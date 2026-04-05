# אוטומציה של הודעות — Automation Messages

## מה המודול הזה עושה:
שרת Node.js שרץ על Windows VPS עם AdsPower.
מנהל את כל ההודעות של חנויות Etsy — קריאה, שליחה, סנכרון ל-DB, ומענה AI אוטומטי.
כולל גם ניהול ביקורות (Reviews) והנחות (Discounts) דרך דפדפן אנושי.

**Flow עיקרי:**
1. IMAP מקשיב לאימיילים חדשים מ-Etsy
2. מפענח את כתובת השיחה מהאימייל
3. פותח את AdsPower (Chromium מנוהל) ומאמת ב-Etsy
4. סורק את השיחה (Playwright) — הודעות, שם לקוח, תמונות, מוצר
5. שומר הכל ב-PostgreSQL
6. הFastify API חושף את הנתונים לפרונטאנד

---

## שרת ומחשב:
- **Windows VPS IP:** `185.241.4.225`
- **PM2 Process:** `etsy-messages` (רץ מ-`C:\etsy\הודעות\dist\index.js`)
- **Fastify API Port:** `3500` (חשוף דרך nginx כ-`yaroncohen.cc/messages-api/`)
- **DB:** PostgreSQL בשרת הלינוקס `185.241.4.225:5433` — DB: `etsy_messages`

---

## איך הוא מתחבר לשרת:
- **DB:** `postgresql://postgres:postgres_dev_password@185.241.4.225:5433/etsy_messages`
- **AdsPower:** `http://local.adspower.net:50325` (API מקומי)
- **IMAP:** Gmail IMAP של חשבון החנות
- **Redis:** `redis://185.241.4.225:6380` (BullMQ queues)

---

## איך הוא מעביר נתונים:

### Endpoints שהמודול חושף (Fastify API):
```
GET  /api/conversations          — רשימת שיחות
GET  /api/conversations/:id      — שיחה בודדת
PUT  /api/conversations/:id/status
GET  /api/messages/conversation/:id  — הודעות של שיחה
POST /api/replies                — שליחת תשובה
GET  /api/stores                 — רשימת חנויות
GET  /api/dashboard              — סטטיסטיקות
GET  /api/status                 — בריאות המערכת
```

### Endpoints שהמודול משתמש בהם:
- Etsy IMAP: `imap.gmail.com:993`
- AdsPower Local API: `http://local.adspower.net:50325/api/v1/browser/*`
- Etsy Web: `https://www.etsy.com/messages/*`

---

## איך להריץ:

```bash
# פיתוח (על Windows VPS עם AdsPower)
cd apps/automation-messages
npm install
npm run dev

# Build לייצור
npm run build

# העתקה ל-PM2 (מריצים על Windows VPS)
# הקוד מ-dist/ עובר ל-C:\etsy\הודעות\dist\
pm2 restart etsy-messages
```

---

## מבנה התיקיות:
```
apps/automation-messages/
├── src/                    ← קוד TypeScript ראשי
│   ├── adspower/           ← ניהול פרופילי AdsPower
│   ├── ai/                 ← מענה AI (Claude API)
│   ├── api/routes/         ← Fastify API endpoints
│   ├── browser/            ← Playwright scrapers + HumanBehavior
│   ├── config/             ← הגדרות מסביבה (.env)
│   ├── db/migrations/      ← SQL migrations
│   ├── email/              ← IMAP listener + parser
│   ├── queue/workers/      ← BullMQ workers
│   ├── scheduler/          ← Celery-like schedulers
│   ├── sync/               ← SyncEngine (DB sync)
│   └── index.ts            ← נקודת כניסה
├── scripts/
│   ├── *.ts                ← סקריפטי פיתוח ובדיקה
│   └── maintenance/        ← סקריפטי תחזוקה חד-פעמיים
├── dist/                   ← קוד מקומפל (לא ב-git)
├── .env                    ← משתני סביבה (לא ב-git)
└── ecosystem.config.js     ← הגדרות PM2
```

---

## תלויות עיקריות:
```json
{
  "fastify": "API server",
  "bullmq": "Job queues (Redis)",
  "playwright": "Browser automation",
  "ghost-cursor-playwright": "Human-like mouse movement",
  "imapflow": "IMAP email listener",
  "pg": "PostgreSQL client",
  "ioredis": "Redis client"
}
```

---

## משתני סביבה (.env):
```
DATABASE_URL=          ← PostgreSQL etsy_messages
PLATFORM_DATABASE_URL= ← PostgreSQL etsy_platform (Python API)
REDIS_URL=             ← Redis
IMAP_USER=             ← Gmail
IMAP_PASSWORD=         ← Gmail App Password
ADSPOWER_API_URL=      ← AdsPower local API
ANTHROPIC_API_KEY=     ← Claude AI (מענה אוטומטי)
```

---

## הערות חשובות:
- **לא לעלות ישירות לשרת** — ראה כללים ב-CLAUDE.md
- **PM2 רץ על Windows VPS** — לא על שרת הלינוקס
- **dist/ לא נמצא ב-git** — צריך לבצע build ולהעתיק ידנית
- **AdsPower חייב לרוץ** לפני הפעלת המערכת
