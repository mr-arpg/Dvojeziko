import React from 'react';
import { X, Calendar, Award, BookOpen, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { Word, WordProgress } from '../data/types';
import { AudioButton, CEFRBadge, StatusChip } from './MaterialComponents';
import { SAMPLE_SENTENCES } from '../data/sampleSentences';
import { loadSentenceCache } from '../data/storage';
import { getExampleSentenceForWord } from '../data/exampleSentences';

interface WordDetailModalProps {
  word: Word | null;
  progress?: WordProgress;
  onClose: () => void;
}

export const WordDetailModal: React.FC<WordDetailModalProps> = ({
  word,
  progress,
  onClose,
}) => {
  if (!word) return null;

  // Find sentences containing this word (using exact whole-word boundary matching)
  const allSentences = [...loadSentenceCache(), ...SAMPLE_SENTENCES];
  const wordSl = word.sl.toLowerCase();
  const wordRegex = new RegExp(`\\b${wordSl}\\b`, 'i');
  let relevantSentences = allSentences.filter(s =>
    s.targets.map(t => t.toLowerCase()).includes(wordSl) ||
    wordRegex.test(s.sl)
  ).slice(0, 3);

  if (relevantSentences.length === 0) {
    const fallbackEx = getExampleSentenceForWord(word);
    relevantSentences = [{
      id: `ex_${word.rank}`,
      sl: fallbackEx.sl,
      en: fallbackEx.en,
      targets: [word.sl],
    }];
  }

  const status = progress ? progress.status : 'new';
  const box = progress ? progress.box : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 transition-transform animate-in slide-in-from-bottom duration-250"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Drag Handle on Mobile */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Title Bar */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CEFRBadge level={word.level} />
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                Rank #{word.rank}
              </span>
              {word.isGrammarWord && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  Grammar
                </span>
              )}
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              {word.sl}
              <AudioButton text={word.sl} size="md" />
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Translation Card */}
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 mb-4">
          <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-1">
            English Translation
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-emerald-100 leading-snug">
            {word.en}
          </p>
          {word.isReflexive && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 italic">
              Reflexive verb: used with particle <strong>se</strong> or <strong>si</strong> in context.
            </p>
          )}
        </div>

        {/* Spaced Repetition Leitner Status */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700">
            <span className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1">
              <Award size={13} /> Leitner Box
            </span>
            <div className="mt-1 flex items-center gap-2">
              <StatusChip status={status} box={box} />
            </div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700">
            <span className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1">
              <Clock size={13} /> Next Review
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 block mt-1">
              {progress?.nextDueDate ? progress.nextDueDate : 'Not yet due'}
            </span>
          </div>
        </div>

        {/* Example Sentences */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2.5">
            <BookOpen size={16} className="text-emerald-600 dark:text-emerald-400" />
            Example Sentences
          </h3>
          {relevantSentences.length > 0 ? (
            <div className="space-y-2.5">
              {relevantSentences.map(sent => (
                <div
                  key={sent.id}
                  className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-200/80 dark:border-zinc-700/60 flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                      {sent.sl}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
                      {sent.en}
                    </p>
                  </div>
                  <AudioButton text={sent.sl} size="sm" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-zinc-400 italic">
              Example sentence will be constructed dynamically as you learn more words!
            </p>
          )}
        </div>

        {/* Authentic Slovenian Examples on Glosbe */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-zinc-400">
            Real bilingual examples:
          </span>
          <a
            href={`https://glosbe.com/sl/en/${encodeURIComponent(word.sl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline"
          >
            <span>Glosbe Sentences</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-5 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
