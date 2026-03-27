"""
Reviews API Endpoints
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.api.dependencies import get_user_context as get_current_user_context, UserContext
from app.services.reviews_service import ReviewsService

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("")
async def get_reviews(
    shop_id: Optional[int] = Query(None),
    shop_ids: Optional[str] = Query(None),
    rating: Optional[int] = Query(None, ge=1, le=5),
    min_rating: Optional[int] = Query(None, ge=1, le=5),
    max_rating: Optional[int] = Query(None, ge=1, le=5),
    has_text: Optional[bool] = Query(None),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("created_desc"),
    context: UserContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    service = ReviewsService(db)

    parsed_shop_ids = None
    if shop_ids:
        try:
            parsed_shop_ids = [int(x.strip()) for x in shop_ids.split(",") if x.strip()]
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid shop_ids format")

    return service.get_shop_reviews(
        tenant_id=context.tenant_id,
        shop_id=shop_id,
        shop_ids=parsed_shop_ids,
        rating=rating,
        min_rating=min_rating,
        max_rating=max_rating,
        has_text=has_text,
        limit=limit,
        offset=offset,
        sort_by=sort_by,
    )


@router.get("/stats")
async def get_review_stats(
    shop_id: Optional[int] = Query(None),
    shop_ids: Optional[str] = Query(None),
    context: UserContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    service = ReviewsService(db)

    parsed_shop_ids = None
    if shop_ids:
        try:
            parsed_shop_ids = [int(x.strip()) for x in shop_ids.split(",") if x.strip()]
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid shop_ids format")

    return service.get_shop_stats(
        tenant_id=context.tenant_id,
        shop_id=shop_id,
        shop_ids=parsed_shop_ids,
    )


@router.post("/sync")
async def sync_reviews(
    shop_id: int = Query(...),
    full_sync: bool = Query(False),
    context: UserContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    from app.models.tenancy import Shop
    shop = db.query(Shop).filter(
        Shop.id == shop_id,
        Shop.tenant_id == context.tenant_id,
    ).first()

    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    service = ReviewsService(db)

    try:
        result = await service.sync_shop_reviews(shop_id=shop_id, full_sync=full_sync)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")
