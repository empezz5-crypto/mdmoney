const express = require('express');
const crypto = require('crypto');
const { readJson, writeJson } = require('../utils/fileStore');

const router = express.Router();
const FILE = 'shorts.json';

function nowISO() {
  return new Date().toISOString();
}

router.get('/', async (req, res) => {
  const data = await readJson(FILE, []);
  const sorted = [...data].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.json(sorted);
});

router.post('/', async (req, res) => {
  const { topic, subtopic, hook, notes } = req.body;
  if (!topic || !subtopic) {
    return res.status(400).json({ message: 'topic and subtopic required' });
  }

  const data = await readJson(FILE, []);
  const timestamp = nowISO();
  const item = {
    id: crypto.randomUUID(),
    topic,
    subtopic,
    hook: hook || '',
    notes: notes || '',
    status: 'idea',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  data.push(item);
  await writeJson(FILE, data);

  return res.status(201).json(item);
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const payload = req.body || {};
  const data = await readJson(FILE, []);
  const index = data.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ message: 'not found' });
  }

  data[index] = {
    ...data[index],
    ...payload,
    updatedAt: nowISO(),
  };

  await writeJson(FILE, data);
  return res.json(data[index]);
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const data = await readJson(FILE, []);
  const next = data.filter((item) => item.id !== id);
  await writeJson(FILE, next);
  return res.json({ removed: data.length - next.length });
});

module.exports = router;
