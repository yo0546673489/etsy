import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { JobQueue } from '../../queue/setup';

export function createStatusRoutes(pool: Pool, jobQueue: JobQueue) {
  return async function (fastify: FastifyInstance) {
    fastify.get('/', async (_req, reply) => {
      reply.header('Access-Control-Allow-Origin', '*');
      try {
        // ── Stores ──────────────────────────────────────────────────────────
        const storeStats = await pool.query(`
          SELECT
            COUNT(*) FILTER (WHERE status != 'needs_reauth') AS active,
            COUNT(*) FILTER (WHERE status = 'needs_reauth')  AS needs_reauth,
            COUNT(*) AS total
          FROM stores
        `);

        const needsReauthStores = await pool.query(`
          SELECT id, store_name, store_email, store_number
          FROM stores WHERE status = 'needs_reauth'
          ORDER BY store_number ASC
        `);

        // ── Conversations ────────────────────────────────────────────────────
        const convStats = await pool.query(`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '24 hours') AS updated_24h,
            COUNT(*) FILTER (WHERE status = 'new') AS new_count
          FROM conversations
        `);

        const recentConversations = await pool.query(`
          SELECT
            c.id,
            c.customer_name,
            c.status,
            c.last_message_text,
            c.last_message_at,
            c.updated_at,
            s.store_name,
            s.store_number
          FROM conversations c
          JOIN stores s ON c.store_id = s.id
          ORDER BY c.updated_at DESC
          LIMIT 15
        `);

        // ── Queue stats ──────────────────────────────────────────────────────
        const [
          syncWaiting, syncActive, syncFailed, syncCompleted,
          replyWaiting, replyActive, replyFailed,
        ] = await Promise.all([
          jobQueue.syncQueue.getWaitingCount(),
          jobQueue.syncQueue.getActiveCount(),
          jobQueue.syncQueue.getFailedCount(),
          jobQueue.syncQueue.getCompletedCount(),
          jobQueue.replyQueue.getWaitingCount(),
          jobQueue.replyQueue.getActiveCount(),
          jobQueue.replyQueue.getFailedCount(),
        ]);

        // ── Messages synced in last 24h ──────────────────────────────────────
        const msgStats = await pool.query(`
          SELECT COUNT(*) AS synced_24h
          FROM messages
          WHERE created_at > NOW() - INTERVAL '24 hours'
        `);

        return {
          status: 'ok',
          uptime: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
          stores: {
            total: parseInt(storeStats.rows[0].total),
            active: parseInt(storeStats.rows[0].active),
            needs_reauth: parseInt(storeStats.rows[0].needs_reauth),
            needs_reauth_list: needsReauthStores.rows,
          },
          conversations: {
            total: parseInt(convStats.rows[0].total),
            updated_24h: parseInt(convStats.rows[0].updated_24h),
            new_count: parseInt(convStats.rows[0].new_count),
            recent: recentConversations.rows,
          },
          messages: {
            synced_24h: parseInt(msgStats.rows[0].synced_24h),
          },
          queues: {
            sync: {
              waiting: syncWaiting,
              active: syncActive,
              failed: syncFailed,
              completed: syncCompleted,
            },
            reply: {
              waiting: replyWaiting,
              active: replyActive,
              failed: replyFailed,
            },
          },
        };
      } catch (error: any) {
        reply.code(500);
        return { status: 'error', error: error?.message || String(error) };
      }
    });
  };
}
