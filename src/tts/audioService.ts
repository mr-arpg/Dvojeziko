/**
 * Dvojeziko Audio Service
 * Generates authentic native Slovenian pronunciation using high-fidelity neural TTS
 * with persistent local CacheStorage on mobile/desktop, offline resilience, and fallback.
 */

// In-memory cache of resolved Blob object URLs for instant 0ms playback
const blobUrls = new Map<string, string>();
let currentAudio: HTMLAudioElement | null = null;
const AUDIO_CACHE_NAME = 'dvojeziko-slovenian-audio-v6';

// Purge all older audio cache versions to ensure authentic neural audio takes effect immediately
if (typeof window !== 'undefined' && 'caches' in window) {
  caches.delete('dvojeziko-slovenian-audio-v1').catch(() => {});
  caches.delete('dvojeziko-slovenian-audio-v2').catch(() => {});
  caches.delete('dvojeziko-slovenian-audio-v3').catch(() => {});
  caches.delete('dvojeziko-slovenian-audio-v4').catch(() => {});
  caches.delete('dvojeziko-slovenian-audio-v5').catch(() => {});
}

/**
 * Loads and caches authentic native neural Slovenian audio (sl-SI-PetraNeural)
 * into local phone CacheStorage and memory Blob URL for instant 0ms playback.
 */
async function loadNeuralAudioBlob(cleanText: string, timeoutMs = 4000): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const key = cleanText.toLowerCase();

  // 1. In-memory Blob URL (instant 0ms playback)
  if (blobUrls.has(key)) {
    return blobUrls.get(key)!;
  }

  const url = `/api/tts?text=${encodeURIComponent(cleanText)}`;

  // 2. Persistent device CacheStorage (offline-ready)
  if (typeof window.caches !== 'undefined') {
    try {
      const cache = await caches.open(AUDIO_CACHE_NAME);
      const matched = await cache.match(url);
      if (matched) {
        const blob = await matched.blob();
        const blobUrl = URL.createObjectURL(blob);
        blobUrls.set(key, blobUrl);
        return blobUrl;
      }
    } catch (_) {}
  }

  // 3. Network fetch from neural endpoint
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      if (typeof window.caches !== 'undefined') {
        const cache = await caches.open(AUDIO_CACHE_NAME);
        cache.put(url, res.clone()).catch(() => {});
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      blobUrls.set(key, blobUrl);
      return blobUrl;
    }
  } catch (_) {}

  return null;
}

// Dedicated shared player instance to preserve user-gesture token across mobile browsers
let sharedPlayer: HTMLAudioElement | null = null;

function getSharedPlayer(): HTMLAudioElement {
  if (!sharedPlayer) {
    sharedPlayer = new Audio();
    sharedPlayer.preload = 'auto';
  }
  return sharedPlayer;
}

/**
 * Preload authentic Slovenian neural audio clips in background for upcoming words in the session
 */
export async function preloadSlovenianAudio(texts: string[]): Promise<void> {
  if (typeof window === 'undefined') return;

  const validTexts = texts
    .map(t => t.replace(/[()]/g, '').trim())
    .filter(Boolean);

  await Promise.allSettled(validTexts.map(text => loadNeuralAudioBlob(text, 6000)));
}

/**
 * Plays authentic native Slovenian human neural audio (sl-SI-PetraNeural).
 * Synchronously initiates playback inside the user's tap gesture so mobile browsers
 * (iOS Safari & Android Chrome) never block audio.
 * NEVER falls back to robotic synthesized speech.
 */
export async function playSlovenianAudio(text: string): Promise<boolean> {
  if (typeof window === 'undefined' || !text) return false;

  const cleanText = text.replace(/[()]/g, '').trim();
  if (!cleanText) return false;

  const key = cleanText.toLowerCase();
  const url = `/api/tts?text=${encodeURIComponent(cleanText)}`;
  const player = getSharedPlayer();

  try {
    player.pause();

    // 1. If we have a pre-cached Blob URL in memory, use it
    const existingBlob = blobUrls.get(key);
    if (existingBlob) {
      player.src = existingBlob;
    } else {
      player.src = url;
    }

    // 2. Play immediately within the user gesture
    player.currentTime = 0;
    await player.play();

    // 3. Cache to device CacheStorage in the background for permanent offline play
    if (!existingBlob && typeof window.caches !== 'undefined') {
      fetch(url)
        .then(async res => {
          if (res.ok) {
            const cache = await caches.open(AUDIO_CACHE_NAME);
            cache.put(url, res.clone()).catch(() => {});
            const blob = await res.blob();
            blobUrls.set(key, URL.createObjectURL(blob));
          }
        })
        .catch(() => {});
    }

    return true;
  } catch (err) {
    console.warn('Native Slovenian neural playback issue:', err);
    return false;
  }
}

// Gentle audio effects for interactions (using Web Audio API)
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSuccessChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    // Pleasant major third chime (E5 -> G#5)
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(659.25, now);
    osc.frequency.exponentialRampToValueAtTime(830.61, now + 0.12);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {
    // Ignore audio errors
  }
}

export function playFailureThud(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';

    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.2);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {
    // Ignore
  }
}

export function hasUserSeenVoiceHint(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('dvojeziko_voice_hint_seen') === 'true';
}

export function markVoiceHintAsSeen(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('dvojeziko_voice_hint_seen', 'true');
}
