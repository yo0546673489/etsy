"""רווח נקי (P&L) לכל חנות - per-shop ואז סיכום"""
from app.core.database import SessionLocal
from app.models.tenancy import Shop
from app.services.financial_service import FinancialService


def main():
    db = SessionLocal()
    try:
        shops = db.query(Shop).filter(Shop.status == "connected").order_by(Shop.id).all()
        svc = FinancialService(db)
        tenant_id = shops[0].tenant_id

        print(f"\n{'='*110}")
        print(f"רווח נקי (P&L) לכל חנות - כל הזמנים")
        print(f"{'='*110}\n")

        print(f"{'ID':<4} {'שם':<22} "
              f"{'revenue':>12} {'fees':>12} {'marketing':>12} {'refunds':>12} {'net_profit':>14}")
        print("-" * 110)

        sum_rev, sum_fees, sum_mkt, sum_ref, sum_net = 0.0, 0.0, 0.0, 0.0, 0.0

        per_shop_results = []
        for shop in shops:
            try:
                pl = svc.get_profit_and_loss(tenant_id=shop.tenant_id, shop_ids=[shop.id])
                rev = pl.get("revenue", 0) / 100
                fees = pl.get("fees", 0) / 100
                mkt = pl.get("marketing", 0) / 100
                ref = pl.get("refunds", 0) / 100
                net = pl.get("net_profit", 0) / 100
            except Exception as e:
                rev = fees = mkt = ref = net = -999
                print(f"ERROR shop {shop.id}: {e}")

            per_shop_results.append((shop.id, shop.display_name, rev, fees, mkt, ref, net))
            sum_rev += rev; sum_fees += fees; sum_mkt += mkt; sum_ref += ref; sum_net += net

            print(f"{shop.id:<4} {(shop.display_name or '')[:22]:<22} "
                  f"{rev:>12,.2f} {fees:>12,.2f} {mkt:>12,.2f} {ref:>12,.2f} {net:>14,.2f}")

        print("-" * 110)
        print(f"{'':<4} {'SUM per-shop':<22} "
              f"{sum_rev:>12,.2f} {sum_fees:>12,.2f} {sum_mkt:>12,.2f} {sum_ref:>12,.2f} {sum_net:>14,.2f}")

        # Aggregated call (multi-shop)
        all_ids = [s.id for s in shops]
        pl_agg = svc.get_profit_and_loss(tenant_id=tenant_id, shop_ids=all_ids)
        print(f"\nAggregated call (multi-shop):")
        print(f"   revenue:    {pl_agg.get('revenue', 0)/100:,.2f}")
        print(f"   fees:       {pl_agg.get('fees', 0)/100:,.2f}")
        print(f"   marketing:  {pl_agg.get('marketing', 0)/100:,.2f}")
        print(f"   refunds:    {pl_agg.get('refunds', 0)/100:,.2f}")
        print(f"   net_profit: {pl_agg.get('net_profit', 0)/100:,.2f}")

        # Compare
        agg_net = pl_agg.get('net_profit', 0) / 100
        if abs(agg_net - sum_net) > 0.01:
            print(f"\n*** BUG: sum per-shop={sum_net:,.2f} but aggregated={agg_net:,.2f}, "
                  f"diff={agg_net - sum_net:+,.2f} ***")
        else:
            print(f"\nOK: aggregated matches sum per-shop")

        print(f"\n{'='*110}\n")

    finally:
        db.close()


if __name__ == "__main__":
    main()
