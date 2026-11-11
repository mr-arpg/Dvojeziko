import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db, User, handleFirestoreError, OperationType } from './firebase';
import { FriendProfile } from '../data/types';
import { getTodayString } from '../srs/scheduler';

const FRIENDS_LOCAL_CACHE_KEY = 'dvojeziko_saved_friends_v1';

/**
 * Load cached local friends list (stripping any legacy demo profiles)
 */
export function getLocalFriends(): FriendProfile[] {
  try {
    const raw = localStorage.getItem(FRIENDS_LOCAL_CACHE_KEY);
    if (!raw) return [];
    const parsed: FriendProfile[] = JSON.parse(raw);
    const realFriends = parsed.filter(f => !f.uid.startsWith('community_'));
    if (realFriends.length !== parsed.length) {
      saveLocalFriends(realFriends);
    }
    return realFriends;
  } catch (e) {
    return [];
  }
}

/**
 * Save cached local friends list
 */
export function saveLocalFriends(friends: FriendProfile[]): void {
  try {
    const realFriends = friends.filter(f => !f.uid.startsWith('community_'));
    localStorage.setItem(FRIENDS_LOCAL_CACHE_KEY, JSON.stringify(realFriends));
  } catch (e) {
    console.error('Failed to save local friends cache:', e);
  }
}

/**
 * Search user in Firestore by Friend Code (e.g. "DV-RP82")
 */
export async function searchUserByFriendCode(code: string): Promise<FriendProfile | null> {
  let cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return null;
  // If user typed '2SFL' without 'DV-', normalize to 'DV-2SFL'
  if (!cleanCode.startsWith('DV-') && cleanCode.length <= 6) {
    cleanCode = `DV-${cleanCode}`;
  }

  try {
    const q = query(
      collection(db, 'publicProfiles'),
      where('friendCode', '==', cleanCode),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const data = snap.docs[0].data();
    const today = getTodayString();
    return {
      uid: snap.docs[0].id,
      displayName: data.displayName || 'Learner',
      photoURL: data.photoURL || '',
      friendCode: data.friendCode || cleanCode,
      streak: data.streak || 0,
      learnedCountSl: data.learnedCountSl || 0,
      learnedCountPt: data.learnedCountPt || 0,
      targetLanguage: data.targetLanguage || (data.learnedCountPt > data.learnedCountSl ? 'pt' : 'sl'),
      totalLessons: data.totalLessons || 0,
      lastActiveDate: data.lastActiveDate || '',
      activeToday: data.lastActiveDate === today,
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('Search friend by code failed:', err);
    return null;
  }
}

/**
 * Add a friend to user's friends list
 */
export async function addFriend(currentUser: User | null, friend: FriendProfile): Promise<void> {
  // Update local cache
  const local = getLocalFriends();
  if (!local.some(f => f.uid === friend.uid)) {
    const updated = [friend, ...local];
    saveLocalFriends(updated);
  }

  // If signed in to Firebase, sync to Firestore
  if (currentUser) {
    const friendDocPath = `users/${currentUser.uid}/friends/${friend.uid}`;
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'friends', friend.uid), {
        friendUid: friend.uid,
        displayName: friend.displayName,
        photoURL: friend.photoURL || '',
        friendCode: friend.friendCode,
        addedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, friendDocPath);
    }
  }
}

/**
 * Remove a friend from user's friends list
 */
export async function removeFriend(currentUser: User | null, friendUid: string): Promise<void> {
  const local = getLocalFriends();
  const filtered = local.filter(f => f.uid !== friendUid);
  saveLocalFriends(filtered);

  if (currentUser) {
    const friendDocPath = `users/${currentUser.uid}/friends/${friendUid}`;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'friends', friendUid));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, friendDocPath);
    }
  }
}

/**
 * Fetch all friends with latest live stats from Firestore and local storage
 */
export async function fetchFriendsWithStats(currentUser: User | null): Promise<FriendProfile[]> {
  const localFriends = getLocalFriends();
  const friendsMap = new Map<string, FriendProfile>();

  // Add local friends
  for (const lf of localFriends) {
    friendsMap.set(lf.uid, lf);
  }

  // If user signed into Firebase, fetch live friends collection & profile data
  if (currentUser) {
    try {
      const friendsSnap = await getDocs(collection(db, 'users', currentUser.uid, 'friends'));
      for (const d of friendsSnap.docs) {
        const friendUid = d.id;
        try {
          const profileSnap = await getDoc(doc(db, 'publicProfiles', friendUid));
          if (profileSnap.exists()) {
            const p = profileSnap.data();
            const today = getTodayString();
            friendsMap.set(friendUid, {
              uid: friendUid,
              displayName: p.displayName || d.data().displayName || 'Friend',
              photoURL: p.photoURL || d.data().photoURL,
              friendCode: p.friendCode || d.data().friendCode || '',
              streak: p.streak || 0,
              learnedCountSl: p.learnedCountSl || 0,
              learnedCountPt: p.learnedCountPt || 0,
              targetLanguage: p.targetLanguage || (p.learnedCountPt > p.learnedCountSl ? 'pt' : 'sl'),
              totalLessons: p.totalLessons || 0,
              lastActiveDate: p.lastActiveDate || '',
              activeToday: p.lastActiveDate === today,
              updatedAt: p.updatedAt || '',
            });
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Could not fetch friends from Firestore:', err);
    }
  }

  return Array.from(friendsMap.values());
}
