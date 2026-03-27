"""
Reviews Model
Stores Etsy shop and listing reviews synced from the API.
"""

from sqlalchemy import (
    Column, Integer, BigInteger, String, Text, DateTime, ForeignKey,
    Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Review(Base):
    __tablename__ = "reviews"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    shop_id = Column(Integer, ForeignKey("shops.id", ondelete="CASCADE"), nullable=False)

    etsy_review_id = Column(BigInteger, nullable=False, index=True)
    etsy_shop_id = Column(String(50), nullable=False)
    etsy_listing_id = Column(BigInteger, nullable=True, index=True)
    etsy_transaction_id = Column(BigInteger, nullable=True)

    rating = Column(Integer, nullable=False)
    review_text = Column(Text, nullable=True)
    language = Column(String(10), nullable=True)

    buyer_user_id = Column(BigInteger, nullable=True)
    buyer_name = Column(String(255), nullable=True)

    listing_title = Column(String(500), nullable=True)
    listing_image_url = Column(Text, nullable=True)

    etsy_created_at = Column(DateTime(timezone=True), nullable=True)
    etsy_updated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    seller_response = Column(Text, nullable=True)
    seller_response_at = Column(DateTime(timezone=True), nullable=True)

    shop = relationship("Shop", back_populates="reviews")

    __table_args__ = (
        UniqueConstraint("shop_id", "etsy_review_id", name="uq_shop_etsy_review"),
        Index("ix_reviews_tenant_shop", "tenant_id", "shop_id"),
        Index("ix_reviews_rating", "shop_id", "rating"),
        Index("ix_reviews_created", "shop_id", "etsy_created_at"),
    )


class ShopReviewStats(Base):
    __tablename__ = "shop_review_stats"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    shop_id = Column(Integer, ForeignKey("shops.id", ondelete="CASCADE"), nullable=False, unique=True)

    total_reviews = Column(Integer, default=0, nullable=False)
    average_rating = Column(Integer, default=0, nullable=False)

    rating_5_count = Column(Integer, default=0, nullable=False)
    rating_4_count = Column(Integer, default=0, nullable=False)
    rating_3_count = Column(Integer, default=0, nullable=False)
    rating_2_count = Column(Integer, default=0, nullable=False)
    rating_1_count = Column(Integer, default=0, nullable=False)

    reviews_last_30_days = Column(Integer, default=0, nullable=False)
    avg_rating_last_30_days = Column(Integer, default=0, nullable=False)

    last_review_at = Column(DateTime(timezone=True), nullable=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_shop_review_stats_tenant", "tenant_id"),
    )

    @property
    def average_rating_display(self) -> float:
        return self.average_rating / 100 if self.average_rating else 0.0
