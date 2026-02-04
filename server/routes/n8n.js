const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { readJson, writeJson } = require('../utils/fileStore');

const router = express.Router();
const FILE = 'shorts.json';

function nowISO() {
  return new Date().toISOString();
}

router.post('/trigger', async (req, res) => {
  const { topic, subtopic, hook, notes } = req.body;
  if (!topic || !subtopic) {
    return res.status(400).json({ message: 'topic and subtopic required' });
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(500).json({ message: 'N8N_WEBHOOK_URL is missing' });
  }

  const payload = {
    topic,
    subtopic,
    hook: hook || '',
    notes: notes || '',
    requestedAt: nowISO(),
  };

  try {
    await axios.post(webhookUrl, payload);
  } catch (err) {
    return res.status(502).json({ message: 'n8n webhook failed' });
  }

  const data = await readJson(FILE, []);
  const timestamp = nowISO();
  const item = {
    id: crypto.randomUUID(),
    topic,
    subtopic,
    hook: hook || '',
    notes: notes || '',
    status: 'script',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  data.push(item);
  await writeJson(FILE, data);

  return res.status(201).json({ ok: true, item });
});

module.exports = router;
