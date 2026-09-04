import React, { useState, useMemo } from 'react';
import {
  Brain,
  Sparkles,
  RotateCw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  Layers,
  ArrowRight,
  Flame,
  Plus,
  RefreshCw,
  BookOpen,
  Volume2
} from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { useNoteStore } from '../store/noteStore';
import { soundEngine } from '../utils/soundEngine';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  sourceNoteTitle: string;
  sourceNoteId: string;
  intervalDays: number;
  reviewedCount: number;
}

export default function FlashcardsPage({ onNavigate }: { onNavigate?: (page: 'editor') => void }) {
  const { data: notes } = useNotes();
  const { setActiveNoteId } = useNoteStore();

  const [cards, setCards] = useState<Flashcard[]>([
    {
      id: '1',
      question: 'What is the primary role of ChromaDB in Neuro?',
      answer: 'ChromaDB serves as the local-first vector store for semantic embeddings and similarity retrieval across notes.',
      sourceNoteTitle: 'Welcome to Neuro',
      sourceNoteId: '1',
      intervalDays: 1,
      reviewedCount: 0,
    },
    {
      id: '2',
      question: 'What global shortcut summons the tactical JARVIS HUD overlay?',
      answer: 'Ctrl + Space or Alt + Space',
      sourceNoteTitle: 'System Settings',
      sourceNoteId: 'settings',
      intervalDays: 3,
      reviewedCount: 1,
    },
    {
      id: '3',
      question: 'How do you create bi-directional links between concepts in Neuro?',
      answer: 'Use the double bracket syntax: [[Note Title]] to automatically generate backlinks in the knowledge graph.',
      sourceNoteTitle: 'Bi-directional Linking',
      sourceNoteId: '2',
      intervalDays: 7,
      reviewedCount: 2,
    },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streak, setStreak] = useState(3);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const currentCard = cards[currentIndex];

  // Auto-generate flashcards from user notes
  const handleGenerateCardsFromNotes = async () => {
    if (!notes || notes.length === 0 || isGenerating) return;
    setIsGenerating(true);
    soundEngine.playClick();

    const newCards: Flashcard[] = [];
    notes.forEach((note) => {
      const lines = note.content.split('\n').filter(l => l.trim().length > 10);
      lines.forEach((line, i) => {
        if (line.includes('::')) {
          const [q, a] = line.split('::');
          if (q && a) {
            newCards.push({
              id: `${note.id}-${i}`,
              question: q.replace(/^[-*#]+\s*/, '').trim(),
              answer: a.trim(),
              sourceNoteTitle: note.title,
              sourceNoteId: note.id,
              intervalDays: 1,
              reviewedCount: 0,
            });
          }
        } else if (line.startsWith('### ') || line.startsWith('## ')) {
          const nextLine = lines[i + 1];
          if (nextLine && !nextLine.startsWith('#')) {
            newCards.push({
              id: `${note.id}-${i}`,
              question: `What are the details of: "${line.replace(/^#+\s*/, '').trim()}"?`,
              answer: nextLine.replace(/^[-*]+\s*/, '').trim(),
              sourceNoteTitle: note.title,
              sourceNoteId: note.id,
              intervalDays: 1,
              reviewedCount: 0,
            });
          }
        }
      });
    });

    if (newCards.length > 0) {
      setCards((prev) => [...newCards, ...prev]);
      soundEngine.playSuccessTone();
    }
    setIsGenerating(false);
  };

  const handleFlip = () => {
    soundEngine.playClick();
    setIsFlipped(!isFlipped);
  };

  const handleGrade = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    soundEngine.playSuccessTone();
    setScore((prev) => ({
      correct: rating !== 'again' ? prev.correct + 1 : prev.correct,
      total: prev.total + 1,
    }));

    if (currentIndex + 1 < cards.length) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    } else {
      setSessionCompleted(true);
      setStreak(prev => prev + 1);
    }
  };

  const handleResetSession = () => {
    soundEngine.playWakeChime();
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionCompleted(false);
    setScore({ correct: 0, total: 0 });
  };

  const handleJumpToNote = (noteId: string) => {
    setActiveNoteId(noteId);
    if (onNavigate) onNavigate('editor');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto h-full flex flex-col justify-between select-none font-sans overflow-y-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Brain size={16} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white font-sans">
                Active Recall & Spaced Repetition (SRS)
              </h1>
              <p className="text-xs text-zinc-400 font-sans">
                Review key concepts, formulas, and connections synthesized from your second brain.
              </p>
            </div>
          </div>
        </div>

        {/* Streak & Generator Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs shadow-sm">
            <Flame size={14} className="text-amber-400 animate-pulse" />
            <span>{streak} Day Streak</span>
          </div>

          <button
            onClick={handleGenerateCardsFromNotes}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-sans text-xs font-semibold shadow-[0_0_15px_rgba(20, 184, 166,0.3)] transition-all"
            title="Generate flashcards from note definitions (::) and headers"
          >
            <Sparkles size={13} className={isGenerating ? 'animate-spin' : ''} />
            <span>Generate from Notes</span>
          </button>
        </div>
      </div>

      {/* Main Review Card Canvas */}
      {!sessionCompleted && currentCard ? (
        <div className="flex-1 flex flex-col items-center justify-center my-4">
          {/* Card Progress Indicator */}
          <div className="w-full max-w-lg flex items-center justify-between text-xs text-zinc-500 font-mono mb-3">
            <span>Card {currentIndex + 1} of {cards.length}</span>
            <span className="text-teal-400">SRS Interval: {currentCard.intervalDays}d</span>
          </div>

          {/* 3D Flipping Card Container */}
          <div
            onClick={handleFlip}
            className="w-full max-w-lg min-h-[300px] p-8 rounded-3xl bg-[#0d101d] hover:bg-[#111526] border border-white/[0.08] hover:border-teal-500/40 shadow-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between relative group"
            style={{
              boxShadow: isFlipped
                ? '0 16px 40px rgba(0,0,0,0.8), 0 0 24px rgba(20, 184, 166,0.2)'
                : '0 12px 32px rgba(0,0,0,0.7)',
            }}
          >
            {/* Top Card Badge */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className={`px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[10px] font-bold ${
                isFlipped ? 'bg-teal-950/80 text-teal-300 border border-teal-500/40' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
              }`}>
                {isFlipped ? 'Answer' : 'Question / Prompt'}
              </span>

              <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors text-[11px]">
                Click or Space to Flip ⟳
              </span>
            </div>

            {/* Card Content Body */}
            <div className="py-6 text-center">
              <h2 className="text-lg md:text-xl font-bold text-white leading-relaxed font-sans">
                {isFlipped ? currentCard.answer : currentCard.question}
              </h2>
            </div>

            {/* Bottom Card Meta & Source Link */}
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleJumpToNote(currentCard.sourceNoteId);
                }}
                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-200 cursor-pointer hover:underline"
              >
                <BookOpen size={11} />
                <span>Source: {currentCard.sourceNoteTitle}</span>
              </div>

              <span>Reviews: {currentCard.reviewedCount}</span>
            </div>
          </div>

          {/* Rating / Grading Action Row */}
          {isFlipped ? (
            <div className="w-full max-w-lg grid grid-cols-4 gap-2.5 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <button
                onClick={() => handleGrade('again')}
                className="py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold transition-all shadow-sm flex flex-col items-center"
              >
                <span>Again</span>
                <span className="text-[9px] text-rose-400/80 font-normal mt-0.5">&lt; 1d</span>
              </button>

              <button
                onClick={() => handleGrade('hard')}
                className="py-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold transition-all shadow-sm flex flex-col items-center"
              >
                <span>Hard</span>
                <span className="text-[9px] text-amber-400/80 font-normal mt-0.5">3d</span>
              </button>

              <button
                onClick={() => handleGrade('good')}
                className="py-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold transition-all shadow-sm flex flex-col items-center"
              >
                <span>Good</span>
                <span className="text-[9px] text-emerald-400/80 font-normal mt-0.5">7d</span>
              </button>

              <button
                onClick={() => handleGrade('easy')}
                className="py-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold transition-all shadow-sm flex flex-col items-center"
              >
                <span>Easy</span>
                <span className="text-[9px] text-emerald-400/80 font-normal mt-0.5">14d</span>
              </button>
            </div>
          ) : (
            <div className="mt-6">
              <button
                onClick={handleFlip}
                className="px-6 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-zinc-200 text-xs font-mono transition-all"
              >
                Show Answer (Spacebar)
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Session Completed Screen */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-8">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 mb-4 shadow-[0_0_24px_rgba(20, 184, 166,0.3)]">
            <Award size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white font-sans mb-1">
            Knowledge Session Complete!
          </h2>
          <p className="text-xs text-zinc-400 max-w-md mb-6 font-sans">
            You've reviewed all cards in this deck. Your spaced repetition intervals have been recorded locally.
          </p>

          <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-6">
            <div className="p-4 rounded-2xl bg-[#0c0f18] border border-white/[0.06] text-center">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Cards Reviewed</span>
              <p className="text-xl font-bold text-white font-mono mt-0.5">{score.total}</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#0c0f18] border border-white/[0.06] text-center">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Accuracy Rate</span>
              <p className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 100}%
              </p>
            </div>
          </div>

          <button
            onClick={handleResetSession}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold font-sans shadow-[0_0_20px_rgba(20, 184, 166,0.3)] transition-all"
          >
            <RefreshCw size={13} />
            <span>Review Deck Again</span>
          </button>
        </div>
      )}

      {/* Footer Navigation Bar */}
      <div className="pt-4 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
        <span>Active Deck: General Knowledge ({cards.length} cards)</span>
        <span>Keyboard: Space to flip, 1-4 to grade</span>
      </div>
    </div>
  );
}
