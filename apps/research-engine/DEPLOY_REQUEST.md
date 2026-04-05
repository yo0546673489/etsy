# 🚀 DEPLOY REQUEST — research-engine

**תאריך:** 2026-04-05
**סטטוס:** ממתין לביצוע על מחשב Venus (Windows)

---

## מה השתנה

### 1. תיקון `source_niche` ב-`/products` endpoint
**קובץ:** `apps/research-engine/server.py` — שורה 122
**שינוי:** `"niche"` → `"source_niche"`
**סיבה:** הפרונט מצפה לשדה `source_niche`, לא `niche`. ללא התיקון המוצרים לא מוצגים נכון.

### 2. עדכון CORS — דומיין חדש
**קובץ:** `apps/research-engine/server.py` — שורה 33
**שינוי:** `"https://yaroncohen.cc"` → `"https://profix-ai.com"`
**סיבה:** הדומיין עבר ל-profix-ai.com

---

## מה לעשות על מחשב Venus

```powershell
# 1. משוך את השינויים מ-GitHub
cd C:\Users\Administrator\Desktop\קלוד\מחקר
git pull origin main

# 2. העתק את server.py המעודכן
copy "C:\Users\Administrator\Desktop\etsy-repo\apps\research-engine\server.py" `
     "C:\Users\Administrator\Desktop\קלוד\מחקר\apps\new-store\server.py"

# 3. הפעל מחדש את שרת Venus
# סגור את חלון PowerShell הקיים ואז:
.\apps\new-store\start_server.ps1
```

---

## איך לבדוק שזה עובד

```powershell
# בדוק health
curl http://localhost:8001/health -H "x-internal-key: 16b72da1ef604967ac041896b58d53ec"
# צפוי: {"status":"ok","active_jobs":0}

# בדוק products (צריך להחזיר source_niche ולא niche)
curl "http://localhost:8001/products?limit=1" -H "x-internal-key: 16b72da1ef604967ac041896b58d53ec"
```

---

## packages חדשים
אין — אין צורך להתקין כלום.

---

## הערות
- VPS כבר עודכן ישירות (nginx, .env, web container)
- אחרי restart — אפשר ללחוץ "התחל מחקר" באתר `profix-ai.com/stores/new`
