import express from 'express';
import { query, querySingle, insert, execute } from '../lib/mysql.js';

const router = express.Router();

// POST /api/response-fields - Save response field (with duplicate prevention)
router.post('/', async (req, res) => {
  try {
    const { metodo, url, endpoint, tipo, campo, detalhes, descricao } = req.body;

    if (!metodo || !url || !endpoint || !tipo || !campo || !detalhes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Use INSERT IGNORE to prevent duplicates (unique constraint)
    const insertId = await insert(
      `INSERT IGNORE INTO response_fields (metodo, url, endpoint, tipo, campo, detalhes, descricao)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [metodo, url, endpoint, tipo, campo, detalhes, descricao || null]
    );

    // If insertId is 0, it means duplicate was ignored
    if (insertId === 0) {
      return res.status(200).json({ message: 'Duplicate field ignored' });
    }

    const newField = await querySingle(
      'SELECT * FROM response_fields WHERE id = ?',
      [insertId]
    );

    res.status(201).json(newField);
  } catch (error) {
    console.error('Error saving response field:', error);
    res.status(500).json({ error: 'Failed to save response field' });
  }
});

// GET /api/response-fields/without-description - Get fields without description
router.get('/without-description', async (req, res) => {
  try {
    const fields = await query(
      `SELECT * FROM response_fields
       WHERE descricao IS NULL OR descricao = ''
       ORDER BY created_at DESC`
    );
    res.json(fields);
  } catch (error) {
    console.error('Error fetching fields without description:', error);
    res.status(500).json({ error: 'Failed to fetch fields' });
  }
});

// GET /api/response-fields/with-description - Get fields with description
router.get('/with-description', async (req, res) => {
  try {
    const fields = await query(
      `SELECT * FROM response_fields
       WHERE descricao IS NOT NULL AND descricao != ''
       ORDER BY created_at DESC`
    );
    res.json(fields);
  } catch (error) {
    console.error('Error fetching fields with description:', error);
    res.status(500).json({ error: 'Failed to fetch fields' });
  }
});

// PUT /api/response-fields/:id/description - Update field description
router.put('/:id/description', async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao } = req.body;

    if (!descricao) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const affectedRows = await execute(
      'UPDATE response_fields SET descricao = ? WHERE id = ?',
      [descricao, id]
    );

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }

    const updatedField = await querySingle(
      'SELECT * FROM response_fields WHERE id = ?',
      [id]
    );

    res.json(updatedField);
  } catch (error) {
    console.error('Error updating field description:', error);
    res.status(500).json({ error: 'Failed to update description' });
  }
});

// GET /api/response-fields/statistics - Get documentation statistics
router.get('/statistics', async (req, res) => {
  try {
    const stats = await querySingle(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN descricao IS NOT NULL AND descricao != '' THEN 1 ELSE 0 END) as with_description,
        SUM(CASE WHEN descricao IS NULL OR descricao = '' THEN 1 ELSE 0 END) as without_description
       FROM response_fields`
    );

    const total = stats.total || 0;
    const withDescription = stats.with_description || 0;
    const withoutDescription = stats.without_description || 0;

    res.json({
      total,
      withDescription,
      withoutDescription,
      percentageDocumented: total > 0 ? ((withDescription / total) * 100).toFixed(1) : '0.0'
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
