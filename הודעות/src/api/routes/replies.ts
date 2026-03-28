import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { JobQueue } from '../../queue/setup';
import { StoreResolver } from '../../stores/resolver';
import { AIReplyGenerator } from '../../ai/replyGenerator';

export function createReplyRoutes(pool: Pool, jobQueue: JobQueue, resolver: StoreResolver) {
  const aiGenerator = new AIReplyGenerator(pool);

  return async function (fastify: FastifyInstance) {
    fastify.post('/', async (request, reply) => {
      const { conversation_id, message_text, source } = request.body as any;
      if (!conversation_id || !message_text) return reply.status(400).send({ error: 'Missing fields' });

      const convoResult = await pool.query(
        `SELECT c.*, s.adspower_profile_id FROM conversations c JOIN stores s ON c.store_id = s.id WHERE c.id = $1`,
        [conversation_id]
      );
      if (convoResult.rows.length === 0) return reply.status(404).send({ error: 'Conversation not found' });
      const convo = convoResult.rows[0];

      const queueResult = await pool.query(
        `INSERT INTO reply_queue (conversation_id, message_text, source, status) VALUES ($1, $2, $3, $4) RETURNING id`,
        [conversation_id, message_text, source || 'manual', 'pending']
      );

      await jobQueue.addSendReplyJob({
        replyQueueId: queueResult.rows[0].id,
        conversationId: conversation_id,
        storeId: convo.store_id,
        profileId: convo.adspower_profile_id,
        conversationUrl: convo.etsy_conversation_url,
        messageText: message_text,
      });

      return { success: true, replyQueueId: queueResult.rows[0].id, status: 'pending' };
    });

    fastify.get('/:id/status', async (request) => {
      const { id } = request.params as any;
      const result = await pool.query('SELECT * FROM reply_queue WHERE id = $1', [id]);
      return result.rows[0] || { error: 'Not found' };
    });

    // AI — יצירת תגובה אוטומטית להודעה
    fastify.post('/ai-generate', async (request, reply) => {
      const { conversation_id } = request.body as any;
      if (!conversation_id) return reply.status(400).send({ error: 'Missing conversation_id' });

      const convoResult = await pool.query(
        'SELECT c.*, s.id as sid FROM conversations c JOIN stores s ON c.store_id = s.id WHERE c.id = $1',
        [conversation_id]
      );
      if (convoResult.rows.length === 0) return reply.status(404).send({ error: 'Conversation not found' });
      const convo = convoResult.rows[0];

      // טעינת היסטוריית שיחה
      const messagesResult = await pool.query(
        'SELECT sender_name as sender, message_text as text FROM messages WHERE conversation_id = $1 ORDER BY sent_at ASC LIMIT 20',
        [conversation_id]
      );

      const lastCustomerMsg = messagesResult.rows.filter((m: any) => m.sender !== convo.customer_name).length > 0
        ? messagesResult.rows[messagesResult.rows.length - 1]
        : messagesResult.rows[0];

      const generated = await aiGenerator.generateMessageReply(
        convo.store_id,
        convo.customer_name,
        lastCustomerMsg?.text || '',
        messagesResult.rows
      );

      if (!generated) {
        return reply.status(400).send({ error: 'AI generation failed — check AI settings' });
      }

      return { success: true, generatedReply: generated.text, source: 'ai' };
    });

    // הגדרות AI להודעות
    fastify.get('/ai-settings/:storeId', async (request) => {
      const { storeId } = request.params as any;
      const result = await pool.query(
        'SELECT * FROM ai_settings WHERE store_id = $1 AND feature = $2',
        [storeId, 'messages']
      );
      return result.rows[0] || { enabled: false };
    });

    fastify.put('/ai-settings/:storeId', async (request) => {
      const { storeId } = request.params as any;
      const { enabled, system_prompt, model, max_tokens, temperature, language, auto_send } = request.body as any;

      await pool.query(
        `INSERT INTO ai_settings (store_id, feature, enabled, system_prompt, model, max_tokens, temperature, language, auto_send, updated_at)
         VALUES ($1, 'messages', $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (store_id, feature) DO UPDATE SET
           enabled = $2, system_prompt = $3, model = $4, max_tokens = $5,
           temperature = $6, language = $7, auto_send = $8, updated_at = NOW()`,
        [storeId, enabled, system_prompt, model || 'claude-sonnet-4-20250514', max_tokens || 500, temperature || 0.7, language || 'en', auto_send || false]
      );

      return { success: true };
    });
  };
}
