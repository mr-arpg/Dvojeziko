import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  RefreshCw,
  Smartphone,
  Monitor,
  ShieldCheck,
  X,
  LogOut,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  loginWithGoogle,
  logoutUser,
  uploadLocalToCloud,
  fetchCloudState,
  mergeCloudAndLocal,
  CloudSyncData,
} from '../services/cloudSync';
import { WordProgress, UserStats, UserSettings, UserProfile } from '../data/types';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onSyncComplete: (
    progress: Record<number, WordProgress>,
    stats: UserStats,
    settings?: UserSettings
  ) => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onUpdateProfile,
  onSyncComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSyncInfo, setLastSyncInfo] = useState<CloudSyncData | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage('Connecting to Google...');
    try {
      const user = await loginWithGoogle();
      setStatusMessage('Checking cloud data...');

      // Check if remote cloud data exists
      const cloudData = await fetchCloudState(user);
      if (cloudData) {
        // Merge cloud and local data safely (always keeping highest progress and all words)
        const { mergedProgress, mergedStats, mergedSettings } = mergeCloudAndLocal(cloudData, true);
        onSyncComplete(mergedProgress, mergedStats, mergedSettings);

        // Upload merged state back to cloud so both cloud and devices are in complete sync
        const syncedCloud = await uploadLocalToCloud(user);
        setLastSyncInfo(syncedCloud);
        const count = Object.values(mergedProgress).filter(p => p.status !== 'new').length;
        setStatusMessage(`Synchronized! ${count} active words are now unified between your phone and PC.`);
      } else {
        // First time: upload local progress to cloud
        const uploaded = await uploadLocalToCloud(user);
        setLastSyncInfo(uploaded);
        setStatusMessage('Your local progress is now securely synced to the cloud!');
      }
    } catch (err: unknown) {
      console.error(err);
      const rawMsg = err instanceof Error ? err.message : String(err);
      if (rawMsg.includes('auth/unauthorized-domain')) {
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'your domain';
        setErrorMessage(
          `Domain not authorized in Firebase: Please add "${domain}" to your Firebase Console under Authentication > Settings > Authorized domains.`
        );
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : 'Sign in failed. Please check popup permissions and try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!currentUser) return;
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage('Syncing with cloud...');
    try {
      // 1. Fetch latest from cloud
      const cloudData = await fetchCloudState(currentUser);
      if (cloudData) {
        const { mergedProgress, mergedStats, mergedSettings } = mergeCloudAndLocal(cloudData);
        onSyncComplete(mergedProgress, mergedStats, mergedSettings);
      }
      // 2. Push merged state back to cloud
      const uploaded = await uploadLocalToCloud(currentUser);
      setLastSyncInfo(uploaded);
      setStatusMessage('All data synced and up to date across all devices!');
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage('Failed to sync. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setStatusMessage('Signed out. Your progress remains saved locally on this device.');
      setLastSyncInfo(null);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Cloud size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                PC & Android Cloud Sync
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Seamless real-time synchronization via Firebase
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current State Card */}
        {currentUser ? (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={
                    currentUser.photoURL ||
                    userProfile.photoURL ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || userProfile.displayName)}&background=0d9488&color=fff&bold=true`
                  }
                  alt={currentUser.displayName || userProfile.displayName}
                  className="w-10 h-10 rounded-full border border-emerald-500/40 object-cover"
                  referrerPolicy="no-referrer"
                  onError={e => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || userProfile.displayName)}&background=0d9488&color=fff&bold=true`;
                  }}
                />
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    {currentUser.displayName || userProfile.displayName}
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded-full">
                      Synced
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-zinc-400 truncate max-w-[200px] sm:max-w-xs">
                    {currentUser.email || userProfile.email}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                title="Sign out of sync"
                className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <LogOut size={18} />
              </button>
            </div>

            <div className="pt-2 border-t border-emerald-500/15 flex items-center justify-between text-xs">
              <span className="text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                Automatic cloud sync active
              </span>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={loading}
                className="font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                Sync Now
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200 dark:border-zinc-700 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={
                  userProfile.photoURL ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName)}&background=0d9488&color=fff&bold=true`
                }
                alt={userProfile.displayName}
                className="w-11 h-11 rounded-full border border-slate-300 dark:border-zinc-600 object-cover"
                referrerPolicy="no-referrer"
                onError={e => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName)}&background=0d9488&color=fff&bold=true`;
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  {userProfile.displayName}
                  <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-400 font-extrabold px-2 py-0.5 rounded-full">
                    Local Device
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                  {userProfile.email}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              Connect this device with your Google account to automatically synchronize your vocabulary, streak, and daily reviews across PC and Android phone.
            </p>

            <button
              type="button"
              onClick={handleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              {loading ? 'Connecting...' : 'Sign In with Google to Sync'}
            </button>
          </div>
        )}

        {/* Status / Error feedback */}
        {statusMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-500/20 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Device Sync Visualizer */}
        <div className="pt-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            How It Works
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-slate-200/80 dark:border-zinc-700/60 text-center space-y-1">
              <Monitor size={22} className="mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
              <div className="text-xs font-bold text-slate-800 dark:text-white">PC / Browser</div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Learn words on your computer with comfortable typing
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-slate-200/80 dark:border-zinc-700/60 text-center space-y-1">
              <Smartphone size={22} className="mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
              <div className="text-xs font-bold text-slate-800 dark:text-white">Android Phone</div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Review on the go; updates instantly push to your PC
              </p>
            </div>
          </div>
        </div>

        {/* Security & Offline Notice */}
        <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-slate-200/60 dark:border-zinc-800">
          <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Conflict-Free Protection:</strong> Merging always keeps your highest streak and all learned vocabulary. Works 100% offline and syncs automatically when reconnected.
          </p>
        </div>
      </div>
    </div>
  );
};
