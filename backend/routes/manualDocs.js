import express from 'express';
import { query, execute } from '../lib/mysql.js';

const router = express.Router();

// POST /api/manual-docs/apply - Apply dictionary descriptions to response fields
router.post('/apply', async (req, res) => {
  try {
    // Find all response_fields without description that have a matching dictionary entry
    const matchingFields = await query(
      `SELECT
        rf.id,
        rf.campo,
        fd.description
       FROM response_fields rf
       INNER JOIN field_dictionary fd ON rf.campo = fd.json_path
       WHERE (rf.descricao IS NULL OR rf.descricao = '')
       AND fd.description IS NOT NULL
       AND fd.description != ''`
    );

    let updatedCount = 0;
    let errors = [];

    // Update each field
    for (const field of matchingFields) {
      try {
        await execute(
          'UPDATE response_fields SET descricao = ? WHERE id = ?',
          [field.description, field.id]
        );
        updatedCount++;
      } catch (err) {
        console.error(`Error updating field ${field.id}:`, err);
        errors.push({ fieldId: field.id, error: err.message });
      }
    }

    // Get statistics
    const [totalFields] = await query(
      'SELECT COUNT(*) as total FROM response_fields'
    );

    const [fieldsWithDescription] = await query(
      `SELECT COUNT(*) as count FROM response_fields
       WHERE descricao IS NOT NULL AND descricao != ''`
    );

    const [fieldsWithoutMatch] = await query(
      `SELECT COUNT(*) as count FROM response_fields rf
       LEFT JOIN field_dictionary fd ON rf.campo = fd.json_path
       WHERE (rf.descricao IS NULL OR rf.descricao = '')
       AND (fd.json_path IS NULL OR fd.description IS NULL OR fd.description = '')`
    );

    res.json({
      success: true,
      updatedCount,
      skippedCount: errors.length,
      notFoundInDictionaryCount: fieldsWithoutMatch.count,
      totalFields: totalFields.total,
      fieldsWithDescription: fieldsWithDescription.count,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error applying dictionary descriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply dictionary descriptions',
      message: error.message
    });
  }
});

// GET /api/manual-docs/preview - Preview matching fields (without updating)
router.get('/preview', async (req, res) => {
  try {
    const matchingFields = await query(
      `SELECT
        rf.id,
        rf.campo,
        rf.descricao as current_description,
        fd.description as dictionary_description
       FROM response_fields rf
       INNER JOIN field_dictionary fd ON rf.campo = fd.json_path
       WHERE (rf.descricao IS NULL OR rf.descricao = '')
       AND fd.description IS NOT NULL
       AND fd.description != ''
       LIMIT 100`
    );

    const [totalMatches] = await query(
      `SELECT COUNT(*) as count
       FROM response_fields rf
       INNER JOIN field_dictionary fd ON rf.campo = fd.json_path
       WHERE (rf.descricao IS NULL OR rf.descricao = '')
       AND fd.description IS NOT NULL
       AND fd.description != ''`
    );

    res.json({
      preview: matchingFields,
      totalMatches: totalMatches.count,
    });
  } catch (error) {
    console.error('Error previewing matches:', error);
    res.status(500).json({ error: 'Failed to preview matches' });
  }
});

export default router;
