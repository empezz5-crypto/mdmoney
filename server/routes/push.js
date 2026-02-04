const express = require('express');
const { readJson, writeJson } = require('../utils/fileStore');
const { sendToAll } = require('../services/pushService');
const { runScheduleTick } = require('../services/pushScheduler');

const router = express.Router();
const SUB_FILE = 'push-subscriptions.json';
const SCHEDULE_FILE = 'push-schedule.json';

router.get('/public-key', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(500).json({ message: 'VAPID_PUBLIC_KEY is missing' });
  }
  return res.json({ publicKey });
});

router.post('/subscribe', async (req, res) => {
  const { subscription } = req.body;
  if (!subscription?.endpoint) {
    return res.status(400).json({ message: 'subscription required' });
  }

  const subscriptions = await readJson(SUB_FILE, []);
  const exists = subscriptions.some((item) => item.endpoint === subscription.endpoint);

  if (!exists) {
    subscriptions.push(subscription);
    await writeJson(SUB_FILE, subscriptions);
  }

  return res.json({ ok: true, total: subscriptions.length });
});

router.get('/schedule', async (req, res) => {
  const schedule = await readJson(SCHEDULE_FILE, {
    enabled: false,
    time: '09:00',
    title: '숏츠 체크인',
    body: '오늘 숏츠 상태를 업데이트해 주세요.',
    timezone: 'UTC',
    lastSentOn: null,
  });
  return res.json(schedule);
});

router.post('/schedule', async (req, res) => {
  const { enabled, time, title, body, timezone } = req.body;

  const schedule = {
    enabled: Boolean(enabled),
    time: time || '09:00',
    title: title || '숏츠 체크인',
    body: body || '오늘 숏츠 상태를 업데이트해 주세요.',
    timezone: timezone || 'UTC',
    lastSentOn: null,
  };

  await writeJson(SCHEDULE_FILE, schedule);
  return res.json(schedule);
});

router.post('/tick', async (req, res) => {
  const secret = process.env.PUSH_CRON_SECRET;
  const header = req.header('x-cron-secret');

  if (secret && secret !== header) {
    return res.status(401).json({ message: 'unauthorized' });
  }

  try {
    const result = await runScheduleTick();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post('/test', async (req, res) => {
  try {
    const result = await sendToAll({
      title: '테스트 알림',
      body: '푸시 알림이 정상적으로 작동합니다.',
      url: '/',
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
