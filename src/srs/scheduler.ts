import { Word, WordProgress, WordStatus } from '../data/types';
import { WORDS } from '../data/words';

// Leitner intervals in days: Box 1=1d, Box 2=2d, Box 3=4d, Box 4=7d, Box 5=14d, Box 6=30d
export const LEITNER_INTERVALS = [1, 2, 4, 7, 14, 30];
export const MAX_DAILY_REVIEWS = 20;

export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysBetween(dateStrA: string, dateStrB: string): number {
  const a = new Date(dateStrA + 'T00:00:00').getTime();
  const b = new Date(dateStrB + 'T00:00:00').getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/**
 * Select review words due today or overdue.
 * Capped at MAX_DAILY_REVIEWS (20).
 * Prioritizes the most overdue and most-failed words so users don't get crushed by backlogs.
 */
export function getDueReviewWords(
  progressMap: Record<number, WordProgress>,
  todayStr: string = getTodayString()
): { word: Word; progress: WordProgress; overdueDays: number }[] {
  const dueItems: { word: Word; progress: WordProgress; overdueDays: number }[] = [];

  for (const progress of Object.values(progressMap)) {
    if (progress.status === 'new') continue;
    
    // Check if due
    if (progress.nextDueDate <= todayStr) {
      const word = WORDS.find(w => w.rank === progress.rank);
      if (word) {
        const overdueDays = Math.max(0, daysBetween(progress.nextDueDate, todayStr));
        dueItems.push({ word, progress, overdueDays });
      }
    }
  }

  // Sort by overdueDays descending, then failedCount descending, then box ascending
  dueItems.sort((a, b) => {
    if (b.overdueDays !== a.overdueDays) {
      return b.overdueDays - a.overdueDays;
    }
    if (b.progress.failedCount !== a.progress.failedCount) {
      return b.progress.failedCount - a.progress.failedCount;
    }
    return a.progress.box - b.progress.box;
  });

  return dueItems.slice(0, MAX_DAILY_REVIEWS);
}

/**
 * Select review words for a 5-minute lesson.
 * GUARANTEE: EVERY lesson includes review words!
 * Even if 0 words are strictly due in the Leitner schedule today,
 * this proactively pulls words from the user's active vocabulary (learned or learning)
 * so every single session exercises retention.
 *
 * Prioritizes:
 * 1. Strictly due or overdue words (nextDueDate <= today)
 * 2. Words with past mistakes (failedCount > 0)
 * 3. Words in lower Leitner boxes (Box 1 -> Box 2 -> Box 3)
 * 4. Words not reviewed for the longest time
 */
export function getLessonReviewWords(
  progressMap: Record<number, WordProgress>,
  targetReviewCount: number = 5,
  todayStr: string = getTodayString()
): { word: Word; progress: WordProgress; overdueDays: number; isProactiveReview?: boolean }[] {
  const strictlyDue: { word: Word; progress: WordProgress; overdueDays: number; isProactiveReview?: boolean }[] = [];
  const candidatePool: { word: Word; progress: WordProgress; overdueDays: number; isProactiveReview?: boolean }[] = [];

  for (const progress of Object.values(progressMap)) {
    if (progress.status === 'new') continue;

    const word = WORDS.find(w => w.rank === progress.rank);
    if (!word) continue;

    if (progress.nextDueDate <= todayStr) {
      const overdueDays = Math.max(0, daysBetween(progress.nextDueDate, todayStr));
      strictlyDue.push({ word, progress, overdueDays, isProactiveReview: false });
    } else {
      candidatePool.push({ word, progress, overdueDays: 0, isProactiveReview: true });
    }
  }

  // Sort strictly due words: most overdue first, then mistakes, then lowest box
  strictlyDue.sort((a, b) => {
    if (b.overdueDays !== a.overdueDays) return b.overdueDays - a.overdueDays;
    if (b.progress.failedCount !== a.progress.failedCount) return b.progress.failedCount - a.progress.failedCount;
    return a.progress.box - b.progress.box;
  });

  // If we have enough due words, take up to 10 for this session
  if (strictlyDue.length >= targetReviewCount) {
    return strictlyDue.slice(0, 10);
  }

  // Otherwise, proactively backfill from active vocabulary so every lesson reviews past vocabulary
  candidatePool.sort((a, b) => {
    // Mistakes first
    if (b.progress.failedCount !== a.progress.failedCount) {
      return b.progress.failedCount - a.progress.failedCount;
    }
    // Lower boxes first
    if (a.progress.box !== b.progress.box) {
      return a.progress.box - b.progress.box;
    }
    // Oldest reviewed first
    const dateA = a.progress.lastReviewedDate || '';
    const dateB = b.progress.lastReviewedDate || '';
    return dateA.localeCompare(dateB);
  });

  const needed = targetReviewCount - strictlyDue.length;
  const backfilled = candidatePool.slice(0, needed);
  const currentItems = [...strictlyDue, ...backfilled];

  // GUARANTEE: If user has 0 words or fewer than targetReviewCount in their vocabulary,
  // backfill from foundational core words (e.g. greetings, essentials) so EVERY session
  // includes review exercises and reinforcement right from the start!
  if (currentItems.length < targetReviewCount) {
    const existingRanks = new Set(currentItems.map(i => i.word.rank));
    const foundationalNeeded = targetReviewCount - currentItems.length;

    const foundational = WORDS
      .filter(w => !existingRanks.has(w.rank))
      .slice(0, foundationalNeeded)
      .map(word => {
        const dummyProgress: WordProgress = progressMap[word.rank] || {
          rank: word.rank,
          box: 1,
          status: 'learning',
          nextDueDate: todayStr,
          lastReviewedDate: todayStr,
          consecutiveCorrect: 0,
          failedCount: 0,
          totalReviews: 0,
        };
        return {
          word,
          progress: dummyProgress,
          overdueDays: 0,
          isProactiveReview: true,
        };
      });

    return [...currentItems, ...foundational];
  }

  return currentItems;
}

/**
 * Calculates the moderated number of new words to introduce today.
 * If adaptivePace is enabled:
 * - If user has 8+ overdue reviews or active mistakes: throttles new words to 1-2 to focus on retention.
 * - If user has 4-7 overdue reviews / mistakes: moderates new words by ~50% (e.g. 7 -> 3 or 4).
 * - If user has < 4 overdue reviews / mistakes: full user quota allowed.
 * This guarantees users never experience "review debt" where they rush through 1000 words while making mistakes on all of them.
 */
export function getModeratedNewWordsQuota(
  targetCount: number,
  dueCount: number,
  mistakesCount: number,
  adaptivePace: boolean = true
): {
  effectiveCount: number;
  isModerated: boolean;
  reason?: string;
} {
  const boundedTarget = Math.max(1, Math.min(8, targetCount));
  if (!adaptivePace) {
    return { effectiveCount: boundedTarget, isModerated: false };
  }

  // Combined backlog indicator (active due reviews + active mistake words)
  const totalBacklog = dueCount + Math.floor(mistakesCount * 0.5);

  if (totalBacklog >= 10) {
    // Heavy review load: limit to 1 new word so user masters existing words
    const effective = Math.min(1, boundedTarget);
    return {
      effectiveCount: effective,
      isModerated: boundedTarget > effective,
      reason: `Heavy review backlog (${dueCount} due, ${mistakesCount} mistakes). Scaled down to prioritize retention first.`,
    };
  } else if (totalBacklog >= 5) {
    // Moderate review load: throttle new words by ~50% (minimum 2)
    const effective = Math.min(Math.max(2, Math.round(boundedTarget * 0.5)), boundedTarget);
    return {
      effectiveCount: effective,
      isModerated: boundedTarget > effective,
      reason: `Moderated to balance ${dueCount} reviews with new vocabulary.`,
    };
  }

  return {
    effectiveCount: boundedTarget,
    isModerated: false,
  };
}

/**
 * Pick new words for today:
 * 1. Must be unintroduced words (status === 'new' or not in progressMap).
 * 2. In frequency order (lowest rank first).
 * 3. Never introduce more than 2 grammar-only words in one day. Mix with concrete nouns/verbs.
 */
export function getTodayNewWords(
  progressMap: Record<number, WordProgress>,
  count: number = 3,
  excludeRanks?: Set<number>
): Word[] {
  const chosen: Word[] = [];
  let grammarCount = 0;

  // Find all available unintroduced words that are not excluded
  const unintroduced = WORDS.filter(w => {
    if (excludeRanks && excludeRanks.has(w.rank)) return false;
    const p = progressMap[w.rank];
    return !p || p.status === 'new';
  });

  // Target count bounded by settings (1-8)
  const targetCount = Math.max(1, Math.min(8, count));

  for (const word of unintroduced) {
    if (chosen.length >= targetCount) break;

    if (word.isGrammarWord) {
      if (grammarCount < 2) {
        chosen.push(word);
        grammarCount++;
      }
      // Otherwise skip this grammar word for now to mix with concrete nouns/verbs
    } else {
      chosen.push(word);
    }
  }

  // If we couldn't fill the quota because skipped grammar words, fill remaining if available
  if (chosen.length < targetCount) {
    for (const word of unintroduced) {
      if (chosen.length >= targetCount) break;
      if (!chosen.some(c => c.rank === word.rank)) {
        chosen.push(word);
      }
    }
  }

  return chosen;
}

export type ReviewGrade = 'again' | 'good' | 'easy';

/**
 * Update SRS progress after an exercise attempt
 */
export function calculateNextProgress(
  current: WordProgress | undefined,
  rank: number,
  grade: ReviewGrade,
  todayStr: string = getTodayString()
): WordProgress {
  const baseProgress: WordProgress = current || {
    rank,
    status: 'learning',
    box: 1,
    lastReviewedDate: null,
    nextDueDate: todayStr,
    consecutiveCorrect: 0,
    totalReviews: 0,
    failedCount: 0,
    introducedDate: todayStr,
  };

  const isCorrect = grade === 'good' || grade === 'easy';
  let newBox = baseProgress.box;
  let newFailed = baseProgress.failedCount;
  let newConsecutive = baseProgress.consecutiveCorrect;

  if (isCorrect) {
    if (grade === 'easy') {
      newBox = Math.min(6, baseProgress.box + 2);
      newFailed = 0;
    } else {
      newBox = Math.min(6, baseProgress.box + 1);
      newFailed = Math.max(0, baseProgress.failedCount - 1);
    }
    newConsecutive += 1;
    // Once the user answers correctly after a mistake, clear the active failure flag
    if (newConsecutive >= 1) {
      newFailed = 0;
    }
  } else {
    // Wrong answer sends it back to box 1
    newBox = 1;
    newFailed += 1;
    newConsecutive = 0;
  }

  const intervalDays = LEITNER_INTERVALS[newBox - 1] || 1;
  const nextDueDate = addDaysToDate(todayStr, intervalDays);

  // Box 3 or higher counts as 'learned'
  const newStatus: WordStatus = newBox >= 3 ? 'learned' : 'learning';

  return {
    ...baseProgress,
    box: newBox,
    status: newStatus,
    lastReviewedDate: todayStr,
    nextDueDate,
    consecutiveCorrect: newConsecutive,
    totalReviews: baseProgress.totalReviews + 1,
    failedCount: newFailed,
  };
}
