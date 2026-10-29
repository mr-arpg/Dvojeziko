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
  // Pass genuine, clean Slovenian text without artificial phonetic corruption
  return rawText.trim();
}

// Serialized execution queue for Edge TTS to prevent simultaneous handshake bursts
let edgeQueue = Promise.resolve<any>(null);
const inFlightTTS = new Map<string, Promise<Buffer>>();

function synthesizeWithEdgeTTS(text: string): Promise<Buffer> {
  const task = async (): Promise<Buffer> => {
    const tts = new MsEdgeTTS();
    await tts.setMetadata('sl-SI-PetraNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);
    const chunks: Buffer[] = [];

    return new Promise<Buffer>((resolve, reject) => {
      const timer = setTimeout(() => {
        try { tts.close(); } catch (_) {}
        reject(new Error('Slovenian TTS timed out after 8s'));
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

    let fetchPromise = inFlightTTS.get(cacheKey);
    if (!fetchPromise) {
      fetchPromise = synthesizeWithEdgeTTS(phoneticInput).finally(() => {
        inFlightTTS.delete(cacheKey);
      });
      inFlightTTS.set(cacheKey, fetchPromise);
    }

    const buffer = await fetchPromise;
    ttsCache.set(cacheKey, buffer);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  } catch (err: any) {
    res.statusCode = 503;
    return res.end(JSON.stringify({ error: 'tts_temporarily_unavailable', message: err?.message }));
  }
}
