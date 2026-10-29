import React, { useState, useMemo } from 'react';
import { Search, Filter, Volume2, Award, ChevronRight, Check } from 'lucide-react';
import { Word, WordProgress, CEFRLevel, WordStatus } from '../data/types';
import { WORDS } from '../data/words';
import { AudioButton, CEFRBadge, StatusChip } from './MaterialComponents';

interface WordListScreenProps {
  progressMap: Record<number, WordProgress>;
  onSelectWord: (word: Word) => void;
}

export const WordListScreen: React.FC<WordListScreenProps> = ({
  progressMap,
  onSelectWord,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<CEFRLevel | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<WordStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const filteredWords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return WORDS.filter(word => {
      // Search match
      const matchesSearch =
        !q ||
        word.sl.toLowerCase().includes(q) ||
        word.en.toLowerCase().includes(q) ||
        word.rank.toString() === q;

      // Level match
      const matchesLevel = levelFilter === 'ALL' || word.level === levelFilter;

      // Status match
      const progress = progressMap[word.rank];
      const status: WordStatus = progress ? progress.status : 'new';
      const matchesStatus = statusFilter === 'ALL' || status === statusFilter;

      return matchesSearch && matchesLevel && matchesStatus;
    });
  }, [searchQuery, levelFilter, statusFilter, progressMap]);

  const pagedWords = useMemo(() => {
    return filteredWords.slice(0, page * pageSize);
  }, [filteredWords, page]);

  return (
    <div className="space-y-4 pb-28 animate-in fade-in duration-200">
      {/* Header and Search */}
      <div className="sticky top-0 z-20 bg-slate-50/90 dark:bg-zinc-950/90 backdrop-blur-md pt-2 pb-3 space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search all 1,000 words (Slovenian or English)..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Level and Status Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {/* Level Filter */}
          {(['ALL', 'A1', 'A2', 'B1', 'B2'] as const).map(lvl => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                setLevelFilter(lvl);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${levelFilter === lvl ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100'}`}
            >
              {lvl === 'ALL' ? 'All Levels' : lvl}
            </button>
          ))}

          <div className="w-[1px] h-5 bg-slate-300 dark:bg-zinc-700 shrink-0 mx-1" />

          {/* Status Filter */}
          {(['ALL', 'learned', 'learning', 'new'] as const).map(st => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer capitalize ${statusFilter === st ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100'}`}
            >
              {st === 'ALL' ? 'All Status' : st}
            </button>
          ))}
        </div>

        <div className="text-xs font-medium text-slate-500 dark:text-zinc-400 px-1 flex items-center justify-between">
          <span>Showing {pagedWords.length} of {filteredWords.length} words</span>
          <span>Tap word for audio & examples</span>
        </div>
      </div>

      {/* Words List */}
      <div className="space-y-2">
        {pagedWords.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6">
            <p className="text-slate-500 dark:text-zinc-400 text-sm">
              No words found matching "{searchQuery}".
            </p>
          </div>
        ) : (
          pagedWords.map(word => {
            const progress = progressMap[word.rank];
            const status: WordStatus = progress ? progress.status : 'new';
            const box = progress ? progress.box : undefined;

            return (
              <div
                key={word.rank}
                onClick={() => onSelectWord(word)}
                className="p-3.5 sm:p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs hover:border-emerald-500/80 transition-all flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono font-bold text-slate-400 w-8 shrink-0">
                    #{word.rank}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                        {word.sl}
                      </span>
                      <CEFRBadge level={word.level} />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                      {word.en}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <StatusChip status={status} box={box} />
                  <AudioButton text={word.sl} size="sm" />
                  <ChevronRight size={16} className="text-slate-300 dark:text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load More Button if remaining */}
      {pagedWords.length < filteredWords.length && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setPage(prev => prev + 1)}
            className="py-3 px-6 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-sm rounded-2xl transition-all cursor-pointer"
          >
            Load 50 More Words ({filteredWords.length - pagedWords.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
};
