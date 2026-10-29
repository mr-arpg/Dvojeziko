import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode, CheckCircle2 } from 'lucide-react';

interface AndroidCodeModalProps {
  onClose: () => void;
}

export const ANDROID_FILES: { path: string; language: string; content: string }[] = [
  {
    path: 'app/src/main/java/com/beseda/slovenian/data/WordEntity.kt',
    language: 'kotlin',
    content: `package com.beseda.slovenian.data

import androidx.room.Entity
import androidx.room.PrimaryKey

enum class CEFRLevel { A1, A2, B1, B2 }
enum class WordStatus { NEW, LEARNING, LEARNED }

@Entity(tableName = "words")
data class WordEntity(
    @PrimaryKey val rank: Int,
    val sl: String,
    val en: String,
    val level: CEFRLevel,
    val isGrammarWord: Boolean = false,
    val isReflexive: Boolean = false,
    
    // Spaced repetition state (Leitner 1..6)
    val status: WordStatus = WordStatus.NEW,
    val box: Int = 1,
    val nextDueDate: Long = System.currentTimeMillis(),
    val consecutiveCorrect: Int = 0,
    val totalReviews: Int = 0,
    val failedCount: Int = 0
)`
  },
  {
    path: 'app/src/main/java/com/beseda/slovenian/srs/LeitnerScheduler.kt',
    language: 'kotlin',
    content: `package com.beseda.slovenian.srs

import com.beseda.slovenian.data.WordEntity
import com.beseda.slovenian.data.WordStatus
import java.util.concurrent.TimeUnit

object LeitnerScheduler {
    // Leitner intervals in days: Box 1=1d, Box 2=2d, Box 3=4d, Box 4=7d, Box 5=14d, Box 6=30d
    val INTERVALS_DAYS = listOf(1, 2, 4, 7, 14, 30)
    const val MAX_DAILY_REVIEWS = 20

    fun calculateNextProgress(
        word: WordEntity,
        isCorrect: Boolean,
        isEasy: Boolean = false
    ): WordEntity {
        val newBox = when {
            !isCorrect -> 1 // Wrong answer drops back to box 1
            isEasy -> (word.box + 2).coerceAtMost(6)
            else -> (word.box + 1).coerceAtMost(6)
        }

        val intervalDays = INTERVALS_DAYS[newBox - 1]
        val nextDue = System.currentTimeMillis() + TimeUnit.DAYS.toMillis(intervalDays.toLong())

        // A word counts as "learned" from box 3 upward
        val newStatus = if (newBox >= 3) WordStatus.LEARNED else WordStatus.LEARNING

        return word.copy(
            box = newBox,
            status = newStatus,
            nextDueDate = nextDue,
            consecutiveCorrect = if (isCorrect) word.consecutiveCorrect + 1 else 0,
            failedCount = if (!isCorrect) word.failedCount + 1 else word.failedCount,
            totalReviews = word.totalReviews + 1
        )
    }

    fun prioritizeReviews(dueWords: List<WordEntity>): List<WordEntity> {
        val now = System.currentTimeMillis()
        return dueWords.sortedWith(
            compareByDescending<WordEntity> { now - it.nextDueDate } // most overdue
                .thenByDescending { it.failedCount }                 // most failed
                .thenBy { it.box }                                  // lower boxes first
        ).take(MAX_DAILY_REVIEWS)
    }
}`
  },
  {
    path: 'app/src/main/java/com/beseda/slovenian/sentences/SentenceEngine.kt',
    language: 'kotlin',
    content: `package com.beseda.slovenian.sentences

import com.beseda.slovenian.data.WordEntity

data class SentenceValidationResult(
    val isValid: Boolean,
    val coverage: Float,
    val tokens: List<TokenItem>
)

data class TokenItem(
    val token: String,
    val lemma: String?,
    val isKnown: Boolean
)

class SentenceEngine(
    private val allWords: List<WordEntity>
) {
    private val lemmaMap = allWords.associateBy { it.sl.lowercase() }

    fun validateSentence(
        sentence: String,
        allowedLemmas: Set<String>
    ): SentenceValidationResult {
        val words = sentence.split("\\\\s+".toRegex())
            .map { it.lowercase().replace("[^a-zA-ZčšžČŠŽ]".toRegex(), "") }
            .filter { it.isNotBlank() }

        if (words.isEmpty()) return SentenceValidationResult(false, 0f, emptyList())

        val tokenItems = words.map { token ->
            val lemma = lemmaMap[token]?.sl ?: findStemMatch(token)
            val isKnown = lemma != null && allowedLemmas.contains(lemma.lowercase())
            TokenItem(token, lemma, isKnown)
        }

        val knownCount = tokenItems.count { it.isKnown }
        val coverage = knownCount.toFloat() / tokenItems.size.toFloat()

        // 85% coverage threshold requirement
        return SentenceValidationResult(
            isValid = coverage >= 0.85f,
            coverage = coverage,
            tokens = tokenItems
        )
    }

    private fun findStemMatch(token: String): String? {
        if (token.length < 4) return null
        val stem = token.substring(0, 4)
        return allWords.firstOrNull { it.sl.startsWith(stem) }?.sl
    }
}`
  },
  {
    path: 'app/src/main/java/com/beseda/slovenian/ui/MainActivity.kt',
    language: 'kotlin',
    content: `package com.beseda.slovenian.ui

import android.os.Bundle
import android.speech.tts.TextToSpeech
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.*
import androidx.compose.runtime.*
import java.util.Locale

class MainActivity : ComponentActivity(), TextToSpeech.OnInitListener {
    private var tts: TextToSpeech? = null
    private var ttsReady by mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        tts = TextToSpeech(this, this)

        setContent {
            MaterialTheme(colorScheme = lightColorScheme()) {
                BesedaAppRoot(
                    onPlayAudio = { text ->
                        if (ttsReady) {
                            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "beseda_tts")
                        }
                    }
                )
            }
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale("sl", "SI"))
            ttsReady = result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED
        }
    }

    override fun onDestroy() {
        tts?.shutdown()
        super.onDestroy()
    }
}`
  }
];

export const AndroidCodeModal: React.FC<AndroidCodeModalProps> = ({ onClose }) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentFile = ANDROID_FILES[selectedFileIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCode className="text-emerald-600" />
              Android Kotlin + Jetpack Compose Architecture
            </h3>
            <span className="text-xs text-slate-500 dark:text-zinc-400">
              Native MVVM, Room Entity, Leitner Scheduler, and Sentence Validation
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* File Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-3">
          {ANDROID_FILES.map((file, idx) => (
            <button
              key={file.path}
              type="button"
              onClick={() => setSelectedFileIndex(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${selectedFileIndex === idx ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'}`}
            >
              {file.path.split('/').pop()}
            </button>
          ))}
        </div>

        {/* Code View */}
        <div className="relative flex-1 overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-xs font-mono text-slate-400">
            <span>{currentFile.path}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-400" /> Copied!
                </>
              ) : (
                <>
                  <Copy size={14} /> Copy Kotlin Code
                </>
              )}
            </button>
          </div>
          <pre className="flex-1 overflow-auto p-4 font-mono text-xs text-emerald-300/90 leading-relaxed">
            {currentFile.content}
          </pre>
        </div>

        {/* Footer */}
        <div className="pt-4 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-zinc-400">
            Copy into Android Studio or build on top of Dvojeziko.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
