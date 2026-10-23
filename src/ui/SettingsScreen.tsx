import React, { useState, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Bell,
  Sun,
  Moon,
  Laptop,
  Download,
  Upload,
  RotateCcw,
  Sliders,
  Check,
  FileCode,
  Info,
  Smartphone,
  Sparkles,
  FileUp,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Flame,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { UserSettings } from '../data/types';
import {
  exportUserDataAsJson,
  importUserDataFromJson,
  resetAllUserData,
  inspectBackupJson,
  BackupPreview,
} from '../data/storage';
import { playSlovenianAudio } from '../tts/audioService';

interface SettingsScreenProps {
  settings: UserSettings;
  currentUser: User | null;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onResetData: () => void;
  onExportAndroidCode: () => void;
  onOpenInstallModal?: () => void;
  onOpenCloudSyncModal: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  currentUser,
  onUpdateSettings,
  onResetData,
  onExportAndroidCode,
  onOpenInstallModal,
  onOpenCloudSyncModal,
}) => {
  const [importText, setImportText] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notificationSent, setNotificationSent] = useState(false);

  // File upload & backup preview state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string } | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  const showToast = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const processJsonString = (content: string, fileName?: string, fileSize?: number) => {
    setImportText(content);
    if (fileName) {
      const sizeStr = fileSize
        ? fileSize < 1024
          ? `${fileSize} B`
          : `${(fileSize / 1024).toFixed(1)} KB`
        : '';
      setSelectedFile({ name: fileName, size: sizeStr });
    }
    const previewResult = inspectBackupJson(content);
    setPreview(previewResult);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processJsonString(content, file.name, file.size);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      showToast('Please upload a valid .json file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processJsonString(content, file.name, file.size);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleExportJson = () => {
    const json = exportUserDataAsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dvojeziko-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Progress exported successfully!');
  };

  const handleImportJson = () => {
    if (!importText.trim()) {
      showToast('Please select a backup file or paste JSON data.');
      return;
    }
    const success = importUserDataFromJson(importText.trim());
    if (success) {
      showToast('Progress restored successfully! Reloading...');
      setShowImportDialog(false);
      setImportText('');
      setPreview(null);
      setSelectedFile(null);
      setTimeout(() => window.location.reload(), 700);
    } else {
      showToast('Failed to import: invalid JSON format.');
    }
  };

  const closeImportDialog = () => {
    setShowImportDialog(false);
    setImportText('');
    setPreview(null);
    setSelectedFile(null);
    setShowRawText(false);
  };

  const handleTestNotification = () => {
    setNotificationSent(true);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Dvojeziko - Slovenian Daily Lesson', {
        body: 'Your 5-minute daily lesson is ready! 3 new words waiting for you.',
        icon: '/favicon.ico',
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Dvojeziko - Slovenian Daily Lesson', {
            body: 'Your 5-minute daily lesson is ready! 3 new words waiting for you.',
          });
        }
      });
    }
    setTimeout(() => setNotificationSent(false), 4000);
  };

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {message && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-2xl shadow-xl text-xs font-bold animate-in fade-in duration-200">
          {message}
        </div>
      )}

      {/* Simulated Android Notification Banner if triggered */}
      {notificationSent && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 rounded-3xl shadow-md flex items-start gap-3 animate-in slide-in-from-top duration-200">
          <div className="w-10 h-10 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shrink-0">
            <Bell size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
              Dvojeziko • Daily Reminder
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              Čas za 5 minut slovenščine! Your daily lesson is ready.
            </p>
          </div>
        </div>
      )}

      {/* PC & Android Cloud Sync Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Cloud size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                PC & Android Cloud Sync
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Keep words, streak & reviews in sync across all devices
              </p>
            </div>
          </div>
          {currentUser ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/20">
              <CheckCircle2 size={13} className="text-emerald-600" />
              Synced
            </span>
          ) : (
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
              Local Only
            </span>
          )}
        </div>

        <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
          {currentUser
            ? `Connected to Google as ${currentUser.email}. Your progress automatically syncs in the background whenever you finish a session.`
            : 'Synchronize your 1,000 words, daily streak, and mistake reviews automatically between this PC and your Android phone.'}
        </p>

        <div className="pt-1">
          <button
            type="button"
            onClick={onOpenCloudSyncModal}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw size={14} />
            {currentUser ? 'Manage Cloud Sync / Force Sync Now' : 'Connect Google for Cloud Sync'}
          </button>
        </div>
      </div>

      {/* Daily Learning Logic Settings */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sliders size={18} className="text-emerald-600" />
          Daily Learning Pace
        </h3>

        {/* New Words Per Day Slider (1 to 8) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
              New words per day
            </span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              {settings.newWordsPerDay} words
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={settings.newWordsPerDay}
            onChange={e =>
              onUpdateSettings({
                ...settings,
                newWordsPerDay: parseInt(e.target.value, 10),
              })
            }
            className="w-full accent-emerald-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-1">
            <span>1 (Relaxed)</span>
            <span>3 (Recommended)</span>
            <span>8 (Intensive)</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Maximum 2 grammar-only words introduced per day, mixed with concrete nouns and verbs.
          </p>
        </div>

        {/* Smart Moderation / Retention Guard Toggle */}
        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div>
            <span className="text-sm font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-600" />
              Smart Moderation (Retention Guard)
            </span>
            <span className="text-xs text-slate-400 block mt-0.5 max-w-md">
              Automatically scales down new words if you have mistakes or overdue reviews. Prevents review overload so you truly master words before piling on new ones.
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({
                ...settings,
                adaptivePace: settings.adaptivePace === false,
              })
            }
            className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
              settings.adaptivePace !== false ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-zinc-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                settings.adaptivePace !== false ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* AI Sentences & Offline Mode Toggle */}
        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div>
            <span className="text-sm font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Sparkles size={15} className="text-emerald-500" />
              AI Sentences (Gemini)
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">
              {settings.enableAiSentences !== false
                ? 'Server-generated natural practice sentences (0 cost to your phone)'
                : '100% Offline Mode (uses curated pre-cached Slovenian sentences, 0 network calls)'}
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({
                ...settings,
                enableAiSentences: settings.enableAiSentences === false,
              })
            }
            className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
              settings.enableAiSentences !== false ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-zinc-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                settings.enableAiSentences !== false ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Daily Reminder Time */}
        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div>
            <span className="text-sm font-semibold text-slate-700 dark:text-zinc-300 block">
              Daily Reminder
            </span>
            <span className="text-xs text-slate-400">
              Sends an Android / system notification
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={settings.dailyReminderTime}
              onChange={e =>
                onUpdateSettings({
                  ...settings,
                  dailyReminderTime: e.target.value,
                })
              }
              className="py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold text-sm border border-slate-300 dark:border-zinc-700 outline-none"
            />
            <button
              type="button"
              onClick={handleTestNotification}
              title="Test reminder notification"
              className="p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl cursor-pointer transition-colors"
            >
              <Bell size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Audio & Theme Settings */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Volume2 size={18} className="text-emerald-600" />
          Sound & Display
        </h3>

        {/* Sound Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-slate-700 dark:text-zinc-300 block">
              Audio & Pronunciation
            </span>
            <span className="text-xs text-slate-400">
              Speaks Slovenian words and example sentences
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({
                ...settings,
                soundEnabled: !settings.soundEnabled,
              })
            }
            className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer ${settings.soundEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-zinc-700'}`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>

        {/* Test Speech Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => playSlovenianAudio('Dober dan! Kako ste?')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer"
          >
            <Volume2 size={14} /> Test Slovenian Voice ("Dober dan! Kako ste?")
          </button>
        </div>

        {/* Theme (Light / Dark / System) */}
        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
          <span className="text-sm font-semibold text-slate-700 dark:text-zinc-300 block mb-2">
            Appearance Theme
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'system', label: 'System', icon: Laptop },
            ].map(t => {
              const Icon = t.icon;
              const isSelected = settings.theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      theme: t.id as any,
                    })
                  }
                  className={`py-2.5 px-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${isSelected ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100'}`}
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Data Backup & Restore */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Download size={18} className="text-emerald-600" />
          Data & Progress Backup
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleExportJson}
            className="py-3 px-4 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 dark:border-zinc-700 cursor-pointer"
          >
            <Download size={15} /> Export JSON
          </button>
          <button
            type="button"
            onClick={() => setShowImportDialog(true)}
            className="py-3 px-4 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 dark:border-zinc-700 cursor-pointer"
          >
            <Upload size={15} /> Import JSON
          </button>
        </div>

        {/* Mobile / PWA / APK Installation Modal */}
        {onOpenInstallModal && (
          <button
            type="button"
            onClick={onOpenInstallModal}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
          >
            <Smartphone size={16} /> Get on Your Phone / Download Android APK
          </button>
        )}

        {/* Native Android Project Code Architecture Modal Trigger */}
        <button
          type="button"
          onClick={onExportAndroidCode}
          className="w-full py-3 px-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-800 dark:text-teal-300 font-bold text-xs flex items-center justify-center gap-2 border border-teal-200 dark:border-teal-800 cursor-pointer transition-colors"
        >
          <FileCode size={15} /> View Android Kotlin + Jetpack Compose Files
        </button>

        {/* Reset Progress */}
        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to reset all learning progress? This cannot be undone.')) {
                resetAllUserData();
                onResetData();
                showToast('All progress reset to day 1.');
              }
            }}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw size={13} /> Reset Learning Progress
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {/* Import Modal with File Upload and Live Preview */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <FileUp size={19} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Import Progress Backup
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Restore learned words, Leitner boxes, and streaks
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeImportDialog}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Hidden Native File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* File Upload Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`p-5 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-4 ring-emerald-500/20'
                  : 'border-slate-300 dark:border-zinc-700 hover:border-emerald-400 bg-slate-50/60 dark:bg-zinc-800/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-2.5 shadow-xs">
                <Upload size={22} />
              </div>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                Upload .json Backup File
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Tap to browse from your device or drag & drop here
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-3 py-1.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors"
              >
                <FileUp size={14} /> Browse Files
              </button>
            </div>

            {/* Selected File & Backup Preview */}
            {selectedFile && (
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText size={18} className="text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                      {selectedFile.size}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="text-xs font-semibold text-emerald-600 hover:underline shrink-0"
                >
                  Change file
                </button>
              </div>
            )}

            {/* Validation & Stats Card */}
            {preview && preview.valid && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span className="text-xs font-extrabold uppercase tracking-wider">
                    Valid Backup Detected
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/80 dark:bg-zinc-900/80 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/60 flex items-center gap-2">
                    <BookOpen size={15} className="text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 block">Words</span>
                      <strong className="text-slate-900 dark:text-white font-extrabold">{preview.wordCount} words</strong>
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-zinc-900/80 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/60 flex items-center gap-2">
                    <Flame size={15} className="text-amber-500 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 block">Streak</span>
                      <strong className="text-slate-900 dark:text-white font-extrabold">{preview.streak} days</strong>
                    </div>
                  </div>
                </div>
                {preview.exportedAt && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 pt-0.5">
                    <Calendar size={13} />
                    Exported: {new Date(preview.exportedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            )}

            {/* Invalid Format Error Card */}
            {preview && !preview.valid && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5">
                <AlertCircle size={17} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-800 dark:text-rose-300">
                  <strong className="font-bold block">Invalid Backup File</strong>
                  <span>{preview.errorMessage || 'Please ensure you selected a valid Dvojeziko backup JSON file.'}</span>
                </div>
              </div>
            )}

            {/* Collapsible Manual JSON Paste Fallback */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowRawText(!showRawText)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-zinc-400 flex items-center gap-1 cursor-pointer"
              >
                {showRawText ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showRawText ? 'Hide raw JSON editor' : 'Or paste JSON text manually'}
              </button>

              {showRawText && (
                <div className="mt-2.5 space-y-2">
                  <textarea
                    rows={4}
                    value={importText}
                    onChange={(e) => processJsonString(e.target.value)}
                    placeholder='Paste {"progress": {...}, "stats": {...}} here...'
                    className="w-full p-3 font-mono text-[11px] rounded-2xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={closeImportDialog}
                className="py-2.5 px-4 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!importText.trim() || (preview !== null && !preview.valid)}
                onClick={handleImportJson}
                className="py-2.5 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Check size={15} />
                Restore Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
