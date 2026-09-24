import React, { useState, useEffect, useMemo } from 'react';
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
  const { data: notes = [] } = useNotes();
  const { setActiveNoteId } = useNoteStore();

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  // Dynamically extract real flashcards from user's actual notes
  const handleGenerateCardsFromNotes = () => {
    if (!notes || notes.length === 0 || isGenerating) return;
    setIsGenerating(true);
    soundEngine.playClick();

    const newCards: Flashcard[] = [];
    notes.forEach((note) => {
      const lines = note.content.split('\n').filter((l) => l.trim().length > 5);
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
          if (nextLine && !nextLine.startsWith('#') && nextLine.trim().length > 10) {
            newCards.push({
              id: `${note.id}-${i}`,
              question: `What are the key points of: "${line.replace(/^#+\s*/, '').trim()}"?`,
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
      setCards(newCards);
      soundEngine.playSuccessTone();
    }
    setIsGenerating(false);
  };

  // Attempt to generate from notes on initial mount
  useEffect(() => {
    if (notes && notes.length > 0 && cards.length === 0) {
      handleGenerateCardsFromNotes();
    }
  }, [notes]);

  const currentCard = cards[currentIndex];

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

    if (rating !== 'again') {
      setStreak((prev) => prev + 1);
    } else {
      setStreak(0);
    }

    setIsFlipped(false);
    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setSessionCompleted(true);
    }
  };

  const handleResetSession = () => {
    soundEngine.playClick();
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionCompleted(false);
    setScore({ correct: 0, total: 0 });
  };

  const handleJumpToNote = (noteId: string) => {
    soundEngine.playClick();
    setActiveNoteId(noteId);
    if (onNavigate) onNavigate('editor');
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (isFlipped) {
        if (e.key === '1') handleGrade('again');
        if (e.key === '2') handleGrade('hard');
        if (e.key === '3') handleGrade('good');
        if (e.key === '4') handleGrade('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentIndex, cards]);

  return (
    <div className="page-container flex flex-col justify-between h-full overflow-y-auto animate-in fade-in duration-200">
      {/* Workspace Header */}
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="page-title flex items-center gap-2">
              <Brain className="w-6 h-6 text-[#0A84FF]" />
              Study & Recall
            </h1>
            <div className="flex items-center gap-2">
              <span className="badge-blue flex items-center gap-1">
                <Layers size={11} />
                {cards.length} cards
              </span>
              {streak > 0 && (
                <span className="badge-gold flex items-center gap-1">
                  <Flame size={11} className="text-[#FF9F0A]" />
                  {streak} streak
                </span>
              )}
            </div>
          </div>
          <p className="page-subtitle">
            Spaced repetition memory review generated from your knowledge vault notes.
          </p>
        </div>

        {/* Generate / Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleGenerateCardsFromNotes}
            disabled={isGenerating || notes.length === 0}
            className="btn-primary"
            title="Scan your notes for 'Question :: Answer' or key concepts to build cards"
          >
            <Sparkles size={13} />
            <span>{isGenerating ? 'Scanning Notes...' : 'Extract From Notes'}</span>
          </button>
        </div>
      </div>

      {/* Main Review Zone */}
      {cards.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center card-surface my-6">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#86868B] mb-4">
            <Brain size={26} />
          </div>
          <h2 className="text-base font-semibold text-[#F5F5F7] mb-1.5 tracking-tight">
            No Study Cards in Deck
          </h2>
          <p className="text-xs text-[#86868B] max-w-md mb-6 leading-relaxed">
            Add{' '}
            <code className="text-[#0A84FF] font-mono bg-white/[0.06] px-1.5 py-0.5 rounded">
              Question :: Answer
            </code>{' '}
            syntax or section headers in your notes to automatically generate flashcard decks.
          </p>
          <button
            onClick={handleGenerateCardsFromNotes}
            disabled={isGenerating || notes.length === 0}
            className="btn-primary"
          >
            <Sparkles size={13} />
            <span>Scan Notes for Flashcards</span>
          </button>
        </div>
      ) : !sessionCompleted && currentCard ? (
        <div className="flex-1 flex flex-col items-center justify-center my-4">
          {/* Card Progress Indicator */}
          <div className="w-full max-w-lg flex items-center justify-between text-xs text-[#86868B] font-mono mb-3">
            <span>
              Card {currentIndex + 1} of {cards.length}
            </span>
            <span className="text-[#0A84FF]">SRS Interval: {currentCard.intervalDays}d</span>
          </div>

          {/* 3D Flipping Card Container */}
          <div
            onClick={handleFlip}
            className="w-full max-w-lg min-h-[280px] p-8 rounded-3xl bg-[#141418] hover:bg-[#1A1A20] border border-white/[0.08] hover:border-white/[0.16] shadow-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between relative group"
            style={{
              boxShadow: isFlipped
                ? '0 16px 40px rgba(0,0,0,0.8), 0 0 24px rgba(0, 113, 227, 0.2)'
                : '0 12px 32px rgba(0,0,0,0.7)',
            }}
          >
            {/* Top Card Badge */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span
                className={`px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[10px] font-bold ${
                  isFlipped
                    ? 'bg-[#0071E3]/20 text-[#0A84FF] border border-[#0071E3]/40'
                    : 'bg-white/[0.08] text-[#F5F5F7] border border-white/[0.1]'
                }`}
              >
                {isFlipped ? 'Answer' : 'Question / Prompt'}
              </span>

              <span className="text-[#86868B] group-hover:text-white transition-colors text-[11px]">
                Click or Space to Flip ⟳
              </span>
            </div>

            {/* Card Content Body */}
            <div className="py-6 text-center">
              <h2 className="text-lg md:text-xl font-bold text-[#F5F5F7] leading-relaxed font-sans tracking-tight">
                {isFlipped ? currentCard.answer : currentCard.question}
              </h2>
            </div>

            {/* Bottom Card Meta & Source Link */}
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#86868B] font-mono">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleJumpToNote(currentCard.sourceNoteId);
                }}
                className="flex items-center gap-1.5 text-[#0A84FF] hover:text-[#5E5CE6] cursor-pointer hover:underline"
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
                className="py-2.5 rounded-2xl bg-[#FF453A]/15 hover:bg-[#FF453A]/25 border border-[#FF453A]/30 text-[#FF453A] text-xs font-mono font-bold transition-all shadow-sm flex flex-col items-center"
              >
                <span>Again</span>
                <span className="text-[9px] text-[#FF453A]/80 font-normal mt-0.5">&lt; 1d</span>
              </button>

              <button
                onClick={() => handleGrade('hard')}
                className="py-2.5 rounded-2xl bg-[#FF9F0A]/15 hover:bg-[#FF9F0A]/25 border border-[#FF9F0A]/30 text-[#FF9F0A] text-xs font-mono font-bold transition-all shadow-sm flex flex-col items-center"
              >
                <span>Hard</span>
                <span className="text-[9px] text-[#FF9F0A]/80 font-normal mt-0.5">3d</span>
              </button>

              <button
                onClick={() => handleGrade('good')}
                className="py-2.5 rounded-2xl bg-[#0071E3]/15 hover:bg-[#0071E3]/25 border border-[#0071E3]/30 text-[#0A84FF] text-xs font-mono font-bold transition-all shadow-sm flex flex-col items-center"
              >
                <span>Good</span>
                <span className="text-[9px] text-[#0A84FF]/80 font-normal mt-0.5">7d</span>
              </button>

              <button
                onClick={() => handleGrade('easy')}
                className="py-2.5 rounded-2xl bg-[#30D158]/15 hover:bg-[#30D158]/25 border border-[#30D158]/30 text-[#30D158] text-xs font-mono font-bold transition-all shadow-sm flex flex-col items-center"
              >
                <span>Easy</span>
                <span className="text-[9px] text-[#30D158]/80 font-normal mt-0.5">14d</span>
              </button>
            </div>
          ) : (
            <div className="mt-6">
              <button
                onClick={handleFlip}
                className="px-6 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-[#F5F5F7] text-xs font-mono transition-all"
              >
                Show Answer (Spacebar)
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Session Completed Screen */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-6 card-surface">
          <div className="w-16 h-16 rounded-2xl bg-[#30D158]/15 border border-[#30D158]/30 flex items-center justify-center text-[#30D158] mb-4 shadow-[0_0_24px_rgba(48,209,88,0.3)]">
            <Award size={32} />
          </div>
          <h2 className="text-xl font-bold text-[#F5F5F7] font-sans mb-1 tracking-tight">
            Knowledge Review Complete!
          </h2>
          <p className="text-xs text-[#86868B] max-w-md mb-6 font-sans">
            You've reviewed all cards in this active recall deck.
          </p>

          <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-6">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
              <span className="text-[10px] font-mono text-[#86868B] uppercase">Cards Reviewed</span>
              <p className="text-xl font-bold text-[#F5F5F7] font-mono mt-0.5">{score.total}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
              <span className="text-[10px] font-mono text-[#86868B] uppercase">Accuracy Rate</span>
              <p className="text-xl font-bold text-[#30D158] font-mono mt-0.5">
                {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 100}%
              </p>
            </div>
          </div>

          <button onClick={handleResetSession} className="btn-primary">
            <RefreshCw size={13} />
            <span>Review Deck Again</span>
          </button>
        </div>
      )}

      {/* Footer Navigation Bar */}
      <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#86868B] font-mono">
        <span>Active Deck: {cards.length} cards</span>
        <span>Keyboard: Space to flip, 1-4 to grade</span>
      </div>
    </div>
  );
}
