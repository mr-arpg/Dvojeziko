import React from 'react';
import {
  Calendar,
  Flame,
  Award,
  AlertTriangle,
  TrendingUp,
  RotateCcw,
  CheckCircle,
  Play,
  Sparkles,
} from 'lucide-react';
import { UserStats, WordProgress, Word } from '../data/types';
import { WORDS } from '../data/words';
import { AudioButton, CEFRBadge, StatusChip } from './MaterialComponents';

interface StatsScreenProps {
  stats: UserStats;
  progressMap: Record<number, WordProgress>;
  onSelectWord: (word: Word) => void;
  onPracticeMistakes?: (words: Word[]) => void;
}

export const StatsScreen: React.FC<StatsScreenProps> = ({
  stats,
  progressMap,
  onSelectWord,
  onPracticeMistakes,
}) => {
  // Compute Box counts
  const boxCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let totalIntroduced = 0;

  for (const p of Object.values(progressMap)) {
    if (p.status !== 'new') {
      totalIntroduced++;
      if (boxCounts[p.box] !== undefined) {
        boxCounts[p.box]++;
      }
    }
  }

  // Hardest words (sorted by failedCount descending)
  const hardestWords = Object.values(progressMap)
    .filter(p => p.failedCount > 0)
    .sort((a, b) => b.failedCount - a.failedCount)
    .slice(0, 10)
    .map(p => ({
      word: WORDS.find(w => w.rank === p.rank)!,
      progress: p,
    }))
    .filter(item => item.word);

  // Generate 28-day calendar grid
  const days: { dateStr: string; label: string; activeCount: number }[] = [];
  const today = new Date();
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayData = stats.history[dateStr];
    days.push({
      dateStr,
      label: d.getDate().toString(),
      activeCount: dayData ? dayData.reviewed : 0,
    });
  }

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-200">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xs text-center">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2">
            <Flame size={20} className="fill-amber-500" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.streak}
          </span>
          <span className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase mt-0.5">
            Days Streak
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xs text-center">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
            <CheckCircle size={20} />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.totalLessonsCompleted}
          </span>
          <span className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase mt-0.5">
            Lessons Done
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xs text-center">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-2">
            <Award size={20} />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white">
            {totalIntroduced}
          </span>
          <span className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase mt-0.5">
            Words Introduced
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xs text-center">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-2">
            <RotateCcw size={20} />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.totalExercisesCompleted}
          </span>
          <span className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase mt-0.5">
            Total Reviews
          </span>
        </div>
      </div>

      {/* Streak Calendar */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
          <Calendar size={18} className="text-emerald-600" />
          Streak Calendar (Last 4 Weeks)
        </h3>

        <div className="grid grid-cols-7 gap-2 text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
            <span key={idx} className="text-[11px] font-bold text-slate-400 uppercase">
              {day}
            </span>
          ))}

          {days.map((item, idx) => {
            const hasActivity = item.activeCount > 0;
            return (
              <div
                key={idx}
                title={`${item.dateStr}: ${item.activeCount} exercises`}
                className={`aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all ${hasActivity ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'}`}
              >
                {item.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Spaced Repetition Leitner Box Distribution */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
          <Award size={18} className="text-emerald-600" />
          Leitner Spaced Repetition Boxes
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4">
          Words graduate to "Learned" once reaching Box 3 (4-day interval).
        </p>

        <div className="space-y-3">
          {[
            { box: 1, interval: '1 day', count: boxCounts[1], isLearned: false },
            { box: 2, interval: '2 days', count: boxCounts[2], isLearned: false },
            { box: 3, interval: '4 days', count: boxCounts[3], isLearned: true },
            { box: 4, interval: '7 days', count: boxCounts[4], isLearned: true },
            { box: 5, interval: '14 days', count: boxCounts[5], isLearned: true },
            { box: 6, interval: '30 days', count: boxCounts[6], isLearned: true },
          ].map(b => {
            const pct = totalIntroduced > 0 ? (b.count / totalIntroduced) * 100 : 0;
            return (
              <div key={b.box} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-slate-800 dark:text-zinc-200">
                    Box {b.box}
                    <span className="font-normal text-slate-400">({b.interval})</span>
                    {b.isLearned && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded-sm">
                        Learned
                      </span>
                    )}
                  </span>
                  <span className="text-slate-900 dark:text-white">
                    {b.count} words ({Math.round(pct)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${b.isLearned ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-sky-500 dark:bg-sky-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hardest Words (Most Overdue & Failed) */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
          <AlertTriangle size={18} className="text-amber-500" />
          Words Needing Practice
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4">
          Words with the most mistakes. Tap to review pronunciation and example sentences.
        </p>

        {hardestWords.length > 0 && onPracticeMistakes && (
          <button
            type="button"
            onClick={() => onPracticeMistakes(hardestWords.map(h => h.word))}
            className="w-full mb-4 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-2xl shadow-xs transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 text-sm"
          >
            <Play size={16} className="fill-slate-950" />
            Practice These {hardestWords.length} Mistake Words Now
          </button>
        )}

        {hardestWords.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-6">
            No challenging words yet! Complete lessons to track tricky vocabulary.
          </p>
        ) : (
          <div className="space-y-2">
            {hardestWords.map(({ word, progress }) => (
              <div
                key={word.rank}
                onClick={() => onSelectWord(word)}
                className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200/80 dark:border-zinc-700/60 flex items-center justify-between gap-3 hover:border-emerald-500 cursor-pointer transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-base">
                      {word.sl}
                    </span>
                    <CEFRBadge level={word.level} />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-zinc-400">
                    {word.en}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-900">
                    {progress.failedCount} {progress.failedCount === 1 ? 'mistake' : 'mistakes'}
                  </span>
                  <AudioButton text={word.sl} size="sm" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
