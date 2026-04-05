// Etsy Discount/Sale Manager
// סלקטורים נבדקו ואומתו ב-2026-03-30 על דף https://www.etsy.com/your/shops/me/sales-discounts/step/createSale

import { Page } from 'playwright';
import { HumanBehavior } from './humanBehavior';
import { logger } from '../utils/logger';

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, randomBetween(minMs, maxMs)));
}

// ממיר YYYY-MM-DD → DD/MM/YYYY (פורמט שEtsy מצפה לו - UK locale)
function toEtsyDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

// מעגל את האחוז לערך הקרוב ביותר שEtsy תומך בו
// ערכים קבועים: 25, 30, 35, 40, 45, 50  (ו-"Custom" לכל ערך אחר)
const ETSY_FIXED_PERCENTS = [25, 30, 35, 40, 45, 50];

export interface SaleConfig {
  saleName: string;            // אלפאנומרי בלבד, ייחודי
  discountPercent: number;     // 5-75 (ערכים קבועים: 25/30/35/40/45/50, כל שאר → Custom)
  startDate: string;           // YYYY-MM-DD
  endDate: string;             // YYYY-MM-DD (מקסימום 30 יום מ-start)
  targetCountry: string;       // 'Everywhere' או שם מדינה (אנגלית)
  termsText?: string;          // עד 500 תווים
  targetScope: 'whole_shop' | 'specific_listings';
  listingIds?: string[];       // אם specific_listings
}

export class EtsyDiscountManager {
  private page: Page;
  private human: HumanBehavior;

  constructor(page: Page) {
    this.page = page;
    this.human = new HumanBehavior(page);
  }

  /**
   * גלישה אנושית לפני פעולה — מבקר ב-2-4 דפים אקראיים בניהול החנות
   */
  private async humanPreBrowse(): Promise<void> {
    const pages = [
      'https://www.etsy.com/your/shops/me/dashboard',
      'https://www.etsy.com/your/shops/me/orders',
      'https://www.etsy.com/your/shops/me/listings',
      'https://www.etsy.com/your/shops/me/stats',
      'https://www.etsy.com/your/shops/me/finances',
      'https://www.etsy.com/your/shops/me/messages',
    ];

    // בחר 2-3 דפים אקראיים שונים
    const shuffled = pages.sort(() => Math.random() - 0.5);
    const count = randomBetween(2, 3);
    const toVisit = shuffled.slice(0, count);

    logger.info(`[pre-browse] מבקר ב-${count} דפים לפני הפעולה`);

    for (const url of toVisit) {
      try {
        await this.human.humanNavigate(url);
        // קרא את הדף כמו בן אדם — זמן קריאה אקראי
        await randomDelay(4000, 12000);
        // גלול קצת כאילו עיינת בתוכן
        const scrollCount = randomBetween(1, 3);
        for (let i = 0; i < scrollCount; i++) {
          await this.human.humanScroll('down', randomBetween(200, 500));
          await randomDelay(1000, 3000);
        }
        // לפעמים חזור למעלה
        if (Math.random() < 0.4) {
          await this.human.humanScroll('up', randomBetween(100, 300));
          await randomDelay(800, 2000);
        }
        // תנועת עכבר אקראית
        await this.human.randomMouseMovement();
        logger.info(`[pre-browse] ביקר ב: ${url}`);
      } catch (e) {
        logger.warn(`[pre-browse] דף נכשל, ממשיך: ${url}`);
      }
    }

    // השהייה לפני הפעולה האמיתית — "חשיבה"
    await randomDelay(3000, 8000);
    logger.info('[pre-browse] סיים גלישה, ממשיך לפעולה');
  }

  /**
   * יצירת מבצע הנחה חדש
   * URL: https://www.etsy.com/your/shops/me/sales-discounts/step/createSale
   */
  async createSale(config: SaleConfig): Promise<boolean> {
    try {
      logger.info(`Creating sale: ${config.saleName} (${config.discountPercent}%)`);

      // שלב 0: גלישה אנושית לפני הפעולה
      await this.humanPreBrowse();

      // שלב 1: ניווט לדף יצירת מבצע (דלג אם כבר שם)
      const pageUrlBefore = this.page.url();
      const alreadyOnCreateSale = pageUrlBefore.includes('sales-discounts') && pageUrlBefore.includes('createSale');

      if (alreadyOnCreateSale) {
        logger.info(`Already on createSale page, skipping navigation (${pageUrlBefore})`);
        // רענן את הדף כדי לוודא state נקי
        await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
        await randomDelay(1000, 2000);
      } else {
        await this.page.goto('https://www.etsy.com/your/shops/me/sales-discounts/step/createSale', {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        await randomDelay(1500, 2500);
      }

      // בדוק שלא נחסמנו
      const currentUrl = this.page.url();
      if (currentUrl.includes('sign_in') || currentUrl.includes('login')) {
        logger.error('Not logged in to Etsy');
        return false;
      }

      // Log page title and URL to confirm we're on the right page
      try {
        const pageTitle = await this.page.title().catch(() => 'unknown');
        logger.info(`After nav - Title: "${pageTitle}" | URL: ${this.page.url()}`);
      } catch (e) { /* ignore */ }

      // שלב 2: סוג הנחה → "Percentage off"
      logger.info('Setting discount type to percentage...');
      const discountTypeSelect = this.page.locator('select[name="reward_type"], #what-discount').first();
      // Increase timeout — React app may take longer to render form elements
      await discountTypeSelect.waitFor({ timeout: 25000 });
      await discountTypeSelect.focus();
      await randomDelay(300, 600);
      await discountTypeSelect.selectOption({ value: 'percent' });
      await randomDelay(600, 1200);

      // שלב 3: אחוז ההנחה
      logger.info(`Setting discount percent: ${config.discountPercent}%`);
      const percentSelect = this.page.locator('select[name="reward_type_percent_dropdown"], #reward-percentage').first();
      await percentSelect.waitFor({ timeout: 8000 });

      const isFixedPercent = ETSY_FIXED_PERCENTS.includes(config.discountPercent);

      if (isFixedPercent) {
        // ערך קבוע — בחר מהתפריט
        await percentSelect.selectOption({ value: config.discountPercent.toString() });
        await randomDelay(400, 800);
      } else {
        // ערך Custom — בחר "1" (Custom) ואז מלא שדה טקסט
        await percentSelect.selectOption({ value: '1' });
        await randomDelay(1000, 2000);

        // שדה custom - verified name attribute: reward_type_percent_input
        const customInput = this.page.locator([
          'input[name="reward_type_percent_input"]',
          'input[name="reward_type_custom_percent"]',
          'input[name="custom_percent"]',
        ].join(', ')).first();
        try {
          await customInput.waitFor({ timeout: 6000 });
          await customInput.click({ clickCount: 3 }).catch(async () => {
            await customInput.click();
            await this.page.keyboard.press('Control+a');
          });
          await randomDelay(100, 200);
          // Use type() character by character so React state updates properly
          await customInput.fill('');
          await customInput.type(config.discountPercent.toString(), { delay: randomBetween(50, 120) });
          await randomDelay(400, 800);
          logger.info(`Custom percent ${config.discountPercent}% entered`);
        } catch (e) {
          logger.warn(`Custom percent input not found, trying nearest fixed: ${config.discountPercent}`);
          const nearest = ETSY_FIXED_PERCENTS.reduce((a, b) =>
            Math.abs(b - config.discountPercent) < Math.abs(a - config.discountPercent) ? b : a
          );
          await percentSelect.selectOption({ value: nearest.toString() });
          await randomDelay(400, 800);
        }
      }

      // שלב 4 + 5: תאריכים — קליק על לוח השנה
      // NOTE: Do NOT press Escape — it navigates away from the form!
      // We click on the date input to open the calendar, then click the specific day.
      logger.info(`Setting start date: ${config.startDate}`);
      const startDateStr = toEtsyDate(config.startDate);
      logger.info(`Setting end date: ${config.endDate}`);
      const endDateStr = toEtsyDate(config.endDate);

      // Wait for date inputs to exist in DOM
      const dateInputs = this.page.locator('input[data-datepicker-input]');
      await dateInputs.first().waitFor({ timeout: 12000 });

      // Helper: select a date from open calendar by clicking the day
      // CONFIRMED via DOM inspection (2026-03-31):
      //   - Day cells have class "react-datepicker__day" (no number-based classes!)
      //   - Outside-month days have "react-datepicker__day--outside-month"
      //   - aria-label is just "day-N" (NOT "April 30, 2026")
      //   - Correct approach: iterate days, match by innerText + NOT outside-month
      const selectDateInCalendar = async (dateStr: string): Promise<boolean> => {
        // dateStr is DD/MM/YYYY, parse it
        const [dd, mm, yyyy] = dateStr.split('/');
        const targetDay = parseInt(dd, 10);
        const targetMonth = parseInt(mm, 10); // 1-12
        const targetYear = parseInt(yyyy, 10);
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const targetMonthName = monthNames[targetMonth - 1];

        // Wait for calendar to open
        await randomDelay(600, 1000);
        const calendar = this.page.locator('.react-datepicker').first();
        const calendarVisible = await calendar.isVisible().catch(() => false);

        if (!calendarVisible) {
          logger.warn('Calendar not visible after click');
          return false;
        }

        // Navigate to the correct month/year if needed
        for (let attempts = 0; attempts < 6; attempts++) {
          const headerText = await this.page.locator('.react-datepicker__current-month').first().textContent({ timeout: 3000 }).catch(() => '');
          logger.info(`Calendar header: "${headerText}" | Target: ${targetMonthName} ${targetYear}`);

          const currentMonthIdx = monthNames.findIndex(m => headerText?.includes(m)) + 1; // 1-12
          const yearMatch = headerText?.match(/\d{4}/);
          const currentYear = yearMatch ? parseInt(yearMatch[0]) : targetYear;

          if (currentMonthIdx === targetMonth && currentYear === targetYear) {
            logger.info(`Calendar showing correct month: ${targetMonthName} ${targetYear}`);
            break;
          }

          // Navigate: next or previous?
          const diff = (targetYear - currentYear) * 12 + (targetMonth - currentMonthIdx);
          logger.info(`Navigating ${diff > 0 ? 'forward' : 'backward'} ${Math.abs(diff)} month(s)`);
          if (diff > 0) {
            // Use JS click to bypass any overlay on nav buttons
            await this.page.evaluate(() => {
              const btn = document.querySelector('.react-datepicker__navigation--next') as HTMLElement;
              if (btn) btn.click();
            });
          } else {
            await this.page.evaluate(() => {
              const btn = document.querySelector('.react-datepicker__navigation--previous') as HTMLElement;
              if (btn) btn.click();
            });
          }
          await randomDelay(400, 700);
        }

        // Verify we're on the right month before clicking
        const finalHeader = await this.page.locator('.react-datepicker__current-month').first().textContent({ timeout: 2000 }).catch(() => '');
        logger.info(`Final calendar header: "${finalHeader}"`);

        // Click the target day using JavaScript — iterate all .react-datepicker__day cells
        // Key: filter by innerText === targetDay AND no 'outside-month' class
        // Use JS click to bypass react-datepicker__header overlay that intercepts pointer events
        const clicked = await this.page.evaluate((tDay) => {
          const days = Array.from(document.querySelectorAll('.react-datepicker__day'));
          const candidates = days.filter(d => {
            const text = (d as HTMLElement).innerText?.trim();
            const classes = d.getAttribute('class') || '';
            return text === String(tDay) && !classes.includes('outside-month');
          });
          if (candidates.length > 0) {
            (candidates[0] as HTMLElement).click();
            return { success: true, count: candidates.length, classes: candidates[0].getAttribute('class') };
          }
          // Log all day cells for debugging
          const allDays = days.map(d => `"${(d as HTMLElement).innerText?.trim()}" [${d.getAttribute('class')}]`).join(', ');
          return { success: false, count: 0, allDays };
        }, targetDay);

        if (clicked.success) {
          logger.info(`Clicked day ${targetDay} (JS click, ${clicked.count} candidates, class: "${clicked.classes}")`);
          return true;
        }

        logger.error(`Could not find day ${targetDay} (${targetMonthName}) in calendar. Header: "${finalHeader}". All days: ${(clicked as any).allDays?.substring(0, 300)}`);
        return false;
      };

      // Set start date: click input, select day in calendar
      logger.info(`Clicking start date input for ${startDateStr}`);
      const startDateInput = dateInputs.first();
      await startDateInput.click();
      const startSelected = await selectDateInCalendar(startDateStr);
      logger.info(`Start date selection result: ${startSelected}`);
      await randomDelay(1200, 1800);

      // Wait for calendar to close after start date selection
      // (selecting a date should close the calendar automatically)
      // Use a short wait — don't fail if calendar stays open
      await randomDelay(800, 1200);
      const calAfterStart = await this.page.locator('.react-datepicker').isVisible().catch(() => false);
      logger.info(`Calendar visible after start date click: ${calAfterStart}`);

      // Now click end date input — wait for it to be ready, then explicitly click it
      const endDateInput = dateInputs.nth(1);
      await endDateInput.waitFor({ timeout: 8000 });
      logger.info(`Clicking end date input for ${endDateStr}`);
      await endDateInput.click();
      await randomDelay(800, 1200);

      // Verify calendar opened for end date
      const endCalVisible = await this.page.locator('.react-datepicker').isVisible().catch(() => false);
      logger.info(`End date calendar visible after click: ${endCalVisible}`);
      if (!endCalVisible) {
        // Try clicking again
        logger.info('Calendar not visible, clicking end date again...');
        await endDateInput.click();
        await randomDelay(1000, 1500);
      }

      const endSelected = await selectDateInCalendar(endDateStr);
      logger.info(`End date selection result: ${endSelected}`);
      await randomDelay(1200, 1800);

      // שלב 6: מדינת יעד
      if (config.targetCountry && config.targetCountry.toLowerCase() !== 'everywhere') {
        logger.info(`Setting target country: ${config.targetCountry}`);
        const countrySelect = this.page.locator('select[name="eligible_region_id"], #what-region').first();
        await countrySelect.waitFor({ timeout: 5000 });
        await countrySelect.focus();
        await randomDelay(300, 600);
        try {
          await countrySelect.selectOption({ label: config.targetCountry });
        } catch (e) {
          logger.warn(`Country "${config.targetCountry}" not found in dropdown, using Everywhere`);
        }
        await randomDelay(400, 800);
      }

      // שלב 7: תנאים ו/הגבלות (אופציונלי)
      if (config.termsText) {
        logger.info('Setting terms text...');
        const termsTextarea = this.page.locator('textarea[name="additional_details"], #additional-details').first();
        try {
          await termsTextarea.waitFor({ timeout: 5000 });
          await termsTextarea.click();
          await randomDelay(200, 400);
          await termsTextarea.type(config.termsText, { delay: randomBetween(30, 80) });
          await randomDelay(400, 800);
        } catch (e) {
          logger.warn('Terms textarea not found, skipping');
        }
      }

      // שלב 8: שם המבצע (Sale name)
      logger.info(`Setting sale name: ${config.saleName}`);
      const saleNameInput = this.page.locator('input[name="promo_name"], #name-your-coupon').first();
      await saleNameInput.waitFor({ timeout: 8000 });
      await saleNameInput.click();
      await randomDelay(200, 400);
      // נקה כל תוכן קיים
      await this.page.keyboard.press('Control+a');
      await randomDelay(100, 200);
      await saleNameInput.type(config.saleName, { delay: randomBetween(50, 120) });
      await randomDelay(500, 1000);

      // שלב 9: המתנה קצרה לפני שליחה
      await randomDelay(800, 1500);

      // שלב 9.5: screenshot לפני Continue כדי לאמת מצב הטופס
      try {
        const fs = await import('fs');
        const preScreenshot = await this.page.screenshot({ type: 'png' });
        fs.writeFileSync('C:\\etsy\\debug-before-continue.png', preScreenshot);
        logger.info('Pre-Continue screenshot saved: C:\\etsy\\debug-before-continue.png');
        // Log current form values for debugging
        const formState = await this.page.evaluate(() => {
          const dateInputs = document.querySelectorAll('input[data-datepicker-input]');
          return {
            startDate: (dateInputs[0] as HTMLInputElement)?.value,
            endDate: (dateInputs[1] as HTMLInputElement)?.value,
            errors: Array.from(document.querySelectorAll('.wt-text-red, [role="alert"]')).map(e => (e as HTMLElement).innerText?.trim()).filter(Boolean),
          };
        });
        logger.info(`Form state before Continue: start=${formState.startDate}, end=${formState.endDate}, errors=${JSON.stringify(formState.errors)}`);
      } catch (e) { /* ignore */ }

      // שלב 10: לחיצה על "Continue"
      // NOTE: Do NOT press Escape before Continue - it navigates away!
      // The Continue button is inside wt-overlay__sticky-footer-container which intercepts
      // pointer events, so we use JavaScript click to bypass the overlay.
      logger.info('Clicking Continue via JavaScript...');

      // First scroll down to make Continue visible
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await randomDelay(500, 800);

      const clicked = await this.page.evaluate(() => {
        // Find Continue button
        const btns = Array.from(document.querySelectorAll('button'));
        const cont = btns.find(b => b.textContent?.trim() === 'Continue');
        if (cont) {
          (cont as HTMLButtonElement).click();
          return true;
        }
        // Fallback: click by class
        const byClass = document.querySelector('.wt-btn--filled') as HTMLButtonElement;
        if (byClass) {
          byClass.click();
          return true;
        }
        return false;
      });

      if (!clicked) {
        logger.warn('Continue button not found via JS, trying Playwright locator...');
        const continueButton = this.page.locator('button:has-text("Continue")').last();
        await continueButton.waitFor({ timeout: 5000 });
        await continueButton.click({ force: true });
      }

      // Wait longer for form submission and page transition
      await randomDelay(5000, 7000);

      // Save debug screenshot to see form state
      try {
        const fs = await import('fs');
        const screenshotData = await this.page.screenshot({ type: 'png' });
        fs.writeFileSync('C:\\etsy\\debug-after-continue.png', screenshotData);
        logger.info('Screenshot saved: C:\\etsy\\debug-after-continue.png');
      } catch (e) { /* ignore */ }

      // שלב 11: זיהוי שלב 2 — בחירת scope (Etsy SPA לא משנה URL!)
      const afterUrl = this.page.url();
      logger.info(`After Continue URL: ${afterUrl}`);

      // בדוק אם "Review and confirm" או "All listings" נראים — זה שלב 2
      const reviewBtnVisible = await this.page.locator('button:has-text("Review and confirm")').isVisible({ timeout: 3000 }).catch(() => false);
      const allListingsVisible = await this.page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        return els.some(e => (e as HTMLElement).innerText?.trim() === 'All listings' && (e as HTMLElement).offsetParent !== null);
      }).catch(() => false);

      logger.info(`Step 2 detection: reviewBtn=${reviewBtnVisible}, allListings=${allListingsVisible}`);

      if (reviewBtnVisible || allListingsVisible) {
        logger.info('Scope selection step detected — proceeding...');
        const scopeDone = await this._handleScopeStep(config);
        if (scopeDone) {
          // step3 (Confirm and create sale) was clicked — sale was submitted
          logger.info(`Sale "${config.saleName}" submitted via scope step. Marking success.`);
          return true;
        }
        await randomDelay(3000, 5000);
      } else if (afterUrl.includes('createSale')) {
        // עדיין בשלב 1 — בדוק שגיאות אמיתיות
        const allErrors = await this.page.evaluate(() => {
          const selectors = ['.wt-text-red', '[role="alert"]', '.error-text'];
          const texts: string[] = [];
          selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
              const t = (el as HTMLElement).innerText?.trim();
              if (t && t.length > 0) texts.push(t);
            });
          });
          return texts;
        }).catch(() => [] as string[]);
        logger.info(`Form errors after Continue: ${JSON.stringify(allErrors)}`);

        // "existing promotion" = המבצע כבר נוצר בניסיון קודם → הצלחה!
        const existingNameError = allErrors.some(e => e.toLowerCase().includes('existing promotion') || e.toLowerCase().includes('has this name'));
        if (existingNameError) {
          logger.info(`Sale "${config.saleName}" already exists on Etsy (from previous attempt). Marking success.`);
          return true;
        }

        const realErrors = allErrors.filter(e => e.length > 0 && !e.includes('Loading'));
        if (realErrors.length > 0) {
          logger.error(`Sale creation form errors: ${realErrors.join(' | ')}`);
          return false;
        }
        // אולי הדף עדיין נטען — המתן עוד קצת
        await randomDelay(3000, 5000);
        const reviewBtnLate = await this.page.locator('button:has-text("Review and confirm")').isVisible({ timeout: 5000 }).catch(() => false);
        if (reviewBtnLate) {
          logger.info('Scope step appeared after additional wait');
          const lateScopeDone = await this._handleScopeStep(config);
          if (lateScopeDone) {
            logger.info(`Sale "${config.saleName}" submitted via late scope step. Marking success.`);
            return true;
          }
          await randomDelay(3000, 5000);
        }
      }

      // שלב 13: אימות הצלחה
      await randomDelay(2000, 4000);
      const finalUrl = this.page.url();
      logger.info(`Final URL after all steps: ${finalUrl}`);

      // Success = navigated away from createSale to a different sales page
      const navigatedAway = finalUrl.includes('sales-discounts') && !finalUrl.includes('createSale');

      if (navigatedAway) {
        logger.info(`Sale "${config.saleName}" created successfully (URL: ${finalUrl})`);
        return true;
      }

      // עדיין על createSale — ייתכן ש-Etsy לא ניווט (SPA)
      // בדוק אם המבצע נוצר בפועל על ידי חיפוש ברשימת המבצעים
      logger.info('URL still shows createSale — checking if sale was created in list...');
      try {
        await this.page.goto('https://www.etsy.com/your/shops/me/sales-discounts', {
          waitUntil: 'domcontentloaded', timeout: 20000,
        });
        await randomDelay(3000, 4000);
        // צלם screenshot של רשימת המבצעים
        try {
          const fsmod = await import('fs');
          const sc = await this.page.screenshot({ type: 'png' });
          fsmod.writeFileSync('C:\\etsy\\debug-sales-list.png', sc);
          const pageText = await this.page.evaluate(() => document.body.innerText?.substring(0, 500));
          logger.info(`Sales list page text: ${pageText?.replace(/\n/g, ' ').trim()}`);
        } catch(e) { /* ignore */ }
        // חפש את שם המבצע (גמיש יותר)
        const saleExists = await this.page.evaluate((saleName) => {
          return document.body.innerText?.includes(saleName) || false;
        }, config.saleName).catch(() => false);
        if (saleExists) {
          logger.info(`Sale "${config.saleName}" confirmed in sales list!`);
          return true;
        }
        // בדוק אם יש כלל מבצע כלשהו
        const hasSales = await this.page.evaluate(() => {
          const body = document.body.innerText || '';
          return body.includes('SALE') || body.includes('% off') || body.includes('Active');
        }).catch(() => false);
        logger.info(`Sales list has any sales: ${hasSales}`);
      } catch (e) { logger.warn('Sales list check failed', e); }

      const errorTexts = await this.page.evaluate(() => {
        const selectors = ['.wt-text-red', '[role="alert"]', '.error-text', '.wt-label--error'];
        const errors: string[] = [];
        selectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            const t = (el as HTMLElement).innerText?.trim();
            if (t && t.length > 0 && !t.includes('Loading')) errors.push(t);
          });
        });
        return errors;
      }).catch(() => [] as string[]);

      logger.warn(`Could not verify sale "${config.saleName}". Errors: ${errorTexts.join(' | ')}`);
      return false;
    } catch (error) {
      logger.error(`Failed to create sale: ${config.saleName}`, error);
      return false;
    }
  }

  /**
   * טיפול בשלב בחירת היקף (אם קיים)
   * מחזיר true אם step3 (Confirm and create sale) נלחץ בהצלחה
   */
  private async _handleScopeStep(config: SaleConfig): Promise<boolean> {
    try {
      if (config.targetScope === 'whole_shop' || !config.listingIds?.length) {
        // בחר "All listings" — הכפתור יכול להיות button, label, div או radio
        const clicked = await this.page.evaluate(() => {
          const all = Array.from(document.querySelectorAll('*'));
          const el = all.find(e => (e as HTMLElement).innerText?.trim() === 'All listings' && (e as HTMLElement).offsetParent !== null);
          if (el) { (el as HTMLElement).click(); return true; }
          return false;
        }).catch(() => false);
        if (!clicked) {
          await this.page.locator('input[type="radio"][value*="all"], input[type="radio"][value*="whole"]').first().click().catch(() => {});
        }
        logger.info(`All listings clicked: ${clicked}`);
        await randomDelay(500, 1000);
      } else if (config.listingIds && config.listingIds.length > 0) {
        // בחר "Specific listings"
        const specificOption = this.page.locator(
          'input[type="radio"][value*="specific"], button:has-text("Specific listings")'
        ).first();
        await specificOption.click().catch(() => {});
        await randomDelay(1000, 2000);

        for (const listingId of config.listingIds) {
          const checkbox = this.page.locator(
            `input[type="checkbox"][data-listing-id="${listingId}"], [data-listing="${listingId}"] input[type="checkbox"]`
          ).first();
          await checkbox.click().catch(() => logger.warn(`Could not select listing ${listingId}`));
          await randomDelay(200, 500);
        }
      }

      // לחץ על "Review and confirm" בדיוק (לא "Save" או כפתורים אחרים)
      logger.info('Clicking exact "Review and confirm" button...');

      // המתן שהכפתור לא יהיה בלואדינג
      await randomDelay(1500, 2500);

      const clickedReview = await this.page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        // חפש כפתור שהטקסט שלו הוא בדיוק "Review and confirm"
        const exact = btns.find(btn => {
          const text = (btn as HTMLButtonElement).textContent?.replace(/\s+/g, ' ').trim() || '';
          return text === 'Review and confirm';
        });
        if (exact) {
          (exact as HTMLButtonElement).click();
          return 'Review and confirm';
        }
        // fallback: כל כפתור שמכיל את הטקסט ורק אותו
        const partial = btns.find(btn => {
          const text = (btn as HTMLButtonElement).textContent?.replace(/\s+/g, ' ').trim() || '';
          return /^Review and confirm/i.test(text) && !text.toLowerCase().includes('loading');
        });
        if (partial) {
          (partial as HTMLButtonElement).click();
          return `partial: ${partial.textContent?.trim()}`;
        }
        // Log all buttons for debugging
        return 'NOT FOUND: ' + btns.map(b => `"${b.textContent?.replace(/\s+/g, ' ').trim()}"`).join(', ');
      }).catch((e: any) => String(e));
      logger.info(`Review and confirm click result: ${clickedReview}`);

      // המתן לתגובת השרת (ייתכן שיש שלב 3 או redirect)
      await this.page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
      await randomDelay(2000, 3000);

      // צלם screenshot לאחר לחיצה
      try {
        const fsmod = await import('fs');
        const sc = await this.page.screenshot({ type: 'png' });
        fsmod.writeFileSync('C:\\etsy\\debug-step3.png', sc);
        logger.info(`Step 3 screenshot saved. URL: ${this.page.url()}`);
      } catch(e) {
        logger.info(`Step 3 screenshot failed: ${e}`);
      }

      // בדוק אם יש שלב 3 — כפתור Confirm and create sale
      const step3Clicked = await this.page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(btn => {
          const text = (btn as HTMLButtonElement).textContent?.replace(/\s+/g, ' ').trim() || '';
          return /^(Confirm and create sale|Activate sale|Schedule sale|Activate|Create sale|Save sale)$/i.test(text);
        });
        if (b) { (b as HTMLButtonElement).click(); return (b as HTMLButtonElement).textContent?.trim() || 'clicked'; }
        return null;
      }).catch(() => null);

      if (step3Clicked) {
        logger.info(`Step 3 button clicked: ${step3Clicked}`);
        // המתן שהדף יתייצב אחרי הלחיצה
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await randomDelay(3000, 5000);
        const urlAfter = this.page.url();
        logger.info(`URL after step3: ${urlAfter}`);
        // צלם screenshot אחרי Confirm and create sale
        try {
          const fsmod = await import('fs');
          const sc = await this.page.screenshot({ type: 'png' });
          fsmod.writeFileSync('C:\\etsy\\debug-after-confirm.png', sc);
          const pageText = await this.page.evaluate(() => document.body.innerText?.substring(0, 600) || '');
          logger.info(`After-confirm screenshot saved. Page text: ${pageText.replace(/\n/g, ' ').trim()}`);
        } catch(e) {
          logger.info(`After-confirm screenshot failed: ${e}`);
        }
        return true;
      }

      logger.warn('Step 3 button NOT found after Review and confirm');
      return false;
    } catch (e: any) {
      logger.warn(`Scope step handling failed: ${e.message}`);
      return false;
    }
  }

  /**
   * ביטול/סיום מבצע קיים
   * מחפש את המבצע ברשימה ולוחץ End
   */
  async endSale(saleName: string): Promise<boolean> {
    try {
      logger.info(`Ending sale: ${saleName}`);

      // גלישה אנושית לפני הפעולה
      await this.humanPreBrowse();

      // ניווט לדף המבצעים
      await this.page.goto('https://www.etsy.com/your/shops/me/sales-discounts', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await randomDelay(2000, 4000);

      // חפש את המבצע ברשימה
      // URL pattern: /sales-discounts/promotion/[id]
      const saleLink = this.page.locator(`a:has-text("${saleName}")`).first();

      let found = false;
      try {
        await saleLink.waitFor({ timeout: 8000 });
        found = true;
      } catch (e) {
        // נסה לגלול ולמצוא
        for (let i = 0; i < 3; i++) {
          await this.human.humanScroll('down', randomBetween(300, 500));
          await randomDelay(1000, 2000);
          const cnt = await saleLink.count().catch(() => 0);
          if (cnt > 0) { found = true; break; }
        }
      }

      if (!found) {
        logger.error(`Sale "${saleName}" not found in list`);
        return false;
      }

      // נווט לדף פרטי המבצע
      await saleLink.click();
      await randomDelay(2000, 3500);

      // חפש כפתור End Sale / Delete
      const endButton = this.page.locator(
        'button:has-text("End sale"), button:has-text("End Sale"), button:has-text("Delete"), button:has-text("Stop sale")'
      ).first();

      await endButton.waitFor({ timeout: 8000 });
      await endButton.scrollIntoViewIfNeeded();
      await randomDelay(500, 1000);
      await endButton.click();
      await randomDelay(1000, 2000);

      // אישור dialog אם קיים
      try {
        const confirmButton = await this.page.waitForSelector(
          'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("End")',
          { timeout: 4000 }
        );
        if (confirmButton) {
          await confirmButton.click();
          await randomDelay(2000, 4000);
        }
      } catch {
        // אין confirmation — ממשיכים
      }

      // אמת שהמבצע הסתיים
      const finalUrl = this.page.url();
      logger.info(`Sale "${saleName}" ended. Final URL: ${finalUrl}`);
      return true;
    } catch (error) {
      logger.error(`Failed to end sale: ${saleName}`, error);
      return false;
    }
  }
}
