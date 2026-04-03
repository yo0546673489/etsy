"""Add available_for_deposit, ledger_balance, pending_funds, etsy_api_available to shop_financial_state

Revision ID: add_shop_financial_state_deposit_fields
Revises: fix_notifications_bigint
Create Date: 2026-04-03

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_shop_financial_state_deposit_fields'
down_revision = 'fix_notifications_bigint'
branch_label = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE shop_financial_state
            ADD COLUMN IF NOT EXISTS available_for_deposit INTEGER,
            ADD COLUMN IF NOT EXISTS ledger_balance INTEGER,
            ADD COLUMN IF NOT EXISTS pending_funds INTEGER,
            ADD COLUMN IF NOT EXISTS etsy_api_available BOOLEAN
    """)


def downgrade():
    op.execute("""
        ALTER TABLE shop_financial_state
            DROP COLUMN IF EXISTS available_for_deposit,
            DROP COLUMN IF EXISTS ledger_balance,
            DROP COLUMN IF EXISTS pending_funds,
            DROP COLUMN IF EXISTS etsy_api_available
    """)
