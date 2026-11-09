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
import { loadUserProfile } from '../data/storage';

const FRIENDS_LOCAL_CACHE_KEY = 'dvojeziko_saved_friends_v1';

// Default starter study buddies for instant community leaderboard
export const COMMUNITY_FRIENDS: FriendProfile[] = [
  {
    uid: 'community_ana',
    displayName: 'Ana Kovačič',
    photoURL: 'https://api.dicebear.com/9.x/initials/svg?seed=Ana+Kovacic&backgroundColor=ec4899,db2777&textColor=ffffff',
    friendCode: 'DV-ANA1',
    streak: 14,
    learnedCountSl: 142,
    learnedCountPt: 35,
    totalLessons: 38,
    lastActiveDate: getTodayString(),
    activeToday: true,
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'community_luka',
    displayName: 'Luka Novak',
    photoURL: 'https://api.dicebear.com/9.x/initials/svg?seed=Luka+Novak&backgroundColor=3b82f6,1d4ed8&textColor=ffffff',
    friendCode: 'DV-LUK2',
    streak: 9,
    learnedCountSl: 98,
    learnedCountPt: 60,
    totalLessons: 27,
    lastActiveDate: getTodayString(),
    activeToday: true,
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'community_matej',
    displayName: 'Matej Zupan',
    photoURL: 'https://api.dicebear.com/9.x/initials/svg?seed=Matej+Zupan&backgroundColor=f59e0b,d97706&textColor=ffffff',
    friendCode: 'DV-MAT3',
    streak: 5,
    learnedCountSl: 52,
    learnedCountPt: 12,
    totalLessons: 16,
    lastActiveDate: getTodayString(),
    activeToday: true,
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Load cached local friends list
 */
export function getLocalFriends(): FriendProfile[] {
  try {
    const raw = localStorage.getItem(FRIENDS_LOCAL_CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

/**
 * Save cached local friends list
 */
export function saveLocalFriends(friends: FriendProfile[]): void {
  try {
    localStorage.setItem(FRIENDS_LOCAL_CACHE_KEY, JSON.stringify(friends));
  } catch (e) {
    console.error('Failed to save local friends cache:', e);
  }
}

/**
 * Search user in Firestore by Friend Code (e.g. "DV-RP82" or "DV-ANA1")
 */
export async function searchUserByFriendCode(code: string): Promise<FriendProfile | null> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return null;

  // Check demo community friends first
  const matchDemo = COMMUNITY_FRIENDS.find(f => f.friendCode.toUpperCase() === cleanCode);
  if (matchDemo) return matchDemo;

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
  // Always update local cache
  const local = getLocalFriends();
  if (!local.some(f => f.uid === friend.uid)) {
    const updated = [friend, ...local];
    saveLocalFriends(updated);
  }

  // If signed in to Firebase, sync to Firestore
  if (currentUser && !friend.uid.startsWith('community_')) {
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

  if (currentUser && !friendUid.startsWith('community_')) {
    const friendDocPath = `users/${currentUser.uid}/friends/${friendUid}`;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'friends', friendUid));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, friendDocPath);
    }
  }
}

/**
 * Fetch all friends with latest live stats
 */
export async function fetchFriendsWithStats(currentUser: User | null): Promise<FriendProfile[]> {
  const localFriends = getLocalFriends();
  const friendsMap = new Map<string, FriendProfile>();

  // Add default community friends
  for (const cf of COMMUNITY_FRIENDS) {
    friendsMap.set(cf.uid, cf);
  }

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
