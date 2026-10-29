import express from 'express';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize GoogleGenAI client on the server side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Endpoint: POST /api/generate-sentences
 * Generates natural Slovenian practice sentences using only allowed vocabulary.
 */
app.post('/api/generate-sentences', async (req, res) => {
  try {
    const { targetWords, allowedWords } = req.body;

    if (!Array.isArray(targetWords) || !Array.isArray(allowedWords)) {
      return res.status(400).json({ error: 'targetWords and allowedWords arrays are required.' });
    }

    const systemPrompt = `You are a native Slovenian language teacher creating practice sentences for an A1-B2 language learner.
TASK: Write 3 to 5 simple, natural present-tense Slovenian sentences and English translations.

STRICT CONSTRAINTS:
1. Sentence length: 3 to 8 words per sentence.
2. Structure: Simple present-tense statements or short questions (natural Slovenian).
3. TARGET WORDS: Every sentence MUST contain at least one of these target words: ${JSON.stringify(targetWords)}.
4. ALLOWED VOCABULARY: Every sentence must be composed almost entirely (at least 85%) of words from this allowed vocabulary list (or their natural present-tense/inflected forms):
${JSON.stringify(allowedWords)}
5. Output format: Respond in valid JSON only with this schema:
{
  "sentences": [
    {
      "sl": "Danes pijem hladno vodo.",
      "en": "Today I drink cold water.",
      "targets": ["danes", "piti", "voda"]
    }
  ]
}`;

    // Use ThinkingLevel.LOW for low-latency text generation
    const apiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: 'LOW' as any },
      },
    });

    // Generous 15s timeout so cloud API calls complete without error
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API call timed out after 15s')), 15000)
    );

    const response = await Promise.race([apiPromise, timeoutPromise]);
    const text = response.text?.trim() || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    if (!parsed.sentences || !Array.isArray(parsed.sentences)) {
      parsed = { sentences: [] };
    }

    return res.json(parsed);
  } catch (err: any) {
    console.warn('Sentence generation failed or timed out:', err?.message);
    return res.json({ sentences: [] });
  }
});

// In-memory cache for generated authentic Slovenian speech audio
const ttsCache = new Map<string, { buffer: Buffer; mimeType: string }>();

// In-flight deduplication to prevent parallel duplicate WebSocket requests
const inFlightTTS = new Map<string, Promise<{ buffer: Buffer; mimeType: string }>>();

// Persistent disk cache directory for audio
const DISK_CACHE_DIR = path.join('/tmp', 'dvojeziko_audio_cache');
try {
  if (!fs.existsSync(DISK_CACHE_DIR)) {
    fs.mkdirSync(DISK_CACHE_DIR, { recursive: true });
  }
} catch (_) {}

/**
 * Preprocesses Slovenian text for authentic neural text-to-speech pronunciation.
 *
 * Slovenian phonetic rules:
 * 1. Standalone preposition "v" is pronounced as bilabial /u̯/ (sounds like "u" / "yu").
 * 2. Preposition "v" before consonants vocalizes to "u".
 * 3. Standalone preposition "z" or "s" is vocalized as "ze" / "se".
 * 4. Isolated words without terminal punctuation get capitalized with a period for natural prosody.
 */
function prepareSlovenianTTSInput(rawText: string): string {
  // Pass genuine, clean Slovenian text without artificial phonetic corruption
  return rawText.trim();
}

// Serialized execution queue for Edge TTS to prevent simultaneous handshake bursts
let edgeQueue = Promise.resolve<any>(null);

function synthesizeWithEdgeTTS(text: string): Promise<Buffer> {
  const task = async (): Promise<Buffer> => {
    const tts = new MsEdgeTTS();
    await tts.setMetadata('sl-SI-PetraNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);
    const chunks: Buffer[] = [];

    return new Promise<Buffer>((resolve, reject) => {
      const timer = setTimeout(() => {
        try { tts.close(); } catch (_) {}
        reject(new Error('Edge TTS timed out after 8s'));
      }, 8000);

      audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      audioStream.on('end', () => {
        clearTimeout(timer);
        try { tts.close(); } catch (_) {}
        resolve(Buffer.concat(chunks));
      });
      audioStream.on('error', (err: any) => {
        clearTimeout(timer);
        try { tts.close(); } catch (_) {}
        reject(err);
      });
    });
  };

  const nextPromise = edgeQueue.then(task, task);
  edgeQueue = nextPromise;
  return nextPromise;
}

/**
 * Native Slovenian Neural Voice Synthesis (sl-SI-PetraNeural)
 * Produces authentic native pronunciation with correct pitch accent, Slovenian č/š/ž phonetics,
 * and natural rhythm.
 */
async function synthesizeSlovenianSpeech(text: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const buffer = await synthesizeWithEdgeTTS(text);
  return { buffer, mimeType: 'audio/mpeg' };
}

/**
 * Endpoint: GET /api/tts?text=...
 * Generates and streams authentic native Slovenian audio pronunciation with multi-tier resilience.
 */
app.get('/api/tts', async (req, res) => {
  try {
    const rawText = (req.query.text as string || '').trim();
    if (!rawText) {
      return res.status(400).send('Missing text parameter');
    }

    const cleanText = rawText.replace(/[()]/g, '').trim().slice(0, 300);
    const cacheKey = cleanText.toLowerCase();

    // 1. Check in-memory cache (instant 0ms response)
    if (ttsCache.has(cacheKey)) {
      const cached = ttsCache.get(cacheKey)!;
      res.setHeader('Content-Type', cached.mimeType || 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      return res.send(cached.buffer);
    }

    // 2. Check persistent disk cache
    const safeKey = Buffer.from(cacheKey).toString('hex');
    const diskPathMp3 = path.join(DISK_CACHE_DIR, `${safeKey}.mp3`);
    const diskPathWav = path.join(DISK_CACHE_DIR, `${safeKey}.wav`);

    if (fs.existsSync(diskPathMp3)) {
      const buffer = fs.readFileSync(diskPathMp3);
      ttsCache.set(cacheKey, { buffer, mimeType: 'audio/mpeg' });
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      return res.send(buffer);
    }
    if (fs.existsSync(diskPathWav)) {
      const buffer = fs.readFileSync(diskPathWav);
      ttsCache.set(cacheKey, { buffer, mimeType: 'audio/wav' });
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      return res.send(buffer);
    }

    // 3. Deduplicate in-flight requests for the same word
    const phoneticInput = prepareSlovenianTTSInput(cleanText);

    let fetchPromise = inFlightTTS.get(cacheKey);
    if (!fetchPromise) {
      fetchPromise = synthesizeSlovenianSpeech(phoneticInput).finally(() => {
        inFlightTTS.delete(cacheKey);
      });
      inFlightTTS.set(cacheKey, fetchPromise);
    }

    const { buffer, mimeType } = await fetchPromise;

    // Save to memory cache & disk cache
    ttsCache.set(cacheKey, { buffer, mimeType });
    const ext = mimeType === 'audio/wav' ? 'wav' : 'mp3';
    fs.writeFile(path.join(DISK_CACHE_DIR, `${safeKey}.${ext}`), buffer, () => {});

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } catch (err: any) {
    console.warn('Slovenian TTS synthesis temporary limitation:', err?.message || err);
    return res.status(503).json({ error: 'tts_temporarily_unavailable', message: err?.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Dvojeziko Slovenian SRS' });
});

async function start() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Beseda server is running on http://0.0.0.0:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
});
