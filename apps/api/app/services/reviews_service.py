"""
Reviews Service
Handles syncing reviews from Etsy API and computing statistics.
"""

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc

from app.models.reviews import Review, ShopReviewStats
from app.models.tenancy import Shop
from app.models.products import Product
from app.services.etsy_client import EtsyClient

logger = logging.getLogger(__name__)


class ReviewsService:

    def __init__(self, db: Session):
        self.db = db

    async def sync_shop_reviews(
        self,
        shop_id: int,
        full_sync: bool = False,
        limit: int = 100,
    ) -> Dict[str, Any]:
        shop = self.db.query(Shop).filter(Shop.id == shop_id).first()
        if not shop or not shop.etsy_shop_id:
            raise ValueError(f"Shop {shop_id} not found or missing Etsy ID")

        etsy = EtsyClient(self.db)

        min_created = None
        if not full_sync:
            stats = self.db.query(ShopReviewStats).filter(
                ShopReviewStats.shop_id == shop_id
            ).first()
            if stats and stats.last_synced_at:
                min_created = int((stats.last_synced_at - timedelta(days=1)).timestamp())

        new_count = 0
        updated_count = 0
        offset = 0

        while True:
            try:
                response = await etsy.get_shop_reviews(
                    shop_id=shop_id,
                    etsy_shop_id=shop.etsy_shop_id,
                    limit=limit,
                    offset=offset,
                    min_created=min_created,
                )
            except Exception as e:
                logger.error(f"Failed to fetch reviews for shop {shop_id}: {e}")
                break

            results = response.get("results", [])
            if not results:
                break

            for review_data in results:
                is_new = self._upsert_review(shop, review_data)
                if is_new:
                    new_count += 1
                else:
                    updated_count += 1

            self.db.commit()

            if len(results) < limit:
                break
            offset += limit

        self._update_shop_stats(shop)
        self.db.commit()

        return {
            "shop_id": shop_id,
            "new_reviews": new_count,
            "updated_reviews": updated_count,
            "total_processed": new_count + updated_count,
        }

    def _upsert_review(self, shop: Shop, data: Dict[str, Any]) -> bool:
        etsy_review_id = (
            data.get("shop_review_id")
            or data.get("review_id")
            or data.get("transaction_id")
        )
        if not etsy_review_id:
            return False

        existing = self.db.query(Review).filter(
            Review.shop_id == shop.id,
            Review.etsy_review_id == etsy_review_id,
        ).first()

        created_timestamp = data.get("create_timestamp") or data.get("created_timestamp")
        updated_timestamp = data.get("update_timestamp") or data.get("updated_timestamp")

        etsy_created = datetime.fromtimestamp(created_timestamp, tz=timezone.utc) if created_timestamp else None
        etsy_updated = datetime.fromtimestamp(updated_timestamp, tz=timezone.utc) if updated_timestamp else None

        listing_id = data.get("listing_id")
        listing_title, listing_image_url = self._get_product_info(shop, listing_id)

        if existing:
            existing.rating = data.get("rating", existing.rating)
            existing.review_text = data.get("review") or data.get("message") or existing.review_text
            existing.language = data.get("language", existing.language)
            existing.buyer_user_id = data.get("buyer_user_id", existing.buyer_user_id)
            existing.etsy_listing_id = listing_id or existing.etsy_listing_id
            existing.etsy_transaction_id = data.get("transaction_id", existing.etsy_transaction_id)
            existing.etsy_updated_at = etsy_updated
            if listing_title:
                existing.listing_title = listing_title
            if listing_image_url:
                existing.listing_image_url = listing_image_url
            return False
        else:
            review = Review(
                tenant_id=shop.tenant_id,
                shop_id=shop.id,
                etsy_review_id=etsy_review_id,
                etsy_shop_id=shop.etsy_shop_id,
                etsy_listing_id=listing_id,
                etsy_transaction_id=data.get("transaction_id"),
                rating=data.get("rating", 5),
                review_text=data.get("review") or data.get("message"),
                language=data.get("language"),
                buyer_user_id=data.get("buyer_user_id"),
                buyer_name=data.get("buyer_name"),
                listing_title=listing_title,
                listing_image_url=listing_image_url,
                etsy_created_at=etsy_created,
                etsy_updated_at=etsy_updated,
            )
            self.db.add(review)
            return True

    def _get_product_info(self, shop: Shop, listing_id: Any):
        if not listing_id:
            return None, None
        product = self.db.query(Product).filter(
            Product.shop_id == shop.id,
            Product.etsy_listing_id == str(listing_id),
        ).first()
        if not product:
            return None, None
        title = product.title_raw
        image_url = None
        images = product.images
        if images:
            if isinstance(images, list) and len(images) > 0:
                image_url = images[0]
            elif isinstance(images, str):
                try:
                    parsed = json.loads(images)
                    image_url = parsed[0] if parsed else None
                except Exception as _e:
                    logger.warning(f"[reviews_service] failed to parse product images JSON: {_e!r}")
        return title, image_url

    def _update_shop_stats(self, shop: Shop) -> ShopReviewStats:
        stats = self.db.query(ShopReviewStats).filter(
            ShopReviewStats.shop_id == shop.id
        ).first()

        if not stats:
            stats = ShopReviewStats(
                tenant_id=shop.tenant_id,
                shop_id=shop.id,
            )
            self.db.add(stats)

        rating_counts = self.db.query(
            Review.rating,
            func.count(Review.id)
        ).filter(
            Review.shop_id == shop.id
        ).group_by(Review.rating).all()

        rating_map = {r: c for r, c in rating_counts}
        stats.rating_5_count = rating_map.get(5, 0)
        stats.rating_4_count = rating_map.get(4, 0)
        stats.rating_3_count = rating_map.get(3, 0)
        stats.rating_2_count = rating_map.get(2, 0)
        stats.rating_1_count = rating_map.get(1, 0)

        total = sum(rating_map.values())
        stats.total_reviews = total

        if total > 0:
            weighted_sum = sum(r * c for r, c in rating_counts)
            stats.average_rating = int((weighted_sum / total) * 100)
        else:
            stats.average_rating = 0

        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        recent = self.db.query(
            func.count(Review.id),
            func.avg(Review.rating)
        ).filter(
            Review.shop_id == shop.id,
            Review.etsy_created_at >= thirty_days_ago
        ).first()

        stats.reviews_last_30_days = recent[0] or 0
        stats.avg_rating_last_30_days = int((recent[1] or 0) * 100)

        last_review = self.db.query(func.max(Review.etsy_created_at)).filter(
            Review.shop_id == shop.id
        ).scalar()
        stats.last_review_at = last_review
        stats.last_synced_at = datetime.now(timezone.utc)

        return stats

    def get_shop_reviews(
        self,
        tenant_id: int,
        shop_id: Optional[int] = None,
        shop_ids: Optional[List[int]] = None,
        rating: Optional[int] = None,
        min_rating: Optional[int] = None,
        max_rating: Optional[int] = None,
        has_text: Optional[bool] = None,
        limit: int = 25,
        offset: int = 0,
        sort_by: str = "created_desc",
    ) -> Dict[str, Any]:
        query = self.db.query(Review).filter(Review.tenant_id == tenant_id)

        if shop_id:
            query = query.filter(Review.shop_id == shop_id)
        elif shop_ids:
            query = query.filter(Review.shop_id.in_(shop_ids))

        if rating is not None:
            query = query.filter(Review.rating == rating)
        else:
            if min_rating is not None:
                query = query.filter(Review.rating >= min_rating)
            if max_rating is not None:
                query = query.filter(Review.rating <= max_rating)

        if has_text is True:
            query = query.filter(Review.review_text.isnot(None), Review.review_text != "")
        elif has_text is False:
            query = query.filter((Review.review_text.is_(None)) | (Review.review_text == ""))

        total = query.count()

        if sort_by == "created_asc":
            query = query.order_by(Review.etsy_created_at.asc())
        elif sort_by == "rating_desc":
            query = query.order_by(Review.rating.desc(), Review.etsy_created_at.desc())
        elif sort_by == "rating_asc":
            query = query.order_by(Review.rating.asc(), Review.etsy_created_at.desc())
        else:
            query = query.order_by(Review.etsy_created_at.desc())

        reviews = query.offset(offset).limit(limit).all()

        return {
            "reviews": [self._review_to_dict(r) for r in reviews],
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": offset + len(reviews) < total,
        }

    def get_shop_stats(
        self,
        tenant_id: int,
        shop_id: Optional[int] = None,
        shop_ids: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        query = self.db.query(ShopReviewStats).filter(
            ShopReviewStats.tenant_id == tenant_id
        )

        if shop_id:
            query = query.filter(ShopReviewStats.shop_id == shop_id)
        elif shop_ids:
            query = query.filter(ShopReviewStats.shop_id.in_(shop_ids))

        stats_list = query.all()

        if not stats_list:
            return {
                "total_reviews": 0,
                "average_rating": 0,
                "average_rating_display": "0.00",
                "rating_distribution": {5: 0, 4: 0, 3: 0, 2: 0, 1: 0},
                "reviews_last_30_days": 0,
                "avg_rating_last_30_days": 0,
                "last_review_at": None,
            }

        total_reviews = sum(s.total_reviews for s in stats_list)

        if total_reviews > 0:
            weighted_avg = sum(s.average_rating * s.total_reviews for s in stats_list) / total_reviews
        else:
            weighted_avg = 0

        return {
            "total_reviews": total_reviews,
            "average_rating": int(weighted_avg),
            "average_rating_display": f"{weighted_avg / 100:.2f}",
            "rating_distribution": {
                5: sum(s.rating_5_count for s in stats_list),
                4: sum(s.rating_4_count for s in stats_list),
                3: sum(s.rating_3_count for s in stats_list),
                2: sum(s.rating_2_count for s in stats_list),
                1: sum(s.rating_1_count for s in stats_list),
            },
            "reviews_last_30_days": sum(s.reviews_last_30_days for s in stats_list),
            "avg_rating_last_30_days": sum(s.avg_rating_last_30_days for s in stats_list) // max(len(stats_list), 1),
            "last_review_at": max((s.last_review_at for s in stats_list if s.last_review_at), default=None),
        }

    def _review_to_dict(self, review: Review) -> Dict[str, Any]:
        return {
            "id": review.id,
            "shop_id": review.shop_id,
            "etsy_review_id": review.etsy_review_id,
            "etsy_listing_id": review.etsy_listing_id,
            "rating": review.rating,
            "review_text": review.review_text,
            "language": review.language,
            "buyer_name": review.buyer_name,
            "listing_title": review.listing_title,
            "listing_image_url": review.listing_image_url,
            "created_at": review.etsy_created_at.isoformat() if review.etsy_created_at else None,
            "seller_response": review.seller_response,
            "seller_response_at": review.seller_response_at.isoformat() if review.seller_response_at else None,
        }
