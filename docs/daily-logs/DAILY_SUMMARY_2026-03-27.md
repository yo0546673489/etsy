# סיכום יום עבודה - 2026-03-27

## ✅ מה בוצע היום:

### ביקורות (Reviews)
- תיקון שמירת ביקורות מ-Etsy API (ID מגיע כ-`transaction_id`)
- הצגת תמונה ושם מוצר על כל כרטיס ביקורת
- Backfill של 8 ביקורות קיימות עם נתוני מוצר מה-DB
- הוספת אפשרות תגובה פנימית ללקוח (שמירה רק ב-DB, לא דרך Etsy API)
- כפתורי עריכה ומחיקה לתגובה שמורה

### הנחות (Discounts) — חדש לחלוטין
- בניית מודול הנחות שלם לפי מפרט BUILD_DISCOUNTS_PAGE.md
- DB: טבלאות discount_rules + discount_tasks
- Backend: Service + API endpoints (CRUD, toggle, tasks)
- Frontend: דף /discounts עם רשימת כללים, Tabs, Modal יצירה/עריכה
- תזמון: חד-פעמי + רוטציה לפי ימים
- Validation: 30 יום מקסימום (מגבלת Etsy), שם מכירה אותיות+מספרים בלבד

### UI / Sidebar
- הוספת פריט "הנחות" עם אייקון Tag לסרגל הצד
- הוספת כפתור "הגדרות" בתחתית הסרגל (מעל עזרה ויציאה)
- הסרת בלוק מידע החנות (אווטאר + שם + "מוכר פרימיום") מהסרגל

---

## קבצים שהשתנו / נוצרו:

### Backend
- apps/api/app/models/discounts.py — חדש — מודלי DiscountRule + DiscountTask
- apps/api/app/models/tenancy.py — הוספת relationship discount_rules ל-Shop
- apps/api/app/models/__init__.py — רישום מודלי הנחות
- apps/api/app/services/discounts_service.py — חדש — CRUD + task generation
- apps/api/app/api/endpoints/discounts.py — חדש — API endpoints
- apps/api/app/api/endpoints/reviews.py — הוספת PUT/DELETE /reviews/{id}/response
- apps/api/app/services/reviews_service.py — חיבור לטבלת מוצרים לשליפת תמונה+שם
- apps/api/main.py — רישום router הנחות
- apps/api/alembic/versions/ec1e8d4b1e8e_...py — migration לטבלאות הנחות

### Frontend
- apps/web/app/discounts/page.tsx — חדש — דף ניהול הנחות מלא
- apps/web/app/reviews/page.tsx — הוספת UI תגובה לביקורת
- apps/web/lib/api.ts — הוספת discountsApi + reviewsApi.setResponse/deleteResponse
- apps/web/components/layout/Sidebar.tsx — הוספת הנחות, הגדרות, הסרת בלוק חנות

---

## API Endpoints חדשים:

- GET /api/discounts/rules?shop_id=X
- POST /api/discounts/rules?shop_id=X
- PUT /api/discounts/rules/{id}?shop_id=X
- DELETE /api/discounts/rules/{id}?shop_id=X
- POST /api/discounts/rules/{id}/toggle?shop_id=X
- GET /api/discounts/tasks?shop_id=X
- PUT /api/reviews/{id}/response
- DELETE /api/reviews/{id}/response

---

## מה נשאר לעשות:

- חיבור automation server (AdsPower) לביצוע הנחות בפועל ב-Etsy
- בחירת מוצרים ספציפיים ב-Modal הנחות
- שליחת תגובות ביקורת ל-Etsy כשה-API יתמוך בזה
- תיקוני UI Dashboard (מטבע ILS->שקל, badge format)

---

## הערות חשובות:

- ה-web container הוא baked image — כל שינוי frontend דורש docker compose build web + up -d
- ה-API container יש לו volume mount — שינויים Python נכנסים לאחר docker restart etsy-api
- Etsy מגביל מכירות ל-30 יום מקסימום — validation קיים בצד לקוח
- etsy_review_id מגיע מ-Etsy כ-transaction_id (לא review_id)
