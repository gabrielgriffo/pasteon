import express from 'express';
import { query, querySingle, insert, execute } from '../lib/mysql.js';

const router = express.Router();

// GET /api/ai-settings/:provider - Get settings for specific provider
router.get('/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const settings = await querySingle(
      'SELECT * FROM ai_provider_settings WHERE provider = ?',
      [provider]
    );

    if (!settings) {
      return res.status(404).json({ error: 'Settings not found for this provider' });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    res.status(500).json({ error: 'Failed to fetch AI settings' });
  }
});

// POST /api/ai-settings - Create or update AI provider settings
router.post('/', async (req, res) => {
  try {
    const { provider, requests_per_minute, requests_per_day } = req.body;

    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }

    // Check if settings already exist
    const existing = await querySingle(
      'SELECT id FROM ai_provider_settings WHERE provider = ?',
      [provider]
    );

    if (existing) {
      // Update existing
      await execute(
        `UPDATE ai_provider_settings
         SET requests_per_minute = ?, requests_per_day = ?, updated_at = CURRENT_TIMESTAMP
         WHERE provider = ?`,
        [requests_per_minute || null, requests_per_day || null, provider]
      );

      const updated = await querySingle(
        'SELECT * FROM ai_provider_settings WHERE provider = ?',
        [provider]
      );

      return res.json(updated);
    } else {
      // Insert new
      const insertId = await insert(
        `INSERT INTO ai_provider_settings (provider, requests_per_minute, requests_per_day)
         VALUES (?, ?, ?)`,
        [provider, requests_per_minute || null, requests_per_day || null]
      );

      const newSettings = await querySingle(
        'SELECT * FROM ai_provider_settings WHERE id = ?',
        [insertId]
      );

      return res.status(201).json(newSettings);
    }
  } catch (error) {
    console.error('Error saving AI settings:', error);
    res.status(500).json({ error: 'Failed to save AI settings' });
  }
});

// DELETE /api/ai-settings/:provider - Delete settings for provider
router.delete('/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const affectedRows = await execute(
      'DELETE FROM ai_provider_settings WHERE provider = ?',
      [provider]
    );

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Settings not found for this provider' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting AI settings:', error);
    res.status(500).json({ error: 'Failed to delete AI settings' });
  }
});

export default router;
