"""בדיקה מה יש במסד נתונים לכל חנות - ShopFinancialState + חישוב מהלדג'ר"""
from app.core.database import SessionLocal
from app.models.tenancy import Shop
from app.models.financials import ShopFinancialState, LedgerEntry
from app.services.financial_service import FinancialService
from sqlalchemy import func


def main():
    db = SessionLocal()
    try:
        shops = db.query(Shop).filter(Shop.status == "connected").order_by(Shop.id).all()
        svc = FinancialService(db)

        print(f"\n{'='*120}")
        print(f"בדיקה מלאה של {len(shops)} חנויות - ShopFinancialState + חישוב לדג'ר")
        print(f"{'='*120}\n")

        print(f"{'ID':<4} {'שם':<22} {'tenant':<7} "
              f"{'state.balance':>15} {'state.avail_payout':>18} "
              f"{'ledger_sum':>15} {'heuristic_avail':>18} {'API_ok':>7}")
        print("-" * 120)

        total_state_balance = 0.0
        total_state_avail = 0.0
        total_ledger = 0.0
        total_heuristic = 0.0

        for shop in shops:
            state = db.query(ShopFinancialState).filter(ShopFinancialState.shop_id == shop.id).first()

            sb = (state.balance / 100 if state and state.balance else 0)
            sa = (state.available_for_payout / 100 if state and state.available_for_payout else 0)
            api_ok = (state.etsy_api_available if state else None)

            # ledger sum
            ledger_sum = db.query(func.coalesce(func.sum(LedgerEntry.amount), 0)).filter(
                LedgerEntry.tenant_id == shop.tenant_id,
                LedgerEntry.shop_id == shop.id,
            ).scalar() or 0
            ledger_sum_val = ledger_sum / 100

            # Heuristic available per shop
            try:
                data = svc.get_payout_estimate(tenant_id=shop.tenant_id, shop_ids=[shop.id])
                heur = (data.get("available_for_deposit", 0) or 0) / 100
            except Exception as e:
                heur = -999

            total_state_balance += sb
            total_state_avail += sa
            total_ledger += ledger_sum_val
            total_heuristic += heur

            print(f"{shop.id:<4} {(shop.display_name or '')[:22]:<22} {shop.tenant_id:<7} "
                  f"{sb:>15,.2f} {sa:>18,.2f} "
                  f"{ledger_sum_val:>15,.2f} {heur:>18,.2f} {str(api_ok):>7}")

        print("-" * 120)
        print(f"{'':<4} {'סה״כ':<22} {'':<7} "
              f"{total_state_balance:>15,.2f} {total_state_avail:>18,.2f} "
              f"{total_ledger:>15,.2f} {total_heuristic:>18,.2f}")

        # Now: aggregated call (like dashboard multi-shop)
        all_shop_ids = [s.id for s in shops]
        agg = svc.get_payout_estimate(tenant_id=shops[0].tenant_id, shop_ids=all_shop_ids)
        print(f"\n🔑 אגרגציה (כמו הדשבורד ברב-חנויות):")
        print(f"   current_balance:       {agg.get('current_balance', 0)/100:,.2f}")
        print(f"   available_for_deposit: {agg.get('available_for_deposit', 0)/100:,.2f}")
        print(f"   available_for_payout:  {agg.get('available_for_payout', 0)/100:,.2f}")
        print(f"\n{'='*120}\n")

    finally:
        db.close()


if __name__ == "__main__":
    main()
