import wordsRaw from './words.json';
import { RawWord, Word, CEFRLevel } from './types';

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
  'pod', 'nad', 'pred', 'k', 'h', 'o', 'poleg', 'naj', 'niti', 'sploh', 'pač', 'kajne'
]);

function cleanMeaning(str: string): string[] {
  return str
    .split(';')
    .map(m => m.trim().toLowerCase().replace(/\([^)]*\)/g, '').trim())
    .filter(Boolean);
}

export const WORDS: Word[] = (wordsRaw as RawWord[]).map(raw => {
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

// Fast lookups
export const WORDS_BY_RANK = new Map<number, Word>();
export const WORDS_BY_LEMMA = new Map<string, Word>();

WORDS.forEach(w => {
  WORDS_BY_RANK.set(w.rank, w);
  WORDS_BY_LEMMA.set(w.sl.toLowerCase(), w);
});

export function getWordByRank(rank: number): Word | undefined {
  return WORDS_BY_RANK.get(rank);
}

export function getWordByLemma(lemma: string): Word | undefined {
  return WORDS_BY_LEMMA.get(lemma.toLowerCase());
}

export const CEFR_TOTALS: Record<CEFRLevel, number> = {
  A1: WORDS.filter(w => w.level === 'A1').length,
  A2: WORDS.filter(w => w.level === 'A2').length,
  B1: WORDS.filter(w => w.level === 'B1').length,
  B2: WORDS.filter(w => w.level === 'B2').length,
};
