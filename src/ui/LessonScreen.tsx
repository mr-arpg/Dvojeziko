import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Volume2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Trophy,
  Flame,
  Award,
} from 'lucide-react';
import {
  LessonExercise,
  Word,
  WordProgress,
  TokenMapping,
} from '../data/types';
import {
  AudioButton,
  CEFRBadge,
  SlovenianKeyboardBar,
} from './MaterialComponents';
import { WordDetailModal } from './WordDetailModal';
import {
  playSlovenianAudio,
  preloadSlovenianAudio,
  playSuccessChime,
  playFailureThud,
} from '../tts/audioService';
import { calculateNextProgress, ReviewGrade } from '../srs/scheduler';
import { WORDS, WORDS_BY_LEMMA } from '../data/words';
import { getExampleSentenceForWord } from '../data/exampleSentences';

interface LessonScreenProps {
  exercises: LessonExercise[];
  progressMap: Record<number, WordProgress>;
  onCompleteLesson: (updatedProgress: Record<number, WordProgress>, totalScore: number) => void;
  onExit: () => void;
}

export const LessonScreen: React.FC<LessonScreenProps> = ({
  exercises,
  progressMap,
  onCompleteLesson,
  onExit,
}) => {
  // 5:00 countdown timer in seconds = 300 seconds
  const [secondsLeft, setSecondsLeft] = useState<number>(300);
  const [exerciseQueue, setExerciseQueue] = useState<LessonExercise[]>(exercises);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedInput, setTypedInput] = useState<string>('');
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [isAnswerChecked, setIsAnswerChecked] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [gentleNote, setGentleNote] = useState<string | null>(null);
  const [activeWordForDetail, setActiveWordForDetail] = useState<Word | null>(null);

  // Sync exerciseQueue if incoming exercises prop changes and preload audio
  useEffect(() => {
    setExerciseQueue(exercises);
    const toPreload: string[] = [];
    exercises.forEach(ex => {
      if ('word' in ex && ex.word) toPreload.push(ex.word.sl);
      if ('sentence' in ex && ex.sentence) toPreload.push(ex.sentence.sl);
    });
    preloadSlovenianAudio(toPreload);
  }, [exercises]);

  // Results tracking
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);
  const [currentProgressMap, setCurrentProgressMap] = useState<Record<number, WordProgress>>({ ...progressMap });
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Timer effect: counts down 5:00 minutes without abruptly interrupting user mid-exercise
  useEffect(() => {
    if (isFinished || isTimeUp) return;
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsTimeUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isFinished, isTimeUp]);

  const currentExercise = exerciseQueue[currentIndex];

  // Auto-play audio when opening a new exercise if listening or learn card
  useEffect(() => {
    if (!currentExercise || isFinished) return;

    // Reset exercise state
    setSelectedOption(null);
    setTypedInput('');
    setSelectedChips([]);
    setIsAnswerChecked(false);
    setIsCorrect(null);
    setGentleNote(null);

    if (currentExercise.type === 'listening' && currentExercise.word) {
      const wordSl = currentExercise.word.sl;
      setTimeout(() => playSlovenianAudio(wordSl), 300);
    } else if (currentExercise.phase === 'learn' && currentExercise.word) {
      const wordSl = currentExercise.word.sl;
      setTimeout(() => playSlovenianAudio(wordSl), 300);
    }
  }, [currentIndex, isFinished]);

  if (isFinished || !currentExercise) {
    const totalDone = correctCount + wrongCount;
    const accuracy = totalDone > 0 ? Math.round((correctCount / totalDone) * 100) : 100;

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-zinc-800 shadow-xl text-center animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50 dark:ring-emerald-950/30">
            <Trophy size={42} />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-1">
            Lesson Completed!
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6">
            Odlično opravljeno! Great job completing your 5-minute Slovenian session.
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200/80 dark:border-zinc-700/60">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {correctCount}
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase mt-0.5">
                Correct
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200/80 dark:border-zinc-700/60">
              <span className="text-2xl font-black text-sky-600 dark:text-sky-400">
                {accuracy}%
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase mt-0.5">
                Accuracy
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200/80 dark:border-zinc-700/60">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {Math.floor((300 - secondsLeft) / 60)}:
                {String((300 - secondsLeft) % 60).padStart(2, '0')}
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase mt-0.5">
                Time
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => onCompleteLesson(currentProgressMap, accuracy)}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-sm transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              Continue to Home <ArrowRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                // Restart another 5-minute round
                setSecondsLeft(300);
                setCurrentIndex(0);
                setIsTimeUp(false);
                setIsFinished(false);
              }}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> Keep Practicing (Another 5:00 Round)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Formatting minutes and seconds
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const progressRatio = exerciseQueue.length > 0 ? (currentIndex + 1) / exerciseQueue.length : 0;

  // Grade word for SRS
  const gradeWord = (targetWord: Word | undefined, grade: ReviewGrade) => {
    if (!targetWord) return;
    const current = currentProgressMap[targetWord.rank];
    const next = calculateNextProgress(current, targetWord.rank, grade);
    setCurrentProgressMap(prev => ({
      ...prev,
      [targetWord.rank]: next,
    }));
  };

  // Check answers
  const handleCheckAnswer = () => {
    if (isAnswerChecked) return;

    let correct = false;
    let note: string | null = null;

    if (
      currentExercise.type === 'mc_sl_to_en' ||
      currentExercise.type === 'mc_en_to_sl' ||
      currentExercise.type === 'listening' ||
      currentExercise.type === 'sentence_gap' ||
      currentExercise.type === 'sentence_understand'
    ) {
      correct = selectedOption === currentExercise.correctAnswer;
      if ('word' in currentExercise && currentExercise.word) {
        gradeWord(currentExercise.word, correct ? 'good' : 'again');
        playSlovenianAudio(currentExercise.word.sl);
      } else if ('sentence' in currentExercise && currentExercise.sentence) {
        playSlovenianAudio(currentExercise.sentence.sl);
      }
    } else if (currentExercise.type === 'typing') {
      const user = typedInput.trim().toLowerCase();
      const target = currentExercise.word.sl.toLowerCase();

      // Normalized comparison (remove diacritics č->c, š->s, ž->z)
      const normalize = (str: string) =>
        str.replace(/č/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z').replace(/đ/g, 'd');

      const matchesExact = user === target;
      const matchesLoose = normalize(user) === normalize(target);

      if (matchesExact) {
        correct = true;
      } else if (matchesLoose) {
        correct = true;
        note = `Good! Remember the accent mark: "${currentExercise.word.sl}"`;
      } else {
        correct = false;
      }

      gradeWord(currentExercise.word, correct ? 'good' : 'again');
      playSlovenianAudio(currentExercise.word.sl);
    } else if (currentExercise.type === 'sentence_translate') {
      const joinedUser = selectedChips.join(' ').toLowerCase();
      const joinedTarget = currentExercise.correctTokens.join(' ').toLowerCase();
      correct = joinedUser === joinedTarget;

      // Grade target words in sentence
      if (currentExercise.targetWord) {
        gradeWord(currentExercise.targetWord, correct ? 'good' : 'again');
      }
      playSlovenianAudio(currentExercise.sentence.sl);
    }

    if (correct) {
      setCorrectCount(prev => prev + 1);
      playSuccessChime();
    } else {
      setWrongCount(prev => prev + 1);
      playFailureThud();
    }

    setIsCorrect(correct);
    setGentleNote(note);
    setIsAnswerChecked(true);
  };

  const handleNextExercise = () => {
    // If the exercise was answered incorrectly, re-queue a reinforcement exercise at the end of the lesson
    if (!isCorrect) {
      const missedWord =
        'word' in currentExercise && currentExercise.word
          ? currentExercise.word
          : currentExercise.type === 'sentence_translate' && currentExercise.targetWord
          ? currentExercise.targetWord
          : undefined;

      if (missedWord) {
        const retriesCount = exerciseQueue.filter(e => e.id.includes(`retry_${missedWord.rank}`)).length;
        if (retriesCount < 2) {
          const retryEx: LessonExercise = {
            id: `retry_${missedWord.rank}_${Date.now()}`,
            type: 'typing',
            phase: 'review',
            isRetry: true,
            word: missedWord,
            prompt: missedWord.en.split(';')[0].trim(),
            acceptedAnswers: [missedWord.sl],
          };
          setExerciseQueue(prev => [...prev, retryEx]);
        }
      }
    }

    if (currentIndex + 1 < exerciseQueue.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  const handleSelfGradeFlashcard = (grade: ReviewGrade) => {
    gradeWord(currentExercise.word, grade);
    if (grade === 'again') {
      setWrongCount(prev => prev + 1);
      playFailureThud();

      const missedWord = currentExercise.word;
      if (missedWord) {
        const retriesCount = exerciseQueue.filter(e => e.id.includes(`retry_${missedWord.rank}`)).length;
        if (retriesCount < 2) {
          const retryEx: LessonExercise = {
            id: `retry_${missedWord.rank}_${Date.now()}`,
            type: 'typing',
            phase: 'review',
            isRetry: true,
            word: missedWord,
            prompt: missedWord.en.split(';')[0].trim(),
            acceptedAnswers: [missedWord.sl],
          };
          setExerciseQueue(prev => [...prev, retryEx]);
        }
      }
    } else {
      setCorrectCount(prev => prev + 1);
      playSuccessChime();
    }
    handleNextExercise();
  };

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-zinc-950 flex flex-col justify-between overflow-x-hidden">
      {/* Top App Bar */}
      <div className="w-full max-w-xl mx-auto px-4 pt-2 pb-1 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExit}
          className="p-2 text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-full hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X size={22} />
        </button>

        {/* 5-minute countdown and progress bar */}
        <div className="flex-1 max-w-xs mx-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              {currentExercise.isRetry && (
                <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-black normal-case ring-1 ring-amber-400/40">
                  🔄 Retry Mistake
                </span>
              )}
              {currentExercise.phase === 'review' && !currentExercise.isRetry && 'Review'}
              {currentExercise.phase === 'learn' && 'Learn New'}
              {currentExercise.phase === 'sentence' && 'Sentence'}
            </span>
            <span className={`font-mono text-xs sm:text-sm px-2.5 py-0.5 rounded-full font-bold transition-all ${isTimeUp ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 ring-1 ring-amber-400' : secondsLeft < 60 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse' : 'bg-slate-200/80 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'}`}>
              {isTimeUp ? '⏱ 5:00 Goal Met!' : `⏱ ${timeFormatted}`}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 dark:bg-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${progressRatio * 100}%` }}
            />
          </div>
        </div>

        <div className="text-xs font-bold text-slate-500 dark:text-zinc-400">
          {currentIndex + 1}/{exerciseQueue.length}
        </div>
      </div>

      {/* 5-minute goal reached banner: stress-free indicator */}
      {isTimeUp && (
        <div className="max-w-xl mx-auto px-4 w-full pt-1 pb-1 animate-in slide-in-from-top duration-200">
          <div className="py-2.5 px-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200 shadow-xs">
            <span className="font-semibold flex items-center gap-1.5">
              <span>⏱</span> 5-minute daily goal reached!
            </span>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              Finish now or continue as long as you like
            </span>
          </div>
        </div>
      )}

      {/* Main Exercise Area - aligned to start on mobile so content is pulled up */}
      <div className="flex-1 flex flex-col justify-start sm:justify-center max-w-xl w-full mx-auto px-4 py-2 sm:py-6 sm:px-6">
        {/* Flashcard (Phase 1 Review or Phase 2 Learn) */}
        {currentExercise.type === 'flashcard' && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-7 border border-slate-200 dark:border-zinc-800 shadow-md text-center animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CEFRBadge level={currentExercise.word.level} />
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${currentExercise.phase === 'learn' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                  {currentExercise.phase === 'learn' ? '✨ New Word' : '🔁 Review'}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                Rank #{currentExercise.word.rank}
              </span>
            </div>

            <div className="my-2.5 sm:my-4">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2.5">
                {currentExercise.word.sl}
                <AudioButton text={currentExercise.word.sl} size="md" />
              </h1>
              <p className="text-base sm:text-lg font-bold text-slate-700 dark:text-zinc-200 mt-2 px-3.5 py-1.5 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200/60 dark:border-zinc-700/60 inline-block">
                {currentExercise.word.en}
              </p>
            </div>

            {/* In Learn Phase: Show example sentence context & Continue button pulled up */}
            {currentExercise.phase === 'learn' && (
              <div className="pt-2.5 border-t border-slate-100 dark:border-zinc-800 space-y-3">
                {(() => {
                  const exampleSentence = getExampleSentenceForWord(currentExercise.word);
                  return (
                    <div className="p-2.5 sm:p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between gap-3 text-left">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block mb-0.5">
                          Example Context
                        </span>
                        <p className="text-sm font-bold text-slate-900 dark:text-emerald-100 leading-snug">
                          {exampleSentence.sl}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                          {exampleSentence.en}
                        </p>
                      </div>
                      <AudioButton
                        text={exampleSentence.sl}
                        size="sm"
                      />
                    </div>
                  );
                })()}

                {/* Continue button pulled up directly into card - no scrolling on phone needed */}
                <button
                  type="button"
                  onClick={handleNextExercise}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-base rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 ring-2 ring-emerald-500/20"
                >
                  Continue <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Multiple Choice (SL->EN, EN->SL, Listening) */}
        {(currentExercise.type === 'mc_sl_to_en' ||
          currentExercise.type === 'mc_en_to_sl' ||
          currentExercise.type === 'listening') && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-zinc-800 shadow-lg animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {currentExercise.type === 'listening' ? 'Listening Exercise' : 'Select Correct Meaning'}
              </span>
              {currentExercise.word && <CEFRBadge level={currentExercise.word.level} />}
            </div>

            <div className="text-center my-6">
              {currentExercise.type === 'listening' ? (
                <div className="flex flex-col items-center justify-center gap-3">
                  <AudioButton text={currentExercise.word.sl} size="lg" className="w-16 h-16" />
                  <span className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
                    Tap to listen again
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {currentExercise.question}
                  </h2>
                  {currentExercise.type === 'mc_sl_to_en' && (
                    <AudioButton text={currentExercise.word.sl} size="md" />
                  )}
                </div>
              )}
            </div>

            {/* 4 Choices Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
              {currentExercise.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                let btnStyle = 'bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 text-slate-800 dark:text-zinc-100 border-slate-200 dark:border-zinc-700';

                if (isAnswerChecked) {
                  if (option === currentExercise.correctAnswer) {
                    btnStyle = 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'bg-rose-100 dark:bg-rose-950/80 border-rose-500 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500';
                  } else {
                    btnStyle = 'opacity-50 border-slate-200 dark:border-zinc-800';
                  }
                } else if (isSelected) {
                  btnStyle = 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 dark:border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-600';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAnswerChecked}
                    onClick={() => setSelectedOption(option)}
                    className={`p-4 rounded-2xl border text-left font-bold text-base transition-all active:scale-98 cursor-pointer ${btnStyle}`}
                  >
                    <span className="inline-block w-6 text-xs text-slate-400">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Typing Exercise (EN -> SL) with on-screen Slovenian keyboard */}
        {currentExercise.type === 'typing' && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-zinc-800 shadow-lg animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Type in Slovenian
              </span>
              <CEFRBadge level={currentExercise.word.level} />
            </div>

            <div className="text-center my-4">
              <span className="text-xs font-semibold text-slate-500 uppercase">Meaning:</span>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {currentExercise.prompt}
              </h2>
            </div>

            {/* Input field */}
            <div className="my-4">
              <input
                ref={inputRef}
                type="text"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck="false"
                placeholder="Type Slovenian word here..."
                disabled={isAnswerChecked}
                value={typedInput}
                onChange={e => setTypedInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && typedInput.trim() && !isAnswerChecked) {
                    handleCheckAnswer();
                  }
                }}
                className={`w-full py-3.5 px-4 rounded-2xl text-lg font-bold text-center border outline-none transition-all ${isAnswerChecked ? (isCorrect ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500' : 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500') : 'bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'}`}
              />
            </div>

            {/* On-screen Slovenian character row: č, š, ž, dž */}
            {!isAnswerChecked && (
              <SlovenianKeyboardBar
                onInsertChar={char => {
                  setTypedInput(prev => prev + char);
                  inputRef.current?.focus();
                }}
              />
            )}
          </div>
        )}

        {/* Sentence Translate (Word Chips) */}
        {currentExercise.type === 'sentence_translate' && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-zinc-800 shadow-lg animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Build Slovenian Sentence
              </span>
              <AudioButton text={currentExercise.sentence.sl} size="sm" />
            </div>

            {/* English Sentence Prompt */}
            <h2 className="text-xl font-bold text-slate-900 dark:text-white my-3">
              "{currentExercise.sentence.en}"
            </h2>

            {/* Selected Chips Slot */}
            <div className="min-h-[56px] p-2.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-dashed border-slate-300 dark:border-zinc-700 flex flex-wrap gap-2 items-center mb-4">
              {selectedChips.length === 0 ? (
                <span className="text-xs font-medium text-slate-400 italic mx-auto">
                  Tap chips below to assemble sentence...
                </span>
              ) : (
                selectedChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAnswerChecked}
                    onClick={() => {
                      if (!isAnswerChecked) {
                        setSelectedChips(prev => prev.filter((_, i) => i !== idx));
                      }
                    }}
                    className="py-1.5 px-3 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    {chip}
                  </button>
                ))
              )}
            </div>

            {/* Available Word Chips */}
            <div className="flex flex-wrap gap-2 justify-center">
              {currentExercise.shuffledChips.map((chip, idx) => {
                // Count how many times this chip was used vs available
                const usedCount = selectedChips.filter(c => c === chip).length;
                const totalInChips = currentExercise.shuffledChips.filter(c => c === chip).length;
                const isUsed = usedCount >= totalInChips;

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isUsed || isAnswerChecked}
                    onClick={() => {
                      if (!isUsed && !isAnswerChecked) {
                        setSelectedChips(prev => [...prev, chip]);
                      }
                    }}
                    className={`py-2 px-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 cursor-pointer border ${isUsed ? 'opacity-30 bg-slate-200 dark:bg-zinc-800 border-transparent text-slate-400 cursor-not-allowed' : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 border-slate-200 dark:border-zinc-700 hover:bg-slate-200'}`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sentence Gap */}
        {currentExercise.type === 'sentence_gap' && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-zinc-800 shadow-lg animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Fill the Gap
              </span>
              <AudioButton text={currentExercise.sentence.sl} size="sm" />
            </div>

            {/* Sentence with Blank */}
            <div className="my-6 text-center">
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white leading-relaxed">
                {currentExercise.displaySentence}
              </p>
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mt-2 italic">
                "{currentExercise.sentence.en}"
              </p>
            </div>

            {/* 4 Choices */}
            <div className="grid grid-cols-2 gap-3">
              {currentExercise.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                let btnStyle = 'bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 text-slate-800 dark:text-zinc-100 border-slate-200 dark:border-zinc-700';

                if (isAnswerChecked) {
                  if (option === currentExercise.correctAnswer) {
                    btnStyle = 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'bg-rose-100 dark:bg-rose-950/80 border-rose-500 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500';
                  } else {
                    btnStyle = 'opacity-50 border-slate-200 dark:border-zinc-800';
                  }
                } else if (isSelected) {
                  btnStyle = 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 dark:border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-600';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAnswerChecked}
                    onClick={() => setSelectedOption(option)}
                    className={`py-3.5 px-4 rounded-2xl border text-center font-bold text-base transition-all active:scale-98 cursor-pointer ${btnStyle}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sentence Understand */}
        {currentExercise.type === 'sentence_understand' && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-zinc-800 shadow-lg animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Understand Sentence
              </span>
              <AudioButton text={currentExercise.sentence.sl} size="sm" />
            </div>

            {/* Slovenian sentence with tap-to-translate tokens */}
            <div className="my-4 p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-200/80 dark:border-zinc-700/60 text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex flex-wrap justify-center gap-1.5">
                {currentExercise.tokenMappings.map((tm, idx) => (
                  <span
                    key={idx}
                    onClick={() => {
                      if (tm.lemma) {
                        const word = WORDS_BY_LEMMA.get(tm.lemma.toLowerCase());
                        if (word) setActiveWordForDetail(word);
                      }
                    }}
                    className={`cursor-pointer transition-colors ${tm.lemma ? 'hover:text-emerald-600 border-b-2 border-dotted border-emerald-500/70' : 'border-b-2 border-dotted border-amber-500/70'}`}
                    title={tm.meaning ? `${tm.lemma}: ${tm.meaning}` : 'Unknown word (tap to view)'}
                  >
                    {tm.token}
                  </span>
                ))}
              </div>
              <span className="block text-[11px] font-medium text-slate-400 dark:text-zinc-500 mt-2">
                Tip: Tap any underlined word to view its base form & meaning!
              </span>
            </div>

            {/* 4 English Translations */}
            <div className="space-y-2.5">
              {currentExercise.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                let btnStyle = 'bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 text-slate-800 dark:text-zinc-100 border-slate-200 dark:border-zinc-700';

                if (isAnswerChecked) {
                  if (option === currentExercise.correctAnswer) {
                    btnStyle = 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'bg-rose-100 dark:bg-rose-950/80 border-rose-500 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500';
                  } else {
                    btnStyle = 'opacity-50 border-slate-200 dark:border-zinc-800';
                  }
                } else if (isSelected) {
                  btnStyle = 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 dark:border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-600';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAnswerChecked}
                    onClick={() => setSelectedOption(option)}
                    className={`w-full p-3.5 rounded-2xl border text-left font-bold text-sm transition-all active:scale-98 cursor-pointer ${btnStyle}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action & Feedback Bar */}
      <div className="w-full max-w-xl mx-auto px-4 pt-1.5 pb-safe sm:pb-4">
        {currentExercise.type === 'flashcard' ? (
          currentExercise.phase === 'learn' ? (
            null
          ) : (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block text-center">
                How well do you remember this word?
              </span>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => handleSelfGradeFlashcard('again')}
                  className="py-2.5 sm:py-3 px-2 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-sm border border-rose-200 dark:border-rose-900/60 active:scale-95 transition-all cursor-pointer"
                >
                  Again
                  <span className="block text-[10px] font-normal opacity-80 mt-0.5">&lt; 1 day</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelfGradeFlashcard('good')}
                  className="py-2.5 sm:py-3 px-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-sm border border-emerald-200 dark:border-emerald-900/60 active:scale-95 transition-all cursor-pointer"
                >
                  Good
                  <span className="block text-[10px] font-normal opacity-80 mt-0.5">Box +1</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelfGradeFlashcard('easy')}
                  className="py-2.5 sm:py-3 px-2 rounded-2xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold text-sm border border-sky-200 dark:border-sky-900/60 active:scale-95 transition-all cursor-pointer"
                >
                  Easy
                  <span className="block text-[10px] font-normal opacity-80 mt-0.5">Box +2</span>
                </button>
              </div>
            </div>
          )
        ) : isAnswerChecked ? (
          <div className={`p-3.5 sm:p-4 rounded-3xl border shadow-lg animate-in slide-in-from-bottom duration-200 ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/90 border-rose-300 dark:border-rose-800'}`}>
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <CheckCircle2 size={22} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle size={22} className="text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <div>
                  <h4 className={`text-sm sm:text-base font-black ${isCorrect ? 'text-emerald-900 dark:text-emerald-200' : 'text-rose-900 dark:text-rose-200'}`}>
                    {isCorrect ? 'Pravilno! (Correct)' : 'Napačno (Incorrect)'}
                  </h4>
                  {gentleNote && (
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mt-0.5">
                      {gentleNote}
                    </p>
                  )}
                  {!isCorrect && (
                    <p className="text-xs font-medium text-rose-800 dark:text-rose-300 mt-0.5">
                      Correct: <strong>{'word' in currentExercise && currentExercise.word ? currentExercise.word.sl : ('correctAnswer' in currentExercise ? currentExercise.correctAnswer : '')}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {isTimeUp ? (
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFinished(true)}
                  className="flex-1 py-3.5 px-4 font-bold rounded-2xl shadow-sm text-slate-800 dark:text-zinc-100 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Trophy size={18} className="text-amber-500" />
                  Finish Lesson
                </button>
                <button
                  type="button"
                  onClick={handleNextExercise}
                  className={`flex-1 py-3.5 px-4 font-bold rounded-2xl shadow-sm text-white transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 text-sm sm:text-base ${isCorrect ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                >
                  <span>Continue Anyway</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleNextExercise}
                className={`w-full py-3.5 px-4 font-bold rounded-2xl shadow-sm text-white transition-all active:scale-98 cursor-pointer text-sm sm:text-base ${isCorrect ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                {currentIndex + 1 >= exercises.length ? (
                  <>Complete Lesson & See Results <Trophy size={18} className="inline ml-1.5" /></>
                ) : (
                  <>Continue <ArrowRight size={18} className="inline ml-1" /></>
                )}
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={
              (currentExercise.type.startsWith('mc') ||
                currentExercise.type === 'listening' ||
                currentExercise.type === 'sentence_gap' ||
                currentExercise.type === 'sentence_understand')
                ? !selectedOption
                : currentExercise.type === 'typing'
                ? !typedInput.trim()
                : selectedChips.length === 0
            }
            onClick={handleCheckAnswer}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base rounded-2xl shadow-sm transition-all active:scale-98 cursor-pointer"
          >
            Check Answer
          </button>
        )}
      </div>

      {/* Word Detail Sheet if user tapped an underlined token */}
      <WordDetailModal
        word={activeWordForDetail}
        progress={activeWordForDetail ? currentProgressMap[activeWordForDetail.rank] : undefined}
        onClose={() => setActiveWordForDetail(null)}
      />
    </div>
  );
};
