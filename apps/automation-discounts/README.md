# אוטומציה של הנחות — Automation Discounts

מודול Node.js/TypeScript שמבצע מבצעי הנחה ב-Etsy אוטומטית דרך AdsPower (דפדפן אנושי).

---

## מה המודול הזה עושה

- **מבצע הנחות ב-Etsy** — פותח את ממשק ה-Shop Manager דרך AdsPower ויוצר/מסיר מבצעים
- **סורק DB כל 5 דקות** — מחפש `discount_tasks` עם `status='pending'` ו-`scheduled_for <= now()`
- **מדמה התנהגות אנושית** — תנועות עכבר Bézier, הקלדה תו-תו, גלילה הדרגתית, השהיות אקראיות
- **מפזר זמנים בין חנויות** — מינימום 30 דקות בין כל חנות (עד 60 דקות), אקראי
- **מדווח לאחור** — מעדכן `status='completed'` בטבלת `discount_tasks` ב-`etsy_platform` DB

---

## מבנה קבצים

```
apps/automation-discounts/
├── src/
│   ├── adspower/
│   │   └── controller.ts       ← פותח/סוגר פרופיל AdsPower, מחזיר Playwright page
│   ├── api/
│   │   └── discounts.ts        ← Fastify routes + utility functions (generateSaleName, getNextDiscountPercent)
│   ├── browser/
│   │   ├── etsyDiscountManager.ts  ← הלב — יוצר/מסיר מבצעים ב-Etsy UI
│   │   └── humanBehavior.ts        ← מחלקת HumanBehavior (עכבר/הקלדה/גלילה אנושיים)
│   ├── config/
│   │   └── index.ts            ← קריאת משתני סביבה
│   ├── db/
│   │   └── migrations/
│   │       └── discounts.sql   ← SQL schema של discount_tasks (legacy, לא בשימוש)
│   ├── scheduler/
│   │   └── discountTaskExecutor.ts  ← סורק etsy_platform DB ומעביר לBullMQ
│   ├── stores/
│   │   └── resolver.ts         ← מיפוי shop_id → adspower_profile_id
│   ├── utils/
│   │   └── logger.ts           ← Winston logger
│   ├── workers/
│   │   └── executeDiscount.ts  ← BullMQ worker שמבצע כל משימה
│   ├── index.ts                ← Entry point — מאתחל הכל
│   └── sync-discounts.ts       ← כלי אד-הוק לסנכרון חד-פעמי
├── logs/                       ← לוגים (לא ב-git)
├── ecosystem.config.js         ← הגדרת PM2
├── start.js                    ← Launcher ל-PM2
├── start-discounts.bat         ← הפעלה ידנית מהטרמינל
├── package.json
├── tsconfig.json
└── .env                        ← משתני סביבה (לא ב-git)
```

---

## Flow — איך זה עובד

```
Python Backend (Celery Beat)
  └─► כותב discount_task עם status='pending' + scheduled_for
        │
        ▼
DiscountTaskExecutor (כל 5 דקות)
  └─► שולף tasks שהגיע זמנם
  └─► מוסיף ל-BullMQ queue
        │
        ▼
executeDiscount Worker (BullMQ)
  └─► פותח AdsPower profile של החנות
  └─► EtsyDiscountManager.createSale() / endSale()
        │ (מתחיל ב-humanPreBrowse — מבקר 2-3 עמודים אקראיים)
        │
        ▼
Etsy Shop Manager (UI automation)
  └─► מעדכן discount_task.status = 'completed'
        │
        ▼
Celery sync task (כל 2 דקות)
  └─► מזהה completed tasks
  └─► מעדכן discount_rule.status = 'active'
```

---

## חיבורים ושרתים

| שירות | כתובת | פורט |
|-------|-------|------|
| Fastify API (מקומי) | `0.0.0.0` | `3510` |
| PostgreSQL — etsy_platform | `185.241.4.225` | `5433` |
| PostgreSQL — etsy_messages | `185.241.4.225` | `5433` |
| Redis (BullMQ) | `185.241.4.225` | `6380` |
| AdsPower API (מקומי VPS) | `127.0.0.1` | `50325` |

---

## AdsPower — חיבור לפרופילים

- כל חנות Etsy משויכת ל-`adspower_profile_id` בטבלת `shops` ב-`etsy_platform` DB
- המודול קורא את ה-ID ופותח את הפרופיל דרך AdsPower API
- כל פרופיל = דפדפן כרום נפרד עם cookies ו-fingerprint ייחודיים

```
GET http://127.0.0.1:50325/api/v1/browser/start?user_id={profile_id}
```

---

## Endpoints שהמודול חושף

| Method | Path | תיאור |
|--------|------|-------|
| GET | `/api/discounts/:storeId` | רשימת משימות לחנות |
| POST | `/api/discounts/execute` | הפעלה ידנית של משימה |
| GET | `/health` | בדיקת תקינות |

---

## כללים עסקיים

- **מגבלת Etsy**: מכירה נמשכת מקסימום 30 יום (Etsy דורשת תאריך סיום)
- **אחוזים**: בין `min_percent` ל-`max_percent`, אקראי, לא אותו אחוז פעמיים ברצף
- **שמות מבצע**: נוצרים אוטומטית (נבחרים מתוך pool של 32 שמות טבעיים)
- **פיזור זמנים**: מינימום 30 דקות בין כל שתי חנויות, מקסימום 60 דקות (אקראי)
- **Pre-browsing**: לפני כל פעולה, המודול מבקר 2-3 עמודים אקראיים ב-Shop Manager כדי להיראות אנושי

---

## הרצה

### הפעלה ידנית
```bat
start-discounts.bat
```

### הפעלה עם PM2 (production)
```bat
pm2 start ecosystem.config.js
pm2 save
```

### פיתוח
```bash
npm install
npm run dev
```

---

## משתני סביבה (.env)

```
DATABASE_URL=          # etsy_messages DB connection string
PLATFORM_DATABASE_URL= # etsy_platform DB connection string
REDIS_URL=             # Redis connection string
ADSPOWER_API_URL=      # AdsPower local API (ברירת מחדל: http://127.0.0.1:50325)
ADSPOWER_API_KEY=      # מפתח API של AdsPower (אם נדרש)
API_PORT=              # פורט הserver (ברירת מחדל: 3510)
API_HOST=              # host לאזנה (ברירת מחדל: 0.0.0.0)
```

---

## תלויות עיקריות

| חבילה | תפקיד |
|-------|-------|
| `playwright` | אוטומציה של הדפדפן |
| `ghost-cursor-playwright` | תנועות עכבר אנושיות (Bézier curves) |
| `bullmq` | תור משימות async |
| `fastify` | API server |
| `ioredis` | חיבור ל-Redis |
| `pg` | חיבור ל-PostgreSQL |
