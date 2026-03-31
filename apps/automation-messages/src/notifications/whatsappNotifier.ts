import axios from 'axios';
import { logger } from '../utils/logger';

/**
 * שליחת התראה בוואטסאפ לבעל החנות
 * עובד עם webhook URL שמוגדר ב-WHATSAPP_WEBHOOK_URL
 * (ניתן לחבר ל-n8n / Make.com / Twilio / כל שירות אחר)
 */
export class WhatsappNotifier {
  private webhookUrl: string;
  private phoneNumber: string;

  constructor() {
    this.webhookUrl = process.env.WHATSAPP_WEBHOOK_URL || '';
    this.phoneNumber = process.env.WHATSAPP_OWNER_PHONE || '';
  }

  async sendAlert(message: string): Promise<void> {
    if (!this.webhookUrl) {
      logger.warn('[WhatsApp] WHATSAPP_WEBHOOK_URL not configured — skipping notification');
      logger.info(`[WhatsApp Alert]: ${message}`);
      return;
    }

    try {
      await axios.post(this.webhookUrl, {
        phone: this.phoneNumber,
        message,
        timestamp: new Date().toISOString(),
      }, { timeout: 10000 });
      logger.info('[WhatsApp] Alert sent successfully');
    } catch (error: any) {
      logger.error('[WhatsApp] Failed to send alert', error?.message);
    }
  }

  async notifyUnansweredQuestion(
    customerName: string,
    storeName: string,
    questionText: string,
    conversationId: number
  ): Promise<void> {
    const message =
      `🔔 *שאלה ממתינה לתשובה*\n\n` +
      `👤 לקוח: ${customerName}\n` +
      `🏪 חנות: ${storeName}\n` +
      `💬 שאלה: "${questionText.substring(0, 200)}"\n\n` +
      `📱 שיחה #${conversationId} — יש להיכנס לאתר ולענות`;

    await this.sendAlert(message);
  }

  async notifyNewOrder(
    customerName: string,
    storeName: string,
    orderId: string,
    amount: string
  ): Promise<void> {
    const message =
      `🎉 *הזמנה חדשה!*\n\n` +
      `👤 לקוח: ${customerName}\n` +
      `🏪 חנות: ${storeName}\n` +
      `📦 מספר הזמנה: ${orderId}\n` +
      `💰 סכום: ${amount}`;

    await this.sendAlert(message);
  }
}
