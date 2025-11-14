import express from 'express';
import { query, querySingle, insert, execute } from '../lib/mysql.js';

const router = express.Router();

// GET /api/request-groups - List all groups with their requests
router.get('/', async (req, res) => {
  try {
    const groups = await query(
      `SELECT
        rg.id,
        rg.name,
        rg.created_at,
        COUNT(gr.id) as request_count
       FROM request_groups rg
       LEFT JOIN group_requests gr ON rg.id = gr.group_id
       GROUP BY rg.id, rg.name, rg.created_at
       ORDER BY rg.created_at DESC`
    );
    res.json(groups);
  } catch (error) {
    console.error('Error fetching request groups:', error);
    res.status(500).json({ error: 'Failed to fetch request groups' });
  }
});

// GET /api/request-groups/:id - Get group with all its requests
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const group = await querySingle(
      'SELECT * FROM request_groups WHERE id = ?',
      [id]
    );

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const requests = await query(
      `SELECT
        gr.id,
        gr.group_id,
        gr.endpoint_id,
        gr.body_json,
        gr.sort_order,
        e.metodo,
        e.url
       FROM group_requests gr
       INNER JOIN endpoints e ON gr.endpoint_id = e.id
       WHERE gr.group_id = ?
       ORDER BY gr.sort_order ASC`,
      [id]
    );

    res.json({ ...group, requests });
  } catch (error) {
    console.error('Error fetching group details:', error);
    res.status(500).json({ error: 'Failed to fetch group details' });
  }
});

// POST /api/request-groups - Create new group
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const insertId = await insert(
      'INSERT INTO request_groups (name) VALUES (?)',
      [name]
    );

    const newGroup = await querySingle(
      'SELECT * FROM request_groups WHERE id = ?',
      [insertId]
    );

    res.status(201).json(newGroup);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// DELETE /api/request-groups/:id - Delete group (cascade deletes requests)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const affectedRows = await execute(
      'DELETE FROM request_groups WHERE id = ?',
      [id]
    );

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// POST /api/request-groups/:id/requests - Add request to group
router.post('/:id/requests', async (req, res) => {
  try {
    const { id } = req.params;
    const { endpoint_id, body_json, sort_order } = req.body;

    if (!endpoint_id) {
      return res.status(400).json({ error: 'Endpoint ID is required' });
    }

    const insertId = await insert(
      `INSERT INTO group_requests (group_id, endpoint_id, body_json, sort_order)
       VALUES (?, ?, ?, ?)`,
      [id, endpoint_id, body_json || null, sort_order || 0]
    );

    const newRequest = await querySingle(
      `SELECT
        gr.id,
        gr.group_id,
        gr.endpoint_id,
        gr.body_json,
        gr.sort_order,
        e.metodo,
        e.url
       FROM group_requests gr
       INNER JOIN endpoints e ON gr.endpoint_id = e.id
       WHERE gr.id = ?`,
      [insertId]
    );

    res.status(201).json(newRequest);
  } catch (error) {
    console.error('Error adding request to group:', error);
    res.status(500).json({ error: 'Failed to add request to group' });
  }
});

// DELETE /api/request-groups/:groupId/requests/:requestId - Remove request from group
router.delete('/:groupId/requests/:requestId', async (req, res) => {
  try {
    const { groupId, requestId } = req.params;
    const affectedRows = await execute(
      'DELETE FROM group_requests WHERE id = ? AND group_id = ?',
      [requestId, groupId]
    );

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Request not found in this group' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error removing request from group:', error);
    res.status(500).json({ error: 'Failed to remove request from group' });
  }
});

export default router;
