/**
 * sync-discounts.ts
 * עובר על כל החנויות, נכנס לכל פרופיל AdsPower,
 * קורא את המבצעים הפעילים מ-Etsy ומעדכן את ה-DB.
 * אם חשבון לא מחובר → מדלג (חשבון חסום).
 */

import { chromium } from 'playwright';
import { Pool } from 'pg';
import axios from 'axios';
import * as fs from 'fs';

const PLATFORM_DB = 'postgresql://postgres:postgres_dev_password@185.241.4.225:5433/etsy_platform';
const ADSPOWER_URL = 'http://127.0.0.1:50325';
const ADSPOWER_KEY = 'c44cda0f358957f4a60bc8054504571400707d1cc0163261';
const RESULTS_FILE = 'C:/etsy/sync-discounts-results.json';

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function openProfile(profileId: string): Promise<string | null> {
  try {
    await axios.get(`${ADSPOWER_URL}/api/v1/browser/stop`, {
      params: { user_id: profileId },
      headers: { 'api-key': ADSPOWER_KEY },
      timeout: 10000,
    }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));

    const res = await axios.get(`${ADSPOWER_URL}/api/v1/browser/start`, {
      params: { user_id: profileId },
      headers: { 'api-key': ADSPOWER_KEY },
      timeout: 30000,
    });
    if (res.data.code !== 0) {
      log(`  ❌ AdsPower error for ${profileId}: ${res.data.msg}`);
      return null;
    }
    return res.data.data.ws.puppeteer;
  } catch (e: any) {
    log(`  ❌ Failed to open profile ${profileId}: ${e.message}`);
    return null;
  }
}

async function closeProfile(profileId: string): Promise<void> {
  await axios.get(`${ADSPOWER_URL}/api/v1/browser/stop`, {
    params: { user_id: profileId },
    headers: { 'api-key': ADSPOWER_KEY },
    timeout: 10000,
  }).catch(() => {});
  log(`  🔒 Profile ${profileId} closed`);
}

interface SaleInfo {
  name: string;
  discountPercent: number;
  startDate: string | null;
  endDate: string | null;
  status: 'active' | 'scheduled' | 'ended';
  scope: string;
  listingCount: number | null;
}

async function readActiveSalesFromEtsy(page: any): Promise<SaleInfo[]> {
  // נווט לרשימת המבצעים
  await page.goto('https://www.etsy.com/your/shops/me/sales-discounts', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));

  // קרא את כל הנתונים מהדף
  const sales = await page.evaluate(() => {
    const results: any[] = [];

    // חפש כרטיסי מבצעים — Etsy מציג כל מבצע בכרטיס
    // הסלקטורים מבוססים על מבנה Etsy sales-discounts page
    const cards = Array.from(document.querySelectorAll(
      '[data-sale-id], .promotion-card, [class*="promotion"], [class*="sale-card"]'
    ));

    // אם אין cards ספציפיים — נסה לקרוא מהטקסט הכללי
    if (cards.length === 0) {
      // גישה גנרית: מצא את כל ה-% off שמוצגים
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);

      // מצא שורות עם אחוז הנחה
      let currentSale: any = null;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // שם מבצע (SALE...)
        if (/^SALE[A-Z0-9]+$/.test(line) || /^sale[a-z0-9]+$/i.test(line)) {
          if (currentSale) results.push(currentSale);
          currentSale = { name: line, discountPercent: null, startDate: null, endDate: null, status: 'active', scope: 'entire_shop', listingCount: null };
        }
        // אחוז הנחה
        else if (currentSale && /(\d+)%\s*off/i.test(line)) {
          const m = line.match(/(\d+)%\s*off/i);
          if (m) currentSale.discountPercent = parseInt(m[1]);
        }
        // תאריכים
        else if (currentSale && /\d{1,2}\/\d{1,2}\/\d{4}/.test(line)) {
          const dates = line.match(/(\d{1,2}\/\d{1,2}\/\d{4})/g);
          if (dates && dates.length >= 2) {
            currentSale.startDate = dates[0];
            currentSale.endDate = dates[1];
          } else if (dates && dates.length === 1) {
            if (!currentSale.startDate) currentSale.startDate = dates[0];
            else currentSale.endDate = dates[0];
          }
        }
        // סטטוס
        else if (currentSale && /^(Active|Scheduled|Ended|Expired)$/i.test(line)) {
          currentSale.status = line.toLowerCase();
        }
      }
      if (currentSale) results.push(currentSale);
      return results;
    }

    // קרא מה-cards
    cards.forEach(card => {
      const text = (card as HTMLElement).innerText || '';
      const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
      const sale: any = { name: null, discountPercent: null, startDate: null, endDate: null, status: 'active', scope: 'entire_shop', listingCount: null };

      for (const line of lines) {
        if (/^SALE[A-Z0-9]+$/i.test(line) && !sale.name) sale.name = line;
        const pct = line.match(/(\d+)%\s*off/i);
        if (pct) sale.discountPercent = parseInt(pct[1]);
        const dates = line.match(/(\d{1,2}\/\d{1,2}\/\d{4})/g);
        if (dates && dates.length >= 2) { sale.startDate = dates[0]; sale.endDate = dates[1]; }
        if (/^(Active|Scheduled|Ended|Expired)$/i.test(line)) sale.status = line.toLowerCase();
        const listing = line.match(/(\d+)\s+listing/i);
        if (listing) sale.listingCount = parseInt(listing[1]);
      }
      if (sale.name || sale.discountPercent) results.push(sale);
    });

    return results;
  }).catch(() => [] as SaleInfo[]);

  // גישה נוספת — חפש links לפרטי מבצע
  const saleLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="sales-discounts/promotion"]'));
    return links.map(a => ({
      href: (a as HTMLAnchorElement).href,
      text: (a as HTMLAnchorElement).innerText?.trim() || ''
    }));
  }).catch(() => [] as any[]);

  log(`  📋 Found ${saleLinks.length} sale links, ${sales.length} parsed sales`);

  // אם יש links ל-promotion pages, נכנס לכל אחד ומוציא פרטים
  if (saleLinks.length > 0 && sales.length === 0) {
    for (const link of saleLinks.slice(0, 10)) {
      try {
        await page.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await new Promise(r => setTimeout(r, 2000));

        const detail = await page.evaluate(() => {
          const text = document.body.innerText || '';
          const pct = text.match(/(\d+)%\s*off/i);
          const nameM = text.match(/Sale name[:\s]+([A-Z0-9]+)/i);
          const dates = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/g);
          const statusM = text.match(/\b(Active|Scheduled|Ended|Expired)\b/i);
          return {
            name: nameM ? nameM[1] : null,
            discountPercent: pct ? parseInt(pct[1]) : null,
            startDate: dates ? dates[0] : null,
            endDate: dates && dates.length > 1 ? dates[1] : null,
            status: statusM ? statusM[1].toLowerCase() : 'active',
            scope: 'entire_shop',
            listingCount: null,
          };
        });
        if (detail.discountPercent || detail.name) {
          sales.push(detail);
          log(`  📦 Sale from detail page: ${JSON.stringify(detail)}`);
        }

        // חזור לרשימה
        await page.goto('https://www.etsy.com/your/shops/me/sales-discounts', {
          waitUntil: 'domcontentloaded', timeout: 20000
        });
        await new Promise(r => setTimeout(r, 2000));
      } catch (e: any) {
        log(`  ⚠️ Could not read sale detail: ${e.message}`);
      }
    }
  }

  return sales;
}

async function checkLoggedIn(page: any): Promise<boolean> {
  const url = page.url();
  if (url.includes('sign_in') || url.includes('login')) return false;

  const isLoggedIn = await page.evaluate(() => {
    const text = document.body.innerText || '';
    // אם יש "Sign in" button ברור או הודעת התחברות → לא מחובר
    const hasSignIn = text.includes('Sign in to Etsy') ||
                      document.querySelector('a[href*="sign_in"]') !== null ||
                      document.querySelector('[data-sign-in]') !== null;
    // אם יש תוכן של Shop Manager → מחובר
    const hasShopManager = text.includes('Sales and discounts') ||
                           text.includes('sales-discounts') ||
                           text.includes('Promotions') ||
                           document.querySelector('[data-shop-id]') !== null;
    return !hasSignIn || hasShopManager;
  }).catch(() => false);

  return isLoggedIn;
}

async function main() {
  const pool = new Pool({ connectionString: PLATFORM_DB });
  const results: any[] = [];

  // שלוף את כל החנויות עם פרופיל AdsPower
  const shopsRes = await pool.query(`
    SELECT s.id, s.display_name, s.etsy_shop_id, s.adspower_profile_id,
           dr.id as rule_id, dr.discount_value, dr.etsy_sale_name, dr.status as rule_status, dr.name as rule_name
    FROM shops s
    LEFT JOIN discount_rules dr ON dr.shop_id = s.id AND dr.is_active = true
    WHERE s.adspower_profile_id IS NOT NULL
    ORDER BY s.id
  `);

  // קבץ לפי shop
  const shopMap = new Map<string, any>();
  for (const row of shopsRes.rows) {
    if (!shopMap.has(row.id)) {
      shopMap.set(row.id, {
        id: row.id,
        display_name: row.display_name,
        etsy_shop_id: row.etsy_shop_id,
        adspower_profile_id: row.adspower_profile_id,
        rules: [],
      });
    }
    if (row.rule_id) {
      shopMap.get(row.id).rules.push({
        id: row.rule_id,
        discount_value: row.discount_value,
        etsy_sale_name: row.etsy_sale_name,
        status: row.rule_status,
        name: row.rule_name,
      });
    }
  }

  const shops = Array.from(shopMap.values());
  log(`\n🚀 Starting discount sync for ${shops.length} shops...\n`);

  for (const shop of shops) {
    const profileId = shop.adspower_profile_id;
    log(`\n📍 Shop: ${shop.display_name} (ID: ${shop.id}, Profile: ${profileId})`);

    const result: any = {
      shopId: shop.id,
      displayName: shop.display_name,
      profileId,
      status: 'unknown',
      activeSales: [],
      dbUpdates: [],
    };

    const wsUrl = await openProfile(profileId);
    if (!wsUrl) {
      result.status = 'profile_open_failed';
      results.push(result);
      continue;
    }

    await new Promise(r => setTimeout(r, 5000 + Math.random() * 3000));

    let browser: any = null;
    try {
      browser = await chromium.connectOverCDP(wsUrl, { timeout: 60000 });
      const context = browser.contexts()[0] || await browser.newContext();
      const existingPages = context.pages();
      let page: any;
      if (existingPages.length > 0) {
        page = existingPages[0];
        await page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
        log(`  🔗 Reusing existing page: ${page.url()}`);
      } else {
        page = await context.newPage();
        await new Promise(r => setTimeout(r, 2000));
      }

      // נווט לדף המבצעים
      await page.goto('https://www.etsy.com/your/shops/me/sales-discounts', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      }).catch(async () => {
        // נסה שוב
        await new Promise(r => setTimeout(r, 3000));
        await page.goto('https://www.etsy.com/your/shops/me/sales-discounts', {
          waitUntil: 'domcontentloaded', timeout: 30000
        }).catch(() => {});
      });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 3000));

      const currentUrl = page.url();
      log(`  🌐 URL: ${currentUrl}`);

      // בדוק אם מחובר
      const loggedIn = await checkLoggedIn(page);
      if (!loggedIn || currentUrl.includes('sign_in') || currentUrl.includes('login')) {
        log(`  🚫 Not logged in — account blocked or session expired. Skipping.`);
        result.status = 'blocked';

        // עדכן בDB שהחנות חסומה
        await pool.query(
          "UPDATE shops SET status = 'blocked' WHERE id = $1",
          [shop.id]
        ).catch(() => {});

        results.push(result);
        continue;
      }

      log(`  ✅ Logged in to Etsy`);
      result.status = 'logged_in';

      // צלם screenshot
      try {
        const sc = await page.screenshot({ type: 'png' });
        fs.writeFileSync(`C:/etsy/sync-${shop.display_name.replace(/[^a-zA-Z0-9]/g, '_')}.png`, sc);
        log(`  📸 Screenshot saved`);
      } catch {}

      // קרא את המבצעים הפעילים
      const activeSales = await readActiveSalesFromEtsy(page);
      result.activeSales = activeSales;
      log(`  📊 Active sales found: ${activeSales.length}`);
      activeSales.forEach(s => log(`     • ${s.name || 'unnamed'}: ${s.discountPercent}% off (${s.status})`));

      // עדכן את ה-DB
      if (activeSales.length > 0) {
        // מצא את המבצע הפעיל (status = active)
        const activeSale = activeSales.find(s => s.status === 'active') || activeSales[0];

        // עדכן discount_rules שיש לחנות
        for (const rule of shop.rules) {
          const updates: string[] = [];
          const params: any[] = [];
          let paramIdx = 1;

          // עדכן etsy_sale_name אם יש שם
          if (activeSale.name && activeSale.name !== rule.etsy_sale_name) {
            updates.push(`etsy_sale_name = $${paramIdx++}`);
            params.push(activeSale.name);
            result.dbUpdates.push(`rule ${rule.id}: etsy_sale_name = ${activeSale.name}`);
          }

          // עדכן discount_value אם שונה
          if (activeSale.discountPercent && activeSale.discountPercent !== rule.discount_value) {
            updates.push(`discount_value = $${paramIdx++}`);
            params.push(activeSale.discountPercent);
            result.dbUpdates.push(`rule ${rule.id}: discount_value = ${activeSale.discountPercent}`);
          }

          // עדכן תאריכים אם יש
          if (activeSale.startDate) {
            updates.push(`start_date = $${paramIdx++}`);
            params.push(activeSale.startDate);
          }
          if (activeSale.endDate) {
            updates.push(`end_date = $${paramIdx++}`);
            params.push(activeSale.endDate);
          }

          // סטטוס
          if (activeSale.status === 'active' && rule.status !== 'active') {
            updates.push(`status = $${paramIdx++}`);
            params.push('active');
          }

          updates.push(`updated_at = NOW()`);

          if (params.length > 0) {
            params.push(rule.id);
            await pool.query(
              `UPDATE discount_rules SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
              params
            ).catch(e => log(`  ⚠️ DB update failed: ${e.message}`));
            log(`  💾 Updated rule ${rule.id} (${rule.name}): ${result.dbUpdates.join(', ')}`);
          }
        }

        // אם אין rule לחנות הזו, צור אחד
        if (shop.rules.length === 0 && activeSale.discountPercent) {
          const saleName = activeSale.name || `SALE_SYNCED_${shop.id}`;
          const newRule = await pool.query(`
            INSERT INTO discount_rules
              (shop_id, name, discount_type, discount_value, scope, etsy_sale_name, status, is_active, updated_at, created_at)
            VALUES ($1, $2, 'percentage', $3, 'entire_shop', $4, 'active', true, NOW(), NOW())
            RETURNING id
          `, [shop.id, `מבצע פעיל - ${shop.display_name}`, activeSale.discountPercent, saleName])
            .catch(e => { log(`  ⚠️ Failed to create rule: ${e.message}`); return null; });

          if (newRule) {
            log(`  ✨ Created new discount_rule ${newRule.rows[0]?.id} for shop ${shop.display_name}`);
            result.dbUpdates.push(`created new rule: ${activeSale.discountPercent}% - ${saleName}`);
          }
        }
      } else {
        // אין מבצעים פעילים
        log(`  ℹ️ No active sales found on Etsy for this shop`);
        result.status = 'no_active_sales';

        // עדכן rules כ-inactive אם הם active בDB אבל אין מבצע ב-Etsy
        for (const rule of shop.rules) {
          if (rule.status === 'active') {
            await pool.query(
              "UPDATE discount_rules SET status = 'paused', is_active = false, updated_at = NOW() WHERE id = $1",
              [rule.id]
            ).catch(() => {});
            log(`  📴 Rule ${rule.id} marked as paused (no active sale on Etsy)`);
            result.dbUpdates.push(`rule ${rule.id}: marked paused`);
          }
        }
      }

    } catch (e: any) {
      log(`  ❌ Error processing shop ${shop.display_name}: ${e.message}`);
      result.status = 'error';
      result.error = e.message;
    } finally {
      if (browser) {
        try { await browser.disconnect(); } catch {}
      }
      await closeProfile(profileId);
      // המתן בין חנויות
      const waitMs = 8000 + Math.random() * 5000;
      log(`  ⏱️ Waiting ${Math.round(waitMs / 1000)}s before next shop...`);
      await new Promise(r => setTimeout(r, waitMs));
    }

    results.push(result);
  }

  // שמור תוצאות
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  log(`\n\n✅ Sync complete! Results saved to ${RESULTS_FILE}`);

  // הצג סיכום
  log('\n====== SUMMARY ======');
  for (const r of results) {
    const emoji = r.status === 'blocked' ? '🚫' :
                  r.status === 'logged_in' ? '✅' :
                  r.status === 'no_active_sales' ? '⚪' :
                  r.status === 'error' ? '❌' : '⚠️';
    log(`${emoji} ${r.displayName} (${r.profileId}): ${r.status} | Sales: ${r.activeSales.length} | Updates: ${r.dbUpdates.length}`);
    if (r.activeSales.length > 0) {
      r.activeSales.forEach((s: any) => log(`   └─ ${s.name || '-'}: ${s.discountPercent}% off (${s.status})`));
    }
  }

  await pool.end();
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
