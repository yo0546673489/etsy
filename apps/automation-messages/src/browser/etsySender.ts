import { Page } from 'playwright';
import { HumanBehavior } from './humanBehavior';
import { logger } from '../utils/logger';

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, randomBetween(minMs, maxMs)));
}

export class EtsySender {
  private page: Page;
  private human: HumanBehavior;

  constructor(page: Page) {
    this.page = page;
    this.human = new HumanBehavior(page);
  }

  async sendReply(conversationUrl: string, messageText: string): Promise<boolean> {
    try {
      await this.human.humanNavigate(conversationUrl);
      await this.page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {});
      await randomDelay(1500, 3500);

      // Scroll down and simulate reading the conversation
      await this.human.humanScroll('down', randomBetween(200, 400));
      await this.human.readingDelay(200);
      await this.human.randomMouseMovement();

      // Think before composing the reply (3-8 seconds)
      await this.human.thinkBeforeSending();

      // Find the reply textarea
      const textareaSelector = 'textarea[placeholder="Type your reply"]';
      await this.page.waitForSelector(textareaSelector, { timeout: 10000 });
      await randomDelay(300, 800);

      // Move mouse near textarea (human-like), then use reliable Playwright click to focus it
      await this.human.randomMouseMovement();
      await this.page.click(textareaSelector);
      await randomDelay(400, 900);

      // Type character by character with human delays
      await this.human.humanTypeInFocus(messageText);

      // Simulate re-reading what was typed
      await this.human.readingDelay(messageText.length);
      await randomDelay(1000, 2500);

      // Verify text was actually entered in the textarea
      const typedText = await this.page.$eval(textareaSelector, (el: HTMLTextAreaElement) => el.value).catch(() => '');
      if (!typedText.includes(messageText.substring(0, 10))) {
        logger.warn('Text not found in textarea, clicking again and retyping...');
        await this.page.click(textareaSelector);
        await randomDelay(300, 600);
        await this.page.fill(textareaSelector, messageText);
        await randomDelay(500, 1000);
      }

      // Send via Tab to move focus to Send button, then Enter — most reliable method
      // Also try clicking the Send button directly
      const btnClicked = await this.page.evaluate(() => {
        // Find the Send button (text "Send" or aria-label "Send")
        const buttons = Array.from(document.querySelectorAll('button'));
        const sendBtn = buttons.find(b =>
          b.textContent?.trim() === 'Send' ||
          b.getAttribute('aria-label')?.toLowerCase() === 'send'
        ) as HTMLButtonElement | null;
        if (sendBtn && !sendBtn.disabled) {
          sendBtn.click();
          return true;
        }
        return false;
      });

      if (btnClicked) {
        logger.info('Send button clicked via DOM');
      } else {
        // Fallback: Ctrl+Enter
        logger.warn('Send button not found, using Ctrl+Enter');
        await this.page.keyboard.down('Control');
        await randomDelay(50, 120);
        await this.page.keyboard.press('Return');
        await randomDelay(50, 100);
        await this.page.keyboard.up('Control');
      }

      // Wait for the page to process the send (random, not fixed)
      await randomDelay(2000, 4000);

      // Verify the message appeared as a store bubble
      const verified = await this.page.evaluate((text: string) => {
        const bubbles = document.querySelectorAll(
          'div.scrolling-message-list div.wt-rounded.wt-text-body-01.wt-sem-bg-surface-informational-subtle'
        );
        const preview = text.substring(0, 30);
        return Array.from(bubbles).some(b =>
          (b.textContent || '').replace(/^Message:\s*/i, '').includes(preview)
        );
      }, messageText);

      if (verified) {
        logger.info('Reply sent and verified in conversation');
        return true;
      }

      logger.warn('Reply sent — could not confirm appearance yet (may still be loading)');
      return true;
    } catch (error) {
      logger.error('Failed to send reply', error);
      return false;
    }
  }
}
