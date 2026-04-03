import { Page } from 'playwright';
import { HumanBehavior } from './humanBehavior';
import { logger } from '../utils/logger';

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomDelay(minMs: number, maxMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, randomBetween(minMs, maxMs)));
}

export interface ConversationLink {
  url: string;
  buyerName: string;
}

/**
 * InboxScraper — סורק את דף ההודעות הראשי של Etsy
 * ומחזיר רשימה של כל השיחות הקיימות.
 * משמש רק בסריקה ידנית (כשמבקשים לסרוק את כל החנויות).
 */
export class InboxScraper {
  private page: Page;
  private human: HumanBehavior;

  constructor(page: Page) {
    this.page = page;
    this.human = new HumanBehavior(page);
  }

  /**
   * סורק את כל השיחות בדף ההודעות של החנות.
   * @param withWarmUp אם true — גולש בעמודים לפני הכניסה
   */
  async scrapeAllConversations(withWarmUp = true): Promise<ConversationLink[]> {
    if (withWarmUp) {
      logger.info('[InboxScraper] מתחיל חימום לפני סריקת תיבת הדואר...');
      await this.human.warmUpBrowsing();
    }

    logger.info('[InboxScraper] נכנס לדף ההודעות הראשי...');
    await this.page.goto('https://www.etsy.com/messages', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await randomDelay(2500, 4500);

    const currentUrl = this.page.url();
    if (currentUrl.includes('/signin') || currentUrl.includes('/login')) {
      throw new Error('ETSY_NOT_LOGGED_IN: Redirected to login page');
    }

    // ממתין שרשימת השיחות תיטען
    const listLoaded = await this.page
      .waitForSelector('[data-appears-component-name="inbox_conversation_list_item"], a[href*="/messages/"]', {
        timeout: 20000,
      })
      .then(() => true)
      .catch(() => false);

    if (!listLoaded) {
      logger.warn('[InboxScraper] לא נמצאה רשימת שיחות בדף — אולי אין הודעות');
      return [];
    }

    await this.human.randomMouseMovement();
    await randomDelay(1000, 2000);

    const conversations: ConversationLink[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      logger.info(`[InboxScraper] סורק עמוד ${page} של השיחות...`);

      // איסוף קישורי השיחות מהדף הנוכחי
      const pageLinks = await this.page.evaluate(() => {
        const results: { url: string; buyerName: string }[] = [];

        // מילות אקססיביליטי שאסור לקחת כשם קונה
        const GARBAGE_PATTERNS = [
          'read message', 'unread message', 'mark as read', 'mark as unread',
          'new message', 'open message', 'inbox',
        ];
        function isGarbage(text: string): boolean {
          const lower = text.toLowerCase().trim();
          return GARBAGE_PATTERNS.some(g => lower === g || lower.startsWith(g));
        }

        // אסטרטגיה 1: לינקים לשיחות ספציפיות
        const links = document.querySelectorAll('a[href*="/messages/"]');
        links.forEach(link => {
          const href = (link as HTMLAnchorElement).href;
          if (!href || !href.match(/\/messages\/\d+/)) return;
          const url = href.split('?')[0];
          if (results.some(r => r.url === url)) return; // דדופ

          // שם הקונה — ניסיון ממוקד לפי סלקטורים ספציפיים
          let buyerName = '';

          // נסיון 1: אלמנט עם class שמכיל name/buyer/username (לא כפתור)
          const nameEls = link.querySelectorAll('[class*="name"], [class*="buyer"], [class*="username"]');
          for (const el of Array.from(nameEls)) {
            if (el.tagName === 'BUTTON') continue;
            const text = el.textContent?.trim() || '';
            if (text && !isGarbage(text)) { buyerName = text; break; }
          }

          // נסיון 2: strong/h3/h4 (לא כפתור)
          if (!buyerName) {
            const headingEls = link.querySelectorAll('strong, h3, h4, [class*="title"]');
            for (const el of Array.from(headingEls)) {
              if (el.tagName === 'BUTTON') continue;
              const text = el.textContent?.trim() || '';
              if (text && !isGarbage(text) && text.length < 80) { buyerName = text; break; }
            }
          }

          // נסיון 3: ה-span הראשון שאינו גארבג' ואינו מיד בתוך button
          if (!buyerName) {
            const spans = link.querySelectorAll('span');
            for (const el of Array.from(spans)) {
              if (el.closest('button')) continue;
              const text = el.textContent?.trim() || '';
              if (text && !isGarbage(text) && text.length > 1 && text.length < 80) {
                buyerName = text; break;
              }
            }
          }

          results.push({ url, buyerName: buyerName.substring(0, 100) });
        });

        return results;
      });

      for (const link of pageLinks) {
        if (!conversations.some(c => c.url === link.url)) {
          conversations.push(link);
        }
      }

      logger.info(`[InboxScraper] עמוד ${page}: נמצאו ${pageLinks.length} שיחות (סה"כ: ${conversations.length})`);

      // בדיקה אם יש עמוד הבא
      const nextBtn = await this.page.$('a[data-appears-component-name="pagination_next"], [aria-label="Next page"], a[rel="next"]');
      if (nextBtn) {
        await this.human.humanScroll('down', randomBetween(200, 400));
        await randomDelay(1000, 2500);
        await nextBtn.click();
        await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
        await randomDelay(2000, 4000);
        page++;
      } else {
        hasMore = false;
      }
    }

    logger.info(`[InboxScraper] ✅ סריקת תיבת הדואר הושלמה — ${conversations.length} שיחות`);
    return conversations;
  }
}
