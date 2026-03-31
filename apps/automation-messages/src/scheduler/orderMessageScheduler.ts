import { Pool } from 'pg';
import { JobQueue } from '../queue/setup';
import { logger } from '../utils/logger';

function randDelay(minMs: number, maxMs: number): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

// הודעת ברוכים הבאים (אחרי הזמנה)
function buildWelcomeMessage(customerName: string, orderId: string | number): string {
  const variants = [
    `שלום ${customerName}! 🎉\nתודה רבה שבחרת לקנות מאיתנו — זה אומר לנו המון!\nהזמנה #${orderId} התקבלה ואנחנו כבר מתחילים לטפל בה בקפידה.\nנשלח לך עדכון ברגע שהמשלוח יצא. אם יש לך שאלות — אנחנו כאן תמיד! 😊`,
    `היי ${customerName}! 🙏\nשמחים שבחרת אותנו!\nהזמנה #${orderId} שלך אצלנו ואנחנו עובדים עליה עכשיו.\nנחזור אליך עם מספר מעקב ברגע שהמשלוח ייצא. אל תהסס לפנות אם יש שאלות!`,
    `שלום ${customerName}! ✨\nתודה על הזמנתך!\nאנחנו מתחילים כבר לטפל בהזמנה #${orderId} ונעשה כל מה שביכולתנו שתקבל מוצר מושלם.\nאם משהו לא ברור — אנחנו כאן 😊`,
  ];
  return variants[Math.floor(Math.random() * variants.length)];
}

// הודעת מספר מעקב
function buildTrackingMessage(customerName: string, trackingCode: string, carrier?: string): string {
  const carrierNote = carrier ? ` (${carrier})` : '';
  return `שלום ${customerName}! 📦\nההזמנה שלך נשלחה!\nמספר מעקב${carrierNote}: *${trackingCode}*\nאפשר לעקוב אחרי המשלוח ולבדוק את הסטטוס בכל עת.\nאם יש שאלות — אנחנו כאן! 😊`;
}

// הודעת מסירה + דירוג
function buildDeliveryMessage(customerName: string): string {
  return `שלום ${customerName}! 🎁\nראינו שהחבילה הגיעה אליך — כל הכבוד!\nנשמח לשמוע שהכל הגיע בסדר מושלם 😊\nאם יש לך שאלות לגבי המוצר, אנחנו כאן תמיד לעזור.\n\n✨ ואם אהבת את הקנייה — נשמח מאוד אם תוכל לדרג את החנות שלנו ב-Etsy. הדירוג שלך עוזר לנו המון!\nתודה מכל הלב! 🙏`;
}

export class OrderMessageScheduler {
  private platformPool: Pool;  // etsy_platform DB
  private messagesPool: Pool;  // etsy_messages DB
  private jobQueue: JobQueue;
  private running = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(platformPool: Pool, messagesPool: Pool, jobQueue: JobQueue) {
    this.platformPool = platformPool;
    this.messagesPool = messagesPool;
    this.jobQueue = jobQueue;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    logger.info('[OrderMessages] Order message scheduler started');
    // בדיקה כל 5 דקות
    this.intervalId = setInterval(() => this.checkAll(), 5 * 60 * 1000);
    // בדיקה ראשונה אחרי דקה
    setTimeout(() => this.checkAll(), 60 * 1000);
  }

  stop(): void {
    this.running = false;
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private async checkAll(): Promise<void> {
    try {
      await Promise.all([
        this.checkNewOrders(),
        this.checkTrackingNumbers(),
        this.checkDeliveries(),
      ]);
    } catch (error) {
      logger.error('[OrderMessages] Check failed', error);
    }
  }

  /** הזמנות חדשות שלא קיבלו הודעת ברוכים הבאים */
  private async checkNewOrders(): Promise<void> {
    try {
      const orders = await this.platformPool.query(`
        SELECT o.id, o.buyer_name, o.buyer_email, o.shop_id, o.receipt_id,
               o.grand_total, o.currency_code,
               s.etsy_shop_id, s.shop_name
        FROM orders o
        JOIN shops s ON o.shop_id = s.id
        WHERE o.created_at > NOW() - INTERVAL '7 days'
          AND o.buyer_name IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM etsy_messages.order_messages om
            WHERE om.order_id = o.receipt_id::text AND om.message_type = 'welcome'
          )
        LIMIT 10
      `);

      for (const order of orders.rows) {
        await this.sendOrderMessage(order, 'welcome');
      }
    } catch (err: any) {
      // etsy_messages schema cross-DB reference might not work — use fallback
      logger.debug('[OrderMessages] checkNewOrders:', err.message);
    }
  }

  /** הזמנות עם מספר מעקב חדש שעדיין לא קיבלו הודעה */
  private async checkTrackingNumbers(): Promise<void> {
    try {
      const orders = await this.platformPool.query(`
        SELECT o.id, o.buyer_name, o.shop_id, o.receipt_id,
               se.tracking_code, se.carrier_name
        FROM orders o
        JOIN shipment_events se ON se.order_id = o.id
        JOIN shops s ON o.shop_id = s.id
        WHERE se.tracking_code IS NOT NULL
          AND se.tracking_code != ''
          AND o.buyer_name IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM etsy_messages.order_messages om
            WHERE om.order_id = o.receipt_id::text AND om.message_type = 'tracking'
          )
        LIMIT 10
      `);

      for (const order of orders.rows) {
        await this.sendOrderMessage(order, 'tracking');
      }
    } catch (err: any) {
      logger.debug('[OrderMessages] checkTrackingNumbers:', err.message);
    }
  }

  /** הזמנות שנמסרו ועדיין לא קיבלו הודעת מסירה */
  private async checkDeliveries(): Promise<void> {
    try {
      const orders = await this.platformPool.query(`
        SELECT o.id, o.buyer_name, o.shop_id, o.receipt_id
        FROM orders o
        JOIN shops s ON o.shop_id = s.id
        WHERE o.status IN ('completed', 'delivered')
          AND o.buyer_name IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM etsy_messages.order_messages om
            WHERE om.order_id = o.receipt_id::text AND om.message_type = 'delivery'
          )
        LIMIT 10
      `);

      for (const order of orders.rows) {
        await this.sendOrderMessage(order, 'delivery');
      }
    } catch (err: any) {
      logger.debug('[OrderMessages] checkDeliveries:', err.message);
    }
  }

  private async sendOrderMessage(order: any, messageType: 'welcome' | 'tracking' | 'delivery'): Promise<void> {
    try {
      // מצא את החנות ב-etsy_messages DB לפי shop_name
      const storeResult = await this.messagesPool.query(
        `SELECT id, adspower_profile_id FROM stores WHERE store_name ILIKE $1 LIMIT 1`,
        [order.shop_name || order.shop_id]
      );
      if (!storeResult.rows.length) {
        logger.warn(`[OrderMessages] Store not found for shop_id ${order.shop_id}`);
        return;
      }
      const store = storeResult.rows[0];

      // בנה את ההודעה
      let messageText = '';
      const customerName = order.buyer_name?.split(' ')[0] || order.buyer_name || 'לקוח יקר';
      const orderId = order.receipt_id || order.id;

      if (messageType === 'welcome') {
        messageText = buildWelcomeMessage(customerName, orderId);
      } else if (messageType === 'tracking') {
        messageText = buildTrackingMessage(customerName, order.tracking_code, order.carrier_name);
      } else if (messageType === 'delivery') {
        messageText = buildDeliveryMessage(customerName);
      }

      // בדוק שלא שלחנו כבר
      const existing = await this.messagesPool.query(
        'SELECT id FROM order_messages WHERE order_id = $1 AND message_type = $2',
        [String(orderId), messageType]
      );
      if (existing.rows.length > 0) return;

      // סמן כנשלח ASAP (לפני delay — כדי לא לשלוח פעמיים)
      await this.messagesPool.query(
        `INSERT INTO order_messages (order_id, message_type, store_id) VALUES ($1, $2, $3)
         ON CONFLICT (order_id, message_type) DO NOTHING`,
        [String(orderId), messageType, store.id]
      );

      // delay אקראי: 3-10 דקות לhello, מיידי לשאר
      const delayMs = messageType === 'welcome'
        ? randDelay(3 * 60 * 1000, 10 * 60 * 1000)
        : randDelay(1 * 60 * 1000, 3 * 60 * 1000);

      logger.info(`[OrderMessages] Scheduling ${messageType} message for order ${orderId} in ${Math.round(delayMs / 60000)} min`);

      setTimeout(async () => {
        try {
          // מצא שיחה קיימת עם הלקוח (אם קיים)
          const convResult = await this.messagesPool.query(
            `SELECT id, etsy_conversation_url, adspower_profile_id
             FROM conversations c
             JOIN stores s ON c.store_id = s.id
             WHERE c.store_id = $1 AND c.customer_name ILIKE $2
             ORDER BY c.updated_at DESC LIMIT 1`,
            [store.id, `%${customerName}%`]
          );

          if (!convResult.rows.length) {
            logger.warn(`[OrderMessages] No conversation found for customer "${customerName}" — cannot send ${messageType} message`);
            return;
          }

          const conv = convResult.rows[0];

          // הוסף לreply_queue
          const queueResult = await this.messagesPool.query(
            `INSERT INTO reply_queue (conversation_id, message_text, source, status) VALUES ($1, $2, $3, 'pending') RETURNING id`,
            [conv.id, messageText, `order_${messageType}`]
          );

          await this.jobQueue.addSendReplyJob({
            replyQueueId: queueResult.rows[0].id,
            conversationId: conv.id,
            storeId: store.id,
            profileId: store.adspower_profile_id,
            conversationUrl: conv.etsy_conversation_url,
            messageText,
          });

          // עדכן order_messages עם conversation_id
          await this.messagesPool.query(
            'UPDATE order_messages SET conversation_id = $1 WHERE order_id = $2 AND message_type = $3',
            [conv.id, String(orderId), messageType]
          );

          logger.info(`[OrderMessages] ${messageType} message queued for ${customerName} (conv ${conv.id})`);
        } catch (err: any) {
          logger.error(`[OrderMessages] Failed to send ${messageType} message:`, err.message);
        }
      }, delayMs);

    } catch (err: any) {
      logger.error(`[OrderMessages] sendOrderMessage error:`, err.message);
    }
  }
}
