import {
  LessonExercise,
  Word,
  WordProgress,
  SentenceItem,
  TokenMapping,
} from '../data/types';
import { WORDS } from '../data/words';
import { analyzeSentenceTokens } from '../sentences/engine';

/**
 * Pick 3 plausible distractors for a word.
 * If user has at least 4 known words (excluding target), picks distractors exclusively
 * from words the user has already learnt. This prevents the user from trivially eliminating
 * unfamiliar words and ensures meaningful testing.
 * If user has fewer than 4 known words, falls back to top foundational A1 words.
 */
export function getDistractors(
  targetWord: Word,
  mode: 'en' | 'sl',
  knownWords?: Word[]
): string[] {
  const targetId = targetWord.rank;

  // Words user has already encountered/learnt (excluding current target)
  const availableKnown = (knownWords || []).filter(w => w.rank !== targetId);

  let pool: Word[] = [];

  // When user has 4+ words in total (i.e. at least 3 distractors available from known words),
  // pick the other options from words user already learnt!
  if (availableKnown.length >= 3) {
    // Prefer words of same CEFR level if possible among known words
    const sameLevelKnown = availableKnown.filter(w => w.level === targetWord.level);
    const candidateKnown = sameLevelKnown.length >= 3 ? sameLevelKnown : availableKnown;
    pool = [...candidateKnown].sort(() => 0.5 - Math.random());
  } else {
    // For beginners with < 4 known words, combine available known words with top foundational words (ranks 1-25)
    // rather than advanced random vocabulary
    const foundational = WORDS.slice(0, 30).filter(w => w.rank !== targetId);
    const combined = [
      ...availableKnown,
      ...foundational.filter(f => !availableKnown.some(k => k.rank === f.rank))
    ];
    pool = combined.sort(() => 0.5 - Math.random());
  }

  const selected = pool.slice(0, 3);
  if (mode === 'en') {
    return selected.map(w => w.en.split(';')[0].trim());
  } else {
    return selected.map(w => w.sl);
  }
}

/**
 * Ensures strict separation in the exercise queue so no exercise for word W
 * directly follows another exercise or introduction for the same word W.
 */
function ensureStrictSeparation(queue: LessonExercise[]): LessonExercise[] {
  const result = [...queue];
  for (let i = 1; i < result.length; i++) {
    const prev = result[i - 1];
    const curr = result[i];

    const prevWordRank = 'word' in prev && prev.word ? prev.word.rank : ('targetWord' in prev && prev.targetWord ? prev.targetWord.rank : undefined);
    const currWordRank = 'word' in curr && curr.word ? curr.word.rank : ('targetWord' in curr && curr.targetWord ? curr.targetWord.rank : undefined);

    if (prevWordRank !== undefined && currWordRank !== undefined && prevWordRank === currWordRank) {
      // Find a later item that has a different word rank or sentence to swap with
      for (let j = i + 1; j < result.length; j++) {
        const candidate = result[j];
        const candRank = 'word' in candidate && candidate.word ? candidate.word.rank : ('targetWord' in candidate && candidate.targetWord ? candidate.targetWord.rank : undefined);
        if (candRank !== currWordRank) {
          const temp = result[i];
          result[i] = result[j];
          result[j] = temp;
          break;
        }
      }
    }
  }
  return result;
}

/**
 * Returns all accepted Slovenian answers for a typing prompt,
 * including valid synonyms and overlapping translations (e.g. ko / kdaj for "when",
 * zdaj / sedaj for "now", le / samo for "only", tu / tukaj for "here").
 */
export function getAcceptedAnswersForWord(word: Word): string[] {
  const answers = new Set<string>();
  const wordSl = word.sl.toLowerCase();
  answers.add(wordSl);

  // Common Slovenian semantic twins and synonyms
  const commonSynonyms: Record<string, string[]> = {
    'ko': ['kdaj'],
    'kdaj': ['ko'],
    'zdaj': ['sedaj'],
    'sedaj': ['zdaj'],
    'le': ['samo'],
    'samo': ['le'],
    'tu': ['tukaj'],
    'tukaj': ['tu'],
    'tam': ['tja'],
    'tja': ['tam'],
    'tudi': ['prav tako'],
    'vedno': ['vselej'],
    'vselej': ['vedno'],
    'zelo': ['prav', 'nadvse'],
    'res': ['zares'],
    'zares': ['res'],
    'morda': ['mogoče'],
    'mogoče': ['morda'],
  };

  if (commonSynonyms[wordSl]) {
    for (const syn of commonSynonyms[wordSl]) {
      answers.add(syn.toLowerCase());
    }
  }

  // Also collect words in WORDS that share the exact same primary English meaning
  const primaryEn = word.en.split(';')[0].replace(/\([^)]*\)/g, '').trim().toLowerCase();
  if (primaryEn.length > 1) {
    for (const w of WORDS) {
      const otherPrimaryEn = w.en.split(';')[0].replace(/\([^)]*\)/g, '').trim().toLowerCase();
      if (otherPrimaryEn === primaryEn) {
        answers.add(w.sl.toLowerCase());
      }
    }
  }

  return Array.from(answers);
}

/**
 * Build the complete 5-minute lesson exercise queue (~15-22 exercises).
 *
 * KEY GUARANTEES:
 * 1. Mixing: A new word is NEVER tested immediately after its intro card.
 *    Review exercises, other words, or sentences are interleaved in between.
 * 2. Distractors: Once user has 4+ words, multiple-choice & fill-in options are
 *    chosen from words the user has already learnt.
 */
export function buildLessonExercises(
  dueWords: { word: Word; progress: WordProgress }[],
  newWords: Word[],
  sentences: SentenceItem[],
  allowedLemmas: Set<string>,
  knownWords: Word[] = []
): LessonExercise[] {
  // Combine all known words with new words for options as the lesson progresses
  const allAvailableKnown = [...knownWords];
  newWords.forEach(w => {
    if (!allAvailableKnown.some(k => k.rank === w.rank)) {
      allAvailableKnown.push(w);
    }
  });

  // --- 1. REVIEW EXERCISES ---
  const sessionDueWords = dueWords.slice(0, 10);
  const reviewTypes = ['mc_sl_to_en', 'mc_en_to_sl', 'listening', 'typing', 'flashcard'] as const;
  const reviewExercises: LessonExercise[] = [];

  sessionDueWords.forEach(({ word }, idx) => {
    const exerciseType = reviewTypes[idx % reviewTypes.length];
    const exId = `rev_${word.rank}_${idx}`;

    if (exerciseType === 'mc_sl_to_en') {
      const distractors = getDistractors(word, 'en', allAvailableKnown);
      const correctAnswer = word.en.split(';')[0].trim();
      const options = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());
      reviewExercises.push({
        id: exId,
        type: 'mc_sl_to_en',
        phase: 'review',
        word,
        question: word.sl,
        options,
        correctAnswer,
      });
    } else if (exerciseType === 'mc_en_to_sl') {
      const distractors = getDistractors(word, 'sl', allAvailableKnown);
      const correctAnswer = word.sl;
      const options = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());
      reviewExercises.push({
        id: exId,
        type: 'mc_en_to_sl',
        phase: 'review',
        word,
        question: word.en,
        options,
        correctAnswer,
      });
    } else if (exerciseType === 'listening') {
      const distractors = getDistractors(word, 'sl', allAvailableKnown);
      const correctAnswer = word.sl;
      const options = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());
      reviewExercises.push({
        id: exId,
        type: 'listening',
        phase: 'review',
        word,
        question: 'Listen and select the word you hear:',
        options,
        correctAnswer,
      });
    } else if (exerciseType === 'typing') {
      reviewExercises.push({
        id: exId,
        type: 'typing',
        phase: 'review',
        word,
        prompt: word.en.split(';')[0].trim(),
        acceptedAnswers: getAcceptedAnswersForWord(word),
      });
    } else {
      reviewExercises.push({
        id: exId,
        type: 'flashcard',
        phase: 'review',
        word,
      });
    }
  });

  // --- 2. NEW WORDS: INTRO, QUIZ, TYPING ---
  const intros: LessonExercise[] = [];
  const quizzes: LessonExercise[] = [];
  const typings: LessonExercise[] = [];
  const isHighVolume = newWords.length > 3;

  newWords.forEach((word, idx) => {
    // A. Intro Card
    intros.push({
      id: `learn_intro_${word.rank}_${idx}`,
      type: 'flashcard',
      phase: 'learn',
      word,
    });

    // B. Quiz: Listening or Multiple Choice with distractors from known words
    if (!isHighVolume || idx % 2 !== 0) {
      const slDistractors = getDistractors(word, 'sl', allAvailableKnown);
      const slOptions = [word.sl, ...slDistractors].sort(() => 0.5 - Math.random());
      quizzes.push({
        id: `learn_listen_${word.rank}_${idx}`,
        type: 'listening',
        phase: 'learn',
        word,
        question: 'Listen carefully and select the word you hear:',
        options: slOptions,
        correctAnswer: word.sl,
      });
    } else {
      const enDistractors = getDistractors(word, 'en', allAvailableKnown);
      const enCorrect = word.en.split(';')[0].trim();
      const enOptions = [enCorrect, ...enDistractors].sort(() => 0.5 - Math.random());
      quizzes.push({
        id: `learn_mc_${word.rank}_${idx}`,
        type: 'mc_sl_to_en',
        phase: 'learn',
        word,
        question: word.sl,
        options: enOptions,
        correctAnswer: enCorrect,
      });
    }

    // C. Active Typing production
    typings.push({
      id: `learn_type_${word.rank}_${idx}`,
      type: 'typing',
      phase: 'learn',
      word,
      prompt: word.en.split(';')[0].trim(),
      acceptedAnswers: getAcceptedAnswersForWord(word),
    });
  });

  // --- 3. SENTENCE EXERCISES ---
  const sentenceExercises: LessonExercise[] = [];
  sentences.forEach((sentence, idx) => {
    const tokens = analyzeSentenceTokens(sentence.sl, allowedLemmas);
    const mode = idx % 3;

    if (mode === 0) {
      // Sentence Translate (Word Chips)
      const cleanTokens = sentence.sl
        .replace(/[.,?!:;]/g, '')
        .split(/\s+/)
        .filter(Boolean);

      // Distractor chips chosen from known words or foundational words
      const availableChipsPool = (allAvailableKnown.length >= 4)
        ? allAvailableKnown.filter(w => !cleanTokens.includes(w.sl.toLowerCase()))
        : WORDS.slice(0, 25).filter(w => !cleanTokens.includes(w.sl.toLowerCase()));
      const shuffledChips = [...availableChipsPool].sort(() => 0.5 - Math.random());
      const distractors = shuffledChips.slice(0, 2).map(w => w.sl);
      const chips = [...cleanTokens, ...distractors].sort(() => 0.5 - Math.random());

      sentenceExercises.push({
        id: `sent_trans_${sentence.id}_${idx}`,
        type: 'sentence_translate',
        phase: 'sentence',
        sentence,
        tokenMappings: tokens,
        shuffledChips: chips,
        distractors,
        correctTokens: cleanTokens,
      });
    } else if (mode === 1) {
      // Sentence Gap (Fill the blank with words from known pool)
      const gapToken = tokens.find(t => t.lemma && t.isKnown) || tokens[0];
      const gapIndex = tokens.indexOf(gapToken);
      const correctAnswer = gapToken ? gapToken.cleanToken : tokens[0].cleanToken;
      const targetWord = gapToken?.lemma ? WORDS.find(w => w.sl === gapToken.lemma) || WORDS[0] : WORDS[0];

      const distractors = getDistractors(targetWord, 'sl', allAvailableKnown);
      const options = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());

      const displaySentence = tokens
        .map((t, i) => (i === gapIndex ? '_____' : t.token))
        .join(' ');

      sentenceExercises.push({
        id: `sent_gap_${sentence.id}_${idx}`,
        type: 'sentence_gap',
        phase: 'sentence',
        sentence,
        targetWord,
        tokenMappings: tokens,
        gapIndex,
        displaySentence,
        options,
        correctAnswer,
      });
    } else {
      // Sentence Understand (Comprehension)
      const otherSentences = sentences
        .filter(s => s.id !== sentence.id)
        .map(s => s.en);

      const genericDistractors = [
        'They are going home now.',
        'We have good food and water.',
        'The morning is cold and windy.',
        'I do not understand the question.'
      ];

      const pool = [...otherSentences, ...genericDistractors].filter(e => e !== sentence.en);
      const distractors = pool.sort(() => 0.5 - Math.random()).slice(0, 3);
      const options = [sentence.en, ...distractors].sort(() => 0.5 - Math.random());

      sentenceExercises.push({
        id: `sent_und_${sentence.id}_${idx}`,
        type: 'sentence_understand',
        phase: 'sentence',
        sentence,
        tokenMappings: tokens,
        options,
        correctAnswer: sentence.en,
      });
    }
  });

  // --- 4. CONSOLIDATION (Self-Grade Flashcard Review) ---
  const consolidation: LessonExercise[] = newWords.map((word, idx) => ({
    id: `learn_review_${word.rank}_${idx}`,
    type: 'flashcard',
    phase: 'review',
    word,
  }));

  // --- 5. INTERLEAVING QUEUE TO PREVENT SAME-WORD ADJACENCY ---
  const mixed: LessonExercise[] = [];
  let revIdx = 0;
  let sentIdx = 0;

  // Initial warm-up reviews
  if (reviewExercises.length > 0) {
    mixed.push(reviewExercises[revIdx++]);
    if (reviewExercises.length > 2) {
      mixed.push(reviewExercises[revIdx++]);
    }
  }

  // Interleave new word introductions with review/sentence spacing
  intros.forEach((introEx, idx) => {
    mixed.push(introEx);

    // Buffer after intro so quiz is not immediately next
    if (revIdx < reviewExercises.length) {
      mixed.push(reviewExercises[revIdx++]);
    } else if (sentIdx < sentenceExercises.length) {
      mixed.push(sentenceExercises[sentIdx++]);
    }
  });

  // Now interleave quizzes
  quizzes.forEach((quizEx) => {
    mixed.push(quizEx);

    // Buffer between quizzes
    if (revIdx < reviewExercises.length) {
      mixed.push(reviewExercises[revIdx++]);
    } else if (sentIdx < sentenceExercises.length) {
      mixed.push(sentenceExercises[sentIdx++]);
    }
  });

  // Sentence exercises
  while (sentIdx < sentenceExercises.length) {
    mixed.push(sentenceExercises[sentIdx++]);
  }

  // Typing exercises (active recall)
  typings.forEach((typeEx) => {
    mixed.push(typeEx);
    if (revIdx < reviewExercises.length) {
      mixed.push(reviewExercises[revIdx++]);
    }
  });

  // Any remaining review exercises
  while (revIdx < reviewExercises.length) {
    mixed.push(reviewExercises[revIdx++]);
  }

  // Final consolidation flashcards
  consolidation.forEach(c => mixed.push(c));

  // Enforce strict separation pass
  return ensureStrictSeparation(mixed);
}

/**
 * Dedicated Practice Mode: lets the user practice words they ALREADY know!
 * Generates an engaging mix of listening, multiple choice, typing, and flashcards
 * exclusively from known vocabulary, reinforcing retention without learning new words.
 */
export function buildKnownWordsPracticeExercises(
  knownWords: Word[],
  count: number = 10
): LessonExercise[] {
  const exercises: LessonExercise[] = [];
  if (knownWords.length === 0) return exercises;

  // Shuffle known words and take up to 'count'
  const pool = [...knownWords].sort(() => 0.5 - Math.random());
  const selected = pool.slice(0, count);

  const exerciseTypes = ['listening', 'mc_sl_to_en', 'mc_en_to_sl', 'typing', 'flashcard'] as const;

  selected.forEach((word, idx) => {
    const type = exerciseTypes[idx % exerciseTypes.length];
    const exId = `practice_${word.rank}_${idx}_${Date.now()}`;

    if (type === 'listening') {
      const slDistractors = getDistractors(word, 'sl', knownWords);
      const options = [word.sl, ...slDistractors].sort(() => 0.5 - Math.random());
      exercises.push({
        id: exId,
        type: 'listening',
        phase: 'review',
        word,
        question: 'Listen carefully and select the word you hear:',
        options,
        correctAnswer: word.sl,
      });
    } else if (type === 'mc_sl_to_en') {
      const enDistractors = getDistractors(word, 'en', knownWords);
      const enCorrect = word.en.split(';')[0].trim();
      const options = [enCorrect, ...enDistractors].sort(() => 0.5 - Math.random());
      exercises.push({
        id: exId,
        type: 'mc_sl_to_en',
        phase: 'review',
        word,
        question: word.sl,
        options,
        correctAnswer: enCorrect,
      });
    } else if (type === 'mc_en_to_sl') {
      const slDistractors = getDistractors(word, 'sl', knownWords);
      const options = [word.sl, ...slDistractors].sort(() => 0.5 - Math.random());
      exercises.push({
        id: exId,
        type: 'mc_en_to_sl',
        phase: 'review',
        word,
        question: word.en,
        options,
        correctAnswer: word.sl,
      });
    } else if (type === 'typing') {
      exercises.push({
        id: exId,
        type: 'typing',
        phase: 'review',
        word,
        prompt: word.en.split(';')[0].trim(),
        acceptedAnswers: getAcceptedAnswersForWord(word),
      });
    } else {
      exercises.push({
        id: exId,
        type: 'flashcard',
        phase: 'review',
        word,
      });
    }
  });

  return ensureStrictSeparation(exercises);
}

/**
 * Build a focused practice queue specifically targeting difficult/errored words
 */
export function buildWeakWordsPracticeExercises(words: Word[]): LessonExercise[] {
  const exercises: LessonExercise[] = [];

  words.forEach((word, idx) => {
    // 1. Audio Listening recognition
    const slDistractors = getDistractors(word, 'sl', words);
    const slOptions = [word.sl, ...slDistractors].sort(() => 0.5 - Math.random());
    exercises.push({
      id: `weak_listen_${word.rank}_${idx}`,
      type: 'listening',
      phase: 'review',
      word,
      question: 'Listen and select the word you hear:',
      options: slOptions,
      correctAnswer: word.sl,
    });

    // 2. Multiple choice SL -> EN
    const enDistractors = getDistractors(word, 'en', words);
    const enCorrect = word.en.split(';')[0].trim();
    const enOptions = [enCorrect, ...enDistractors].sort(() => 0.5 - Math.random());
    exercises.push({
      id: `weak_mc_${word.rank}_${idx}`,
      type: 'mc_sl_to_en',
      phase: 'review',
      word,
      question: word.sl,
      options: enOptions,
      correctAnswer: enCorrect,
    });

    // 3. Active typing recall EN -> SL
    exercises.push({
      id: `weak_type_${word.rank}_${idx}`,
      type: 'typing',
      phase: 'review',
      word,
      prompt: word.en.split(';')[0].trim(),
      acceptedAnswers: getAcceptedAnswersForWord(word),
    });
  });

  return ensureStrictSeparation(exercises);
}
