import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  db,
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { WordProgress, UserStats, UserSettings } from '../data/types';
import {
  loadWordProgress,
  saveWordProgress,
  loadStats,
  saveStats,
  loadSettings,
  saveSettings,
} from '../data/storage';

export interface CloudSyncData {
  userId: string;
  progressJson: string;
  statsJson: string;
  settingsJson?: string;
  streak: number;
  learnedCount: number;
  updatedAt: string;
  device: string;
}

export function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android Phone';
  if (/iPhone|iPad/i.test(ua)) return 'iPhone / iOS';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Linux/i.test(ua)) return 'Linux PC';
  return 'Web Device';
}

/**
 * Sign in with Google Account
 */
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Record user profile in Firestore
    const userDocPath = `users/${user.uid}`;
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Learner',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, userDocPath);
    }

    return user;
  } catch (err: unknown) {
    console.error('Google Sign-in failed:', err);
    throw err;
  }
}

/**
 * Sign out current user
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Push local state to Firestore cloud
 */
export async function uploadLocalToCloud(user: User): Promise<CloudSyncData> {
  const progress = loadWordProgress();
  const stats = loadStats();
  const settings = loadSettings();

  let learnedCount = 0;
  for (const p of Object.values(progress)) {
    if (p.status === 'learned') learnedCount++;
  }

  const payload: CloudSyncData = {
    userId: user.uid,
    progressJson: JSON.stringify(progress),
    statsJson: JSON.stringify(stats),
    settingsJson: JSON.stringify(settings),
    streak: stats.streak || 0,
    learnedCount,
    updatedAt: new Date().toISOString(),
    device: getDeviceName(),
  };

  const syncPath = `users/${user.uid}/sync/state`;
  try {
    await setDoc(doc(db, 'users', user.uid, 'sync', 'state'), payload);
    localStorage.setItem('beseda_last_synced_at', payload.updatedAt);
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, syncPath);
  }
}

/**
 * Fetch cloud state for user
 */
export async function fetchCloudState(user: User): Promise<CloudSyncData | null> {
  const syncPath = `users/${user.uid}/sync/state`;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid, 'sync', 'state'));
    if (!snap.exists()) return null;
    return snap.data() as CloudSyncData;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, syncPath);
  }
}

/**
 * Merge cloud and local data safely without losing progress
 */
export function mergeCloudAndLocal(
  cloudData: CloudSyncData,
  applySettings: boolean = false
): {
  mergedProgress: Record<number, WordProgress>;
  mergedStats: UserStats;
  mergedSettings?: UserSettings;
} {
  const localProgress = loadWordProgress();
  const localStats = loadStats();

  let cloudProgress: Record<number, WordProgress> = {};
  let cloudStats: UserStats = {
    streak: 0,
    lastActiveDate: '',
    history: {},
    totalExercisesCompleted: 0,
    totalLessonsCompleted: 0,
  };
  let cloudSettings: UserSettings | undefined;

  try {
    cloudProgress = JSON.parse(cloudData.progressJson);
  } catch (e) {
    console.error('Failed to parse cloud progress:', e);
  }

  try {
    cloudStats = JSON.parse(cloudData.statsJson);
  } catch (e) {
    console.error('Failed to parse cloud stats:', e);
  }

  if (cloudData.settingsJson) {
    try {
      cloudSettings = JSON.parse(cloudData.settingsJson);
    } catch (e) {
      console.error('Failed to parse cloud settings:', e);
    }
  }

  // Merge progress maps: keep highest box and max reviews for each word
  const mergedProgress: Record<number, WordProgress> = { ...localProgress };

  for (const [rankStr, cProg] of Object.entries(cloudProgress)) {
    const rank = Number(rankStr);
    const lProg = mergedProgress[rank];

    if (!lProg) {
      mergedProgress[rank] = cProg;
    } else {
      // Pick higher box, max consecutive correct, max total reviews
      const higherBox = Math.max(lProg.box, cProg.box);
      const higherStatus = higherBox >= 3 ? 'learned' : 'learning';
      mergedProgress[rank] = {
        ...lProg,
        box: higherBox,
        status: higherStatus,
        totalReviews: Math.max(lProg.totalReviews, cProg.totalReviews),
        consecutiveCorrect: Math.max(lProg.consecutiveCorrect, cProg.consecutiveCorrect),
        failedCount: Math.max(lProg.failedCount, cProg.failedCount),
        lastReviewedDate:
          (lProg.lastReviewedDate || '') > (cProg.lastReviewedDate || '')
            ? lProg.lastReviewedDate
            : cProg.lastReviewedDate,
        nextDueDate:
          lProg.box >= cProg.box ? lProg.nextDueDate : cProg.nextDueDate,
      };
    }
  }

  // Merge stats: keep highest streak and union dates in history
  const mergedHistory = { ...localStats.history, ...cloudStats.history };
  const mergedStats: UserStats = {
    streak: Math.max(localStats.streak, cloudStats.streak),
    lastActiveDate:
      (localStats.lastActiveDate || '') > (cloudStats.lastActiveDate || '')
        ? localStats.lastActiveDate
        : cloudStats.lastActiveDate,
    history: mergedHistory,
    totalExercisesCompleted: Math.max(
      localStats.totalExercisesCompleted,
      cloudStats.totalExercisesCompleted
    ),
    totalLessonsCompleted: Math.max(
      localStats.totalLessonsCompleted,
      cloudStats.totalLessonsCompleted
    ),
  };

  // Save merged result to local storage
  saveWordProgress(mergedProgress);
  saveStats(mergedStats);

  if (applySettings && cloudSettings) {
    saveSettings(cloudSettings);
  }

  return {
    mergedProgress,
    mergedStats,
    mergedSettings: applySettings ? cloudSettings : undefined,
  };
}

/**
 * Subscribe to real-time remote cloud updates from other devices
 */
export function subscribeToCloudSync(
  user: User,
  onRemoteUpdate: (cloudData: CloudSyncData) => void
): () => void {
  const syncPath = `users/${user.uid}/sync/state`;
  const unsub = onSnapshot(
    doc(db, 'users', user.uid, 'sync', 'state'),
    snapshot => {
      if (!snapshot.exists()) return;
      const data = snapshot.data() as CloudSyncData;
      onRemoteUpdate(data);
    },
    error => {
      handleFirestoreError(error, OperationType.GET, syncPath);
    }
  );
  return unsub;
}
