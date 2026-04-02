import { ImapFlow } from 'imapflow';
import { config } from '../config';
import { EmailParser } from './parser';
import { StoreResolver } from '../stores/resolver';
import { JobQueue } from '../queue/setup';
import { logger } from '../utils/logger';

export class EmailListener {
  private client: ImapFlow;
  private parser: EmailParser;
  private resolver: StoreResolver;
  private jobQueue: JobQueue;
  private running: boolean = false;

  constructor(resolver: StoreResolver, jobQueue: JobQueue) {
    this.client = this.createClient();
    this.parser = new EmailParser();
    this.resolver = resolver;
    this.jobQueue = jobQueue;
  }

  private createClient(): ImapFlow {
    return new ImapFlow({
      host: config.imap.host,
      port: config.imap.port,
      secure: true,
      auth: {
        user: config.imap.user,
        pass: config.imap.password,
      },
      logger: false,
    });
  }

  async start(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Connected to IMAP server');
      this.running = true;
      await this.listen();
    } catch (error) {
      logger.error('Failed to connect to IMAP', error);
      throw error;
    }
  }

  private async listen(): Promise<void> {
    while (this.running) {
      try {
        const lock = await this.client.getMailboxLock('INBOX');
        try {
          await this.client.idle();
          await this.processNewEmails();
        } finally {
          lock.release();
        }
      } catch (error) {
        logger.error('IMAP listener error, reconnecting in 10s...', error);
        await new Promise(r => setTimeout(r, 10000));
        try {
          this.client = this.createClient();
          await this.client.connect();
          logger.info('IMAP reconnected successfully');
        } catch (e) {
          logger.error('Reconnect failed', e);
        }
      }
    }
  }

  private async processNewEmails(): Promise<void> {
    // ⚠️ MUST use { uid: true } — sequence numbers shift when new messages arrive,
    //    causing messageFlagsAdd to mark the wrong message. UIDs are stable.
    const uids = await this.client.search({ seen: false }, { uid: true }) as number[];
    if (!Array.isArray(uids) || uids.length === 0) return;

    logger.info(`Found ${uids.length} new emails (UIDs: ${uids.slice(0, 5).join(',')})${uids.length > 5 ? '...' : ''}`);

    for (const uid of uids) {
      try {
        const message = await this.client.fetchOne(`${uid}`, { source: true, envelope: true }, { uid: true });
        if (!message) {
          await this.client.messageFlagsAdd(`${uid}`, ['\\Seen'], { uid: true });
          continue;
        }

        const parsed = await this.parser.parse(message.source as Buffer);

        // Always mark as seen FIRST (before processing) — stable UID ensures correct message.
        await this.client.messageFlagsAdd(`${uid}`, ['\\Seen'], { uid: true });

        if (!parsed || !parsed.isEtsyNotification) {
          logger.debug(`[Email] UID=${uid} — not an Etsy message notification, skipped`);
          continue;
        }

        // ── פרוט מלא של כל אימייל שהגיע ──────────────────────────────────
        logger.info(
          `[Email] UID=${uid} | ` +
          `נמסר ל: ${parsed.storeEmail} | ` +
          `קונה: ${parsed.buyerName} | ` +
          `נושא: ${parsed.subject} | ` +
          `קישור: ${parsed.conversationLink} | ` +
          `הגיע: ${parsed.receivedAt.toISOString()}`
        );

        const store = await this.resolver.resolveByEmail(parsed.storeEmail);
        if (!store) {
          logger.warn(`[Email] לא נמצאה חנות עבור: ${parsed.storeEmail}`);
          continue;
        }

        if (store.status === 'needs_reauth') {
          logger.warn(`[Email] חנות ${store.id} (${parsed.storeEmail}) דורשת התחברות מחדש — מדולג`);
          continue;
        }

        await this.jobQueue.addSyncConversationJob({
          storeId: store.id,
          profileId: store.adspower_profile_id,
          conversationUrl: parsed.conversationLink,
          buyerName: parsed.buyerName,
          storeEmail: parsed.storeEmail,
        });

        logger.info(`[Listener] ✅ תור סנכרון נוסף — חנות ${store.id}, קונה: ${parsed.buyerName}`);
      } catch (error) {
        logger.error(`[Email] שגיאה בעיבוד UID ${uid}`, error);
        try { await this.client.messageFlagsAdd(`${uid}`, ['\\Seen'], { uid: true }); } catch {}
      }
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.client.logout();
    logger.info('IMAP listener stopped');
  }
}
