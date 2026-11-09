import {
  WordProgress,
  UserSettings,
  UserStats,
  UserProfile,
  SentenceItem,
} from './types';
import { getTodayString } from '../srs/scheduler';

const PROGRESS_KEY = 'beseda_word_progress_v1';
const SETTINGS_KEY = 'beseda_user_settings_v1';
const STATS_KEY = 'beseda_user_stats_v1';
const SENTENCES_CACHE_KEY = 'beseda_sentences_cache_v1';
const PROFILE_KEY = 'dvojeziko_user_profile_v1';

export const DEFAULT_SETTINGS: UserSettings = {
  language: 'sl',
  newWordsPerDay: 3,
  adaptivePace: true,
  soundEnabled: true,
  theme: 'system',
  dailyReminderTime: '09:00',
  hapticFeedback: true,
  autoPlayAudio: true,
  enableAiSentences: true,
};

export const DEFAULT_STATS: UserStats = {
  streak: 0,
  lastActiveDate: '',
  history: {},
  totalExercisesCompleted: 0,
  totalLessonsCompleted: 0,
};

export function generateFriendCode(seedStr?: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let hash = 0;
  const str = seedStr || Math.random().toString();
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  let code = 'DV-';
  for (let i = 0; i < 4; i++) {
    code += chars[(hash >>> (i * 5)) % chars.length];
  }
  return code;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  displayName: 'Rafael Pires',
  email: 'piresrafaelarmando2002@gmail.com',
  photoURL: 'https://api.dicebear.com/9.x/initials/svg?seed=Rafael+Pires&backgroundColor=0f766e,0d9488,059669&textColor=ffffff',
  friendCode: 'DV-RP82',
  isFirebaseSynced: false,
};

export function loadUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_USER_PROFILE;
    const parsed = JSON.parse(raw);
    const profile = { ...DEFAULT_USER_PROFILE, ...parsed };
    if (!profile.friendCode) {
      profile.friendCode = generateFriendCode(profile.email || profile.displayName);
      saveUserProfile(profile);
    }
    return profile;
  } catch (e) {
    return DEFAULT_USER_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    if (!profile.friendCode) {
      profile.friendCode = generateFriendCode(profile.email || profile.displayName);
    }
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save user profile:', e);
  }
}


// Helper to get language-aware key
function getProgressKey(lang?: string): string {
  if (lang === 'pt') return 'beseda_word_progress_pt_v1';
  return PROGRESS_KEY;
}

function getSentencesKey(lang?: string): string {
  if (lang === 'pt') return 'beseda_sentences_cache_pt_v1';
  return SENTENCES_CACHE_KEY;
}

function getStatsKey(lang?: string): string {
  if (lang === 'pt') return 'beseda_user_stats_pt_v1';
  return STATS_KEY;
}

// Storage operations
export function loadWordProgress(lang?: string): Record<number, WordProgress> {
  try {
    const raw = localStorage.getItem(getProgressKey(lang));
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load word progress:', e);
    return {};
  }
}

export function saveWordProgress(progress: Record<number, WordProgress>, lang?: string): void {
  try {
    localStorage.setItem(getProgressKey(lang), JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save word progress:', e);
  }
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to load settings:', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function loadStats(lang?: string): UserStats {
  try {
    const raw = localStorage.getItem(getStatsKey(lang));
    if (!raw) return DEFAULT_STATS;
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to load stats:', e);
    return DEFAULT_STATS;
  }
}

export function saveStats(stats: UserStats, lang?: string): void {
  try {
    localStorage.setItem(getStatsKey(lang), JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats:', e);
  }
}

export function loadSentenceCache(lang?: string): SentenceItem[] {
  try {
    const raw = localStorage.getItem(getSentencesKey(lang));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load sentence cache:', e);
    return [];
  }
}

export function saveSentenceToCache(sentence: SentenceItem, lang?: string): void {
  try {
    const current = loadSentenceCache(lang);
    // Avoid duplicates by sl text
    const exists = current.some(s => s.sl.toLowerCase().trim() === sentence.sl.toLowerCase().trim());
    if (!exists) {
      current.push({ ...sentence, cachedAt: Date.now() });
      localStorage.setItem(getSentencesKey(lang), JSON.stringify(current));
    }
  } catch (e) {
    console.error('Failed to save sentence cache:', e);
  }
}

export function updateStreakAndStats(
  exercisesCount: number,
  accuracy: number,
  todayStr: string = getTodayString(),
  lang?: string
): UserStats {
  const stats = loadStats(lang);
  const lastActive = stats.lastActiveDate;

  let newStreak = stats.streak;
  if (!lastActive) {
    newStreak = 1;
  } else if (lastActive === todayStr) {
    // Already did something today, streak stays the same
  } else {
    const dLast = new Date(lastActive + 'T00:00:00');
    const dToday = new Date(todayStr + 'T00:00:00');
    const diffDays = Math.round((dToday.getTime() - dLast.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1; // missed days resets streak
    }
  }

  const currentDayStats = stats.history[todayStr] || {
    date: todayStr,
    reviewed: 0,
    learned: 0,
    accuracy: 100,
    timeSpentSeconds: 0,
  };

  currentDayStats.reviewed += exercisesCount;
  currentDayStats.accuracy = Math.round((currentDayStats.accuracy + accuracy) / 2);
  currentDayStats.timeSpentSeconds += 300; // ~5 mins

  stats.streak = newStreak;
  stats.lastActiveDate = todayStr;
  stats.totalExercisesCompleted += exercisesCount;
  stats.totalLessonsCompleted += 1;
  stats.history[todayStr] = currentDayStats;

  saveStats(stats, lang);
  return stats;
}

export function exportUserDataAsJson(): string {
  const settings = loadSettings();
  const progSl = loadWordProgress('sl');
  const progPt = loadWordProgress('pt');
  const statsSl = loadStats('sl');
  const statsPt = loadStats('pt');
  const activeLang = settings.language || 'sl';

  const data = {
    progressSl: progSl,
    progressPt: progPt,
    statsSl: statsSl,
    statsPt: statsPt,
    // Active language backward compatibility
    progress: activeLang === 'pt' ? progPt : progSl,
    stats: activeLang === 'pt' ? statsPt : statsSl,
    settings,
    sentenceCache: loadSentenceCache(activeLang),
    exportedAt: new Date().toISOString(),
    version: '2.0',
  };
  return JSON.stringify(data, null, 2);
}

export interface BackupPreview {
  valid: boolean;
  wordCount: number;
  streak: number;
  totalLessons: number;
  exportedAt?: string;
  errorMessage?: string;
}

export function inspectBackupJson(jsonStr: string): BackupPreview {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, wordCount: 0, streak: 0, totalLessons: 0, errorMessage: 'File does not contain a valid JSON object.' };
    }
    const slCount = parsed.progressSl && typeof parsed.progressSl === 'object' ? Object.keys(parsed.progressSl).length : 0;
    const ptCount = parsed.progressPt && typeof parsed.progressPt === 'object' ? Object.keys(parsed.progressPt).length : 0;
    const legacyCount = parsed.progress && typeof parsed.progress === 'object' ? Object.keys(parsed.progress).length : 0;
    const wordCount = slCount + ptCount > 0 ? slCount + ptCount : legacyCount;

    const streak = Math.max(
      typeof parsed.statsSl?.streak === 'number' ? parsed.statsSl.streak : 0,
      typeof parsed.statsPt?.streak === 'number' ? parsed.statsPt.streak : 0,
      typeof parsed.stats?.streak === 'number' ? parsed.stats.streak : 0
    );
    const totalLessons = Math.max(
      typeof parsed.statsSl?.totalLessonsCompleted === 'number' ? parsed.statsSl.totalLessonsCompleted : 0,
      typeof parsed.statsPt?.totalLessonsCompleted === 'number' ? parsed.statsPt.totalLessonsCompleted : 0,
      typeof parsed.stats?.totalLessonsCompleted === 'number' ? parsed.stats.totalLessonsCompleted : 0
    );
    const exportedAt = typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined;
    const hasValidPayload = wordCount > 0 || !!parsed.stats || !!parsed.settings || !!parsed.statsSl;

    if (!hasValidPayload) {
      return { valid: false, wordCount: 0, streak: 0, totalLessons: 0, errorMessage: 'File is valid JSON but does not contain Dvojeziko learning data.' };
    }

    return {
      valid: true,
      wordCount,
      streak,
      totalLessons,
      exportedAt,
    };
  } catch (e: any) {
    return { valid: false, wordCount: 0, streak: 0, totalLessons: 0, errorMessage: e?.message || 'Malformed JSON file.' };
  }
}

export function importUserDataFromJson(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.progressSl) {
      saveWordProgress(parsed.progressSl, 'sl');
    } else if (parsed.progress) {
      saveWordProgress(parsed.progress, 'sl');
    }
    if (parsed.progressPt) {
      saveWordProgress(parsed.progressPt, 'pt');
    }

    if (parsed.statsSl) {
      saveStats(parsed.statsSl, 'sl');
    } else if (parsed.stats) {
      saveStats(parsed.stats, 'sl');
    }
    if (parsed.statsPt) {
      saveStats(parsed.statsPt, 'pt');
    }

    if (parsed.settings) saveSettings(parsed.settings);
    if (parsed.sentenceCache) {
      localStorage.setItem(SENTENCES_CACHE_KEY, JSON.stringify(parsed.sentenceCache));
    }
    return true;
  } catch (e) {
    console.error('Failed to import user data:', e);
    return false;
  }
}

export function resetAllUserData(): void {
  localStorage.removeItem(PROGRESS_KEY);
  localStorage.removeItem(STATS_KEY);
  localStorage.removeItem(SENTENCES_CACHE_KEY);
  // Keep settings or reset them
  saveSettings(DEFAULT_SETTINGS);
}
