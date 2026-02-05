const express = require('express');

const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

async function fetchTrendingVideos(regionCode = 'KR', maxResults = 12) {
  if (!YOUTUBE_API_KEY) return [];
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('chart', 'mostPopular');
  url.searchParams.set('regionCode', regionCode);
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('key', YOUTUBE_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`YouTube API error: ${res.status}`);
  }
  const data = await res.json();
  return (data.items || []).map((item) => ({
    title: item.snippet?.title,
    channelTitle: item.snippet?.channelTitle,
  }));
}

async function generateIdeas({ keyword, trends }) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing');
  }

  const system = `You are a creative producer for YouTube Shorts. Return ONLY valid JSON.`;
  const user = {
    keyword: keyword || '',
    trends,
    instructions: [
      'Reflect current trends in the topic.',
      'Output in Korean.',
      'Return JSON with fields: topic, subtopic, hook, notes.',
      'Make topic short and punchy (max 40 chars).',
      'Subtopic should be specific and actionable (max 60 chars).',
      'Hook should be a strong opening line (max 60 chars).',
      'Notes can include tone, format, or CTA (max 120 chars).',
    ],
  };

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(user) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const text = data.output_text || '';
  return JSON.parse(text);
}

router.post('/auto', async (req, res) => {
  try {
    const { keyword } = req.body || {};
    const trends = await fetchTrendingVideos('KR', 12);
    const result = await generateIdeas({ keyword, trends });
    return res.json({
      ...result,
      trends,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'AI generation failed' });
  }
});

module.exports = router;
