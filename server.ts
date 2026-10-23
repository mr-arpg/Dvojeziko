import express from 'express';
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

// In-memory cache for generated authentic Slovenian speech audio (MP3)
const ttsCache = new Map<string, { buffer: Buffer; mimeType: string }>();

/**
 * Preprocesses Slovenian text for authentic neural text-to-speech pronunciation.
 *
 * Slovenian phonetic rules:
 * 1. The standalone preposition "v" (meaning 'in', 'into', 'at', rank 20):
 *    In standard Slovenian orthoepy, isolated "v" is pronounced as bilabial /u̯/
 *    (sounds like "u" / "yu" / "w"), NOT as the labiodental fricative [v] or letter name "ve".
 *    Passing "u" to the Slovenian voice produces the authentic native pronunciation.
 * 2. Preposition "v" before consonants in phrases (e.g. "v šoli", "v redu", "v mestu"):
 *    In Slovenian, "v" before consonants vocalizes to [u̯] ("u"), whereas before vowels ("v avtu")
 *    it remains [v].
 */
function prepareSlovenianTTSInput(rawText: string): string {
  const trimmed = rawText.trim();

  // Rule 1: Standalone word "v" or "V"
  if (trimmed.toLowerCase() === 'v') {
    return 'u';
  }

  // Rule 2: Preposition "v" before a consonant (e.g. "v mestu", "v redu", "v šoli")
  const slovenianConsonants = 'bcdfghjklmnprstvzčžšBCDFGHJKLMNPRSTVZČŽŠ';
  const prepRegex = new RegExp(`\\b([vV])\\s+([${slovenianConsonants}])`, 'g');
  const processed = trimmed.replace(prepRegex, (_, v, next) => {
    return (v === 'V' ? 'U ' : 'u ') + next;
  });

  // Rule 3: Standalone preposition "z" or "s" (meaning 'with')
  // An isolated fricative consonant "z" causes neural TTS to emit an unnatural mechanical buzzing sound.
  // In Slovenian language teaching and dictionaries (SSKJ), the isolated preposition is vocalized as "ze".
  if (trimmed.toLowerCase() === 'z') {
    return 'ze';
  }
  if (trimmed.toLowerCase() === 's') {
    return 'se';
  }
  // Rule 4: Isolated words without punctuation
  // Microsoft neural TTS treats bare unpunctuated lowercase words (like "na", "da", "že")
  // as fragmented continuations, causing clipped robotic audio.
  // Capitalizing and adding a terminal period applies full declarative prosody and natural vowel length.
  if (!/[.?!]$/.test(processed) && processed.split(/\s+/).length === 1) {
    const capitalized = processed.charAt(0).toUpperCase() + processed.slice(1);
    return `${capitalized}.`;
  }

  return processed;
}

/**
 * Synthesizes native Slovenian audio using the official sl-SI-PetraNeural neural voice.
 * Produces authentic native pronunciation with correct pitch accent, Slovenian č/š/ž phonetics,
 * and natural rhythm.
 */
async function synthesizeSlovenianSpeech(text: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata('sl-SI-PetraNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text);
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try { tts.close(); } catch (_) {}
      reject(new Error('Slovenian TTS synthesis timed out after 8s'));
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
}

/**
 * Endpoint: GET /api/tts?text=...
 * Generates and streams authentic native Slovenian audio pronunciation.
 */
app.get('/api/tts', async (req, res) => {
  try {
    const rawText = (req.query.text as string || '').trim();
    if (!rawText) {
      return res.status(400).send('Missing text parameter');
    }

    const cleanText = rawText.replace(/[()]/g, '').trim().slice(0, 300);
    const cacheKey = cleanText.toLowerCase();

    // Serve from memory cache if available (instant 0ms response)
    if (ttsCache.has(cacheKey)) {
      const cached = ttsCache.get(cacheKey)!;
      res.setHeader('Content-Type', cached.mimeType || 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      return res.send(cached.buffer);
    }

    // Apply Slovenian phonetic correction (e.g. "v" pronounced as "u" / [u̯])
    const phoneticInput = prepareSlovenianTTSInput(cleanText);

    // Generate authentic Slovenian audio via native neural voice
    const buffer = await synthesizeSlovenianSpeech(phoneticInput);
    const mimeType = 'audio/mpeg';
    ttsCache.set(cacheKey, { buffer, mimeType });

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } catch (err: any) {
    console.error('Slovenian TTS endpoint error:', err?.message || err);
    return res.status(500).send(err?.message || 'TTS generation failed');
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
