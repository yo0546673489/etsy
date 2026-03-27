"""add_discount_rules_and_tasks_tables

Revision ID: ec1e8d4b1e8e
Revises: 20250320_messaging_access_tokens
Create Date: 2026-03-27 13:22:17.235049

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ec1e8d4b1e8e'
down_revision: Union[str, None] = '20250320_messaging_access_tokens'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'discount_rules',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('shop_id', sa.BigInteger(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('discount_type', sa.String(50), nullable=False),
        sa.Column('discount_value', sa.Float(), nullable=False),
        sa.Column('scope', sa.String(50), nullable=False, server_default='entire_shop'),
        sa.Column('listing_ids', sa.JSON(), nullable=True),
        sa.Column('category_id', sa.String(100), nullable=True),
        sa.Column('is_scheduled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('schedule_type', sa.String(50), nullable=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rotation_config', sa.JSON(), nullable=True),
        sa.Column('target_country', sa.String(100), nullable=True, server_default='everywhere'),
        sa.Column('terms_text', sa.String(500), nullable=True),
        sa.Column('etsy_sale_name', sa.String(200), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='draft'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['shop_id'], ['shops.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_discount_rules_shop_id', 'discount_rules', ['shop_id'])

    op.create_table(
        'discount_tasks',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('rule_id', sa.Integer(), nullable=False),
        sa.Column('shop_id', sa.BigInteger(), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('discount_value', sa.Float(), nullable=True),
        sa.Column('scope', sa.String(50), nullable=False),
        sa.Column('listing_ids', sa.JSON(), nullable=True),
        sa.Column('scheduled_for', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.String(500), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['rule_id'], ['discount_rules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['shop_id'], ['shops.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_discount_tasks_rule_id', 'discount_tasks', ['rule_id'])
    op.create_index('ix_discount_tasks_shop_id', 'discount_tasks', ['shop_id'])
    op.create_index('ix_discount_tasks_scheduled_for', 'discount_tasks', ['scheduled_for'])


def downgrade() -> None:
    op.drop_table('discount_tasks')
    op.drop_table('discount_rules')
