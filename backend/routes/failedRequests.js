import express from 'express';
import { query, querySingle, insert, execute } from '../lib/mysql.js';

const router = express.Router();

// POST /api/failed-requests - Save a failed 401 request
router.post('/', async (req, res) => {
  try {
    const {
      endpoint_id,
      body,
      title,
      bearer_token,
      error_status,
      error_message,
      error_response_body,
    } = req.body;

    if (!endpoint_id) {
      return res.status(400).json({ error: 'Endpoint ID is required' });
    }

    const insertId = await insert(
      `INSERT INTO failed_requests_401
       (endpoint_id, body, title, bearer_token, error_status, error_message, error_response_body)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        endpoint_id,
        body || null,
        title || null,
        bearer_token || null,
        error_status || 401,
        error_message || null,
        error_response_body || null,
      ]
    );

    const newFailedRequest = await querySingle(
      `SELECT
        fr.id,
        fr.endpoint_id,
        fr.body,
        fr.title,
        fr.bearer_token,
        fr.error_status,
        fr.error_message,
        fr.error_response_body,
        fr.created_at,
        e.metodo,
        e.url
       FROM failed_requests_401 fr
       INNER JOIN endpoints e ON fr.endpoint_id = e.id
       WHERE fr.id = ?`,
      [insertId]
    );

    res.status(201).json(newFailedRequest);
  } catch (error) {
    console.error('Error saving failed request:', error);
    res.status(500).json({ error: 'Failed to save failed request' });
  }
});

// GET /api/failed-requests - List all failed 401 requests
router.get('/', async (req, res) => {
  try {
    const failedRequests = await query(
      `SELECT
        fr.id,
        fr.endpoint_id,
        fr.body,
        fr.title,
        fr.bearer_token,
        fr.error_status,
        fr.error_message,
        fr.error_response_body,
        fr.created_at,
        e.metodo,
        e.url
       FROM failed_requests_401 fr
       INNER JOIN endpoints e ON fr.endpoint_id = e.id
       ORDER BY fr.created_at DESC`
    );

    res.json(failedRequests);
  } catch (error) {
    console.error('Error fetching failed requests:', error);
    res.status(500).json({ error: 'Failed to fetch failed requests' });
  }
});

// GET /api/failed-requests/:id - Get a specific failed request
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const failedRequest = await querySingle(
      `SELECT
        fr.id,
        fr.endpoint_id,
        fr.body,
        fr.title,
        fr.bearer_token,
        fr.error_status,
        fr.error_message,
        fr.error_response_body,
        fr.created_at,
        e.metodo,
        e.url
       FROM failed_requests_401 fr
       INNER JOIN endpoints e ON fr.endpoint_id = e.id
       WHERE fr.id = ?`,
      [id]
    );

    if (!failedRequest) {
      return res.status(404).json({ error: 'Failed request not found' });
    }

    res.json(failedRequest);
  } catch (error) {
    console.error('Error fetching failed request:', error);
    res.status(500).json({ error: 'Failed to fetch failed request' });
  }
});

// DELETE /api/failed-requests/:id - Delete a failed request
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const affectedRows = await execute(
      'DELETE FROM failed_requests_401 WHERE id = ?',
      [id]
    );

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Failed request not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting failed request:', error);
    res.status(500).json({ error: 'Failed to delete failed request' });
  }
});

export default router;
