import {
  WordProgress,
  UserSettings,
  UserStats,
  SentenceItem,
} from './types';
import { getTodayString } from '../srs/scheduler';

const PROGRESS_KEY = 'beseda_word_progress_v1';
const SETTINGS_KEY = 'beseda_user_settings_v1';
const STATS_KEY = 'beseda_user_stats_v1';
const SENTENCES_CACHE_KEY = 'beseda_sentences_cache_v1';

export const DEFAULT_SETTINGS: UserSettings = {
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

// Storage operations
export function loadWordProgress(): Record<number, WordProgress> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load word progress:', e);
    return {};
  }
}

export function saveWordProgress(progress: Record<number, WordProgress>): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
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

export function loadStats(): UserStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return DEFAULT_STATS;
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to load stats:', e);
    return DEFAULT_STATS;
  }
}

export function saveStats(stats: UserStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats:', e);
  }
}

export function loadSentenceCache(): SentenceItem[] {
  try {
    const raw = localStorage.getItem(SENTENCES_CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load sentence cache:', e);
    return [];
  }
}

export function saveSentenceToCache(sentence: SentenceItem): void {
  try {
    const current = loadSentenceCache();
    // Avoid duplicates by sl text
    const exists = current.some(s => s.sl.toLowerCase().trim() === sentence.sl.toLowerCase().trim());
    if (!exists) {
      current.push({ ...sentence, cachedAt: Date.now() });
      localStorage.setItem(SENTENCES_CACHE_KEY, JSON.stringify(current));
    }
  } catch (e) {
    console.error('Failed to save sentence cache:', e);
  }
}

export function updateStreakAndStats(
  exercisesCount: number,
  accuracy: number,
  todayStr: string = getTodayString()
): UserStats {
  const stats = loadStats();
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

  saveStats(stats);
  return stats;
}

export function exportUserDataAsJson(): string {
  const data = {
    progress: loadWordProgress(),
    settings: loadSettings(),
    stats: loadStats(),
    sentenceCache: loadSentenceCache(),
    exportedAt: new Date().toISOString(),
    version: '1.0',
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
    const wordCount = parsed.progress && typeof parsed.progress === 'object' ? Object.keys(parsed.progress).length : 0;
    const streak = typeof parsed.stats?.streak === 'number' ? parsed.stats.streak : 0;
    const totalLessons = typeof parsed.stats?.totalLessonsCompleted === 'number' ? parsed.stats.totalLessonsCompleted : 0;
    const exportedAt = typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined;
    const hasValidPayload = wordCount > 0 || !!parsed.stats || !!parsed.settings || !!parsed.sentenceCache;

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
    if (parsed.progress) saveWordProgress(parsed.progress);
    if (parsed.settings) saveSettings(parsed.settings);
    if (parsed.stats) saveStats(parsed.stats);
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
