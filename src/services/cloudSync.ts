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
  User,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { WordProgress, UserStats, UserSettings, Language, UserProfile } from '../data/types';
import {
  loadWordProgress,
  saveWordProgress,
  loadStats,
  saveStats,
  loadSettings,
  saveSettings,
  loadUserProfile,
  saveUserProfile,
  generateFriendCode,
  getAnonymousDeviceFriendCode,
} from '../data/storage';

export interface CloudSyncData {
  userId: string;
  progressJson?: string;
  statsJson?: string;
  progressJsonSl?: string;
  progressJsonPt?: string;
  statsJsonSl?: string;
  statsJsonPt?: string;
  settingsJson?: string;
  streak: number;
  learnedCount: number;
  learnedCountSl?: number;
  learnedCountPt?: number;
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
 * Resolves a unique friend code for each distinct user.
 * Guarantees that different accounts NEVER share the same code.
 */
export function resolveUserFriendCode(user: User, existingDocCode?: string): string {
  if (user.email === 'piresrafaelarmando2002@gmail.com') {
    return 'DV-RP82';
  }
  if (existingDocCode && existingDocCode !== 'DV-RP82' && existingDocCode.startsWith('DV-')) {
    return existingDocCode;
  }
  return generateFriendCode(user.uid);
}

/**
 * Sign in with Google Account
 */
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Read user document to check for existing friendCode
    let existingCode: string | undefined;
    const userDocPath = `users/${user.uid}`;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        existingCode = snap.data().friendCode;
      }
    } catch (_) {}

    const friendCode = resolveUserFriendCode(user, existingCode);

    // Save profile to local storage for THIS authenticated user
    const updatedProfile: UserProfile = {
      displayName: user.displayName || 'Learner',
      email: user.email || '',
      photoURL: user.photoURL || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.displayName || 'Learner')}&backgroundColor=0f766e,0d9488&textColor=ffffff`,
      friendCode,
      isFirebaseSynced: true,
    };
    saveUserProfile(updatedProfile);

    // Record user profile in Firestore
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          email: user.email || '',
          displayName: updatedProfile.displayName,
          friendCode,
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
 * Sign out current user and reset local profile
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
  const guestProfile: UserProfile = {
    displayName: 'Learner',
    email: '',
    photoURL: '',
    friendCode: getAnonymousDeviceFriendCode(),
    isFirebaseSynced: false,
  };
  saveUserProfile(guestProfile);
}

/**
 * Push local state to Firestore cloud (both Slovenian & Portuguese)
 */
export async function uploadLocalToCloud(user: User, currentLang?: Language): Promise<CloudSyncData> {
  const settings = loadSettings();
  const activeLang = currentLang || settings.language || 'sl';

  // Load both languages
  const progressSl = loadWordProgress('sl');
  const progressPt = loadWordProgress('pt');
  const statsSl = loadStats('sl');
  const statsPt = loadStats('pt');
  const userProfile = loadUserProfile();

  let countSl = 0;
  for (const p of Object.values(progressSl)) {
    if (p.status === 'learned') countSl++;
  }

  let countPt = 0;
  for (const p of Object.values(progressPt)) {
    if (p.status === 'learned') countPt++;
  }

  const activeStats = activeLang === 'pt' ? statsPt : statsSl;
  const activeProgress = activeLang === 'pt' ? progressPt : progressSl;
  const activeLearned = activeLang === 'pt' ? countPt : countSl;

  const payload: CloudSyncData = {
    userId: user.uid,
    progressJsonSl: JSON.stringify(progressSl),
    progressJsonPt: JSON.stringify(progressPt),
    statsJsonSl: JSON.stringify(statsSl),
    statsJsonPt: JSON.stringify(statsPt),
    // Backward compatibility fields
    progressJson: JSON.stringify(activeProgress),
    statsJson: JSON.stringify(activeStats),
    settingsJson: JSON.stringify(settings),
    streak: activeStats.streak || 0,
    learnedCount: activeLearned,
    learnedCountSl: countSl,
    learnedCountPt: countPt,
    updatedAt: new Date().toISOString(),
    device: getDeviceName(),
  };

  const syncPath = `users/${user.uid}/sync/state`;
  try {
    await setDoc(doc(db, 'users', user.uid, 'sync', 'state'), payload);
    localStorage.setItem('beseda_last_synced_at', payload.updatedAt);

    // Also update Public Profile for Friend discovery & Leaderboard
    const friendCode = resolveUserFriendCode(user, userProfile.friendCode);
    const publicProfileDoc = {
      uid: user.uid,
      displayName: user.displayName || userProfile.displayName || 'Learner',
      photoURL: user.photoURL || userProfile.photoURL || '',
      friendCode,
      streak: Math.max(statsSl.streak || 0, statsPt.streak || 0),
      learnedCountSl: countSl,
      learnedCountPt: countPt,
      totalLessons: (statsSl.totalLessonsCompleted || 0) + (statsPt.totalLessonsCompleted || 0),
      lastActiveDate: statsSl.lastActiveDate || statsPt.lastActiveDate || '',
      updatedAt: payload.updatedAt,
    };

    setDoc(doc(db, 'publicProfiles', user.uid), publicProfileDoc, { merge: true }).catch(err => {
      console.warn('Could not update public profile:', err);
    });

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
 * Helper to merge two progress maps
 */
function mergeProgressMaps(
  local: Record<number, WordProgress>,
  cloud: Record<number, WordProgress>
): Record<number, WordProgress> {
  const merged: Record<number, WordProgress> = { ...local };
  for (const [rankStr, cProg] of Object.entries(cloud)) {
    const rank = Number(rankStr);
    const lProg = merged[rank];
    if (!lProg) {
      merged[rank] = cProg;
    } else {
      const higherBox = Math.max(lProg.box, cProg.box);
      const higherStatus = higherBox >= 3 ? 'learned' : 'learning';
      merged[rank] = {
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
        nextDueDate: lProg.box >= cProg.box ? lProg.nextDueDate : cProg.nextDueDate,
      };
    }
  }
  return merged;
}

/**
 * Helper to merge two user stats
 */
function mergeUserStats(local: UserStats, cloud: UserStats): UserStats {
  const mergedHistory = { ...local.history, ...cloud.history };
  return {
    streak: Math.max(local.streak, cloud.streak),
    lastActiveDate:
      (local.lastActiveDate || '') > (cloud.lastActiveDate || '')
        ? local.lastActiveDate
        : cloud.lastActiveDate,
    history: mergedHistory,
    totalExercisesCompleted: Math.max(
      local.totalExercisesCompleted,
      cloud.totalExercisesCompleted
    ),
    totalLessonsCompleted: Math.max(
      local.totalLessonsCompleted,
      cloud.totalLessonsCompleted
    ),
  };
}

/**
 * Merge cloud and local data safely for BOTH languages without losing any words
 */
export function mergeCloudAndLocal(
  cloudData: CloudSyncData,
  applySettings: boolean = false,
  activeLanguage?: Language
): {
  mergedProgress: Record<number, WordProgress>;
  mergedStats: UserStats;
  mergedSettings?: UserSettings;
} {
  const currentLang = activeLanguage || loadSettings().language || 'sl';

  // 1. Slovenian data
  const localSlProgress = loadWordProgress('sl');
  const localSlStats = loadStats('sl');
  let cloudSlProgress: Record<number, WordProgress> = {};
  let cloudSlStats: UserStats = { streak: 0, lastActiveDate: '', history: {}, totalExercisesCompleted: 0, totalLessonsCompleted: 0 };

  // If cloudData has progressJsonSl, use it; otherwise fallback to legacy progressJson (which was Slovenian)
  const slProgressRaw = cloudData.progressJsonSl || cloudData.progressJson;
  if (slProgressRaw) {
    try {
      cloudSlProgress = JSON.parse(slProgressRaw);
    } catch (e) {
      console.error('Failed to parse cloud Slovenian progress:', e);
    }
  }

  const slStatsRaw = cloudData.statsJsonSl || cloudData.statsJson;
  if (slStatsRaw) {
    try {
      cloudSlStats = JSON.parse(slStatsRaw);
    } catch (e) {
      console.error('Failed to parse cloud Slovenian stats:', e);
    }
  }

  const mergedSlProgress = mergeProgressMaps(localSlProgress, cloudSlProgress);
  const mergedSlStats = mergeUserStats(localSlStats, cloudSlStats);
  saveWordProgress(mergedSlProgress, 'sl');
  saveStats(mergedSlStats, 'sl');

  // 2. Portuguese data
  const localPtProgress = loadWordProgress('pt');
  const localPtStats = loadStats('pt');
  let cloudPtProgress: Record<number, WordProgress> = {};
  let cloudPtStats: UserStats = { streak: 0, lastActiveDate: '', history: {}, totalExercisesCompleted: 0, totalLessonsCompleted: 0 };

  if (cloudData.progressJsonPt) {
    try {
      cloudPtProgress = JSON.parse(cloudData.progressJsonPt);
    } catch (e) {
      console.error('Failed to parse cloud Portuguese progress:', e);
    }
  }

  if (cloudData.statsJsonPt) {
    try {
      cloudPtStats = JSON.parse(cloudData.statsJsonPt);
    } catch (e) {
      console.error('Failed to parse cloud Portuguese stats:', e);
    }
  }

  const mergedPtProgress = mergeProgressMaps(localPtProgress, cloudPtProgress);
  const mergedPtStats = mergeUserStats(localPtStats, cloudPtStats);
  saveWordProgress(mergedPtProgress, 'pt');
  saveStats(mergedPtStats, 'pt');

  // 3. Settings
  let cloudSettings: UserSettings | undefined;
  if (cloudData.settingsJson) {
    try {
      cloudSettings = JSON.parse(cloudData.settingsJson);
      if (applySettings && cloudSettings) {
        saveSettings(cloudSettings);
      }
    } catch (e) {
      console.error('Failed to parse cloud settings:', e);
    }
  }

  // Return the merged progress and stats for the active language
  const returnProgress = currentLang === 'pt' ? mergedPtProgress : mergedSlProgress;
  const returnStats = currentLang === 'pt' ? mergedPtStats : mergedSlStats;

  return {
    mergedProgress: returnProgress,
    mergedStats: returnStats,
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
