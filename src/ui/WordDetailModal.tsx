import React from 'react';
import { X, Calendar, Award, BookOpen, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { Word, WordProgress, Language } from '../data/types';
import { AudioButton, CEFRBadge, StatusChip } from './MaterialComponents';
import { SAMPLE_SENTENCES } from '../data/sampleSentences';
import { SAMPLE_SENTENCES_PT } from '../data/sampleSentencesPt';
import { loadSentenceCache } from '../data/storage';
import { getExampleSentenceForWord } from '../data/exampleSentences';

interface WordDetailModalProps {
  word: Word | null;
  progress?: WordProgress;
  onClose: () => void;
  language?: Language;
}

export const WordDetailModal: React.FC<WordDetailModalProps> = ({
  word,
  progress,
  onClose,
  language = 'sl',
}) => {
  if (!word) return null;

  const isPt = language === 'pt';

  // 1. Tailored primary example sentence for this word
  const primaryEx = getExampleSentenceForWord(word, language);

  // 2. Find any additional sample/cached sentences containing this word
  const allSentences = isPt ? SAMPLE_SENTENCES_PT : [...loadSentenceCache(), ...SAMPLE_SENTENCES];
  const wordSl = word.sl.toLowerCase();
  const wordRegex = new RegExp(`(^|[\\s.,!?:;"'»«])${wordSl}([\\s.,!?:;"'»«]|$)`, 'i');

  const additional = allSentences.filter(s =>
    s.sl !== primaryEx.sl &&
    (s.targets.map(t => t.toLowerCase()).includes(wordSl) || wordRegex.test(s.sl))
  );

  const relevantSentences = [
    {
      id: `primary_${word.rank}_${word.sl}`,
      sl: primaryEx.sl,
      en: primaryEx.en,
      targets: [word.sl],
    },
    ...additional,
  ].slice(0, 3);

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
              {word.rank > 0 ? (
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  Rank #{word.rank}
                </span>
              ) : (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {isPt ? 'Palavra do texto' : 'Context word'}
                </span>
              )}
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

        {/* Spaced Repetition Leitner Status (for vocabulary list words) */}
        {word.rank > 0 && (
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
        )}

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

        {/* Reference Dictionaries & Contextual Sentences */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 dark:text-zinc-400 font-medium">
            {isPt ? 'Dicionários de referência:' : 'Bilingual references:'}
          </span>
          <div className="flex items-center gap-3">
            {isPt ? (
              <>
                <a
                  href={`https://www.linguee.pt/portugues-ingles/search?source=auto&query=${encodeURIComponent(word.sl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline"
                  title="Linguee (Exemplos bilingues e contexto real)"
                >
                  <span>Linguee</span>
                  <ExternalLink size={12} />
                </a>
                <span className="text-slate-300 dark:text-zinc-700">•</span>
                <a
                  href={`https://www.infopedia.pt/dicionarios/portugues-ingles/${encodeURIComponent(word.sl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline"
                  title="Infopédia (Porto Editora - Portugal)"
                >
                  <span>Infopédia</span>
                  <ExternalLink size={12} />
                </a>
                <span className="text-slate-300 dark:text-zinc-700">•</span>
                <a
                  href={`https://dicionario.priberam.org/${encodeURIComponent(word.sl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline"
                  title="Dicionário Priberam da Língua Portuguesa"
                >
                  <span>Priberam</span>
                  <ExternalLink size={12} />
                </a>
              </>
            ) : (
              <>
                <a
                  href={`https://glosbe.com/sl/en/${encodeURIComponent(word.sl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline"
                >
                  <span>Glosbe</span>
                  <ExternalLink size={12} />
                </a>
                <span className="text-slate-300 dark:text-zinc-700">•</span>
                <a
                  href={`https://fran.si/iskanje?View=1&Query=${encodeURIComponent(word.sl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline"
                >
                  <span>Fran.si</span>
                  <ExternalLink size={12} />
                </a>
              </>
            )}
          </div>
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
