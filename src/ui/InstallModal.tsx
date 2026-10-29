import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Download,
  Share2,
  X,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Layers,
  ShieldCheck,
  WifiOff,
  Globe,
  HelpCircle,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install, isIOS, isAndroid } = usePWAInstall();

  // Dynamically detect the actual current running URL (not an old hardcoded link)
  const getDetectedUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.href.split('?')[0].split('#')[0];
    }
    return '';
  };

  const [appUrl, setAppUrl] = useState<string>(getDetectedUrl);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'apk' | 'api-faq'>('android');

  // Keep appUrl synced with real window location when modal opens
  useEffect(() => {
    if (isOpen) {
      const current = getDetectedUrl();
      if (current && (!appUrl || appUrl.includes('ais-pre-nybneefhbjug4d5ugu2qq2'))) {
        setAppUrl(current);
      }
    }
  }, [isOpen]);

  // Re-generate QR code whenever appUrl changes
  useEffect(() => {
    if (isOpen && appUrl) {
      QRCode.toDataURL(appUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error('Failed to generate QR code', err));
    }
  }, [isOpen, appUrl]);

  const handleCopyLink = () => {
    if (!appUrl) return;
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isLocalhost =
    typeof window !== 'undefined' &&
    (appUrl.includes('localhost') || appUrl.includes('127.0.0.1'));

  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(appUrl || 'https://')}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 text-slate-800 dark:text-zinc-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Header with Custom Icon */}
        <div className="flex items-center gap-3.5 mb-5">
          <img
            src="/pwa-192x192.png"
            alt="Dvojeziko Mount Triglav Icon"
            className="w-13 h-13 rounded-2xl shadow-md border border-slate-200 dark:border-zinc-700 object-cover shrink-0"
          />
          <div>
            <h2 className="text-xl font-bold tracking-tight">Get Dvojeziko on Your Phone</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Install to home screen with custom Triglav mountain icon
            </p>
          </div>
        </div>

        {/* Already Installed Banner */}
        {isInstalled && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            <span>Dvojeziko is already installed and running in standalone app mode!</span>
          </div>
        )}

        {/* 1-Click Browser Install Prompt (if available on this browser) */}
        {isInstallable && (
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  Quick Install Detected
                </p>
                <p className="text-xs text-slate-600 dark:text-zinc-400">
                  Install Dvojeziko as a native app right now with 1 click.
                </p>
              </div>
              <button
                onClick={install}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold tracking-wide shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Download size={14} /> Install Now
              </button>
            </div>
          </div>
        )}

        {/* QR Code & Live Link Box */}
        <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 mb-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 shrink-0">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="Scan to open Dvojeziko on your phone"
                  className="w-32 h-32 rounded-lg block"
                />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center text-xs text-slate-400">
                  Generating QR...
                </div>
              )}
            </div>
            <div className="flex-1 w-full text-center sm:text-left space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 text-[11px] font-semibold">
                <Sparkles size={12} /> Scan with Phone Camera
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                Open your phone's camera to immediately open Dvojeziko in Chrome or Safari.
              </p>
              <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition cursor-pointer"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {copied ? 'Link Copied!' : 'Copy Link'}
                </button>
                {appUrl && (
                  <a
                    href={appUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
                  >
                    Open in New Tab <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Live URL Input / Customizer */}
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-zinc-700/60">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
              Live App Address (dynamically detected):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={appUrl}
                onChange={e => setAppUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg text-slate-800 dark:text-zinc-200 font-mono outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setAppUrl(getDetectedUrl())}
                title="Reset to current browser URL"
                className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-300 dark:border-zinc-700 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700"
              >
                Reset
              </button>
            </div>
            {isLocalhost && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">
                ⚠️ Running on localhost: To open on a phone over Wi-Fi, change "localhost" to your computer's local Wi-Fi IP (e.g. <code>http://192.168.1.X:3000</code>).
              </p>
            )}
          </div>
        </div>

        {/* API Usage & Offline Guarantee Callout (Direct Answer to User's Question) */}
        <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/20 text-xs">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold mb-1">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>Will you get API calls on your phone? NO!</span>
          </div>
          <p className="text-slate-600 dark:text-zinc-300 leading-relaxed text-[11px]">
            The 1,000 Slovenian words, spaced repetition scheduler, mistake repeat queues, and native Slovenian audio all run <strong>100% locally on your phone</strong> with zero API calls. You will never be billed or asked for an API key.
          </p>
        </div>

        {/* Tabs for Detailed Steps */}
        <div className="flex border-b border-slate-200 dark:border-zinc-800 mb-4 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('android')}
            className={`pb-2 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'android'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Smartphone size={14} /> Android (1-Click)
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`pb-2 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'ios'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Share2 size={14} /> iPhone / iOS
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`pb-2 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'apk'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Layers size={14} /> Build .APK
          </button>
          <button
            onClick={() => setActiveTab('api-faq')}
            className={`pb-2 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'api-faq'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <HelpCircle size={14} /> API & Offline FAQ
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'android' && (
          <div className="space-y-3 text-xs text-slate-600 dark:text-zinc-300">
            <p className="font-medium text-slate-800 dark:text-zinc-100">
              How to install onto any Android phone (Recommended):
            </p>
            <ol className="list-decimal list-inside space-y-2 pl-1 leading-relaxed">
              <li>
                Scan the QR code above or open the link in <strong>Google Chrome</strong>.
              </li>
              <li>
                Tap the <strong>"Install app"</strong> banner or tap Chrome's{' '}
                <strong>three dots menu (⋮)</strong> in the top-right corner.
              </li>
              <li>
                Tap <strong>"Install app"</strong> (or <strong>"Add to Home screen"</strong>).
              </li>
              <li>
                Chrome automatically compiles a native <strong>WebAPK</strong> on your phone with the app icon, offline caching, and fullscreen mode!
              </li>
            </ol>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
              💡 <strong>Instant & Free:</strong> No APK sideloading warnings, no developer mode required, and updates install automatically!
            </p>
          </div>
        )}

        {activeTab === 'ios' && (
          <div className="space-y-3 text-xs text-slate-600 dark:text-zinc-300">
            <p className="font-medium text-slate-800 dark:text-zinc-100">
              How to install onto an iPhone or iPad:
            </p>
            <ol className="list-decimal list-inside space-y-2 pl-1 leading-relaxed">
              <li>
                Scan the QR code or open the link in <strong>Safari</strong>.
              </li>
              <li>
                Tap the <strong>Share</strong> button at the bottom of Safari (the square icon with
                an arrow pointing up).
              </li>
              <li>
                Scroll down in the share sheet and tap <strong>"Add to Home Screen"</strong>.
              </li>
              <li>
                Tap <strong>"Add"</strong> in the top-right corner.
              </li>
              <li>
                Dvojeziko will now appear on your home screen and run standalone like a native iOS app!
              </li>
            </ol>
          </div>
        )}

        {activeTab === 'apk' && (
          <div className="space-y-3 text-xs text-slate-600 dark:text-zinc-300">
            <p className="font-medium text-slate-800 dark:text-zinc-100">
              Generating a standalone .APK file with PWABuilder:
            </p>
            <p className="leading-relaxed">
              Because Dvojeziko includes a complete PWA Web Manifest and Service Worker, you can generate a signed <strong>.apk</strong> in 1 minute using <strong>PWABuilder</strong>:
            </p>
            <div className="p-3 bg-slate-100 dark:bg-zinc-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-zinc-200">
                  PWABuilder Package Generator
                </span>
                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium inline-flex items-center gap-1 transition"
                >
                  Open PWABuilder <ExternalLink size={12} />
                </a>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                1. Make sure your link above is a publicly accessible HTTPS URL.
                <br />
                2. Click <strong>"Open PWABuilder"</strong> &rarr; Click <strong>"Package for Stores"</strong> &rarr; <strong>"Android"</strong>.
                <br />
                3. Download the ready-to-install <strong>.apk</strong> file to install onto your device!
              </p>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Note: <strong>Method 1 (Chrome "Install App")</strong> is faster and recommended because Chrome directly builds a native WebAPK on the phone without manual file transfers.
            </p>
          </div>
        )}

        {activeTab === 'api-faq' && (
          <div className="space-y-3 text-xs text-slate-600 dark:text-zinc-300">
            <div className="p-3 bg-slate-100 dark:bg-zinc-800/80 rounded-xl space-y-1.5">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <WifiOff size={14} className="text-emerald-500" />
                Does the phone app use Gemini or third-party API calls?
              </p>
              <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed">
                <strong>No.</strong> Your phone does not make direct external AI API calls. All vocabulary, spaced repetition intervals, spelling tests, and pronunciation audio operate 100% locally on your phone.
              </p>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-zinc-800/80 rounded-xl space-y-1.5">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Globe size={14} className="text-blue-500" />
                Where does Gemini come into play?
              </p>
              <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed">
                The optional sentence generator runs on the server backend to generate extra practice sentences. It uses the server's own configuration, so you are never charged or asked for an API key. Even if offline, hundreds of pre-bundled Slovenian sentences are used.
              </p>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-zinc-800/80 rounded-xl space-y-1.5">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500" />
                Can I practice 100% offline with zero network requests?
              </p>
              <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed">
                <strong>Yes!</strong> Go to <em>Settings</em> and toggle <em>AI Practice Sentences</em> to OFF. The app will operate in pure offline mode using local cached sentences only.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
