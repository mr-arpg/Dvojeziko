import wordsRaw from './words.json';
import wordsPtRaw from './words-portuguese.json';
import { RawWord, Word, CEFRLevel, Language } from './types';

// Set of common grammatical/functional words (prepositions, conjunctions, particles, pronouns)
const GRAMMAR_LEMMAS = new Set([
  'in', 'je', 'se', 'na', 'da', 'so', 'ne', 'za', 'ki', 'pa', 'to', 'kot', 'po',
  'sem', 'bi', 'ali', 'jo', 'ga', 'kaj', 'v', 'z', 's', 'tudi', 'ko', 'še', 'že',
  'do', 'iz', 'bo', 'ta', 'ampak', 'ker', 'če', 'samo', 'kdo', 'jaz', 'me', 'mi',
  'ti', 'on', 'ona', 'tako', 'lahko', 'od', 'si', 'ves', 'ob', 'kjer', 'ni', 'smo',
  'moj', 'saj', 'oni', 'vi', 'ono', 'kar', 'nič', 'kateri', 'takrat', 'nek', 'naš',
  'njegov', 'njen', 'tvoj', 'zato', 'vsak', 'vse', 'brez', 'pri', 'med', 'kdor',
  'nato', 'potem', 'eden', 'ena', 'nekaj', 'nekdo', 'nihče', 'vsi', 'sam', 'isti',
  'tisti', 'takšen', 'kakšen', 'toliko', 'koliko', 'sicer', 'čeprav', 'medtem',
  'vendar', 'torej', 'namreč', 'kljub', 'zaradi', 'proti', 'čez', 'skozi', 'okoli',
  'pod', 'nad', 'pred', 'k', 'h', 'o', 'poleg', 'naj', 'niti', 'sploh', 'pač', 'kajne',
  // Portuguese grammatical words
  'de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não', 'uma',
  'os', 'no', 'se', 'na', 'por', 'mais', 'as', 'dos', 'como', 'mas', 'foi', 'ao', 'ele',
  'das', 'tem', 'à', 'seu', 'sua', 'ou', 'ser', 'quando', 'muito', 'nos', 'já', 'está',
  'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso', 'ela', 'entre', 'depois', 'sem'
]);

function cleanMeaning(str: string): string[] {
  return str
    .split(';')
    .map(m => m.trim().toLowerCase().replace(/\([^)]*\)/g, '').trim())
    .filter(Boolean);
}

export const SLOVENIAN_WORDS: Word[] = (wordsRaw as RawWord[]).map(raw => {
  const isReflexive = raw.en.includes('(se)') || raw.en.includes('(si)');
  const isGrammar = GRAMMAR_LEMMAS.has(raw.sl.toLowerCase());
  const meanings = cleanMeaning(raw.en);

  return {
    ...raw,
    isGrammarWord: isGrammar,
    meanings,
    isReflexive,
  };
});

export const PORTUGUESE_WORDS: Word[] = (wordsPtRaw as any[]).map(raw => {
  const isReflexive = raw.en.includes('(se)') || raw.en.includes('(si)');
  const isGrammar = GRAMMAR_LEMMAS.has((raw.pt || raw.sl).toLowerCase());
  const meanings = cleanMeaning(raw.en);

  return {
    rank: raw.rank,
    sl: raw.pt || raw.sl, // Used as target word across exercises
    en: raw.en,
    level: raw.level as CEFRLevel,
    isGrammarWord: isGrammar,
    meanings,
    isReflexive,
  };
});

// Currently active default word list (Slovenian)
export let WORDS: Word[] = SLOVENIAN_WORDS;

// Fast lookups
export const WORDS_BY_RANK = new Map<number, Word>();
export const WORDS_BY_LEMMA = new Map<string, Word>();

export const PT_WORDS_BY_RANK = new Map<number, Word>();
export const PT_WORDS_BY_LEMMA = new Map<string, Word>();

SLOVENIAN_WORDS.forEach(w => {
  WORDS_BY_RANK.set(w.rank, w);
  WORDS_BY_LEMMA.set(w.sl.toLowerCase(), w);
});

PORTUGUESE_WORDS.forEach(w => {
  PT_WORDS_BY_RANK.set(w.rank, w);
  PT_WORDS_BY_LEMMA.set(w.sl.toLowerCase(), w);
});

export function setGlobalLanguage(lang: Language): void {
  WORDS = lang === 'pt' ? PORTUGUESE_WORDS : SLOVENIAN_WORDS;
}

export function getWordsForLanguage(lang?: Language): Word[] {
  return lang === 'pt' ? PORTUGUESE_WORDS : SLOVENIAN_WORDS;
}

export function getWordsByRankMap(lang?: Language): Map<number, Word> {
  return lang === 'pt' ? PT_WORDS_BY_RANK : WORDS_BY_RANK;
}

export function getWordByRank(rank: number, lang?: Language): Word | undefined {
  const map = lang === 'pt' ? PT_WORDS_BY_RANK : WORDS_BY_RANK;
  return map.get(rank);
}

export function getWordByLemma(lemma: string, lang?: Language): Word | undefined {
  const map = lang === 'pt' ? PT_WORDS_BY_LEMMA : WORDS_BY_LEMMA;
  return map.get(lemma.toLowerCase());
}

export function getCefrTotals(lang?: Language): Record<CEFRLevel, number> {
  const list = getWordsForLanguage(lang);
  return {
    A1: list.filter(w => w.level === 'A1').length,
    A2: list.filter(w => w.level === 'A2').length,
    B1: list.filter(w => w.level === 'B1').length,
    B2: list.filter(w => w.level === 'B2').length,
  };
}

export const CEFR_TOTALS: Record<CEFRLevel, number> = getCefrTotals('sl');
