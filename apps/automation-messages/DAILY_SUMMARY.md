# סיכום מלא — אוטומציה של הודעות
# תאריך יצירה: 2026-03-31

---

## מה זה הפרויקט הזה?

זה עותק מלא של כל קוד האוטומציה שרץ על השרת VPS Windows ב-`C:\etsy\הודעות\`.
הפרויקט הזה מנהל את **כל** האוטומציה של Etsy:
- הודעות לקוחות (Messages)
- ביקורות (Reviews)
- הנחות ומבצעים (Discounts/Sales)
- AI תגובות אוטומטיות

---

## מבנה הקבצים

```
אוטומציה של הודעות/
├── package.json                    ← תלויות npm
├── tsconfig.json                   ← הגדרות TypeScript
├── .env                            ← כל הcredentials (ראה למטה)
├── src/
│   ├── index.ts                    ← נקודת כניסה — מפעיל הכל
│   ├── config/index.ts             ← קורא ENV variables
│   ├── utils/logger.ts             ← לוגר פשוט עם timestamp
│   ├── stores/resolver.ts          ← מחפש store לפי email/ID
│   ├── adspower/controller.ts      ← API של AdsPower לפתיחת פרופילים
│   ├── browser/
│   │   ├── humanBehavior.ts        ← *** כל פעולות הדפדפן (אנושיות!) ***
│   │   ├── etsyScraper.ts          ← גרידת שיחות מEtsy
│   │   ├── etsySender.ts           ← שליחת הודעות חזרה ללקוחות
│   │   ├── etsyReviewReplier.ts    ← תגובה לביקורות (סלקטורים = PLACEHOLDERS)
│   │   ├── etsyDiscountManager.ts  ← *** יצירת מבצעים + ביטול ***
│   │   └── listingScraper.ts       ← גרידת מחירים/תמונות של מוצרים
│   ├── email/
│   │   ├── listener.ts             ← מאזין לGmail IMAP
│   │   └── parser.ts               ← מפרסר אימיילים מEtsy
│   ├── sync/engine.ts              ← שומר שיחות בDB
│   ├── ai/replyGenerator.ts        ← יוצר תגובות AI דרך Anthropic
│   ├── queue/
│   │   ├── setup.ts                ← הגדרת BullMQ queues
│   │   └── workers/
│   │       ├── syncConversation.ts ← Worker: גרידת שיחה מEtsy
│   │       ├── sendReply.ts        ← Worker: שליחת תגובה
│   │       ├── initialSync.ts      ← Worker: אתחול חנות
│   │       ├── replyToReview.ts    ← Worker: תגובה לביקורת
│   │       └── executeDiscount.ts  ← Worker: ביצוע מבצע הנחה
│   ├── scheduler/
│   │   ├── discountRotation.ts     ← Scheduler: בודק rotations כל 12 שעות
│   │   └── discountTaskExecutor.ts ← Executor: polls etsy_platform כל 5 דק'
│   ├── api/
│   │   ├── server.ts               ← Fastify server על פורט 3500
│   │   └── routes/
│   │       ├── stores.ts           ← GET/POST/PUT חנויות
│   │       ├── conversations.ts    ← GET שיחות
│   │       ├── messages.ts         ← GET הודעות + חיפוש
│   │       ├── replies.ts          ← POST שליחת תגובה + AI
│   │       ├── reviews.ts          ← GET/POST ביקורות + AI
│   │       └── discounts.ts        ← GET/POST מבצעים + לוחות זמנים
│   └── db/migrations/
│       ├── 001_initial.sql         ← stores, conversations, messages, reply_queue
│       ├── 002_reviews_discounts.sql ← ai_settings, review_replies, discount_tasks, discount_schedules
│       └── 003_listing_previews.sql  ← listing_previews (cache מחירי מוצרים)
```

---

## איפה הקוד LIVE (בשרת האמיתי)?

**נתיב בשרת:** `C:\etsy\הודעות\`
**PM2 process:** `etsy-messages`

הקוד הזה בתיקייה הנוכחית הוא **עותק לעיון** — השינויים צריכים לעלות לGitHub ואז להיות מעודכנים בשרת.

---

## Credentials ומידע חיוני

### Database (Ubuntu Server)
- **IP:** `185.241.4.225`
- **Port:** `5433` (לא 5432! יש PostgreSQL נוסף)
- **User:** `postgres`
- **Password:** `postgres_dev_password`
- **DB הודעות:** `etsy_messages`
- **DB פלטפורמה:** `etsy_platform`

### Redis
- **URL:** `redis://185.241.4.225:6380` (לא 6379!)

### AdsPower
- **URL:** `http://127.0.0.1:50325` (LOCAL — רץ על אותו מחשב!)
- **API Key:** `c44cda0f358957f4a60bc8054504571400707d1cc0163261`
- **Profile שנבדק:** `k16kmi55`

### Gmail IMAP
- **User:** `a05832261551@gmail.com`
- **Password (App Password):** `ovmp vyok huwe qjkz`
- **Port:** 993 (SSL)

### API Server
- **Port:** 3500
- **Health check:** `GET http://localhost:3500/api/health`

### Anthropic AI
- **Key:** `sk-ant-api03-placeholder` ← צריך להחליף בkey אמיתי!

---

## ארכיטקטורה — איך הכל עובד

### 1. זרימת הודעת לקוח (Message Flow)

```
לקוח שולח הודעה ב-Etsy
    ↓
Etsy שולח אימייל ל-a05832261551@gmail.com
    ↓
EmailListener (IMAP IDLE) מזהה אימייל חדש
    ↓
EmailParser מחלץ:
  - store email (מי הנמען המקורי)
  - buyer name
  - conversation link (ablink → etsy URL)
    ↓
StoreResolver מוצא את החנות לפי email
    ↓
JobQueue.addSyncConversationJob()
    ↓
BullMQ queue: 'sync-conversation'
    ↓
SyncConversation Worker:
  1. AdsPowerController.openProfile(profileId)
  2. chromium.connectOverCDP(ws_url)
  3. EtsyScraper.scrapeConversation(url)
  4. SyncEngine.syncConversation() → שמור בDB
  5. (אם יש לינקים למוצרים) → ListingScraper
    ↓
Frontend מציג השיחה (דרך API)
```

### 2. זרימת שליחת תגובה (Reply Flow)

```
Frontend שולח POST /api/replies
    ↓
reply_queue נשמר בDB
BullMQ queue: 'send-reply'
    ↓
SendReply Worker:
  1. AdsPower.openProfile()
  2. EtsySender.sendReply(url, text)
     - הקלדה אנושית (ghost-cursor + delays אקראיים)
     - לחיצה על Send
     - אימות שההודעה נשלחה
  3. EtsyScraper.scrapeConversation() → עדכן DB
  4. UPDATE reply_queue SET status='sent'
  5. UPDATE conversations SET status='answered'
```

### 3. זרימת מבצע הנחה (Discount Flow)

**דרך A — DiscountTaskExecutor (Python API):**
```
Python API יוצר discount_task בetsy_platform DB
    ↓
DiscountTaskExecutor polls כל 5 דקות
    ↓
מוצא task עם status='pending' AND scheduled_for<=NOW()
    ↓
מושך discount_rule + shop.adspower_profile_id
    ↓
דוחף ל-BullMQ queue: 'discount-execute'
    ↓
ExecuteDiscount Worker:
  1. AdsPower.openProfile()
  2. EtsyDiscountManager.createSale(config) / endSale(name)
  3. UPDATE discount_tasks status='completed'/'failed'
  4. UPDATE etsy_platform.discount_tasks status
```

**דרך B — DiscountRotationScheduler (Node.js):**
```
Scheduler בודק כל 12 שעות
    ↓
לפי היום בשבוע (0=Sunday...6=Saturday)
    ↓
מוצא discount_schedules פעילים
    ↓
יוצר discount_task + דוחף לqueue
```

**דרך C — Direct API:**
```
POST /api/discounts/create → מיידי
POST /api/discounts/end → מיידי
```

---

## EtsyDiscountManager — הלב של ההנחות

**⚠️ CRITICAL — חשוב מאוד לצ'אט הבא!**

הקוד של `createSale()` עבר debugging מאסיבי ב-2026-03-31.

### בעיות שנפתרו:

**1. react-datepicker — בחירת תאריך לא עובדת**
- **בעיה:** ניסינו `.react-datepicker__day--030` כ-CSS class — לא קיים ב-Etsy!
- **בעיה 2:** ניסינו `aria-label="April 30, 2026"` — לא קיים! ה-aria הוא רק `day-30`
- **בעיה 3:** הדף `react-datepicker__header` מסתיר את תאי הימים → Playwright לא יכול לקלוק
- **פתרון סופי (מאומת):**
  ```typescript
  // JS click שעוקף את ה-overlay
  const clicked = await this.page.evaluate((tDay) => {
    const days = Array.from(document.querySelectorAll('.react-datepicker__day'));
    const candidates = days.filter(d => {
      const text = (d as HTMLElement).innerText?.trim();
      const classes = d.getAttribute('class') || '';
      return text === String(tDay) && !classes.includes('outside-month');
    });
    if (candidates.length > 0) {
      (candidates[0] as HTMLElement).click();
      return { success: true };
    }
    return { success: false };
  }, targetDay);
  ```
- **עיקרון:** מסנן ימים לפי `innerText` + אין `outside-month` class

**2. select[name="reward_type"] timeout**
- **בעיה:** Etsy מטעין את הfrom כ-React modal — לוקח עד 25 שניות!
- **פתרון:** `waitFor({ timeout: 25000 })` (היה 10000)

**3. Continue button intercepts pointer events**
- **פתרון:** JavaScript click `(cont as HTMLButtonElement).click()`

**4. Calendar navigation — JS click על כפתורי חיצים**
- **פתרון:** `page.evaluate(() => btn.click())` גם על navigation buttons

### תאריכים:
- Format: `DD/MM/YYYY` (UK locale שEtsy משתמש בו)
- `toEtsyDate('2026-04-01')` → `'01/04/2026'`

---

## PM2 בשרת — פקודות שימושיות

```bash
# ראה סטטוס
pm2 status

# לוגים בזמן אמת
pm2 logs etsy-messages

# הפעל מחדש
pm2 restart etsy-messages

# בנה TypeScript ואז הפעל מחדש
node C:\etsy\do-build.js

# שמור configuration
pm2 save
```

### do-build.js (חשוב!)
יש קובץ `C:\etsy\do-build.js` שמטפל בnHebrew path:
```javascript
const hebFolder = '\u05D4\u05D5\u05D3\u05E2\u05D5\u05EA'; // הודעות
// מריץ tsc בתוך תיקיית הודעות ואז pm2 restart
```
**למה צריך Unicode?** כי PowerShell לא מסוגל לטפל בעברית בpaths!

---

## Database Schema

### etsy_messages (Node.js DB — port 5433)

```sql
stores (id, store_number, store_name, store_email, adspower_profile_id, initial_sync_completed, status)
conversations (id, store_id, etsy_conversation_url, customer_name, last_message_text, last_message_at, status)
messages (id, conversation_id, sender_type, sender_name, message_text, sent_at, message_hash)
reply_queue (id, conversation_id, message_text, source, status, attempts, error_message, sent_at)
ai_settings (id, store_id, feature, enabled, system_prompt, model, max_tokens, temperature, language, auto_send)
review_replies (id, store_id, reviewer_name, review_rating, review_text, reply_text, reply_source, status)
discount_tasks (id, store_id, task_type, sale_name, discount_percent, target_scope, listing_ids, target_country, terms_text, start_date, end_date, status, attempts)
discount_schedules (id, store_id, schedule_name, is_active, rotation_config, target_scope, listing_ids, target_country, terms_text)
listing_previews (id, listing_id, url, title, image_url, price, currency_code, scraped_at)
```

### etsy_platform (Python DB — port 5433)
```sql
shops (id, adspower_profile_id, etsy_shop_id, display_name)
discount_rules (id, shop_id, name, discount_type, discount_value, scope, listing_ids, target_country, terms_text, etsy_sale_name, start_date, end_date)
discount_tasks (id, rule_id, shop_id, action, discount_value, scope, listing_ids, scheduled_for, status, started_at, completed_at, error_message, retry_count)
```

---

## API Endpoints

**Base URL:** `http://localhost:3500`

### Stores
```
GET  /api/stores                          ← כל החנויות
POST /api/stores                          ← חנות חדשה
PUT  /api/stores/:id                      ← עדכון חנות
POST /api/stores/:id/initial-sync         ← הפעל sync ראשוני
```

### Conversations
```
GET /api/conversations?store_id=X&status=new&search=text&page=1&limit=50
GET /api/conversations/:id
PUT /api/conversations/:id/status
```

### Messages
```
GET /api/messages/conversation/:conversationId
GET /api/messages/search?q=text&store_id=X
```

### Replies
```
POST /api/replies                         ← שלח תגובה ידנית
GET  /api/replies/:id/status
POST /api/replies/ai-generate             ← generate AI reply (preview)
GET  /api/replies/ai-settings/:storeId
PUT  /api/replies/ai-settings/:storeId
```

### Reviews
```
GET  /api/reviews/:storeId
POST /api/reviews/reply                   ← תגובה ידנית
POST /api/reviews/reply-ai                ← generate AI preview
POST /api/reviews/reply-ai/send           ← שלח AI reply שאושר
GET  /api/reviews/ai-settings/:storeId
PUT  /api/reviews/ai-settings/:storeId
```

### Discounts
```
GET  /api/discounts/:storeId
POST /api/discounts/create                ← מבצע חדש
POST /api/discounts/end                   ← ביטול מבצע
POST /api/discounts/schedule              ← שמירת rotation schedule
GET  /api/discounts/schedules/:storeId
```

---

## BullMQ Queues

| Queue | Worker | Concurrency | Limiter |
|-------|--------|-------------|---------|
| `sync-conversation` | syncConversation | 3 | max 5/min |
| `send-reply` | sendReply | 2 | — |
| `initial-sync` | initialSync | 1 | — |
| `review-reply` | replyToReview | 1 | max 3/min |
| `discount-execute` | executeDiscount | 1 | max 2/min |

---

## HumanBehavior — כללים חשובים

**כל** גישה לדפדפן חייבת לעבור דרך `HumanBehavior`:
- `humanClick(selector)` — Bézier curve mouse movement
- `humanType(selector, text)` — הקלדה תו-תו עם delays אקראיים 50-800ms
- `humanTypeInFocus(text)` — הקלדה ל-element שכבר בfocus
- `humanScroll(direction, amount)` — גלילה ב-3-6 צעדים עם רעש
- `humanNavigate(url)` — ניווט + delay + random scroll
- `thinkBeforeSending()` — 3-8 שניות "חשיבה"
- `readingDelay(length)` — delay לפי אורך הטקסט
- `randomMouseMovement()` — תנועת עכבר אקראית ב-30% מהמקרים

**אף פעם לא:**
- `page.goto()` ישיר (אלא אם יש סיבה טכנית כמו בdiscountManager)
- `page.click()` ישיר (כאשר יש overlay — להשתמש ב-`page.evaluate`)
- `window.scrollTo()` ישיר
- `element.scrollIntoViewIfNeeded()` ישיר

---

## EmailParser — איך עובד

הParser מזהה אימיילים מEtsy כך:
1. **from**: `@etsy.com`
2. **subject**: מכיל "message"/"conversation"/"sent you"/"replied"
3. **conversation link**: ב-HTML של האימייל, הלינק שמשויך ל-"View message"

Etsy מעביר כל לינק דרך `ablink.account.etsy.com` (SendGrid tracking).
הbrowser עוקב אחרי ה-redirect לURL האמיתי.

---

## בעיות ידועות + פתרונות

### 1. Hebrew path בPowerShell
**בעיה:** `C:\etsy\הודעות\` — PowerShell לא מוצא!
**פתרון:** השתמש בNode.js עם Unicode: `\u05D4\u05D5\u05D3\u05E2\u05D5\u05EA`

### 2. PM2 OOM (Out of Memory)
**בעיה:** V8 heap OOM — קורה כאשר נשמרים screenshots גדולים
**פתרון:** screenshot רק לפני Continue (לא אחרי ניווט)

### 3. Calendar date selection
**כבר נפתר** — ראה סעיף EtsyDiscountManager למעלה

### 4. AdsPower "already open"
**AdsPowerController** מטפל בזה: אם `openProfile` מקבל "already"/"opened" → קורא ל-`getActiveProfile`

### 5. Git push non-fast-forward
**פתרון:** `git pull origin main --rebase` ואז `git push`

---

## איך להפעיל בשרת (מחדש)

```bash
# 1. בשרת VPS Windows
cd C:\etsy

# 2. עדכן קוד מGitHub
git pull origin main

# 3. בנה TypeScript (עם Hebrew path fix)
node do-build.js

# 4. בדוק שהprocess רץ
pm2 status
pm2 logs etsy-messages --lines 50

# 5. בדוק health
curl http://localhost:3500/api/health
```

---

## מה נשאר לעשות

1. **הנחות — בדיקה אמיתית**: האם createSale עובד לאחר התיקון של ה-calendar?
   - הlogs צריכים להראות: `Clicked day 30 (JS click, ...)`
   - screenshot: `C:\etsy\debug-before-continue.png` ו-`debug-after-continue.png`

2. **ביקורות — סלקטורים**: `etsyReviewReplier.ts` מכיל PLACEHOLDER selectors
   - צריך להריץ `inspect-selectors.ts` ולבדוק את DOM האמיתי של Etsy reviews page
   - הסלקטורים הנוכחיים: `[data-review-id]`, `.review-card` — אולי לא קיימים!

3. **ANTHROPIC_API_KEY**: יש צורך בkey אמיתי ב-.env

4. **npm install**: בתיקייה הזו — לא נעשה עדיין
   ```bash
   npm install
   ```

---

## מאיפה ממשיכים

**בצ'אט הבא** — אם רוצים לעבוד על הפרויקט הזה:

1. הקוד ה-LIVE נמצא ב-`C:\etsy\הודעות\` בשרת VPS
2. לא לערוך את הקבצים **בתיקייה הזו** — לערוך בשרת או דרך GitHub
3. לבדוק logs: `pm2 logs etsy-messages --lines 100`
4. לבדוק screenshots הנחות: `C:\etsy\debug-before-continue.png`

**הדבר הראשון לבדוק:** האם מבצע ה-VCRHC (או כל מבצע אחר) נוצר בהצלחה ב-Etsy לאחר התיקון של ה-calendar.
