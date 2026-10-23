import React from 'react';
import {
  Play,
  RotateCw,
  Sparkles,
  BookOpen,
  Award,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Word, WordProgress, UserStats, CEFRLevel } from '../data/types';
import { ProgressRing, CEFRBadge, StatusChip, AudioButton } from './MaterialComponents';
import { CEFR_TOTALS, WORDS } from '../data/words';

interface HomeScreenProps {
  stats: UserStats;
  progressMap: Record<number, WordProgress>;
  dueCount: number;
  newWordsCount: number;
  targetNewWordsCount?: number;
  isModerated?: boolean;
  moderationReason?: string;
  mistakeWordsCount?: number;
  onStartLesson: () => void;
  onPracticeKnown: () => void;
  onPracticeMistakes?: () => void;
  onSelectWord: (word: Word) => void;
  onNavigateToWords: () => void;
  onOpenInstallModal?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  stats,
  progressMap,
  dueCount,
  newWordsCount,
  targetNewWordsCount,
  isModerated,
  moderationReason,
  mistakeWordsCount = 0,
  onStartLesson,
  onPracticeKnown,
  onPracticeMistakes,
  onSelectWord,
  onNavigateToWords,
  onOpenInstallModal,
}) => {
  // Count words by status and CEFR
  let learnedCount = 0;
  let learningCount = 0;
  const cefrLearned: Record<CEFRLevel, number> = { A1: 0, A2: 0, B1: 0, B2: 0 };

  for (const p of Object.values(progressMap)) {
    if (p.status === 'learned') {
      learnedCount++;
      const w = WORDS.find(word => word.rank === p.rank);
      if (w) cefrLearned[w.level] = (cefrLearned[w.level] || 0) + 1;
    } else if (p.status === 'learning') {
      learningCount++;
    }
  }

  // Pick a featured word of the day (e.g. first due word or word rank 1)
  const featuredWord = WORDS[Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % 100];

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-200">
      {/* Quick Action: Recap Mistakes (when user has challenging words) */}
      {mistakeWordsCount > 0 && onPracticeMistakes && (
        <div className="bg-amber-500/10 dark:bg-amber-950/30 rounded-3xl p-5 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide">
                Challenging Words
              </span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
              {mistakeWordsCount} {mistakeWordsCount === 1 ? 'Word' : 'Words'} to Recap
            </h4>
            <p className="text-xs text-slate-600 dark:text-zinc-300 mt-0.5">
              Review and reinforce your mistakes now without learning new words (~2 mins).
            </p>
          </div>
          <button
            type="button"
            onClick={onPracticeMistakes}
            className="shrink-0 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCw size={14} /> Recap Mistakes Now
          </button>
        </div>
      )}

      {/* Progress Ring Hero Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center">
        <div className="mb-4">
          <ProgressRing current={learnedCount} total={1000} size={170} strokeWidth={15} />
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Slovenian 1,000 Core Vocabulary
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs mt-1">
          {learnedCount} learned (Box 3+) • {learningCount} learning • {1000 - (learnedCount + learningCount)} new
        </p>

        {/* Start Lesson Main Button */}
        <button
          type="button"
          onClick={onStartLesson}
          className="w-full mt-6 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-lg rounded-2xl shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer ring-4 ring-emerald-500/20"
        >
          <Play size={22} className="fill-white" />
          Start Today's Lesson
          <span className="text-xs font-medium bg-emerald-700/60 px-2 py-0.5 rounded-full">
            5:00 min
          </span>
        </button>

        {/* Practice Known Words Button */}
        <button
          type="button"
          onClick={onPracticeKnown}
          className="w-full mt-3 py-3 px-5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold text-sm sm:text-base rounded-2xl border border-teal-200 dark:border-teal-800/60 shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
        >
          <RotateCw size={17} className="text-teal-600 dark:text-teal-400" />
          <span>Practice Known Words</span>
          <span className="text-xs font-bold bg-teal-200/70 dark:bg-teal-900/80 px-2 py-0.5 rounded-full text-teal-900 dark:text-teal-200">
            {learnedCount + learningCount > 0 ? `${learnedCount + learningCount} words` : 'Starter words'}
          </span>
        </button>

        {/* Lesson Composition Pill */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-3 text-xs font-semibold text-slate-600 dark:text-zinc-300">
          <span className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
            <RotateCw size={12} className="text-emerald-600" /> {dueCount > 0 ? `${Math.min(10, dueCount)} Reviews` : '0 Reviews'}
          </span>
          <span className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
            <Sparkles size={12} className="text-amber-500" /> {newWordsCount} New Words
            {isModerated && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold ml-1">
                (Moderated)
              </span>
            )}
          </span>
          <span className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
            <BookOpen size={12} className="text-purple-500" /> Sentence Practice
          </span>
        </div>

        {isModerated && moderationReason && (
          <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 max-w-sm mt-3 text-center">
            🛡️ <strong>Smart Moderation Active:</strong> {moderationReason}
          </p>
        )}
      </div>

      {/* Word of the Day Card */}
      <div
        onClick={() => onSelectWord(featuredWord)}
        className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-3 hover:border-emerald-500 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-black text-xl">
            {featuredWord.sl.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Word of the Day
              </span>
              <CEFRBadge level={featuredWord.level} />
            </div>
            <h4 className="text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
              {featuredWord.sl}
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-1">
              {featuredWord.en}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AudioButton text={featuredWord.sl} size="sm" />
          <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* CEFR Level Breakdown */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award size={18} className="text-emerald-600" />
            CEFR Level Breakdown
          </h3>
          <button
            type="button"
            onClick={onNavigateToWords}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
          >
            All 1000 words <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(['A1', 'A2', 'B1', 'B2'] as CEFRLevel[]).map(lvl => {
            const learned = cefrLearned[lvl] || 0;
            const total = CEFR_TOTALS[lvl] || 1;
            const pct = Math.round((learned / total) * 100);

            return (
              <div
                key={lvl}
                className="p-3.5 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-200/80 dark:border-zinc-700/60"
              >
                <div className="flex items-center justify-between mb-2">
                  <CEFRBadge level={lvl} />
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    {learned} / {total}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 dark:bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase mt-1.5 block text-right">
                  {pct}% complete
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
