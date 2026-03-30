# סיכום יום עבודה - 2026-03-30

## ✅ מה בוצע היום:

### 🔑 פתרון בעיית SSH (ufw חסם port 22)
- SSH היה חסום לחלוטין מהסשן הקודם (הופעל ufw בלי לפתוח port 22)
- נפתחה גישה דרך **Kamatera Remote Console** (noVNC בדפדפן)
- תהליך ה-PK: "Retrieve lost PK" → קיבלנו token+passphrase במייל → שחזרנו private key → הדבקנו → קיבלנו סיסמת שרת: `Profitly2026!@#` (לא עבדה בגלל `@`) → שחזרנו שוב ← קיבלנו `aA@05466734890` → הצלחנו להיכנס דרך clipboard של noVNC
- הרצנו: `ufw allow 22 && ufw reload` → SSH פתוח

### 🌐 הגדרת nginx + דומיין
- הותקן nginx: `apt update && apt install nginx -y`
- נוצר config: `/etc/nginx/sites-available/profitly` — proxy מ-80 ל-3000, ומ-/api ל-8080
- נפתחו ports 80 ו-443 ב-ufw
- נמחק A record ישן ב-Hostinger DNS (`2.57.91.91`) — נשאר רק `185.241.4.225`

### 🔒 SSL Let's Encrypt
- הותקן certbot: `apt install certbot python3-certbot-nginx -y`
- ניסיון ראשון נכשל — `www.yaroncohen.cc` עדיין הצביע ל-`2.57.91.91` (DNS לא התפשט)
- הצלחנו עם domain בלבד: `certbot --nginx -d yaroncohen.cc`
- תעודה תקפה עד **27/06/2026**, מתחדשת אוטומטית

### 🔧 עדכון .env בשרת
תוקנו 4 משתנים ב-`/opt/profitly/.env`:
```
NEXTAUTH_URL: http://185.241.4.225:3000 → https://yaroncohen.cc
ETSY_REDIRECT_URI: http://185.241.4.225:3000/... → https://yaroncohen.cc/...
GOOGLE_REDIRECT_URI: http://185.241.4.225:3000/... → https://yaroncohen.cc/...
FRONTEND_URL: http://185.241.4.225:3000 → https://yaroncohen.cc
```
(FRONTEND_URL גורם לכפתור "חבר חנות חדשה" לייצר URL נכון)

### 🔑 עדכון Google Cloud Console
- נפתח: `console.cloud.google.com` → APIs & Services → Credentials → **Profitly Web**
- הוסף ל-**Authorized JavaScript origins**: `https://yaroncohen.cc`
- הוסף ל-**Authorized redirect URIs**: `https://yaroncohen.cc/api/oauth/google/callback`

### 🏪 עדכון Etsy Developer Console
- נפתח: `etsy.com/developers/edit/[app-id]/callbacks`
- הוסף: `https://yaroncohen.cc/oauth/etsy/callback`

### 🎨 תיקוני RTL — Dropdowns
**בעיה**: כל ה-dropdown menus (notifications, profile, shop selector, language) נפתחו בצד שמאל במקום ימין בממשק העברי (RTL).
**פתרון**: החלפת `right-0` ב-`end-0` (Tailwind logical properties שמתאימות ל-RTL/LTR אוטומטית):

- `NotificationPanel.tsx`: `right-0` → `end-0`, `ml-auto` → `ms-auto`
- `TopBar.tsx`: 3 dropdowns שונו (shop menu, language menu, user menu) מ-`right-0` ל-`end-0`

### 🔄 Docker Rebuilds על השרת
- `docker compose -p etsyauto up -d --build web` — x3
- `docker compose -p etsyauto up -d --build api` — x1

## 📁 קבצים שהשתנו:

### בשרת `/opt/profitly/`
- `.env` — עודכנו כל ה-URL variables לדומיין החדש

### בקוד המקומי + שרת
- `apps/web/components/layout/NotificationPanel.tsx` — תיקוני RTL
- `apps/web/components/layout/TopBar.tsx` — תיקוני RTL בכל 3 dropdown menus

### שינויים מסשן קודם (שהועלו היום)
- `apps/api/app/core/rbac.py` — supplier role ללא READ_PRODUCT/CREATE_PRODUCT
- `apps/web/app/settings/page.tsx` — supplier במקום member בטופס הזמנה לצוות
- `apps/web/components/layout/Sidebar.tsx` — supplier רואה הזמנות בלבד

## 🔗 תשתית נוכחית:

| רכיב | כתובת |
|------|--------|
| אתר ראשי | https://yaroncohen.cc |
| API | http://185.241.4.225:8080 |
| IP שרת | 185.241.4.225 |
| SSH | `ssh root@185.241.4.225` סיסמה: `aA@05466734890` |
| SSL | תקף עד 27/06/2026, מתחדש אוטומטית |
| nginx config | `/etc/nginx/sites-available/profitly` |
| קבצי פרויקט | `/opt/profitly/` |
| Docker | `docker compose -p etsyauto` |

## ⏳ מה נשאר לעשות:

### דחוף
- [ ] **חיבור חנויות** — היכנס ל-`https://yaroncohen.cc/settings` → לחץ "חבר חנות חדשה" → חבר FigurineeHaven + CoreBags דרך Etsy OAuth
- [ ] **בדיקת Google OAuth** — לבדוק שכניסה עם Google עובדת (לפעמים לוקח 5 דקות אחרי שמירה ב-Google Console)

### פחות דחוף
- [ ] **SSL ל-www** — אחרי שה-DNS מתפשט: `certbot --nginx -d yaroncohen.cc -d www.yaroncohen.cc`
- [ ] **www redirect** — הגדרת nginx לעשות redirect מ-www ל-apex
- [ ] **מיגרציה DB** — להעביר נתונים מהדאטהבייס המקומי לשרת (אם רוצים)

## 📝 הערות חשובות לצ'אט הבא:

1. **הדאטהבייס בשרת ריק** — כל הנתונים (הזמנות, מוצרים, ביקורות) צריכים לסנכרן מ-Etsy מחדש אחרי חיבור החנויות
2. **סיסמת השרת**: `aA@05466734890` — עובדת ב-SSH רגיל, לא עבדה ב-Remote Console בגלל `@`
3. **Private Key של Kamatera** — שמור במייל a0583226155@gmail.com (נושא: "etsy12345 private key restoration")
4. **FRONTEND_URL** הוא המשתנה שקובע את URL בכפתור "חבר חנות חדשה" — חשוב!
5. **כפתור "חבר חנות חדשה"** מעתיק לclipboard — לפתוח בדפדפן אחר (לא מנוהל) לביצוע ה-OAuth
