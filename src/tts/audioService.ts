/**
 * Dvojeziko Audio Service
 * Generates authentic native Slovenian pronunciation using high-fidelity neural TTS
 * with persistent local CacheStorage on mobile/desktop, offline resilience, and fallback.
 */

// Memory cache of Audio elements for instant, low-latency playback
const audioElements = new Map<string, HTMLAudioElement>();
let currentAudio: HTMLAudioElement | null = null;
const AUDIO_CACHE_NAME = 'dvojeziko-slovenian-audio-v4';

// Purge older audio cache versions to ensure corrected Slovenian pronunciations take effect immediately
if (typeof window !== 'undefined' && 'caches' in window) {
  caches.delete('dvojeziko-slovenian-audio-v1').catch(() => {});
  caches.delete('dvojeziko-slovenian-audio-v2').catch(() => {});
  caches.delete('dvojeziko-slovenian-audio-v3').catch(() => {});
}

/**
 * Check if the browser has an official local Slovenian voice pack
 */
export function checkSlovenianVoice(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve(false);
      return;
    }

    const check = () => {
      const voices = window.speechSynthesis.getVoices();
      const hasVoice = voices.some(v => v.lang.toLowerCase().startsWith('sl') || v.lang.includes('SI'));
      resolve(hasVoice);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      check();
    } else {
      window.speechSynthesis.onvoiceschanged = () => check();
      setTimeout(() => resolve(false), 500);
    }
  });
}

/**
 * Preload Slovenian audio clips in background for upcoming words in the session
 * and save them into persistent phone CacheStorage.
 */
export async function preloadSlovenianAudio(texts: string[]): Promise<void> {
  if (typeof window === 'undefined') return;

  const cache = typeof window.caches !== 'undefined' ? await caches.open(AUDIO_CACHE_NAME).catch(() => null) : null;

  for (const rawText of texts) {
    const cleanText = rawText.replace(/[()]/g, '').trim();
    if (!cleanText) continue;

    const key = cleanText.toLowerCase();
    const url = `/api/tts?text=${encodeURIComponent(cleanText)}`;

    if (!audioElements.has(key)) {
      if (cache) {
        try {
          const matched = await cache.match(url);
          if (matched) {
            const blob = await matched.blob();
            const blobUrl = URL.createObjectURL(blob);
            const audio = new Audio(blobUrl);
            audio.preload = 'auto';
            audioElements.set(key, audio);
            continue;
          }
        } catch (_) {}
      }

      // If online, fetch and cache in phone storage
      try {
        const audio = new Audio(url);
        audio.preload = 'auto';
        audioElements.set(key, audio);

        if (cache && navigator.onLine) {
          fetch(url)
            .then(res => {
              if (res.ok) cache.put(url, res.clone());
            })
            .catch(() => {});
        }
      } catch (_) {}
    }
  }
}

/**
 * Plays authentic native Slovenian audio pronunciation for a word or phrase.
 * Streams high-fidelity neural Slovenian speech from /api/tts with persistent
 * local CacheStorage so audio works even when offline or server is asleep.
 */
export async function playSlovenianAudio(text: string): Promise<boolean> {
  if (typeof window === 'undefined' || !text) return false;

  const cleanText = text.replace(/[()]/g, '').trim();
  if (!cleanText) return false;

  const key = cleanText.toLowerCase();
  const url = `/api/tts?text=${encodeURIComponent(cleanText)}`;

  // Stop previous audio playback if currently active
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (_) {}
  }

  // 1. Check in-memory elements
  let audio = audioElements.get(key);

  // 2. Check persistent CacheStorage on the phone
  if (!audio && typeof window.caches !== 'undefined') {
    try {
      const cache = await caches.open(AUDIO_CACHE_NAME);
      const matched = await cache.match(url);
      if (matched) {
        const blob = await matched.blob();
        const blobUrl = URL.createObjectURL(blob);
        audio = new Audio(blobUrl);
        audioElements.set(key, audio);
      }
    } catch (_) {}
  }

  // 3. Primary playback: Use native Slovenian neural audio
  try {
    if (!audio) {
      audio = new Audio(url);
      audioElements.set(key, audio);

      // Save to persistent CacheStorage for future offline use
      if (typeof window.caches !== 'undefined' && navigator.onLine) {
        caches.open(AUDIO_CACHE_NAME).then(c => {
          fetch(url)
            .then(res => {
              if (res.ok) c.put(url, res.clone());
            })
            .catch(() => {});
        }).catch(() => {});
      }
    }

    currentAudio = audio;
    audio.currentTime = 0;
    await audio.play();
    return true;
  } catch (err) {
    // Purge cached audio element if it failed so a retry gets a fresh stream
    audioElements.delete(key);
    console.warn('Native Slovenian TTS stream unavailable, attempting local fallback:', err);
  }

  // 4. Secondary fallback: Web Speech API (ONLY if real Slovenian voice is available)
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const voices = window.speechSynthesis.getVoices();
      const slVoice = voices.find(v => v.lang.toLowerCase().startsWith('sl') || v.lang.includes('SI'));

      // If no Slovenian voice is installed, do NOT use English default voice (sounds completely wrong)
      if (slVoice) {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'sl-SI';
        utterance.voice = slVoice;
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
        return true;
      }
    } catch (_) {}
  }

  return false;
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
