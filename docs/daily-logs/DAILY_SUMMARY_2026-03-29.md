# סיכום יום — 2026-03-29

## מה נעשה היום

### 1. Commercial API Access
- Etsy אישרו גישה מסחרית לאפליקציה `shoppilot`
- Rate limits חדשים: **150 QPS, 100K QPD** (במקום personal limits)
- עודכן `.env`: `ETSY_RATE_LIMIT_CAPACITY=150`, `ETSY_RATE_LIMIT_REFILL_PER_SEC=50`
- ה-Client ID לא השתנה — הטוקנים הקיימים תקינים, אין צורך לחבר מחדש

### 2. אופטימיזציית Sync — חיסכון ב-API Quota

**לפני:**
- הזמנות: כל 15 דקות
- מוצרים: כל 6 שעות
- לדג'ר: כל 5 דקות
- תשלומים: כל 5 דקות

**אחרי:**
- הזמנות: **כל 2 דקות** (מהיר יותר)
- מוצרים: **בלוגין בלבד** (חיסכון)
- לדג'ר: **בלוגין בלבד** (חיסכון)
- תשלומים: **בלוגין בלבד** (חיסכון)

### 3. On-Login Sync Trigger
נוסף ב-`auth.py` — בעת לוגין מופעלות tasks ב-Celery:
- `sync_products_from_etsy` לכל חנות מחוברת
- `sync_ledger_entries` לכל חנות מחוברת
- `sync_payment_details` לכל חנות מחוברת

## קבצים שהשתנו
- `apps/api/app/worker/celery_app.py` — לוח זמנים חדש
- `apps/api/app/api/endpoints/auth.py` — on-login sync trigger
- `.env` — rate limits מעודכנים

## הערות
- Webhooks של Etsy דורשים URL ציבורי — לא זמין ב-localhost
- כשהפלטפורמה תעלה לפרודקשן עם domain אמיתי — לרשום webhook ב-Etsy לעדכוני הזמנות מיידיים
