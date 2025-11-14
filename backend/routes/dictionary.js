import express from 'express';
import { query, querySingle, insert, execute } from '../lib/mysql.js';

const router = express.Router();

// GET /api/dictionary - List dictionary entries with pagination
router.get('/', async (req, res) => {
  try {
    // Parse query parameters for pagination
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    // Validate limit and offset to prevent SQL injection
    const safeLimit = Math.max(1, Math.min(1000, limit));
    const safeOffset = Math.max(0, offset);

    // Get total count
    const [countResult] = await query(
      'SELECT COUNT(*) as total FROM field_dictionary'
    );
    const total = countResult.total;

    // Get paginated entries (using template literal because LIMIT/OFFSET can't be parameterized)
    const entries = await query(
      `SELECT * FROM field_dictionary ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`
    );

    res.json({
      entries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching dictionary:', error);
    res.status(500).json({ error: 'Failed to fetch dictionary' });
  }
});

// POST /api/dictionary/batch - Insert multiple dictionary entries
router.post('/batch', async (req, res) => {
  try {
    const { entries } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'Entries array is required' });
    }

    // Validate entries - only business_element_name is required
    for (const entry of entries) {
      if (!entry.business_element_name) {
        return res.status(400).json({ error: 'Each entry must have business_element_name' });
      }
    }

    // MySQL has a limit of 65535 placeholders in prepared statements
    // With 8 fields per entry, we can safely insert ~8000 entries at once
    // But to be conservative and avoid any MySQL configuration limits, batch at 100 entries
    const BATCH_SIZE = 100;
    let insertedCount = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      console.log(`\n📦 Processing batch ${batchNum} (entries ${i + 1}-${i + batch.length})...`);

      // Build batch insert query with all 8 fields
      const values = batch.map(e => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const params = batch.flatMap(e => [
        e.business_element_name,
        e.description || null,
        e.reference_scots_table || null,
        e.json_path || null,
        e.element_name || null,
        e.element_type || null,
        e.json_data_type || null,
        e.example || null
      ]);

      // Log sample data from this batch
      console.log(`🔍 Sample from batch ${batchNum}:`);
      console.log(`   First entry: ${batch[0].business_element_name}`);
      console.log(`   Has special chars: ${/[^\x00-\x7F]/.test(JSON.stringify(batch[0]))}`);
      console.log(`   Total params: ${params.length} (${batch.length} entries × 8 fields)`);

      // Use CONVERT to force UTF-8 encoding for all string parameters
      const convertedValues = batch.map(() =>
        '(CONVERT(? USING utf8mb4), CONVERT(? USING utf8mb4), CONVERT(? USING utf8mb4), CONVERT(? USING utf8mb4), CONVERT(? USING utf8mb4), CONVERT(? USING utf8mb4), CONVERT(? USING utf8mb4), CONVERT(? USING utf8mb4))'
      ).join(', ');

      try {
        await execute(
          `INSERT IGNORE INTO field_dictionary (
            business_element_name,
            description,
            reference_scots_table,
            json_path,
            element_name,
            element_type,
            json_data_type,
            example
          ) VALUES ${convertedValues}`,
          params
        );

        insertedCount += batch.length;
        console.log(`✅ Inserted batch ${batchNum}: ${batch.length} entries (total: ${insertedCount}/${entries.length})`);
      } catch (error) {
        console.error(`❌ Failed at batch ${batchNum}:`, {
          batchStart: i + 1,
          batchEnd: i + batch.length,
          firstEntry: batch[0].business_element_name,
          errorCode: error.code,
          errorMessage: error.message
        });
        throw error;
      }
    }

    res.status(201).json({
      message: 'Dictionary entries inserted successfully',
      insertedCount,
      totalEntries: entries.length
    });
  } catch (error) {
    console.error('Error inserting dictionary entries:', error);
    res.status(500).json({ error: 'Failed to insert dictionary entries' });
  }
});

// PUT /api/dictionary/:id/description - Update dictionary entry description
router.put('/:id/description', async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao } = req.body;

    if (!descricao) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const affectedRows = await execute(
      'UPDATE field_dictionary SET descricao = ? WHERE id = ?',
      [descricao, id]
    );

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Dictionary entry not found' });
    }

    const updated = await querySingle(
      'SELECT * FROM field_dictionary WHERE id = ?',
      [id]
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating dictionary entry:', error);
    res.status(500).json({ error: 'Failed to update dictionary entry' });
  }
});

// DELETE /api/dictionary/:id - Delete dictionary entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const affectedRows = await execute(
      'DELETE FROM field_dictionary WHERE id = ?',
      [id]
    );

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Dictionary entry not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting dictionary entry:', error);
    res.status(500).json({ error: 'Failed to delete dictionary entry' });
  }
});

export default router;
