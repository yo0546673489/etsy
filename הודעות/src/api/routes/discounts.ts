import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { JobQueue } from '../../queue/setup';
import { StoreResolver } from '../../stores/resolver';

export function createDiscountRoutes(pool: Pool, jobQueue: JobQueue, resolver: StoreResolver) {
  return async function (fastify: FastifyInstance) {
    // רשימת משימות הנחה
    fastify.get('/tasks', async (request) => {
      const { store_id, status } = request.query as any;
      let sql = 'SELECT * FROM discount_tasks WHERE 1=1';
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
      return { tasks: result.rows };
    });

    // יצירת משימת הנחה חדשה
    fastify.post('/tasks', async (request, reply) => {
      const {
        store_id, task_type, sale_name, discount_percent,
        target_scope, listing_ids, target_country, terms_text,
        start_date, end_date,
      } = request.body as any;

      if (!store_id || !task_type || !sale_name) {
        return reply.status(400).send({ error: 'Missing required fields: store_id, task_type, sale_name' });
      }

      if (task_type === 'create_sale' || task_type === 'update_sale') {
        if (!discount_percent || discount_percent < 5 || discount_percent > 75) {
          return reply.status(400).send({ error: 'discount_percent must be between 5 and 75' });
        }
        if (!start_date || !end_date) {
          return reply.status(400).send({ error: 'start_date and end_date required for create/update' });
        }
        // בדיקה שהמבצע לא עולה על 30 יום
        const start = new Date(start_date);
        const end = new Date(end_date);
        const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 30) {
          return reply.status(400).send({ error: 'Sale duration cannot exceed 30 days' });
        }
      }

      const storeResult = await pool.query(
        'SELECT adspower_profile_id, store_name FROM stores WHERE id = $1',
        [store_id]
      );
      if (storeResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Store not found' });
      }
      const store = storeResult.rows[0];

      const insertResult = await pool.query(
        `INSERT INTO discount_tasks
          (store_id, task_type, sale_name, discount_percent, target_scope, listing_ids, target_country, terms_text, start_date, end_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
         RETURNING id`,
        [store_id, task_type, sale_name, discount_percent, target_scope || 'whole_shop', listing_ids, target_country || 'Everywhere', terms_text, start_date, end_date]
      );

      const taskId = insertResult.rows[0].id;

      await jobQueue.addDiscountJob({
        discountTaskId: taskId,
        storeId: store_id,
        profileId: store.adspower_profile_id,
        shopName: store.store_name,
        taskType: task_type,
      });

      return { success: true, taskId, status: 'pending' };
    });

    // סטטוס משימה
    fastify.get('/tasks/:id', async (request) => {
      const { id } = request.params as any;
      const result = await pool.query('SELECT * FROM discount_tasks WHERE id = $1', [id]);
      return result.rows[0] || { error: 'Not found' };
    });

    // ============ SCHEDULES (רוטציה) ============

    // רשימת schedules
    fastify.get('/schedules', async (request) => {
      const { store_id } = request.query as any;
      let sql = 'SELECT * FROM discount_schedules WHERE 1=1';
      const params: any[] = [];

      if (store_id) {
        params.push(store_id);
        sql += ` AND store_id = $${params.length}`;
      }

      sql += ' ORDER BY created_at DESC';
      const result = await pool.query(sql, params);
      return { schedules: result.rows };
    });

    // יצירת schedule חדש
    fastify.post('/schedules', async (request, reply) => {
      const {
        store_id, schedule_name, rotation_config,
        target_scope, listing_ids, target_country, terms_text,
      } = request.body as any;

      if (!store_id || !schedule_name || !rotation_config) {
        return reply.status(400).send({ error: 'Missing required fields' });
      }

      const result = await pool.query(
        `INSERT INTO discount_schedules
          (store_id, schedule_name, rotation_config, target_scope, listing_ids, target_country, terms_text)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [store_id, schedule_name, JSON.stringify(rotation_config), target_scope || 'whole_shop', listing_ids, target_country || 'Everywhere', terms_text]
      );

      return { success: true, scheduleId: result.rows[0].id };
    });

    // עדכון schedule
    fastify.put('/schedules/:id', async (request) => {
      const { id } = request.params as any;
      const { is_active, rotation_config, schedule_name, target_scope, listing_ids, target_country, terms_text } = request.body as any;

      const updates: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); params.push(is_active); }
      if (rotation_config) { updates.push(`rotation_config = $${idx++}`); params.push(JSON.stringify(rotation_config)); }
      if (schedule_name) { updates.push(`schedule_name = $${idx++}`); params.push(schedule_name); }
      if (target_scope) { updates.push(`target_scope = $${idx++}`); params.push(target_scope); }
      if (listing_ids !== undefined) { updates.push(`listing_ids = $${idx++}`); params.push(listing_ids); }
      if (target_country) { updates.push(`target_country = $${idx++}`); params.push(target_country); }
      if (terms_text !== undefined) { updates.push(`terms_text = $${idx++}`); params.push(terms_text); }

      updates.push(`updated_at = NOW()`);
      params.push(id);

      await pool.query(
        `UPDATE discount_schedules SET ${updates.join(', ')} WHERE id = $${idx}`,
        params
      );

      return { success: true };
    });

    // מחיקת schedule
    fastify.delete('/schedules/:id', async (request) => {
      const { id } = request.params as any;
      await pool.query('DELETE FROM discount_schedules WHERE id = $1', [id]);
      return { success: true };
    });
  };
}
