import { SentenceItem, TokenMapping, Word, WordProgress } from '../data/types';
import { WORDS, WORDS_BY_LEMMA } from '../data/words';
import { SAMPLE_SENTENCES } from '../data/sampleSentences';
import { getExampleSentenceForWord } from '../data/exampleSentences';
import { loadSentenceCache, saveSentenceToCache, loadSettings } from '../data/storage';

// Known irregular mappings in Slovenian for common high-frequency verbs & pronouns
const IRREGULAR_MAPPINGS: Record<string, string> = {
  // biti (to be)
  sem: 'biti', si: 'biti', je: 'biti', smo: 'biti', ste: 'biti', so: 'biti',
  bo: 'biti', bom: 'biti', boš: 'biti', bomo: 'biti', boste: 'biti', bodo: 'biti',
  sta: 'biti', sva: 'biti', bil: 'biti', bila: 'biti', bilo: 'biti', bili: 'biti',
  bile: 'biti', nisi: 'biti', nismo: 'biti', niste: 'biti', niso: 'biti',

  // vedeti (to know)
  vem: 'vedeti', veš: 'vedeti', ve: 'vedeti', vemo: 'vedeti', veste: 'vedeti', vedo: 'vedeti',

  // iti (to go)
  grem: 'iti', greš: 'iti', gre: 'iti', gremo: 'iti', greste: 'iti', gredo: 'iti', šel: 'iti', šla: 'iti',

  // hoteti (to want)
  hočem: 'hoteti', hočeš: 'hoteti', hoče: 'hoteti', hočemo: 'hoteti', hočete: 'hoteti', hočejo: 'hoteti',
  nočem: 'hoteti', nočeš: 'hoteti', noče: 'hoteti',

  // moči (can/be able)
  morem: 'moči', moreš: 'moči', more: 'moči', moremo: 'moči', morete: 'moči', morejo: 'moči',
  lahko: 'lahko',

  // imeti (to have)
  imam: 'imeti', imaš: 'imeti', ima: 'imeti', imamo: 'imeti', imate: 'imeti', imajo: 'imeti',
  nimam: 'imeti', nimaš: 'imeti', nima: 'imeti', nimamo: 'imeti', nimate: 'imeti', nimajo: 'imeti',

  // reči (to say)
  rečem: 'reči', rečeš: 'reči', reče: 'reči', rečemo: 'reči', rečejo: 'reči', rekel: 'reči', rekla: 'reči',

  // dati (to give)
  dam: 'dati', daš: 'dati', da: 'dati', damo: 'dati', date: 'dati', dajo: 'dati',

  // videti (to see)
  vidim: 'videti', vidiš: 'videti', vidi: 'videti', vidimo: 'videti', vidite: 'videti', vidijo: 'videti',

  // priti (to come)
  pridem: 'priti', prideš: 'priti', pride: 'priti', pridemo: 'priti', pridete: 'priti', pridejo: 'priti', prišel: 'priti', prišla: 'priti',

  // pronouns / clitics
  me: 'jaz', mi: 'jaz', mano: 'jaz', menoj: 'jaz', mene: 'jaz',
  te: 'ti', ti: 'ti', teboj: 'ti', tebe: 'ti',
  ga: 'on', mu: 'on', njim: 'on', njega: 'on',
  jo: 'ona', ji: 'ona', njo: 'ona', nje: 'ona',
  ju: 'dva', jim: 'oni', jih: 'oni', njimi: 'oni',
  naju: 'mi', vam: 'vi', vas: 'vi', vami: 'vi',
};

/**
 * Tokenize a Slovenian sentence and find corresponding lemma in 1000 list.
 */
export function analyzeSentenceTokens(
  sentenceText: string,
  allowedLemmas: Set<string>
): TokenMapping[] {
  // Split retaining words and attached punctuation
  const wordsWithPunct = sentenceText.split(/\s+/).filter(Boolean);

  return wordsWithPunct.map(rawToken => {
    const clean = rawToken.toLowerCase().replace(/^[.,?!:;"'»«()]+|[.,?!:;"'»«()]+$/g, '');
    let matchedWord: Word | undefined;

    // 1. Exact match on lemma
    if (WORDS_BY_LEMMA.has(clean)) {
      matchedWord = WORDS_BY_LEMMA.get(clean);
    }
    // 2. Irregular match
    else if (IRREGULAR_MAPPINGS[clean]) {
      matchedWord = WORDS_BY_LEMMA.get(IRREGULAR_MAPPINGS[clean]);
    }
    // 3. Stem matching (remove inflectional suffixes)
    else {
      // Suffix list for Slovenian present verbs, adjectives, nouns
      const suffixes = [
        'ejo', 'ijo', 'ajo', 'emo', 'imo', 'amo', 'ete', 'ite', 'ate', 'eš', 'iš', 'aš',
        'ala', 'alo', 'ali', 'ale', 'ila', 'ilo', 'ili', 'ile', 'el', 'al', 'il',
        'ega', 'emu', 'ima', 'oma', 'ami', 'imi', 'em', 'om', 'am', 'im', 'ih', 'ah',
        'a', 'e', 'i', 'o', 'u'
      ];

      for (const suffix of suffixes) {
        if (clean.endsWith(suffix) && clean.length - suffix.length >= 2) {
          const stem = clean.slice(0, clean.length - suffix.length);
          
          // 1. Direct noun/adj base (e.g. masculine korak)
          if (WORDS_BY_LEMMA.has(stem)) {
            matchedWord = WORDS_BY_LEMMA.get(stem);
            break;
          }

          // 2. Neuter noun base in -o (e.g. mestu -> mesto, oknu -> okno)
          if (WORDS_BY_LEMMA.has(stem + 'o')) {
            matchedWord = WORDS_BY_LEMMA.get(stem + 'o');
            break;
          }

          // 3. Neuter noun base in -e (e.g. morju -> morje, polju -> polje)
          if (WORDS_BY_LEMMA.has(stem + 'e')) {
            matchedWord = WORDS_BY_LEMMA.get(stem + 'e');
            break;
          }

          // 4. Feminine noun base in -a (e.g. vodo -> voda, hiši -> hiša)
          if (WORDS_BY_LEMMA.has(stem + 'a')) {
            matchedWord = WORDS_BY_LEMMA.get(stem + 'a');
            break;
          }

          // 5. Verb base ending in -ti or -či
          const candidateVerbs = [stem + 'ti', stem + 'iti', stem + 'ati', stem + 'eti', stem + 'či'];
          for (const cand of candidateVerbs) {
            if (WORDS_BY_LEMMA.has(cand)) {
              matchedWord = WORDS_BY_LEMMA.get(cand);
              break;
            }
          }
          if (matchedWord) break;
        }
      }

      // 4. Strict prefix fallback (only words >= 4 letters, strictly w.sl.startsWith)
      if (!matchedWord && clean.length >= 4) {
        const stem4 = clean.slice(0, 4);
        matchedWord = WORDS.find(w => w.sl.length >= 4 && w.sl.startsWith(stem4));
      }
    }

    const lemma = matchedWord ? matchedWord.sl : undefined;
    const meaning = matchedWord ? matchedWord.en : undefined;
    const isKnown = !!lemma && allowedLemmas.has(lemma.toLowerCase());

    return {
      token: rawToken,
      cleanToken: clean,
      lemma,
      meaning,
      isKnown,
    };
  });
}

/**
 * Validates on-device if at least 85% of words are known in allowed vocabulary
 */
export function validateSentenceCoverage(
  sentenceText: string,
  allowedLemmas: Set<string>
): { isValid: boolean; coverage: number; tokens: TokenMapping[] } {
  const tokens = analyzeSentenceTokens(sentenceText, allowedLemmas);
  if (tokens.length === 0) return { isValid: false, coverage: 0, tokens: [] };

  const knownCount = tokens.filter(t => t.isKnown).length;
  const coverage = knownCount / tokens.length;
  return {
    isValid: coverage >= 0.85,
    coverage,
    tokens,
  };
}

/**
 * Fetch or generate sentences for given target words and allowed vocabulary
 */
export async function getPracticeSentences(
  targetWords: Word[],
  allowedWords: Word[],
  count: number = 3
): Promise<SentenceItem[]> {
  const allowedLemmas = new Set(allowedWords.map(w => w.sl.toLowerCase()));
  targetWords.forEach(w => allowedLemmas.add(w.sl.toLowerCase()));

  const targetLemmas = targetWords.map(w => w.sl.toLowerCase());
  const cached = [...loadSentenceCache(), ...SAMPLE_SENTENCES];

  // 1. Check cache and curated sentences using whole-word boundary matching
  const matchedFromCache: SentenceItem[] = [];
  for (const s of cached) {
    if (matchedFromCache.length >= count) break;
    const hasTarget = s.targets.some(t => targetLemmas.includes(t.toLowerCase())) ||
      targetLemmas.some(t => new RegExp(`\\b${t}\\b`, 'i').test(s.sl));

    if (hasTarget) {
      const val = validateSentenceCoverage(s.sl, allowedLemmas);
      if (val.isValid && !matchedFromCache.some(m => m.id === s.id || m.sl === s.sl)) {
        matchedFromCache.push(s);
      }
    }
  }

  // 2. If we need more sentences to reach the requested count, construct contextual examples for target words
  if (matchedFromCache.length < count) {
    for (const w of targetWords) {
      if (matchedFromCache.length >= count) break;
      const example = getExampleSentenceForWord(w);
      if (!matchedFromCache.some(m => m.sl === example.sl)) {
        matchedFromCache.push({
          id: `curated_${w.rank}_${Date.now()}`,
          sl: example.sl,
          en: example.en,
          targets: [w.sl.toLowerCase()],
        });
      }
    }
  }

  // 3. Fallback to general high-frequency sample sentences
  if (matchedFromCache.length < count) {
    for (const s of SAMPLE_SENTENCES) {
      if (matchedFromCache.length >= count) break;
      if (!matchedFromCache.some(m => m.sl === s.sl)) {
        matchedFromCache.push(s);
      }
    }
  }

  return matchedFromCache.slice(0, count);
}
