import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Share2,
  Copy,
  Check,
  Flame,
  Award,
  Sparkles,
  Search,
  Trash2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { FriendProfile, UserProfile } from '../data/types';
import {
  fetchFriendsWithStats,
  searchUserByFriendCode,
  addFriend,
  removeFriend,
} from '../services/friendsService';
import { User } from '../services/firebase';

interface FriendsTabProps {
  currentUser: User | null;
  userProfile: UserProfile;
  activeLanguage: 'sl' | 'pt';
  userStreak: number;
  userLearnedSl: number;
  userLearnedPt: number;
  userLessons: number;
  onOpenCloudSync: () => void;
}

export const FriendsTab: React.FC<FriendsTabProps> = ({
  currentUser,
  userProfile,
  activeLanguage,
  userStreak,
  userLearnedSl,
  userLearnedPt,
  userLessons,
  onOpenCloudSync,
}) => {
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<FriendProfile | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await fetchFriendsWithStats(currentUser);
      setFriends(list);
    } catch (e) {
      console.warn('Failed to load friends:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleCopyCode = () => {
    if (!userProfile.friendCode) return;
    navigator.clipboard.writeText(userProfile.friendCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleShareInvite = () => {
    const code = userProfile.friendCode || 'DV-LEARN';
    const text = `Join me learning on Dvojeziko! Add my friend code ${code} to track daily streaks and words together: ${window.location.origin}`;
    if (navigator.share) {
      navigator.share({
        title: 'Dvojeziko Language Learning',
        text,
        url: window.location.origin,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setActionSuccess('Invite message copied to clipboard!');
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const handleSearchFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const found = await searchUserByFriendCode(searchCode.trim());
      if (found) {
        if (found.uid === currentUser?.uid || found.friendCode === userProfile.friendCode) {
          setSearchError("That's your own friend code!");
        } else {
          setSearchResult(found);
        }
      } else {
        setSearchError(`No learner found with code "${searchCode.trim().toUpperCase()}". Try checking with your friend!`);
      }
    } catch (err) {
      setSearchError('Error looking up friend code. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFoundFriend = async () => {
    if (!searchResult) return;
    try {
      await addFriend(currentUser, searchResult);
      setActionSuccess(`Added ${searchResult.displayName} to your friends list!`);
      setSearchResult(null);
      setSearchCode('');
      await loadData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setSearchError('Could not add friend. Please try again.');
    }
  };

  const handleRemoveFriend = async (friend: FriendProfile) => {
    if (!window.confirm(`Remove ${friend.displayName} from your friends list?`)) return;
    try {
      await removeFriend(currentUser, friend.uid);
      setFriends(prev => prev.filter(f => f.uid !== friend.uid));
      setActionSuccess(`Removed ${friend.displayName}`);
      setTimeout(() => setActionSuccess(null), 2500);
    } catch (err) {
      console.warn('Remove friend error:', err);
    }
  };

  // Compile combined leaderboard: Current user + friends
  const myLeaderboardEntry: FriendProfile = {
    uid: currentUser?.uid || 'me',
    displayName: `${userProfile.displayName || 'You'} (You)`,
    photoURL: userProfile.photoURL,
    friendCode: userProfile.friendCode || 'DV-YOU',
    streak: userStreak,
    learnedCountSl: userLearnedSl,
    learnedCountPt: userLearnedPt,
    totalLessons: userLessons,
    lastActiveDate: new Date().toISOString().split('T')[0],
    activeToday: true,
    updatedAt: new Date().toISOString(),
  };

  // Sort leaderboard by active language learned words, then streak
  const allLearners = [myLeaderboardEntry, ...friends].sort((a, b) => {
    const aLearned = activeLanguage === 'pt' ? a.learnedCountPt : a.learnedCountSl;
    const bLearned = activeLanguage === 'pt' ? b.learnedCountPt : b.learnedCountSl;
    if (bLearned !== aLearned) return bLearned - aLearned;
    return b.streak - a.streak;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Toast */}
      {actionSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white px-5 py-2.5 rounded-2xl shadow-xl text-xs font-bold animate-in fade-in duration-200">
          {actionSuccess}
        </div>
      )}

      {/* Your Friend Code Card */}
      <div className="bg-linear-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Users size={22} className="text-white" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-100">
                Your Friend Code
              </span>
              <h3 className="text-xl font-black tracking-wider text-white">
                {userProfile.friendCode || '...'}
              </h3>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-white/20 px-2.5 py-1 rounded-full text-white backdrop-blur-xs">
            {friends.length} {friends.length === 1 ? 'Friend' : 'Friends'}
          </span>
        </div>

        <p className="text-xs text-emerald-50 leading-relaxed">
          Share this code with friends so they can add you, see your daily streaks, compare words learned, and stay motivated together!
        </p>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex-1 py-2.5 px-3 bg-white text-emerald-800 hover:bg-emerald-50 active:scale-98 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copiedCode ? 'Code Copied!' : 'Copy Friend Code'}
          </button>
          <button
            type="button"
            onClick={handleShareInvite}
            className="py-2.5 px-4 bg-emerald-800/60 hover:bg-emerald-800 active:scale-98 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Share2 size={14} />
            Share
          </button>
        </div>
      </div>

      {/* Add Friend Input Form */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus size={18} className="text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Connect with a Friend
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Enter your friend's code (e.g. <span className="font-mono font-bold text-emerald-600">DV-XXXX</span>) to view their stats and connect.
        </p>

        <form onSubmit={handleSearchFriend} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchCode}
              onChange={e => {
                setSearchCode(e.target.value.toUpperCase());
                setSearchError(null);
              }}
              placeholder="DV-XXXX"
              maxLength={12}
              className="w-full uppercase font-mono tracking-wider py-2.5 pl-3.5 pr-9 rounded-2xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white font-bold text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <Search size={16} className="absolute right-3 top-3.5 text-slate-400" />
          </div>
          <button
            type="submit"
            disabled={!searchCode.trim() || isSearching}
            className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-2xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            {isSearching ? 'Searching...' : 'Find'}
          </button>
        </form>

        {/* Search Error */}
        {searchError && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2 text-xs text-rose-800 dark:text-rose-300">
            <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Found Friend Preview Card */}
        {searchResult && (
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={
                  searchResult.photoURL ||
                  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(searchResult.displayName)}&backgroundColor=0f766e,0d9488&textColor=ffffff`
                }
                alt={searchResult.displayName}
                className="w-11 h-11 rounded-2xl object-cover ring-2 ring-emerald-500/50 shadow-xs"
                crossOrigin="anonymous"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {searchResult.displayName}
                  </h4>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-white/80 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
                    {searchResult.friendCode}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
                  <span className="flex items-center gap-1 text-amber-600 font-bold">
                    <Flame size={12} className="fill-amber-500" />
                    {searchResult.streak}d streak
                  </span>
                  <span>•</span>
                  <span>{searchResult.learnedCountSl} SI / {searchResult.learnedCountPt} PT words</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddFoundFriend}
              className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 flex items-center gap-1"
            >
              <UserPlus size={14} />
              Add
            </button>
          </div>
        )}
      </div>

      {/* Friends Shared Leaderboard */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-amber-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Shared Leaderboard
            </h3>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
            {activeLanguage === 'pt' ? '🇵🇹 Portuguese' : '🇸🇮 Slovenian'}
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Ranked by words learned and active daily streaks. See who practiced today!
        </p>

        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">
            Loading friends data...
          </div>
        ) : (
          <div className="space-y-2.5">
            {allLearners.map((learner, idx) => {
              const isMe = learner.uid === currentUser?.uid || learner.uid === 'me';
              const learnedInTrack = activeLanguage === 'pt' ? learner.learnedCountPt : learner.learnedCountSl;

              return (
                <div
                  key={learner.uid}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isMe
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Badge */}
                    <div className="w-6 text-center shrink-0">
                      {idx === 0 ? (
                        <span className="text-lg">🥇</span>
                      ) : idx === 1 ? (
                        <span className="text-lg">🥈</span>
                      ) : idx === 2 ? (
                        <span className="text-lg">🥉</span>
                      ) : (
                        <span className="text-xs font-black text-slate-400">#{idx + 1}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={
                          learner.photoURL ||
                          `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(learner.displayName)}&backgroundColor=0f766e,0d9488&textColor=ffffff`
                        }
                        alt={learner.displayName}
                        className="w-10 h-10 rounded-2xl object-cover ring-2 ring-slate-200 dark:ring-zinc-700 bg-emerald-800 shadow-2xs"
                        crossOrigin="anonymous"
                      />
                      {/* Active today dot */}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-zinc-900 ${
                          learner.activeToday ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-600'
                        }`}
                        title={learner.activeToday ? 'Practiced today!' : 'Not practiced yet today'}
                      />
                    </div>

                    {/* Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {learner.displayName}
                        </span>
                        {isMe && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-emerald-600 text-white">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                        <span className="font-mono text-[10px] text-slate-400">
                          {learner.friendCode}
                        </span>
                        <span>•</span>
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          {learnedInTrack} words
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Streak & Actions */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="flex items-center gap-1 py-1 px-2.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-extrabold text-xs border border-amber-500/20">
                      <Flame size={13} className="fill-amber-500" />
                      <span>{learner.streak}d</span>
                    </div>

                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFriend(learner)}
                        title="Remove friend"
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {friends.length === 0 && (
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-dashed border-slate-300 dark:border-zinc-700 text-center py-6 mt-3">
                <Users size={28} className="text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  No friends connected yet
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-0.5">
                  Share your friend code <span className="font-mono font-bold text-emerald-600">{userProfile.friendCode}</span> to track streaks and compare progress together!
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cloud Sync Callout if not signed in */}
      {!currentUser && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-3xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
            <p className="text-xs text-slate-700 dark:text-zinc-300">
              Sign in with Google to automatically back up your friends list and sync across your phone and PC.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCloudSync}
            className="py-2 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs cursor-pointer shrink-0"
          >
            Sign In
          </button>
        </div>
      )}
    </div>
  );
};
