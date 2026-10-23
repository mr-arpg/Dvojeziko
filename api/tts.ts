import type { IncomingMessage, ServerResponse } from 'http';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// In-memory cache on the serverless instance
const ttsCache = new Map<string, Buffer>();

/**
 * Preprocesses Slovenian text for authentic neural text-to-speech pronunciation.
 * Rules:
 * 1. Isolated preposition "v" is pronounced as bilabial /u̯/ (sounds like "u" / "yu"), NOT consonant [v].
 * 2. Preposition "v" before a consonant (e.g. "v šoli", "v redu") vocalizes to "u".
 */
function prepareSlovenianTTSInput(rawText: string): string {
  const trimmed = rawText.trim();
  if (trimmed.toLowerCase() === 'v') {
    return 'u';
  }
  // Rule 2: Preposition "v" before a consonant (e.g. "v šoli", "v redu") vocalizes to "u"
  const slovenianConsonants = 'bcdfghjklmnprstvzčžšBCDFGHJKLMNPRSTVZČŽŠ';
  const prepRegex = new RegExp(`\\b([vV])\\s+([${slovenianConsonants}])`, 'g');
  const processed = trimmed.replace(prepRegex, (_, v, next) => (v === 'V' ? 'U ' : 'u ') + next);

  // Rule 3: Standalone preposition "z" or "s"
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

export default async function handler(req: IncomingMessage & { query?: Record<string, string> }, res: ServerResponse) {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const rawText = url.searchParams.get('text') || '';
    if (!rawText.trim()) {
      res.statusCode = 400;
      return res.end('Missing text parameter');
    }

    const cleanText = rawText.replace(/[()]/g, '').trim().slice(0, 300);
    const cacheKey = cleanText.toLowerCase();

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');

    if (ttsCache.has(cacheKey)) {
      return res.end(ttsCache.get(cacheKey));
    }

    const phoneticInput = prepareSlovenianTTSInput(cleanText);
    const buffer = await synthesizeSlovenianSpeech(phoneticInput);
    ttsCache.set(cacheKey, buffer);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  } catch (err: any) {
    res.statusCode = 500;
    return res.end(err?.message || 'TTS generation failed');
  }
}
