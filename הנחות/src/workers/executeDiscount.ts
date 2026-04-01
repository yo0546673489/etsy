import { Worker, Job } from 'bullmq';
import { Pool } from 'pg';
import { chromium } from 'playwright';
import { config } from '../config';
import { AdsPowerController } from '../adspower/controller';
import { EtsyDiscountManager, SaleConfig } from '../browser/etsyDiscountManager';
import { logger } from '../utils/logger';

/** וודא שיש רק tab אחד פתוח — סגור extras, שמור ראשון */
async function ensureSingleTab(context: any): Promise<any> {
  const pages = context.pages() as any[];
  if (pages.length === 0) {
    const page = await context.newPage();
    await new Promise(r => setTimeout(r, 1500));
    logger.info('Opened new tab (no existing tabs)');
    return page;
  }
  const [keep, ...extras] = pages;
  if (extras.length > 0) {
    logger.info(`Found ${pages.length} open tabs — closing ${extras.length} extra tab(s)`);
    for (const p of extras) {
      await p.close().catch(() => {});
    }
  }
  await keep.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
  logger.info(`Using tab: ${keep.url()}`);
  return keep;
}

interface DiscountJob {
  taskId: number;           // ID מטבלת discount_tasks (etsy_messages)
  storeId: number;
  serialNumber: string;     // AdsPower profile
  taskType: 'create_sale' | 'end_sale';
  saleConfig?: SaleConfig;  // רק ל-create_sale
  saleName?: string;        // רק ל-end_sale
  platformTaskId?: number;  // ID מטבלת discount_tasks (etsy_platform)
}

export function createDiscountWorker(pool: Pool, platformPool?: Pool) {
  const adspower = new AdsPowerController();

  function getRedisConnection() {
    try {
      const url = new URL(config.redis.url);
      return { host: url.hostname || 'localhost', port: parseInt(url.port || '6379') };
    } catch {
      return { host: 'localhost', port: 6379 };
    }
  }

  async function updatePlatformTask(platformTaskId: number, success: boolean, errorMessage?: string) {
    if (!platformPool) return;
    try {
      if (success) {
        await platformPool.query(
          "UPDATE discount_tasks SET status = 'completed', completed_at = NOW() WHERE id = $1",
          [platformTaskId]
        );
      } else {
        // Only update to failed if not already completed (avoid overwriting success on retry)
        await platformPool.query(
          "UPDATE discount_tasks SET status = 'failed', error_message = $2, retry_count = retry_count + 1 WHERE id = $1 AND status != 'completed'",
          [platformTaskId, errorMessage || 'Unknown error']
        );
      }
    } catch (e: any) {
      logger.error(`Failed to update platform task ${platformTaskId}: ${e.message}`);
    }
  }

  const worker = new Worker(
    'etsy-discounts-execute',
    async (job: Job<DiscountJob>) => {
      const data = job.data;
      logger.info(`Processing discount job ${data.taskId}: ${data.taskType}`);

      // עדכון סטטוס ב-etsy_messages
      try {
        await pool.query(
          'UPDATE discount_tasks SET status = $1, attempts = attempts + 1 WHERE id = $2',
          ['processing', data.taskId]
        );
      } catch {
        // discount_tasks בסכמת Node.js אולי לא קיימת
      }

      const browserInfo = await adspower.openProfile(data.serialNumber);
      if (!browserInfo) throw new Error(`Failed to open AdsPower profile ${data.serialNumber}`);

      // המתן שהדפדפן יהיה מוכן לגמרי לפני חיבור CDP
      await new Promise(r => setTimeout(r, 5000 + Math.random() * 3000));

      let browser;
      try {
        browser = await chromium.connectOverCDP(browserInfo.ws.puppeteer, { timeout: 60000 });
        const context = browser.contexts()[0] || await browser.newContext();
        // וודא שיש רק tab אחד פתוח
        const page = await ensureSingleTab(context);

        const discountManager = new EtsyDiscountManager(page);

        let success = false;

        if (data.taskType === 'create_sale' && data.saleConfig) {
          success = await discountManager.createSale(data.saleConfig);
        } else if (data.taskType === 'end_sale' && data.saleName) {
          success = await discountManager.endSale(data.saleName);
        } else {
          throw new Error(`Invalid task type or missing config: ${data.taskType}`);
        }

        if (success) {
          try {
            await pool.query(
              'UPDATE discount_tasks SET status = $1, executed_at = NOW() WHERE id = $2',
              ['completed', data.taskId]
            );
          } catch { /* לא קריטי */ }

          if (data.platformTaskId) {
            await updatePlatformTask(data.platformTaskId, true);
          }

          logger.info(`Discount task ${data.taskId} completed successfully`);
        } else {
          throw new Error('Discount operation verification failed');
        }
      } finally {
        if (browser) await browser.close().catch(() => {});
        await new Promise(r => setTimeout(r, 3000 + Math.random() * 5000));
        await adspower.closeProfile(data.serialNumber);
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 1,
      limiter: { max: 2, duration: 60000 },
    }
  );

  worker.on('failed', async (job, err) => {
    if (job) {
      try {
        await pool.query(
          'UPDATE discount_tasks SET status = $1, error_message = $2 WHERE id = $3',
          ['failed', err.message, job.data.taskId]
        );
      } catch { /* לא קריטי */ }

      if (job.data.platformTaskId) {
        await updatePlatformTask(job.data.platformTaskId, false, err.message);
      }
    }
    logger.error(`Discount job failed: ${err.message}`);
  });

  return worker;
}
