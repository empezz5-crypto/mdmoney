const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const axios = require("axios");
const webpush = require("web-push");

setGlobalOptions({maxInstances: 10, region: "asia-southeast1"});

admin.initializeApp();
const db = admin.firestore();

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const YOUTUBE_API_KEY = defineSecret("YOUTUBE_API_KEY");
const VAPID_PUBLIC_KEY = defineSecret("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = defineSecret("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = defineSecret("VAPID_SUBJECT");
const N8N_WEBHOOK_URL = defineSecret("N8N_WEBHOOK_URL");
const PUSH_CRON_SECRET = defineSecret("PUSH_CRON_SECRET");

const OPENAI_MODEL = "gpt-4o-mini";

const app = express();
app.use(cors({origin: true}));
app.use(express.json());
app.use((req, _res, next) => {
  req.secrets = {
    openaiKey: OPENAI_API_KEY.value(),
    youtubeKey: YOUTUBE_API_KEY.value(),
    vapidPublic: VAPID_PUBLIC_KEY.value(),
    vapidPrivate: VAPID_PRIVATE_KEY.value(),
    vapidSubject: VAPID_SUBJECT.value() || "mailto:admin@example.com",
    n8nWebhook: N8N_WEBHOOK_URL.value(),
    pushCronSecret: PUSH_CRON_SECRET.value(),
  };
  next();
});

function nowISO() {
  return new Date().toISOString();
}

function getNowLabel(timeZone) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function getToday(timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function fetchTrendingVideos(youtubeKey, regionCode = "KR", maxResults = 12) {
  if (!youtubeKey) return [];
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("chart", "mostPopular");
  url.searchParams.set("regionCode", regionCode);
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("key", youtubeKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`YouTube API error: ${res.status}`);
  }
  const data = await res.json();
  return (data.items || []).map((item) => ({
    title: item && item.snippet ? item.snippet.title : undefined,
    channelTitle: item && item.snippet ? item.snippet.channelTitle : undefined,
  }));
}

async function generateIdeas(openaiKey, {keyword, trends}) {
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const system = "You are a creative producer for YouTube Shorts. Return ONLY valid JSON.";
  const user = {
    keyword: keyword || "",
    trends,
    instructions: [
      "Reflect current trends in the topic.",
      "Output in Korean.",
      "Return JSON with fields: topic, subtopic, hook, promise, structure, length_sec, on_screen_text, broll_idea, cta, hashtags, title_options, posting_time, notes.",
      "Make topic short and punchy (max 40 chars).",
      "Subtopic should be specific and actionable (max 60 chars).",
      "Hook should be a strong opening line (max 60 chars).",
      "Promise should be a clear viewer benefit (max 60 chars).",
      "Structure should be a 3-step flow (max 60 chars).",
      "length_sec should be a number as string (e.g., 30).",
      "on_screen_text should be a short overlay text (max 40 chars).",
      "broll_idea should be a simple visual idea (max 60 chars).",
      "cta should be a short action prompt (max 40 chars).",
      "hashtags should be 3-5 hashtags, space separated.",
      "title_options should be 3 short titles separated by ' | '.",
      "posting_time should be a short time window (e.g., 19-21시).",
      "Notes can include tone or format (max 120 chars).",
    ],
  };

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {role: "system", content: system},
        {role: "user", content: JSON.stringify(user)},
      ],
      response_format: {type: "json_object"},
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const text = data.output_text || "";
  return JSON.parse(text);
}

async function sendPushToAll({vapidPublic, vapidPrivate, vapidSubject}, payload) {
  if (!vapidPublic || !vapidPrivate) {
    throw new Error("VAPID keys are missing");
  }

  webpush.setVapidDetails(
    vapidSubject || "mailto:admin@example.com",
    vapidPublic,
    vapidPrivate
  );
  const subsSnap = await db.collection("pushSubscriptions").get();
  const subs = subsSnap.docs.map((doc) => doc.data());

  const results = await Promise.allSettled(
    subs.map((sub) => webpush.sendNotification(sub, JSON.stringify(payload)))
  );

  const batch = db.batch();
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const statusCode = result.reason && result.reason.statusCode ? result.reason.statusCode : undefined;
      if (statusCode === 410 || statusCode === 404) {
        const endpoint = subs[index] && subs[index].endpoint ? subs[index].endpoint : undefined;
        if (endpoint) {
          const id = crypto.createHash("sha256").update(endpoint).digest("hex");
          batch.delete(db.collection("pushSubscriptions").doc(id));
        }
      }
    }
  });

  await batch.commit();
  return {
    sent: results.filter((r) => r.status === "fulfilled").length,
    total: subs.length,
  };
}

async function runScheduleTick(secrets) {
  const ref = db.collection("pushSchedule").doc("default");
  const snap = await ref.get();
  const schedule = snap.exists ? snap.data() : null;
  if (!schedule || !schedule.enabled || !schedule.time) {
    return {sent: false, reason: "disabled"};
  }
  const timezone = schedule.timezone || "UTC";
  const nowLabel = getNowLabel(timezone);
  if (nowLabel !== schedule.time) return {sent: false, reason: "not-time"};
  const today = getToday(timezone);
  if (schedule.lastSentOn === today) {
    return {sent: false, reason: "already-sent"};
  }
  await sendPushToAll(secrets, {
    title: schedule.title,
    body: schedule.body,
    url: "/",
  });
  await ref.set({lastSentOn: today}, {merge: true});
  return {sent: true};
}

// Shorts CRUD
app.get("/api/shorts", async (_req, res) => {
  const snap = await db.collection("shorts").orderBy("createdAt", "desc").get();
  const items = snap.docs.map((doc) => ({id: doc.id, ...doc.data()}));
  res.json(items);
});

app.post("/api/shorts", async (req, res) => {
  const {topic, subtopic, hook, notes} = req.body || {};
  if (!topic || !subtopic) {
    return res.status(400).json({message: "topic and subtopic required"});
  }

  const timestamp = nowISO();
  const data = {
    topic,
    subtopic,
    hook: hook || "",
    notes: notes || "",
    status: "idea",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const docRef = await db.collection("shorts").add(data);
  return res.status(201).json({id: docRef.id, ...data});
});

app.patch("/api/shorts/:id", async (req, res) => {
  const {id} = req.params;
  const payload = req.body || {};
  const ref = db.collection("shorts").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return res.status(404).json({message: "not found"});
  }
  const next = {...payload, updatedAt: nowISO()};
  await ref.update(next);
  const updated = await ref.get();
  return res.json({id, ...updated.data()});
});

app.delete("/api/shorts/:id", async (req, res) => {
  const {id} = req.params;
  await db.collection("shorts").doc(id).delete();
  return res.json({removed: 1});
});

// n8n webhook
app.post("/api/n8n/trigger", async (req, res) => {
  const {topic, subtopic, hook, notes} = req.body || {};
  if (!topic || !subtopic) {
    return res.status(400).json({message: "topic and subtopic required"});
  }
  const webhookUrl = req.secrets.n8nWebhook;
  if (!webhookUrl) {
    return res.status(500).json({message: "N8N_WEBHOOK_URL is missing"});
  }

  const payload = {
    topic,
    subtopic,
    hook: hook || "",
    notes: notes || "",
    requestedAt: nowISO(),
  };

  try {
    await axios.post(webhookUrl, payload);
  } catch (err) {
    return res.status(502).json({message: "n8n webhook failed"});
  }

  const timestamp = nowISO();
  const data = {
    topic,
    subtopic,
    hook: hook || "",
    notes: notes || "",
    status: "script",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const docRef = await db.collection("shorts").add(data);
  return res.status(201).json({ok: true, item: {id: docRef.id, ...data}});
});

// AI auto-fill
app.post("/api/ai/auto", async (req, res) => {
  try {
    const {keyword} = req.body || {};
    const trends = await fetchTrendingVideos(req.secrets.youtubeKey, "KR", 12);
    const result = await generateIdeas(req.secrets.openaiKey, {keyword, trends});
    return res.json({...result, trends});
  } catch (err) {
    logger.error("AI auto error", err);
    return res.status(500).json({message: err.message || "AI generation failed"});
  }
});

// Push
app.get("/api/push/public-key", (req, res) => {
  const key = req.secrets.vapidPublic;
  if (!key) {
    return res.status(500).json({message: "VAPID_PUBLIC_KEY is missing"});
  }
  return res.json({publicKey: key});
});

app.post("/api/push/subscribe", async (req, res) => {
  const {subscription} = req.body || {};
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({message: "subscription required"});
  }
  const id = crypto.createHash("sha256").update(subscription.endpoint).digest("hex");
  await db.collection("pushSubscriptions").doc(id).set(subscription, {merge: true});
  return res.json({ok: true});
});

app.get("/api/push/schedule", async (_req, res) => {
  const ref = db.collection("pushSchedule").doc("default");
  const snap = await ref.get();
  if (!snap.exists) {
    return res.json({
      enabled: false,
      time: "09:00",
      title: "숏츠 체크인",
      body: "오늘 숏츠 상태를 업데이트해 주세요.",
      timezone: "UTC",
      lastSentOn: null,
    });
  }
  return res.json(snap.data());
});

app.post("/api/push/schedule", async (req, res) => {
  const {enabled, time, title, body, timezone} = req.body || {};
  const schedule = {
    enabled: Boolean(enabled),
    time: time || "09:00",
    title: title || "숏츠 체크인",
    body: body || "오늘 숏츠 상태를 업데이트해 주세요.",
    timezone: timezone || "UTC",
    lastSentOn: null,
  };
  await db.collection("pushSchedule").doc("default").set(schedule, {merge: true});
  return res.json(schedule);
});

app.post("/api/push/test", async (req, res) => {
  try {
    const result = await sendPushToAll(req.secrets, {
      title: "테스트 알림",
      body: "푸시 알림이 정상적으로 작동합니다.",
      url: "/",
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({message: err.message});
  }
});

app.post("/api/push/tick", async (req, res) => {
  const secret = req.secrets.pushCronSecret;
  const header = req.header("x-cron-secret");
  if (secret && secret !== header) {
    return res.status(401).json({message: "unauthorized"});
  }
  try {
    const result = await runScheduleTick(req.secrets);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({message: err.message});
  }
});

exports.api = onRequest(
  {
    secrets: [
      OPENAI_API_KEY,
      YOUTUBE_API_KEY,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
      VAPID_SUBJECT,
      N8N_WEBHOOK_URL,
      PUSH_CRON_SECRET,
    ],
    region: "asia-southeast1",
  },
  app
);

exports.pushTick = onSchedule(
  {
    schedule: "every 1 minutes",
    region: "asia-southeast1",
    secrets: [
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
      VAPID_SUBJECT,
    ],
  },
  async () => {
    const secrets = {
      vapidPublic: VAPID_PUBLIC_KEY.value(),
      vapidPrivate: VAPID_PRIVATE_KEY.value(),
      vapidSubject: VAPID_SUBJECT.value() || "mailto:admin@example.com",
    };
    try {
      await runScheduleTick(secrets);
    } catch (err) {
      logger.error("pushTick error", err);
    }
  }
);
