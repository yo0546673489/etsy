import { Pool } from 'pg';
import { AIReplyGenerator } from './replyGenerator';
import { WhatsappNotifier } from '../notifications/whatsappNotifier';
import { JobQueue } from '../queue/setup';
import { logger } from '../utils/logger';
import { createHash } from 'crypto';

const FALLBACK_MESSAGES = [
  'תודה על פנייתך! אנחנו בודקים את הבקשה ונחזור אליך בהקדם 😊',
  'קיבלנו את הודעתך! אנחנו בוחנים את הנושא ונחזור אליך ממש בקרוב 🙏',
  'תודה שיצרת איתנו קשר! הצוות שלנו כבר בודק ויחזור אליך בהקדם האפשרי ✨',
];

function randomFallback(): string {
  return FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
}

export class AutoReplyService {
  private pool: Pool;
  private aiGenerator: AIReplyGenerator;
  private whatsapp: WhatsappNotifier;
  private jobQueue: JobQueue;

  constructor(pool: Pool, jobQueue: JobQueue) {
    this.pool = pool;
    this.aiGenerator = new AIReplyGenerator(pool);
    this.whatsapp = new WhatsappNotifier();
    this.jobQueue = jobQueue;
  }

  /**
   * נקרא כל פעם שנסרקת הודעת לקוח חדשה ו-ai_mode=true
   */
  async handleNewCustomerMessage(
    conversationId: number,
    storeId: number,
    customerName: string,
    customerMessage: string,
    conversationUrl: string,
    adsProfileId: string
  ): Promise<void> {
    try {
      logger.info(`[AutoReply] Processing message for conversation ${conversationId}`);

      // שליפת היסטוריית שיחה
      const historyResult = await this.pool.query(
        `SELECT sender_type as sender, message_text as text
         FROM messages WHERE conversation_id = $1
         ORDER BY sent_at ASC LIMIT 15`,
        [conversationId]
      );

      // ניסיון לייצר תגובה ב-AI
      const aiReply = await this.aiGenerator.generateMessageReply(
        storeId,
        customerName,
        customerMessage,
        historyResult.rows
      );

      // שם החנות לשמירה
      const storeResult = await this.pool.query('SELECT store_name FROM stores WHERE id = $1', [storeId]);
      const storeName = storeResult.rows[0]?.store_name || 'Store';

      if (aiReply && aiReply.text) {
        logger.info(`[AutoReply] AI generated reply for conv ${conversationId}`);
        await this.queueAndSaveReply(conversationId, storeId, adsProfileId, conversationUrl, aiReply.text, storeName, 'ai');
      } else {
        // AI לא הצליח — שלח fallback + התראה בוואטסאפ
        logger.info(`[AutoReply] AI fallback for conv ${conversationId}`);
        const fallback = randomFallback();
        await this.queueAndSaveReply(conversationId, storeId, adsProfileId, conversationUrl, fallback, storeName, 'ai_fallback');

        // התראה לבעל
        await this.whatsapp.notifyUnansweredQuestion(
          customerName,
          storeName,
          customerMessage,
          conversationId
        );
      }
    } catch (error) {
      logger.error(`[AutoReply] Error for conversation ${conversationId}`, error);
    }
  }

  private async queueAndSaveReply(
    conversationId: number,
    storeId: number,
    adsProfileId: string,
    conversationUrl: string,
    text: string,
    storeName: string,
    source: string
  ): Promise<void> {
    // שמור מיד ב-messages table (יופיע בUI)
    const hash = createHash('sha256')
      .update(`${conversationId}|store|${text.trim()}`)
      .digest('hex');
    await this.pool.query(
      `INSERT INTO messages (conversation_id, sender_type, sender_name, message_text, sent_at, message_hash)
       VALUES ($1, 'store', $2, $3, NOW(), $4) ON CONFLICT (message_hash) DO NOTHING`,
      [conversationId, storeName, text, hash]
    ).catch(() => {});

    // הוסף ל-reply_queue לשליחה פיזית ל-Etsy
    const queueResult = await this.pool.query(
      `INSERT INTO reply_queue (conversation_id, message_text, source, status) VALUES ($1, $2, $3, 'pending') RETURNING id`,
      [conversationId, text, source]
    );

    await this.jobQueue.addSendReplyJob({
      replyQueueId: queueResult.rows[0].id,
      conversationId,
      storeId,
      profileId: adsProfileId,
      conversationUrl,
      messageText: text,
    });

    // עדכן סטטוס שיחה
    await this.pool.query(
      `UPDATE conversations SET status = 'answered', updated_at = NOW() WHERE id = $1`,
      [conversationId]
    );
  }
}
