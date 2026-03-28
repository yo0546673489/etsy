// Etsy Review Replier
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

export interface ReviewInfo {
  reviewerName: string;
  rating: number;
  reviewText: string;
  listingTitle?: string;
  hasExistingReply: boolean;
  reviewElementSelector?: string;
}

export class EtsyReviewReplier {
  private page: Page;
  private human: HumanBehavior;
  private shopName: string;

  constructor(page: Page, shopName: string) {
    this.page = page;
    this.human = new HumanBehavior(page);
    this.shopName = shopName;
  }

  /**
   * שלב 1: ניווט לדף הביקורות של החנות
   */
  async navigateToReviewsPage(): Promise<void> {
    logger.info('Navigating to reviews page...');
    await this.human.humanNavigate('https://www.etsy.com/your/shops/me/reviews');
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await randomDelay(2000, 4000);
    await this.human.randomMouseMovement();
    await this.human.humanScroll('down', randomBetween(100, 300));
    logger.info('Arrived at reviews page');
  }

  /**
   * שלב 2: סריקת ביקורות בדף
   */
  async scrapeReviews(): Promise<ReviewInfo[]> {
    await this.human.humanScroll('down', randomBetween(200, 400));
    await randomDelay(1000, 2000);

    // TODO: עדכן סלקטורים אחרי inspect-selectors.ts
    const reviews = await this.page.evaluate(() => {
      const reviewElements = document.querySelectorAll(
        '[data-review-id], .review-card, .shop-review'
      );

      return Array.from(reviewElements).map((el) => {
        const nameEl = el.querySelector(
          '.reviewer-name, [data-reviewer-name], .review-author'
        );
        const ratingEl = el.querySelector(
          '[data-rating], .stars-svg, .review-rating'
        );
        const textEl = el.querySelector(
          '.review-text, .review-body, [data-review-content]'
        );
        const listingEl = el.querySelector(
          '.listing-title, .review-listing-link, [data-listing-title]'
        );
        const replyEl = el.querySelector(
          '.shop-response, .review-reply, [data-shop-response]'
        );

        let rating = 5;
        if (ratingEl) {
          const ratingText = ratingEl.getAttribute('data-rating')
            || ratingEl.getAttribute('aria-label')
            || ratingEl.textContent || '';
          const match = ratingText.match(/(\d)/);
          if (match) rating = parseInt(match[1]);
        }

        return {
          reviewerName: nameEl?.textContent?.trim() || 'Unknown',
          rating,
          reviewText: textEl?.textContent?.trim() || '',
          listingTitle: listingEl?.textContent?.trim() || undefined,
          hasExistingReply: !!replyEl,
          reviewElementSelector: `[data-review-id="${el.getAttribute('data-review-id')}"]`,
        };
      });
    });

    // קריאה "אנושית" של הביקורות
    for (const review of reviews) {
      if (review.reviewText) {
        await this.human.readingDelay(review.reviewText.length);
      }
    }

    logger.info(`Scraped ${reviews.length} reviews (${reviews.filter(r => !r.hasExistingReply).length} without reply)`);
    return reviews;
  }

  /**
   * שלב 3: תגובה לביקורת ספציפית
   */
  async replyToReview(reviewIndex: number, replyText: string): Promise<boolean> {
    try {
      logger.info(`Replying to review #${reviewIndex}...`);

      const currentUrl = this.page.url();
      if (!currentUrl.includes('/reviews')) {
        await this.navigateToReviewsPage();
      }

      await this.human.humanScroll('down', randomBetween(200, 500));
      await randomDelay(1000, 2000);

      // TODO: עדכן סלקטורים
      const reviewCards = await this.page.$$('[data-review-id], .review-card, .shop-review');
      if (reviewIndex >= reviewCards.length) {
        logger.error(`Review index ${reviewIndex} out of bounds (${reviewCards.length} total)`);
        return false;
      }

      const targetReview = reviewCards[reviewIndex];

      // גלילה לביקורת
      await targetReview.scrollIntoViewIfNeeded();
      await randomDelay(800, 1500);
      await this.human.randomMouseMovement();

      // קריאת הביקורת (התנהגות אנושית)
      const reviewText = await targetReview.evaluate(el => el.textContent || '');
      await this.human.readingDelay(reviewText.length);

      // לחיצה על Reply/Respond
      // TODO: עדכן סלקטור
      const replyButton = await targetReview.$(
        'button:has-text("Reply"), button:has-text("Respond"), [data-reply-button], .reply-to-review-btn'
      );

      if (!replyButton) {
        logger.error('Reply button not found for this review');
        return false;
      }

      await this.human.humanClick(
        'button:has-text("Reply"), button:has-text("Respond"), [data-reply-button]'
      );
      await randomDelay(1000, 2000);

      // חשיבה לפני כתיבה
      await this.human.thinkBeforeSending();

      // הקלדה אנושית של התגובה
      // TODO: עדכן סלקטור של textarea
      const replyInputSelector = 'textarea.reply-input, textarea[name="reply"], [data-reply-input], textarea';
      await this.human.humanType(replyInputSelector, replyText);

      // קריאה חוזרת של מה שכתבנו
      await this.human.readingDelay(replyText.length);
      await randomDelay(1000, 3000);

      // לחיצה על שליחה
      // TODO: עדכן סלקטור
      const submitSelector = 'button[type="submit"]:has-text("Post"), button:has-text("Submit"), [data-submit-reply]';
      await this.human.humanClick(submitSelector);

      await randomDelay(2000, 4000);

      // אימות שהתגובה נשלחה
      const success = await this.page.evaluate((text: string) => {
        const replies = document.querySelectorAll('.shop-response, .review-reply, [data-shop-response]');
        const lastReply = replies[replies.length - 1];
        return lastReply?.textContent?.includes(text.substring(0, 30)) || false;
      }, replyText);

      if (success) {
        logger.info('Review reply sent successfully');
      } else {
        logger.warn('Could not verify review reply was sent — may still have succeeded');
      }

      return success;
    } catch (error) {
      logger.error(`Failed to reply to review #${reviewIndex}`, error);
      return false;
    }
  }

  /**
   * שלב 4: סריקה + תגובה לכל הביקורות ללא תגובה (batch)
   */
  async replyToAllUnreplied(replies: Map<number, string>): Promise<{ sent: number; failed: number }> {
    const reviews = await this.scrapeReviews();
    const unreplied = reviews
      .map((r, i) => ({ ...r, index: i }))
      .filter(r => !r.hasExistingReply);

    let sent = 0;
    let failed = 0;

    for (const review of unreplied) {
      const replyText = replies.get(review.index);
      if (!replyText) continue;

      // השהיה בין תגובות — התנהגות אנושית
      await randomDelay(5000, 15000);

      const success = await this.replyToReview(review.index, replyText);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    }

    logger.info(`Batch reply complete: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }
}
