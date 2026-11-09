/**
 * Beseda - Slovenian 1,000 Words & Spaced Repetition App
 * Native Android Material 3 design experience
 */

import React, { useState, useEffect } from 'react';
import {
  Home,
  BookOpen,
  BarChart2,
  Settings,
  Play,
  Flame,
  Volume2,
  VolumeX,
  AlertCircle,
  X,
  Sparkles,
  Cloud,
} from 'lucide-react';

import {
  Word,
  WordProgress,
  UserSettings,
  UserStats,
  UserProfile,
  LessonExercise,
  Language,
} from './data/types';
import {
  WORDS,
  WORDS_BY_RANK,
  setGlobalLanguage,
  getWordsForLanguage,
  getWordsByRankMap,
} from './data/words';
import { setActiveAudioLanguage } from './tts/audioService';
import {
  loadWordProgress,
  saveWordProgress,
  loadSettings,
  saveSettings,
  loadStats,
  saveStats,
  loadUserProfile,
  saveUserProfile,
  updateStreakAndStats,
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  getAnonymousDeviceFriendCode,
} from './data/storage';
import {
  getDueReviewWords,
  getLessonReviewWords,
  getTodayNewWords,
  getModeratedNewWordsQuota,
  getTodayString,
} from './srs/scheduler';
import { getPracticeSentences } from './sentences/engine';
import {
  buildLessonExercises,
  buildWeakWordsPracticeExercises,
  buildKnownWordsPracticeExercises,
} from './srs/exerciseBuilder';

import { HomeScreen } from './ui/HomeScreen';
import { WordListScreen } from './ui/WordListScreen';
import { StatsScreen } from './ui/StatsScreen';
import { SettingsScreen } from './ui/SettingsScreen';
import { LessonScreen } from './ui/LessonScreen';
import { WordDetailModal } from './ui/WordDetailModal';
import { AndroidCodeModal } from './ui/AndroidCodeModal';
import { InstallModal } from './ui/InstallModal';
import { CloudSyncModal } from './ui/CloudSyncModal';
import { auth, onAuthStateChanged, User } from './services/firebase';
import {
  fetchCloudState,
  uploadLocalToCloud,
  mergeCloudAndLocal,
  subscribeToCloudSync,
  getDeviceName,
  resolveUserFriendCode,
} from './services/cloudSync';

type NavTab = 'home' | 'words' | 'stats' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isInLesson, setIsInLesson] = useState(false);
  const [lessonExercises, setLessonExercises] = useState<LessonExercise[]>([]);
  const [isPreparingLesson, setIsPreparingLesson] = useState(false);
  const [isMistakePractice, setIsMistakePractice] = useState(false);

  // App data state
  const [progressMap, setProgressMap] = useState<Record<number, WordProgress>>({});
  const [settings, setSettingsState] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [stats, setStatsState] = useState<UserStats>(DEFAULT_STATS);

  // Selected word for detail view modal
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);

  // Android Kotlin code view modal
  const [showAndroidModal, setShowAndroidModal] = useState(false);

  // Phone PWA / APK install modal
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Cloud Sync modal and Firebase Auth user
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile());
  const [showCloudSyncModal, setShowCloudSyncModal] = useState(false);

  // Load storage on mount
  useEffect(() => {
    const loadedSettings = loadSettings();
    const activeLang = loadedSettings.language || 'sl';
    const loadedProgress = loadWordProgress(activeLang);
    const loadedStats = loadStats(activeLang);
    const loadedProfile = loadUserProfile();

    setProgressMap(loadedProgress);
    setSettingsState(loadedSettings);
    setStatsState(loadedStats);
    setUserProfile(loadedProfile);
  }, []);

  // Firebase Auth listener & bidirectional cloud sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      if (user) {
        // Sync authenticated user into local profile with their distinct friend code
        setUserProfile(prev => {
          const friendCode = resolveUserFriendCode(user, prev.friendCode);
          const updated: UserProfile = {
            displayName: user.displayName || prev.displayName || 'Learner',
            email: user.email || prev.email,
            photoURL: user.photoURL || prev.photoURL,
            friendCode,
            isFirebaseSynced: true,
          };
          saveUserProfile(updated);
          return updated;
        });

        // Initial sync from cloud on launch
        fetchCloudState(user)
          .then(async cloudData => {
            if (cloudData) {
              const activeLang = settings.language || 'sl';
              const { mergedProgress, mergedStats, mergedSettings } = mergeCloudAndLocal(cloudData, false, activeLang);
              setProgressMap(mergedProgress);
              setStatsState(mergedStats);
              if (mergedSettings) setSettingsState(mergedSettings);

              // Push merged state back to cloud
              await uploadLocalToCloud(user, activeLang);
            } else {
              // Upload initial local data to cloud
              const activeLang = settings.language || 'sl';
              uploadLocalToCloud(user, activeLang).catch(err => console.warn('Cloud sync initial upload:', err));
            }
          })
          .catch(err => console.warn('Cloud sync fetch error:', err));

        // Realtime listener for remote updates from Android device
        const unsubCloud = subscribeToCloudSync(user, remoteData => {
          if (remoteData.device !== getDeviceName()) {
            const activeLang = settings.language || 'sl';
            const { mergedProgress, mergedStats, mergedSettings } = mergeCloudAndLocal(remoteData, false, activeLang);
            setProgressMap(mergedProgress);
            setStatsState(mergedStats);
            if (mergedSettings) setSettingsState(mergedSettings);
          }
        });
        return () => unsubCloud();
      } else {
        setUserProfile(prev => {
          const updated: UserProfile = {
            displayName: 'Learner',
            email: '',
            photoURL: '',
            friendCode: getAnonymousDeviceFriendCode(),
            isFirebaseSynced: false,
          };
          saveUserProfile(updated);
          return updated;
        });
      }
    });
    return () => unsub();
  }, [settings.language]);

  // Current active language ('sl' or 'pt')
  const currentLanguage: Language = settings.language || 'sl';

  // Language application: update active vocabulary lists and audio service
  useEffect(() => {
    setGlobalLanguage(currentLanguage);
    setActiveAudioLanguage(currentLanguage);
    // Load word progress and stats corresponding to this language
    const loadedProgress = loadWordProgress(currentLanguage);
    const loadedStats = loadStats(currentLanguage);
    setProgressMap(loadedProgress);
    setStatsState(loadedStats);
  }, [currentLanguage]);

  // Theme application
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [settings.theme]);

  // Save settings handler
  const handleUpdateSettings = (newSettings: UserSettings) => {
    const prevLang = settings.language || 'sl';
    const nextLang = newSettings.language || 'sl';

    setSettingsState(newSettings);
    saveSettings(newSettings);

    if (prevLang !== nextLang) {
      setGlobalLanguage(nextLang);
      setActiveAudioLanguage(nextLang);
      const newProgress = loadWordProgress(nextLang);
      const newStats = loadStats(nextLang);
      setProgressMap(newProgress);
      setStatsState(newStats);
    }

    if (currentUser) {
      uploadLocalToCloud(currentUser).catch(err => console.warn('Cloud sync settings upload:', err));
    }
  };

  // Reset data handler
  const handleResetData = () => {
    setProgressMap({});
    setStatsState(DEFAULT_STATS);
    saveWordProgress({}, currentLanguage);
    saveStats(DEFAULT_STATS, currentLanguage);
  };

  // Active word maps and list for the active language
  const activeWords = getWordsForLanguage(currentLanguage);
  const activeRankMap = getWordsByRankMap(currentLanguage);

  // Mistake words tracking: any word failed in lesson/practice that hasn't been recapped yet
  const mistakeWords = Object.values(progressMap)
    .filter(p => p.hasUnresolvedMistake || p.failedCount > 0)
    .sort((a, b) => {
      if (a.hasUnresolvedMistake && !b.hasUnresolvedMistake) return -1;
      if (!a.hasUnresolvedMistake && b.hasUnresolvedMistake) return 1;
      return (b.failedCount || 0) - (a.failedCount || 0);
    })
    .map(p => activeRankMap.get(p.rank))
    .filter((w): w is Word => !!w);

  // Strictly due items & lesson review items (guarantees every lesson includes review words!)
  const strictlyDueItems = getDueReviewWords(progressMap);
  const lessonReviewItems = getLessonReviewWords(progressMap, 5);

  const newWordsQuota = getModeratedNewWordsQuota(
    settings.newWordsPerDay,
    strictlyDueItems.length,
    mistakeWords.length,
    settings.adaptivePace !== false
  );
  const reviewRanks = new Set(lessonReviewItems.map(i => i.word.rank));
  const todayNewWords = getTodayNewWords(progressMap, newWordsQuota.effectiveCount, reviewRanks);

  // Start 5-Minute Lesson
  // Start 5-Minute Lesson
  const handleStartLesson = async () => {
    setIsMistakePractice(false);
    setIsPreparingLesson(true);
    try {
      // Words allowed in sentences: all learned + learning + today's new words
      const allowedWords: Word[] = [];
      for (const p of Object.values(progressMap)) {
        if (p.status !== 'new') {
          const w = activeRankMap.get(p.rank);
          if (w) allowedWords.push(w);
        }
      }
      todayNewWords.forEach(w => {
        if (!allowedWords.some(a => a.rank === w.rank)) {
          allowedWords.push(w);
        }
      });

      // Target words: review words or today's new words
      const targetWords = [
        ...lessonReviewItems.map(d => d.word),
        ...todayNewWords,
      ];
      const pool = targetWords.length > 0 ? targetWords : activeWords.slice(0, 10);

      // Fetch or generate sentences with 2s max timeout so UI never hangs
      const sentencesPromise = getPracticeSentences(pool, allowedWords, 3);
      const timeoutPromise = new Promise<import('./data/types').SentenceItem[]>(resolve =>
        setTimeout(() => resolve([]), 2000)
      );
      const sentences = await Promise.race([sentencesPromise, timeoutPromise]);

      const allowedLemmas = new Set(allowedWords.map(w => w.sl.toLowerCase()));
      targetWords.forEach(w => allowedLemmas.add(w.sl.toLowerCase()));

      // Build mixed queue: Review -> Learn -> Sentences with knownWords distractors & mixed sequencing
      let exercises = buildLessonExercises(lessonReviewItems, todayNewWords, sentences, allowedLemmas, allowedWords);
      if (exercises.length === 0) {
        // Fallback safety: always ensure at least today's new words are tested
        exercises = buildLessonExercises([], activeWords.slice(0, 3), [], allowedLemmas, allowedWords);
      }
      setLessonExercises(exercises);
      setIsInLesson(true);
    } catch (e) {
      console.error('Error starting lesson:', e);
      // Emergency fallback
      const fallbackExercises = buildLessonExercises([], todayNewWords.length > 0 ? todayNewWords : activeWords.slice(0, 3), [], new Set(), []);
      setLessonExercises(fallbackExercises);
      setIsInLesson(true);
    } finally {
      setIsPreparingLesson(false);
    }
  };

  // Practice Known Words: focused practice without introducing any new words
  const handleStartPracticeKnown = () => {
    setIsMistakePractice(false);
    const knownWords: Word[] = [];
    for (const p of Object.values(progressMap)) {
      if (p.status !== 'new') {
        const w = activeRankMap.get(p.rank);
        if (w) knownWords.push(w);
      }
    }
    // If user has few or 0 known words, use foundational starter words
    const pool = knownWords.length >= 3 ? knownWords : activeWords.slice(0, 10);
    const count = Math.min(12, Math.max(6, pool.length));
    const exercises = buildKnownWordsPracticeExercises(pool, count);
    setLessonExercises(exercises);
    setIsInLesson(true);
  };

  // Complete Lesson
  const handleCompleteLesson = (
    updatedProgress: Record<number, WordProgress>,
    accuracy: number
  ) => {
    let finalProgress = updatedProgress;

    // If the user just completed a dedicated mistake practice session:
    if (isMistakePractice) {
      finalProgress = { ...updatedProgress };
      const practicedRanks = new Set(
        lessonExercises
          .map(e => ('word' in e && e.word ? e.word.rank : undefined))
          .filter((r): r is number => r !== undefined)
      );

      for (const rank of practicedRanks) {
        if (finalProgress[rank]) {
          finalProgress[rank] = {
            ...finalProgress[rank],
            hasUnresolvedMistake: false,
            failedCount: 0,
          };
        }
      }
    }

    setProgressMap(finalProgress);
    saveWordProgress(finalProgress, currentLanguage);

    const updatedStats = updateStreakAndStats(lessonExercises.length, accuracy, getTodayString(), currentLanguage);
    setStatsState(updatedStats);

    if (currentUser) {
      uploadLocalToCloud(currentUser, currentLanguage).catch(err => console.warn('Cloud sync lesson upload:', err));
    }

    setIsInLesson(false);
    setIsMistakePractice(false);
    setActiveTab('home');
  };

  // Practice Weak Words (Recap Mistakes)
  const handlePracticeMistakes = (words: Word[]) => {
    if (words.length === 0) return;
    const exercises = buildWeakWordsPracticeExercises(words.slice(0, 8));
    setLessonExercises(exercises);
    setIsMistakePractice(true);
    setIsInLesson(true);
  };

  // Active Lesson Screen View
  if (isInLesson && lessonExercises.length > 0) {
    return (
      <LessonScreen
        exercises={lessonExercises}
        progressMap={progressMap}
        onCompleteLesson={handleCompleteLesson}
        onProgressUpdate={liveProgress => {
          setProgressMap(liveProgress);
        }}
        onExit={savedProgress => {
          if (savedProgress) {
            setProgressMap(savedProgress);
            saveWordProgress(savedProgress, currentLanguage);
            if (currentUser) {
              uploadLocalToCloud(currentUser, currentLanguage).catch(err => console.warn('Cloud sync onExit upload:', err));
            }
          }
          setIsInLesson(false);
          setIsMistakePractice(false);
        }}
        isMistakePractice={isMistakePractice}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 antialiased flex flex-col justify-between selection:bg-emerald-500/20">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-4 py-3 shadow-xs">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/pwa-192x192.png"
              alt="Dvojeziko Logo"
              className="w-9 h-9 rounded-2xl shadow-sm object-cover bg-emerald-700"
            />
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                Dvojeziko
              </h1>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
                {currentLanguage === 'pt' ? 'Portuguese in 5 Min/Day' : 'Slovenian in 5 Min/Day'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* User Profile & Sync Button */}
            <button
              type="button"
              onClick={() => setShowCloudSyncModal(true)}
              className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer active:scale-95 transition-transform p-0 shrink-0"
              title={
                currentUser || userProfile.isFirebaseSynced
                  ? `Logged in: ${userProfile.displayName} (${userProfile.email}) • Cloud Synced`
                  : `Profile: ${userProfile.displayName} • Tap to sync PC & Phone`
              }
            >
              <div className="relative w-8 h-8 shrink-0">
                <img
                  src={
                    userProfile.photoURL ||
                    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(userProfile.displayName || 'RP')}&backgroundColor=0f766e,0d9488&textColor=ffffff`
                  }
                  alt={userProfile.displayName || 'User Avatar'}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/80 hover:ring-emerald-400 transition-all shadow-xs bg-emerald-800"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={e => {
                    const fallback = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(userProfile.displayName || 'RP')}&backgroundColor=0f766e,0d9488&textColor=ffffff`;
                    if (e.currentTarget.src !== fallback) {
                      e.currentTarget.src = fallback;
                    }
                  }}
                />
                {/* Active green synced dot if firebase connected, amber dot if local profile */}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-zinc-900 ${
                    currentUser || userProfile.isFirebaseSynced
                      ? 'bg-emerald-500'
                      : 'bg-amber-400'
                  }`}
                  title={currentUser || userProfile.isFirebaseSynced ? 'Firebase Synced' : 'Local Profile (Tap to sync)'}
                />
              </div>
            </button>

            {/* Streak Indicator */}
            <div
              onClick={() => setActiveTab('stats')}
              className="flex items-center gap-1 py-1.5 px-3 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-extrabold text-xs border border-amber-500/20 cursor-pointer active:scale-95 transition-transform"
            >
              <Flame size={15} className="fill-amber-500" />
              <span>{stats.streak}d</span>
            </div>

            {/* Sound Toggle Quick Icon */}
            <button
              type="button"
              onClick={() =>
                handleUpdateSettings({
                  ...settings,
                  soundEnabled: !settings.soundEnabled,
                })
              }
              className="p-2 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Toggle audio"
            >
              {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} className="text-slate-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 pt-4">
        {activeTab === 'home' && (
          <HomeScreen
            stats={stats}
            progressMap={progressMap}
            dueCount={lessonReviewItems.length}
            newWordsCount={todayNewWords.length}
            targetNewWordsCount={settings.newWordsPerDay}
            isModerated={newWordsQuota.isModerated}
            moderationReason={newWordsQuota.reason}
            mistakeWordsCount={mistakeWords.length}
            language={currentLanguage}
            onStartLesson={handleStartLesson}
            onPracticeKnown={handleStartPracticeKnown}
            onPracticeMistakes={() => handlePracticeMistakes(mistakeWords)}
            onSelectWord={word => setSelectedWord(word)}
            onNavigateToWords={() => setActiveTab('words')}
            onOpenInstallModal={() => setShowInstallModal(true)}
          />
        )}

        {activeTab === 'words' && (
          <WordListScreen
            progressMap={progressMap}
            onSelectWord={word => setSelectedWord(word)}
          />
        )}

        {activeTab === 'stats' && (
          <StatsScreen
            stats={stats}
            progressMap={progressMap}
            currentUser={currentUser}
            userProfile={userProfile}
            activeLanguage={currentLanguage}
            onSelectWord={word => setSelectedWord(word)}
            onPracticeMistakes={handlePracticeMistakes}
            onOpenCloudSync={() => setShowCloudSyncModal(true)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            settings={settings}
            currentUser={currentUser}
            onUpdateSettings={handleUpdateSettings}
            onResetData={handleResetData}
            onExportAndroidCode={() => setShowAndroidModal(true)}
            onOpenInstallModal={() => setShowInstallModal(true)}
            onOpenCloudSyncModal={() => setShowCloudSyncModal(true)}
          />
        )}
      </main>

      {/* Loading Overlay while preparing 5-min lesson */}
      {isPreparingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-200 dark:border-zinc-800">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-spin">
              <Sparkles size={28} />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">
              Preparing Your Lesson
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Gathering due words, today's {settings.newWordsPerDay} new words, and synthesizing sentences from your learned vocabulary...
            </p>
          </div>
        </div>
      )}

      {/* Word Detail Sheet Modal */}
      <WordDetailModal
        word={selectedWord}
        progress={selectedWord ? progressMap[selectedWord.rank] : undefined}
        onClose={() => setSelectedWord(null)}
      />

      {/* Android Kotlin Source Code Modal */}
      {showAndroidModal && (
        <AndroidCodeModal onClose={() => setShowAndroidModal(false)} />
      )}

      {/* Phone / PWA / APK Install Modal */}
      <InstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />

      {/* Cloud Sync Modal */}
      <CloudSyncModal
        isOpen={showCloudSyncModal}
        onClose={() => setShowCloudSyncModal(false)}
        currentUser={currentUser}
        userProfile={userProfile}
        onUpdateProfile={p => {
          setUserProfile(p);
          saveUserProfile(p);
        }}
        onSyncComplete={(newProg, newStats, newSettings) => {
          setProgressMap(newProg);
          setStatsState(newStats);
          if (newSettings) setSettingsState(newSettings);
        }}
      />

      {/* Material 3 Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-zinc-800/80 pb-safe">
        <div className="max-w-xl mx-auto px-4 py-2 flex items-center justify-around">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${activeTab === 'home' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-zinc-400 font-medium hover:text-slate-900'}`}
          >
            <div className={`p-1 rounded-full ${activeTab === 'home' ? 'bg-emerald-100 dark:bg-emerald-950' : ''}`}>
              <Home size={20} />
            </div>
            <span className="text-[11px]">Home</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('words')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${activeTab === 'words' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-zinc-400 font-medium hover:text-slate-900'}`}
          >
            <div className={`p-1 rounded-full ${activeTab === 'words' ? 'bg-emerald-100 dark:bg-emerald-950' : ''}`}>
              <BookOpen size={20} />
            </div>
            <span className="text-[11px]">1000 Words</span>
          </button>

          {/* Quick Start Floating Action Center Button */}
          <button
            type="button"
            onClick={handleStartLesson}
            className="flex flex-col items-center -mt-5 cursor-pointer group active:scale-95 transition-transform"
            title="Start 5-Minute Daily Lesson"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg group-hover:bg-emerald-700 transition-colors ring-4 ring-white dark:ring-zinc-900">
              <Play size={24} className="fill-white ml-0.5" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 mt-1 uppercase tracking-tight">
              5 Min
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${activeTab === 'stats' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-zinc-400 font-medium hover:text-slate-900'}`}
          >
            <div className={`p-1 rounded-full ${activeTab === 'stats' ? 'bg-emerald-100 dark:bg-emerald-950' : ''}`}>
              <BarChart2 size={20} />
            </div>
            <span className="text-[11px]">Stats</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${activeTab === 'settings' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-zinc-400 font-medium hover:text-slate-900'}`}
          >
            <div className={`p-1 rounded-full ${activeTab === 'settings' ? 'bg-emerald-100 dark:bg-emerald-950' : ''}`}>
              <Settings size={20} />
            </div>
            <span className="text-[11px]">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
