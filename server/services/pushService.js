const webpush = require('web-push');
const { readJson, writeJson } = require('../utils/fileStore');

const SUB_FILE = 'push-subscriptions.json';
let configured = false;

function configureWebPush() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys are missing');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

async function sendToAll(payload) {
  configureWebPush();
  const subscriptions = await readJson(SUB_FILE, []);
  const results = await Promise.allSettled(
    subscriptions.map((sub) => webpush.sendNotification(sub, JSON.stringify(payload)))
  );

  const activeSubs = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      activeSubs.push(subscriptions[index]);
    } else {
      const statusCode = result.reason?.statusCode;
      if (statusCode !== 410 && statusCode !== 404) {
        activeSubs.push(subscriptions[index]);
      }
    }
  });

  if (activeSubs.length !== subscriptions.length) {
    await writeJson(SUB_FILE, activeSubs);
  }

  return {
    sent: results.filter((result) => result.status === 'fulfilled').length,
    total: subscriptions.length,
  };
}

module.exports = { sendToAll };
