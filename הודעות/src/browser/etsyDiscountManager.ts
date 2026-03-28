// Etsy Discount Manager
// הערה: הסלקטורים הם PLACEHOLDERS — צריך להריץ inspect-selectors.ts לעדכן
// כל האינטראקציות עוברות דרך HumanBehavior לתנועה אנושית מלאה

import { Page } from 'playwright';
import { HumanBehavior } from './humanBehavior';
import { logger } from '../utils/logger';

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, randomBetween(minMs, maxMs)));
}

export interface DiscountConfig {
  saleName: string;
  discountPercent: number;
  targetScope: 'whole_shop' | 'specific_listings';
  listingIds?: string[];
  targetCountry: string;
  termsText?: string;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
}

export interface ExistingSale {
  name: string;
  percent: number;
  status: 'active' | 'scheduled' | 'ended';
  startDate?: string;
  endDate?: string;
}

export class EtsyDiscountManager {
  private page: Page;
  private human: HumanBehavior;
  private shopName: string;

  // TODO: עדכן סלקטורים אחרי inspect-selectors.ts
  private static SELECTORS = {
    salesPage: 'https://www.etsy.com/your/shops/me/sales-and-coupons',
    createSaleBtn: 'a:has-text("Create a sale"), button:has-text("Create a sale"), [data-create-sale]',
    saleNameInput: 'input[name="sale_name"], input[placeholder*="sale name"], [data-sale-name-input]',
    discountInput: 'input[name="discount_percent"], input[type="number"][placeholder*="percent"], [data-discount-input]',
    wholeShopRadio: 'input[value="whole_shop"], label:has-text("Whole shop"), [data-scope-whole]',
    specificListingsRadio: 'input[value="specific"], label:has-text("Specific listings"), [data-scope-specific]',
    countrySelect: 'select[name="country"], [data-country-select]',
    termsInput: 'textarea[name="terms"], input[name="terms"], [data-terms-input]',
    startDateInput: 'input[name="start_date"], input[type="date"]:first-of-type, [data-start-date]',
    endDateInput: 'input[name="end_date"], input[type="date"]:last-of-type, [data-end-date]',
    submitBtn: 'button[type="submit"]:has-text("Create"), button:has-text("Save"), [data-submit-sale]',
    endSaleBtn: 'button:has-text("End sale"), button:has-text("Deactivate"), [data-end-sale]',
    confirmEndBtn: 'button:has-text("Confirm"), button:has-text("Yes"), [data-confirm-end]',
    activeSaleCards: '.sale-card, [data-sale-id], .promotion-card',
    successIndicator: '.success-message, [data-success], .wt-alert--success',
  };

  constructor(page: Page, shopName: string) {
    this.page = page;
    this.human = new HumanBehavior(page);
    this.shopName = shopName;
  }

  /**
   * ניווט לדף המבצעים
   */
  async navigateToSalesPage(): Promise<void> {
    logger.info('Navigating to sales & coupons page...');
    await this.human.humanNavigate(EtsyDiscountManager.SELECTORS.salesPage);
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await randomDelay(2000, 4000);
    await this.human.randomMouseMovement();
    await this.human.humanScroll('down', randomBetween(100, 300));
    logger.info('Arrived at sales page');
  }

  /**
   * סריקת מבצעים קיימים
   */
  async scrapeExistingSales(): Promise<ExistingSale[]> {
    await this.human.humanScroll('down', randomBetween(200, 400));
    await randomDelay(1000, 2000);

    const sales = await this.page.evaluate((selector: string) => {
      const saleElements = document.querySelectorAll(selector);
      return Array.from(saleElements).map(el => {
        const nameEl = el.querySelector('.sale-name, [data-sale-name], h3, h4');
        const percentEl = el.querySelector('.sale-percent, [data-discount], .discount-value');
        const statusEl = el.querySelector('.sale-status, [data-status], .badge');
        const startEl = el.querySelector('[data-start-date], .start-date');
        const endEl = el.querySelector('[data-end-date], .end-date');

        let percent = 0;
        const percentText = percentEl?.textContent || '';
        const match = percentText.match(/(\d+)/);
        if (match) percent = parseInt(match[1]);

        let status: 'active' | 'scheduled' | 'ended' = 'active';
        const statusText = (statusEl?.textContent || '').toLowerCase();
        if (statusText.includes('scheduled') || statusText.includes('upcoming')) status = 'scheduled';
        if (statusText.includes('ended') || statusText.includes('expired')) status = 'ended';

        return {
          name: nameEl?.textContent?.trim() || '',
          percent,
          status,
          startDate: startEl?.textContent?.trim(),
          endDate: endEl?.textContent?.trim(),
        };
      });
    }, EtsyDiscountManager.SELECTORS.activeSaleCards);

    logger.info(`Found ${sales.length} existing sales`);
    return sales;
  }

  /**
   * יצירת מבצע חדש
   */
  async createSale(config: DiscountConfig): Promise<boolean> {
    try {
      logger.info(`Creating sale: ${config.saleName} (${config.discountPercent}%)`);

      const currentUrl = this.page.url();
      if (!currentUrl.includes('sales-and-coupons')) {
        await this.navigateToSalesPage();
      }

      // לחיצה על "Create a sale"
      await this.human.humanClick(EtsyDiscountManager.SELECTORS.createSaleBtn);
      await randomDelay(2000, 4000);
      await this.human.randomMouseMovement();

      // שם המבצע
      await this.human.humanType(EtsyDiscountManager.SELECTORS.saleNameInput, config.saleName);
      await randomDelay(500, 1500);

      // אחוז הנחה
      await this.human.humanType(
        EtsyDiscountManager.SELECTORS.discountInput,
        config.discountPercent.toString()
      );
      await randomDelay(500, 1000);

      // היקף — כל החנות או מוצרים ספציפיים
      if (config.targetScope === 'whole_shop') {
        await this.human.humanClick(EtsyDiscountManager.SELECTORS.wholeShopRadio);
      } else {
        await this.human.humanClick(EtsyDiscountManager.SELECTORS.specificListingsRadio);
        await randomDelay(1000, 2000);
        // בחירת מוצרים ספציפיים
        if (config.listingIds && config.listingIds.length > 0) {
          await this.selectSpecificListings(config.listingIds);
        }
      }
      await randomDelay(500, 1500);

      // מדינת יעד
      if (config.targetCountry !== 'Everywhere') {
        try {
          await this.page.selectOption(
            EtsyDiscountManager.SELECTORS.countrySelect,
            { label: config.targetCountry }
          );
          await randomDelay(500, 1000);
        } catch {
          logger.warn(`Could not set country to ${config.targetCountry}, using default`);
        }
      }

      // תנאים
      if (config.termsText) {
        await this.human.humanType(EtsyDiscountManager.SELECTORS.termsInput, config.termsText);
        await randomDelay(500, 1000);
      }

      // תאריכים
      await this.setDateField(EtsyDiscountManager.SELECTORS.startDateInput, config.startDate);
      await randomDelay(500, 1000);
      await this.setDateField(EtsyDiscountManager.SELECTORS.endDateInput, config.endDate);
      await randomDelay(1000, 2000);

      // חשיבה לפני שליחה
      await this.human.thinkBeforeSending();
      await this.human.humanScroll('down', randomBetween(100, 200));

      // שליחה
      await this.human.humanClick(EtsyDiscountManager.SELECTORS.submitBtn);
      await randomDelay(3000, 6000);

      // אימות הצלחה
      const success = await this.verifySuccess();
      if (success) {
        logger.info(`Sale "${config.saleName}" created successfully`);
      } else {
        logger.warn('Could not verify sale creation — may still have succeeded');
      }

      return success;
    } catch (error) {
      logger.error(`Failed to create sale "${config.saleName}"`, error);
      return false;
    }
  }

  /**
   * סיום מבצע קיים
   */
  async endSale(saleName: string): Promise<boolean> {
    try {
      logger.info(`Ending sale: ${saleName}`);

      const currentUrl = this.page.url();
      if (!currentUrl.includes('sales-and-coupons')) {
        await this.navigateToSalesPage();
      }

      await this.human.humanScroll('down', randomBetween(200, 400));
      await randomDelay(1000, 2000);

      // מציאת המבצע לפי שם
      const saleCards = await this.page.$$(EtsyDiscountManager.SELECTORS.activeSaleCards);
      let targetCard = null;

      for (const card of saleCards) {
        const cardText = await card.evaluate(el => el.textContent || '');
        if (cardText.includes(saleName)) {
          targetCard = card;
          break;
        }
      }

      if (!targetCard) {
        logger.error(`Sale "${saleName}" not found`);
        return false;
      }

      await targetCard.scrollIntoViewIfNeeded();
      await randomDelay(800, 1500);

      // לחיצה על End sale
      const endBtn = await targetCard.$(
        'button:has-text("End"), button:has-text("Deactivate"), [data-end-sale]'
      );
      if (!endBtn) {
        logger.error('End sale button not found');
        return false;
      }

      await this.human.humanClick(EtsyDiscountManager.SELECTORS.endSaleBtn);
      await randomDelay(1000, 2000);

      // אישור
      await this.human.thinkBeforeSending();
      await this.human.humanClick(EtsyDiscountManager.SELECTORS.confirmEndBtn);
      await randomDelay(2000, 4000);

      const success = await this.verifySuccess();
      if (success) {
        logger.info(`Sale "${saleName}" ended successfully`);
      }

      return success;
    } catch (error) {
      logger.error(`Failed to end sale "${saleName}"`, error);
      return false;
    }
  }

  /**
   * בחירת מוצרים ספציפיים — helper
   */
  private async selectSpecificListings(listingIds: string[]): Promise<void> {
    for (const listingId of listingIds) {
      const checkboxSelector = `input[value="${listingId}"], [data-listing-id="${listingId}"] input[type="checkbox"]`;
      try {
        await this.human.humanClick(checkboxSelector);
        await randomDelay(300, 800);
      } catch {
        logger.warn(`Could not select listing ${listingId}`);
      }
    }
  }

  /**
   * הזנת תאריך בשדה — helper
   */
  private async setDateField(selector: string, dateStr: string): Promise<void> {
    try {
      await this.page.evaluate(
        ({ sel, val }: { sel: string; val: string }) => {
          const input = document.querySelector(sel) as HTMLInputElement;
          if (input) {
            input.value = val;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        },
        { sel: selector, val: dateStr }
      );
    } catch {
      // fallback — הקלדה ידנית
      await this.human.humanType(selector, dateStr);
    }
  }

  /**
   * אימות הצלחה — helper
   */
  private async verifySuccess(): Promise<boolean> {
    try {
      await this.page.waitForSelector(
        EtsyDiscountManager.SELECTORS.successIndicator,
        { timeout: 5000 }
      );
      return true;
    } catch {
      // בדיקה חלופית — URL השתנה או אין הודעת שגיאה
      const errorEl = await this.page.$('.error-message, [data-error], .wt-alert--error');
      return !errorEl;
    }
  }
}
