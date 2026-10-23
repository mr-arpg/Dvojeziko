/**
 * Beseda - Types for Slovenian Spaced Repetition Learning App
 */

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2';

export interface RawWord {
  rank: number;
  sl: string;
  en: string;
  level: CEFRLevel;
}

export interface Word extends RawWord {
  isGrammarWord: boolean;
  meanings: string[]; // parsed from en split by ';'
  isReflexive: boolean; // contains (se) or (si)
}

export type WordStatus = 'new' | 'learning' | 'learned';

export interface WordProgress {
  rank: number;
  status: WordStatus;
  box: number; // 1 to 6 (intervals: 1, 2, 4, 7, 14, 30 days)
  lastReviewedDate: string | null;
  nextDueDate: string; // YYYY-MM-DD
  consecutiveCorrect: number;
  totalReviews: number;
  failedCount: number;
  introducedDate?: string;
}

export interface SentenceItem {
  id: string;
  sl: string;
  en: string;
  targets: string[]; // Slovenian lemmas
  cachedAt?: number;
}

export interface TokenMapping {
  token: string;
  cleanToken: string;
  lemma?: string;
  meaning?: string;
  isKnown: boolean;
  isTarget?: boolean;
}

export type ExerciseType =
  | 'flashcard'
  | 'mc_sl_to_en'
  | 'mc_en_to_sl'
  | 'listening'
  | 'typing'
  | 'sentence_translate'
  | 'sentence_gap'
  | 'sentence_understand';

export interface BaseExercise {
  id: string;
  type: ExerciseType;
  word?: Word;
  phase: 'review' | 'learn' | 'sentence';
  isRetry?: boolean;
}

export interface FlashcardExercise extends BaseExercise {
  type: 'flashcard';
  word: Word;
}

export interface MultipleChoiceExercise extends BaseExercise {
  type: 'mc_sl_to_en' | 'mc_en_to_sl' | 'listening';
  word: Word;
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface TypingExercise extends BaseExercise {
  type: 'typing';
  word: Word;
  prompt: string;
  acceptedAnswers: string[];
}

export interface SentenceTranslateExercise extends BaseExercise {
  type: 'sentence_translate';
  sentence: SentenceItem;
  targetWord?: Word;
  tokenMappings: TokenMapping[];
  shuffledChips: string[];
  distractors: string[];
  correctTokens: string[];
}

export interface SentenceGapExercise extends BaseExercise {
  type: 'sentence_gap';
  sentence: SentenceItem;
  targetWord: Word;
  tokenMappings: TokenMapping[];
  gapIndex: number;
  displaySentence: string;
  options: string[];
  correctAnswer: string;
}

export interface SentenceUnderstandExercise extends BaseExercise {
  type: 'sentence_understand';
  sentence: SentenceItem;
  targetWord?: Word;
  tokenMappings: TokenMapping[];
  options: string[];
  correctAnswer: string;
}

export type LessonExercise =
  | FlashcardExercise
  | MultipleChoiceExercise
  | TypingExercise
  | SentenceTranslateExercise
  | SentenceGapExercise
  | SentenceUnderstandExercise;

export interface UserSettings {
  newWordsPerDay: number; // 1 to 8, default 3
  adaptivePace?: boolean; // Smart Moderation: throttles new words when mistake/due review backlog is high
  soundEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  dailyReminderTime: string; // "09:00"
  hapticFeedback: boolean;
  autoPlayAudio: boolean;
  enableAiSentences: boolean; // toggle whether to use Gemini API for sentences or purely offline
}

export interface DayStats {
  date: string; // YYYY-MM-DD
  reviewed: number;
  learned: number;
  accuracy: number;
  timeSpentSeconds: number;
}

export interface UserStats {
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
  history: Record<string, DayStats>;
  totalExercisesCompleted: number;
  totalLessonsCompleted: number;
}
