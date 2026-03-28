import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { JobQueue } from '../../queue/setup';
import { StoreResolver } from '../../stores/resolver';
import { AIReplyGenerator } from '../../ai/replyGenerator';

export function createReviewRoutes(pool: Pool, jobQueue: JobQueue, resolver: StoreResolver) {
  const aiGenerator = new AIReplyGenerator(pool);

  return async function (fastify: FastifyInstance) {
    // רשימת תגובות ביקורת לפי חנות
    fastify.get('/', async (request) => {
      const { store_id, status } = request.query as any;
      let sql = 'SELECT * FROM review_replies WHERE 1=1';
      const params: any[] = [];

      if (store_id) {
        params.push(store_id);
        sql += ` AND store_id = $${params.length}`;
      }
      if (status) {
        params.push(status);
        sql += ` AND status = $${params.length}`;
      }

      sql += ' ORDER BY created_at DESC LIMIT 100';
      const result = await pool.query(sql, params);
      return { reviews: result.rows };
    });

    // יצירת תגובה לביקורת (ידנית)
    fastify.post('/', async (request, reply) => {
      const { store_id, reviewer_name, review_rating, review_text, etsy_listing_id, reply_text } = request.body as any;

      if (!store_id || !reply_text) {
        return reply.status(400).send({ error: 'Missing store_id or reply_text' });
      }

      const storeResult = await pool.query(
        'SELECT s.*, s.adspower_profile_id, s.store_name FROM stores s WHERE s.id = $1',
        [store_id]
      );
      if (storeResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Store not found' });
      }
      const store = storeResult.rows[0];

      const insertResult = await pool.query(
        `INSERT INTO review_replies
          (store_id, reviewer_name, review_rating, review_text, etsy_listing_id, reply_text, reply_source, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [store_id, reviewer_name, review_rating, review_text, etsy_listing_id, reply_text, 'manual', 'pending']
      );

      const reviewReplyId = insertResult.rows[0].id;

      await jobQueue.addReviewReplyJob({
        reviewReplyId,
        storeId: store_id,
        profileId: store.adspower_profile_id,
        replyText: reply_text,
        shopName: store.store_name,
      });

      return { success: true, reviewReplyId, status: 'pending' };
    });

    // יצירת תגובה לביקורת עם AI
    fastify.post('/ai-generate', async (request, reply) => {
      const { store_id, reviewer_name, review_rating, review_text, product_name } = request.body as any;

      if (!store_id || !review_text) {
        return reply.status(400).send({ error: 'Missing store_id or review_text' });
      }

      const generated = await aiGenerator.generateReviewReply(
        store_id,
        reviewer_name || 'Customer',
        review_rating || 5,
        review_text,
        product_name
      );

      if (!generated) {
        return reply.status(400).send({ error: 'AI generation failed — check AI settings for this store' });
      }

      return { success: true, generatedReply: generated.text, source: 'ai' };
    });

    // יצירת תגובה לביקורת עם AI + שליחה
    fastify.post('/ai-reply', async (request, reply) => {
      const { store_id, reviewer_name, review_rating, review_text, etsy_listing_id, product_name } = request.body as any;

      if (!store_id || !review_text) {
        return reply.status(400).send({ error: 'Missing store_id or review_text' });
      }

      const generated = await aiGenerator.generateReviewReply(
        store_id,
        reviewer_name || 'Customer',
        review_rating || 5,
        review_text,
        product_name
      );

      if (!generated) {
        return reply.status(400).send({ error: 'AI generation failed' });
      }

      const storeResult = await pool.query(
        'SELECT adspower_profile_id, store_name FROM stores WHERE id = $1',
        [store_id]
      );
      if (storeResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Store not found' });
      }
      const store = storeResult.rows[0];

      // בדיקה אם auto_send מופעל
      const settings = await aiGenerator.getSettings(store_id, 'reviews');
      const autoSend = settings?.auto_send ?? false;

      const insertResult = await pool.query(
        `INSERT INTO review_replies
          (store_id, reviewer_name, review_rating, review_text, etsy_listing_id, reply_text, reply_source, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [store_id, reviewer_name, review_rating, review_text, etsy_listing_id, generated.text, 'ai', autoSend ? 'pending' : 'pending']
      );

      const reviewReplyId = insertResult.rows[0].id;

      if (autoSend) {
        await jobQueue.addReviewReplyJob({
          reviewReplyId,
          storeId: store_id,
          profileId: store.adspower_profile_id,
          replyText: generated.text,
          shopName: store.store_name,
        });
      }

      return {
        success: true,
        reviewReplyId,
        generatedReply: generated.text,
        autoSend,
        status: autoSend ? 'queued' : 'pending_approval',
      };
    });

    // סטטוס תגובה
    fastify.get('/:id/status', async (request) => {
      const { id } = request.params as any;
      const result = await pool.query('SELECT * FROM review_replies WHERE id = $1', [id]);
      return result.rows[0] || { error: 'Not found' };
    });

    // הגדרות AI לביקורות
    fastify.get('/ai-settings/:storeId', async (request) => {
      const { storeId } = request.params as any;
      const result = await pool.query(
        'SELECT * FROM ai_settings WHERE store_id = $1 AND feature = $2',
        [storeId, 'reviews']
      );
      return result.rows[0] || { enabled: false };
    });

    // עדכון הגדרות AI
    fastify.put('/ai-settings/:storeId', async (request) => {
      const { storeId } = request.params as any;
      const { enabled, system_prompt, model, max_tokens, temperature, language, auto_send } = request.body as any;

      await pool.query(
        `INSERT INTO ai_settings (store_id, feature, enabled, system_prompt, model, max_tokens, temperature, language, auto_send, updated_at)
         VALUES ($1, 'reviews', $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (store_id, feature) DO UPDATE SET
           enabled = $2, system_prompt = $3, model = $4, max_tokens = $5,
           temperature = $6, language = $7, auto_send = $8, updated_at = NOW()`,
        [storeId, enabled, system_prompt, model || 'claude-sonnet-4-20250514', max_tokens || 500, temperature || 0.7, language || 'en', auto_send || false]
      );

      return { success: true };
    });
  };
}
