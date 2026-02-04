const { readJson, writeJson } = require('../utils/fileStore');
const { sendToAll } = require('./pushService');

const SCHEDULE_FILE = 'push-schedule.json';

function getNowLabel(timeZone) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

function getToday(timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function runScheduleTick() {
  const schedule = await readJson(SCHEDULE_FILE, {
    enabled: false,
    time: '09:00',
    title: '숏츠 체크인',
    body: '오늘 숏츠 상태를 업데이트해 주세요.',
    timezone: 'UTC',
    lastSentOn: null,
  });

  if (!schedule.enabled || !schedule.time) return { sent: false, reason: 'disabled' };

  const timezone = schedule.timezone || 'UTC';
  const nowLabel = getNowLabel(timezone);
  if (nowLabel !== schedule.time) return { sent: false, reason: 'not-time' };

  const today = getToday(timezone);
  if (schedule.lastSentOn === today) return { sent: false, reason: 'already-sent' };

  await sendToAll({
    title: schedule.title,
    body: schedule.body,
    url: '/',
  });

  schedule.lastSentOn = today;
  await writeJson(SCHEDULE_FILE, schedule);
  return { sent: true };
}

function startPushScheduler() {
  setInterval(async () => {
    try {
      await runScheduleTick();
    } catch (err) {
      console.warn('Push scheduler error:', err.message);
    }
  }, 30 * 1000);
}

module.exports = { startPushScheduler, runScheduleTick };
