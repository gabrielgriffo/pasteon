import express from 'express';
import { query, querySingle, insert, execute } from '../lib/mysql.js';

const router = express.Router();

// GET /api/endpoints - List all endpoints
router.get('/', async (req, res) => {
  try {
    const endpoints = await query(
      'SELECT * FROM endpoints ORDER BY created_at DESC'
    );
    res.json(endpoints);
  } catch (error) {
    console.error('Error fetching endpoints:', error);
    res.status(500).json({ error: 'Failed to fetch endpoints' });
  }
});

// POST /api/endpoints - Create new endpoint
router.post('/', async (req, res) => {
  try {
    const { metodo, url } = req.body;

    if (!metodo || !url) {
      return res.status(400).json({ error: 'Method and URL are required' });
    }

    // Check if endpoint already exists
    const existing = await querySingle(
      'SELECT id FROM endpoints WHERE metodo = ? AND url = ?',
      [metodo, url]
    );

    if (existing) {
      return res.status(409).json({ error: 'Endpoint already exists' });
    }

    const insertId = await insert(
      'INSERT INTO endpoints (metodo, url) VALUES (?, ?)',
      [metodo, url]
    );

    const newEndpoint = await querySingle(
      'SELECT * FROM endpoints WHERE id = ?',
      [insertId]
    );

    res.status(201).json(newEndpoint);
  } catch (error) {
    console.error('Error creating endpoint:', error);
    res.status(500).json({ error: 'Failed to create endpoint' });
  }
});

// DELETE /api/endpoints/:id - Delete endpoint by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const affectedRows = await execute(
      'DELETE FROM endpoints WHERE id = ?',
      [id]
    );

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting endpoint:', error);
    res.status(500).json({ error: 'Failed to delete endpoint' });
  }
});

export default router;
