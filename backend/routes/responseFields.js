import express from 'express';
import { query, querySingle, insert, execute } from '../lib/mysql.js';

const router = express.Router();

// POST /api/response-fields - Save response field (with duplicate prevention)
router.post('/', async (req, res) => {
  try {
    const { metodo, url, endpoint, tipo, campo, detalhes, descricao, title } = req.body;

    if (!metodo || !url || !endpoint || !tipo || !campo || !detalhes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Extract elemento from campo (last segment after last dot)
    const elemento = campo.includes('.') ? campo.split('.').pop() : campo;

    // Use INSERT IGNORE to prevent duplicates (unique constraint)
    const insertId = await insert(
      `INSERT IGNORE INTO response_fields (metodo, url, endpoint, tipo, campo, elemento, detalhes, descricao, title)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [metodo, url, endpoint, tipo, campo, elemento, detalhes, descricao || null, title || null]
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
       WHERE descricao IS NOT NULL 
        AND descricao != ''
          AND (campo like '%organization.beneficialOwnership.beneficialOwners%' 
          OR campo like '%searchCandidates.organization.duns'
          OR campo like 'organization.registrationNumbers%'
          OR campo like 'organization.primaryIndustryCode.usSicV4Description'
          OR campo like '%organization.dunsControlStatus.operatingSubStatus.startDate%'
          OR campo like 'organization.primaryAddress%'
          OR campo like 'applicant.isoCountry%'
          OR campo like '%screeningResult.profiles.rdcEntity.events.sources.type%'
          OR campo like '%screeningResult.profiles.rdcEntity.attributes.type%'
          OR campo like '%rdcEntity.isAPEP%'
          OR campo like '%rdcEntity.relationships%'
          OR campo like '%screeningResult.profiles.rdcEntity.events.categoryDescription%'
          OR campo like '%sourceKey%'
          OR campo like '%screeningResult.profiles.risk%'
        )
       ORDER BY id asc`
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

// GET /api/response-fields/untranslated - Get fields with description that haven't been translated yet
router.get('/untranslated', async (req, res) => {
  try {
    const fields = await query(
      `SELECT rf.*
       FROM response_fields rf
       LEFT JOIN translated_fields tf ON rf.id = tf.response_field_id
       WHERE (rf.descricao IS NOT NULL AND rf.descricao != '')
         AND tf.id IS NULL
       ORDER BY rf.created_at DESC`
    );
    res.json(fields);
  } catch (error) {
    console.error('Error fetching untranslated fields:', error);
    res.status(500).json({ error: 'Failed to fetch untranslated fields' });
  }
});

// POST /api/response-fields/:id/mark-translated - Mark a field as translated
router.post('/:id/mark-translated', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if field exists
    const field = await querySingle(
      'SELECT * FROM response_fields WHERE id = ?',
      [id]
    );

    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }

    // Insert into translated_fields (INSERT IGNORE to prevent duplicates)
    await insert(
      'INSERT IGNORE INTO translated_fields (response_field_id) VALUES (?)',
      [id]
    );

    res.json({ success: true, message: 'Field marked as translated' });
  } catch (error) {
    console.error('Error marking field as translated:', error);
    res.status(500).json({ error: 'Failed to mark field as translated' });
  }
});

// GET /api/response-fields/translation-statistics - Get translation statistics
router.get('/translation-statistics', async (req, res) => {
  try {
    const stats = await querySingle(
      `SELECT
        COUNT(DISTINCT rf.id) as total,
        SUM(CASE WHEN rf.descricao IS NOT NULL AND rf.descricao != '' THEN 1 ELSE 0 END) as with_description,
        COUNT(DISTINCT tf.response_field_id) as translated
       FROM response_fields rf
       LEFT JOIN translated_fields tf ON rf.id = tf.response_field_id`
    );

    const total = stats.total || 0;
    const withDescription = stats.with_description || 0;
    const translated = stats.translated || 0;

    res.json({
      total,
      withDescription,
      translated,
      percentageTranslated: withDescription > 0 ? ((translated / withDescription) * 100).toFixed(1) : '0.0'
    });
  } catch (error) {
    console.error('Error fetching translation statistics:', error);
    res.status(500).json({ error: 'Failed to fetch translation statistics' });
  }
});

export default router;
