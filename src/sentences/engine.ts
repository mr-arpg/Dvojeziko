import { SentenceItem, TokenMapping, Word, WordProgress, Language } from '../data/types';
import { WORDS, WORDS_BY_LEMMA, PT_WORDS_BY_LEMMA } from '../data/words';
import { SAMPLE_SENTENCES } from '../data/sampleSentences';
import { SAMPLE_SENTENCES_PT } from '../data/sampleSentencesPt';
import { getExampleSentenceForWord } from '../data/exampleSentences';
import { loadSentenceCache, saveSentenceToCache, loadSettings } from '../data/storage';

// Known irregular mappings in Slovenian for common high-frequency verbs & pronouns
const SLOVENIAN_IRREGULAR_MAPPINGS: Record<string, string> = {
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

// Known irregular mappings in Portuguese for common high-frequency verbs & pronouns
const PORTUGUESE_IRREGULAR_MAPPINGS: Record<string, string> = {
  // ser / estar (to be)
  sou: 'ser', és: 'ser', é: 'ser', somos: 'ser', sois: 'ser', são: 'ser',
  era: 'ser', eras: 'ser', éramos: 'ser', eram: 'ser', fui: 'ser', foi: 'ser',
  fomos: 'ser', foram: 'ser', será: 'ser', serão: 'ser',
  estou: 'estar', estás: 'estar', está: 'estar', estamos: 'estar', estão: 'estar',
  estava: 'estar', estive: 'estar', esteve: 'estar', estivemos: 'estar', estiveram: 'estar',

  // ter (to have)
  tenho: 'ter', tens: 'ter', tem: 'ter', temos: 'ter', têm: 'ter',
  tinha: 'ter', tinhas: 'ter', tínhamos: 'ter', tinham: 'ter',
  tive: 'ter', teve: 'ter', tivemos: 'ter', tiveram: 'ter',

  // ir (to go)
  vou: 'ir', vais: 'ir', vai: 'ir', vamos: 'ir', vão: 'ir',
  ia: 'ir', ias: 'ir', íamos: 'ir', iam: 'ir',

  // fazer (to do/make)
  faço: 'fazer', fazes: 'fazer', faz: 'fazer', fazemos: 'fazer', fazem: 'fazer',
  fiz: 'fazer', fez: 'fazer', fizemos: 'fazer', fizeram: 'fazer',

  // ver (to see)
  vejo: 'ver', vês: 'ver', vê: 'ver', vemos: 'ver', veem: 'ver',
  vi: 'ver', viste: 'ver', viu: 'ver', vimos: 'ver', viram: 'ver',

  // saber (to know)
  sei: 'saber', sabes: 'saber', sabe: 'saber', sabemos: 'saber', sabem: 'saber',
  soube: 'saber', soubemos: 'saber',

  // poder (can)
  posso: 'poder', podes: 'poder', pode: 'poder', podemos: 'poder', podem: 'poder',
  pude: 'poder', pôde: 'poder', pudemos: 'poder', puderam: 'poder',

  // querer (to want)
  quero: 'querer', queres: 'querer', quer: 'querer', queremos: 'querer', querem: 'querer',
  quis: 'querer', quisemos: 'querer', quiseram: 'querer',

  // dizer (to say)
  digo: 'dizer', dizes: 'dizer', diz: 'dizer', dizemos: 'dizer', dizem: 'dizer',
  disse: 'dizer', dissemos: 'dizer', disseram: 'dizer',

  // dar (to give)
  dou: 'dar', dás: 'dar', dá: 'dar', damos: 'dar', dão: 'dar',
  dei: 'dar', deu: 'dar', demos: 'dar', deram: 'dar',

  // Contractions & clitics
  do: 'de', da: 'de', dos: 'de', das: 'de',
  no: 'em', na: 'em', nos: 'em', nas: 'em',
  ao: 'a', aos: 'a', à: 'a', às: 'a',
  pelo: 'por', pela: 'por', pelos: 'por', pelas: 'por',
  dum: 'de', duma: 'de', num: 'em', numa: 'em',
  contigo: 'tu', comigo: 'eu', connosco: 'nós',
};

/**
 * Tokenize a sentence and find corresponding lemma in 1000 list.
 */
export function analyzeSentenceTokens(
  sentenceText: string,
  allowedLemmas: Set<string>,
  lang: Language = 'sl'
): TokenMapping[] {
  const isPt = lang === 'pt';
  const lemmaMap = isPt ? PT_WORDS_BY_LEMMA : WORDS_BY_LEMMA;
  const irregulars = isPt ? PORTUGUESE_IRREGULAR_MAPPINGS : SLOVENIAN_IRREGULAR_MAPPINGS;

  // Split retaining words and attached punctuation
  const wordsWithPunct = sentenceText.split(/\s+/).filter(Boolean);

  return wordsWithPunct.map(rawToken => {
    const clean = rawToken.toLowerCase().replace(/^[.,?!:;"'»«()]+|[.,?!:;"'»«()]+$/g, '');
    let matchedWord: Word | undefined;

    // 1. Exact match on lemma
    if (lemmaMap.has(clean)) {
      matchedWord = lemmaMap.get(clean);
    }
    // 2. Irregular match
    else if (irregulars[clean]) {
      matchedWord = lemmaMap.get(irregulars[clean]);
    }
    // 3. Stem matching (remove inflectional suffixes)
    else if (isPt) {
      // Portuguese verb and plural suffixes
      const ptSuffixes = [
        'mente', 'íssima', 'íssimo', 'íssimas', 'íssimos',
        'ássemos', 'êssemos', 'íssemos', 'aremos', 'eremos', 'iremos',
        'avam', 'evam', 'ivam', 'aria', 'eria', 'iria',
        'amos', 'emos', 'imos', 'aram', 'eram', 'iram',
        'avas', 'evas', 'ivas', 'ando', 'endo', 'indo',
        'ava', 'eva', 'iva', 'ada', 'ado', 'adas', 'ados',
        'ida', 'ido', 'idas', 'idos', 'ou', 'eu', 'iu',
        'as', 'es', 'is', 'os', 'am', 'em', 'ão', 'ões',
        'a', 'e', 'o', 's'
      ];

      for (const suffix of ptSuffixes) {
        if (clean.endsWith(suffix) && clean.length - suffix.length >= 2) {
          const stem = clean.slice(0, clean.length - suffix.length);

          if (lemmaMap.has(stem)) {
            matchedWord = lemmaMap.get(stem);
            break;
          }
          if (lemmaMap.has(stem + 'ar')) {
            matchedWord = lemmaMap.get(stem + 'ar');
            break;
          }
          if (lemmaMap.has(stem + 'er')) {
            matchedWord = lemmaMap.get(stem + 'er');
            break;
          }
          if (lemmaMap.has(stem + 'ir')) {
            matchedWord = lemmaMap.get(stem + 'ir');
            break;
          }
          if (lemmaMap.has(stem + 'o')) {
            matchedWord = lemmaMap.get(stem + 'o');
            break;
          }
          if (lemmaMap.has(stem + 'a')) {
            matchedWord = lemmaMap.get(stem + 'a');
            break;
          }
        }
      }
    } else {
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
          
          if (WORDS_BY_LEMMA.has(stem)) {
            matchedWord = WORDS_BY_LEMMA.get(stem);
            break;
          }

          if (WORDS_BY_LEMMA.has(stem + 'o')) {
            matchedWord = WORDS_BY_LEMMA.get(stem + 'o');
            break;
          }

          if (WORDS_BY_LEMMA.has(stem + 'a')) {
            matchedWord = WORDS_BY_LEMMA.get(stem + 'a');
            break;
          }

          if (WORDS_BY_LEMMA.has(stem + 'ti')) {
            matchedWord = WORDS_BY_LEMMA.get(stem + 'ti');
            break;
          }
        }
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
  allowedLemmas: Set<string>,
  lang: Language = 'sl'
): { isValid: boolean; coverage: number; tokens: TokenMapping[] } {
  const tokens = analyzeSentenceTokens(sentenceText, allowedLemmas, lang);
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
  count: number = 3,
  lang: Language = 'sl'
): Promise<SentenceItem[]> {
  const isPt = lang === 'pt';
  const allowedLemmas = new Set(allowedWords.map(w => w.sl.toLowerCase()));
  targetWords.forEach(w => allowedLemmas.add(w.sl.toLowerCase()));

  const targetLemmas = targetWords.map(w => w.sl.toLowerCase());
  const samplePool = isPt ? SAMPLE_SENTENCES_PT : [...loadSentenceCache(), ...SAMPLE_SENTENCES];

  // 1. Check curated sentences using whole-word boundary matching
  const matchedFromCache: SentenceItem[] = [];
  for (const s of samplePool) {
    if (matchedFromCache.length >= count) break;
    const hasTarget = s.targets.some(t => targetLemmas.includes(t.toLowerCase())) ||
      targetLemmas.some(t => new RegExp(`(^|[\\s.,!?:;"'»«])${t}([\\s.,!?:;"'»«]|$)`, 'i').test(s.sl));

    if (hasTarget) {
      const val = validateSentenceCoverage(s.sl, allowedLemmas, lang);
      if (val.isValid && !matchedFromCache.some(m => m.id === s.id || m.sl === s.sl)) {
        matchedFromCache.push(s);
      }
    }
  }

  // 2. If we need more sentences to reach the requested count, construct contextual examples for target words
  if (matchedFromCache.length < count) {
    for (const w of targetWords) {
      if (matchedFromCache.length >= count) break;
      const example = getExampleSentenceForWord(w, lang);
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
    for (const s of samplePool) {
      if (matchedFromCache.length >= count) break;
      if (!matchedFromCache.some(m => m.sl === s.sl)) {
        matchedFromCache.push(s);
      }
    }
  }

  return matchedFromCache.slice(0, count);
}
