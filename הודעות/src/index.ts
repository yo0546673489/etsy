import { Pool } from 'pg';
import { config } from './config';
import { StoreResolver } from './stores/resolver';
import { JobQueue } from './queue/setup';
import { EmailListener } from './email/listener';
import { createSyncWorker } from './queue/workers/syncConversation';
import { createInitialSyncWorker } from './queue/workers/initialSync';
import { createReplyWorker } from './queue/workers/sendReply';
import { createReviewReplyWorker } from './queue/workers/replyToReview';
import { createDiscountWorker } from './queue/workers/executeDiscount';
import { createApiServer } from './api/server';
import { logger } from './utils/logger';

async function main() {
  logger.info('Starting Etsy Messaging System...');

  const pool = new Pool({ connectionString: config.db.url });
  await pool.query('SELECT 1');
  logger.info('Database connected');

  const fs = await import('fs');
  const path = await import('path');
  const migrations = ['001_initial.sql', '002_reviews_discounts.sql'];
  for (const migration of migrations) {
    const migrationPath = path.join(__dirname, `db/migrations/${migration}`);
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      await pool.query(sql);
    }
  }
  logger.info('Migrations applied');

  const resolver = new StoreResolver(pool);
  await resolver.loadAll();

  const jobQueue = new JobQueue();

  const syncWorker = createSyncWorker(pool, jobQueue);
  const initialSyncWorker = createInitialSyncWorker(pool, jobQueue);
  const replyWorker = createReplyWorker(pool, jobQueue);
  const reviewReplyWorker = createReviewReplyWorker(pool, jobQueue);
  const discountWorker = createDiscountWorker(pool, jobQueue);
  logger.info('Workers started (messages + reviews + discounts)');

  const { fastify, io } = await createApiServer(pool, jobQueue, resolver);

  if (config.imap.user && config.imap.password) {
    const emailListener = new EmailListener(resolver, jobQueue);
    await emailListener.start();
    logger.info('Email listener started');
  } else {
    logger.warn('IMAP not configured - email listener disabled');
  }

  const shutdown = async () => {
    logger.info('Shutting down...');
    await syncWorker.close();
    await initialSyncWorker.close();
    await replyWorker.close();
    await reviewReplyWorker.close();
    await discountWorker.close();
    await fastify.close();
    await pool.end();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  logger.info('=== Etsy Automation Server is running ===');
}

main().catch((error) => {
  logger.error('Failed to start', error);
  process.exit(1);
});
