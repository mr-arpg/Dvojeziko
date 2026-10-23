import React from 'react';
import { Volume2, Sparkles, Check, X, ArrowLeft } from 'lucide-react';
import { playSlovenianAudio } from '../tts/audioService';
import { WordStatus, CEFRLevel } from '../data/types';

interface AudioButtonProps {
  text: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const AudioButton: React.FC<AudioButtonProps> = ({
  text,
  size = 'md',
  className = '',
  label,
}) => {
  const [isPlaying, setIsPlaying] = React.useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(true);
    playSlovenianAudio(text);
    setTimeout(() => setIsPlaying(false), 900);
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  }[size];

  const iconSizes = {
    sm: 15,
    md: 18,
    lg: 22,
  }[size];

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Pronounce ${text}`}
      className={`inline-flex items-center justify-center rounded-full transition-transform active:scale-95 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800/60 shadow-xs cursor-pointer ${sizeClasses} ${className} ${isPlaying ? 'scale-110 ring-2 ring-emerald-500' : ''}`}
    >
      <Volume2 size={iconSizes} className={isPlaying ? 'animate-pulse' : ''} />
      {label && <span className="ml-2 font-medium">{label}</span>}
    </button>
  );
};

export const CEFRBadge: React.FC<{ level: CEFRLevel }> = ({ level }) => {
  const colors: Record<CEFRLevel, string> = {
    A1: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    A2: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    B1: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    B2: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800',
  };

  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full border ${colors[level] || 'bg-slate-100 text-slate-800'}`}>
      {level}
    </span>
  );
};

export const StatusChip: React.FC<{ status: WordStatus; box?: number }> = ({ status, box }) => {
  if (status === 'learned') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
        <Check size={12} className="stroke-[3]" /> Learned {box ? `(B${box})` : ''}
      </span>
    );
  }
  if (status === 'learning') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
        <Sparkles size={12} /> Learning {box ? `(B${box})` : ''}
      </span>
    );
  }
  return (
    <span className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-200/70 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400">
      New
    </span>
  );
};

export const ProgressRing: React.FC<{
  current: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}> = ({ current, total, size = 160, strokeWidth = 14 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min(100, Math.max(0, (current / total) * 100));
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200 dark:text-zinc-800"
          fill="transparent"
        />
        {/* Active progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-emerald-600 dark:text-emerald-400 transition-all duration-700 ease-out"
          fill="transparent"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
          {current}
        </span>
        <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
          / {total} words
        </span>
        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mt-0.5">
          {Math.round(percentage)}% Mastered
        </span>
      </div>
    </div>
  );
};

/**
 * On-screen Slovenian Special Character Bar (č, š, ž, dž)
 */
export const SlovenianKeyboardBar: React.FC<{
  onInsertChar: (char: string) => void;
}> = ({ onInsertChar }) => {
  const specialChars = ['č', 'š', 'ž', 'dž'];

  return (
    <div className="flex items-center justify-center gap-2 py-1.5 px-3 bg-slate-100 dark:bg-zinc-800/80 rounded-2xl border border-slate-200 dark:border-zinc-700/60 shadow-xs">
      <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mr-1 select-none">
        Slovenian keys:
      </span>
      {specialChars.map(char => (
        <button
          key={char}
          type="button"
          onClick={() => onInsertChar(char)}
          className="w-10 h-10 flex items-center justify-center bg-white dark:bg-zinc-700 hover:bg-emerald-50 dark:hover:bg-zinc-600 text-slate-900 dark:text-white font-bold text-lg rounded-xl shadow-xs border border-slate-300 dark:border-zinc-600 active:scale-90 transition-all cursor-pointer"
        >
          {char}
        </button>
      ))}
    </div>
  );
};
