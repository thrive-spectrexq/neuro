import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Sparkles, 
  RotateCw, 
  CheckCircle2, 
  Layers, 
  Trophy, 
  BrainCircuit, 
  Search, 
  Plus, 
  BookOpen, 
  HelpCircle, 
  Check, 
  Flame,
  ArrowRight
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Flashcard {
  id: string;
  noteId: string;
  noteTitle: string;
  front: string;
  back: string;
  cardType: 'qa' | 'cloze';
  easeFactor: number;
  repetitions: number;
  intervalDays: number;
  dueDate: string;
  lastReviewedAt?: string;
}

export function SpacedRepetitionStudio() {
  const token = useAuthStore((state) => state.token);

  // Fetch real vault notes from backend
  const { data: notes = [] } = useQuery<NoteItem[]>({
    queryKey: ['notes'],
    queryFn: async () => {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/v1/notes', { headers });
      if (!res.ok) {
        throw new Error('Failed to fetch notes');
      }
      return res.json();
    },
  });

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterMode, setFilterMode] = useState<'due' | 'all' | 'mastered'>('due');
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0);
  const [streakDays] = useState(7);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState('');

  // Extract cards from vault notes automatically
  const extractCardsFromNotes = useCallback(() => {
    const extracted: Flashcard[] = [];
    const now = new Date().toISOString();

    notes.forEach((note: NoteItem) => {
      const content = note.content || '';
      const lines = content.split('\n');

      // 1. Parse inline Q::A
      lines.forEach((line: string, idx: number) => {
        const trimmed = line.trim();
        if (trimmed.includes('::') && !trimmed.startsWith('#')) {
          const parts = trimmed.split('::');
          if (parts.length >= 2 && parts[0]?.trim() && parts[1]?.trim()) {
            extracted.push({
              id: `${note.id}_qa_${idx}`,
              noteId: note.id,
              noteTitle: note.title,
              front: parts[0].trim(),
              back: parts.slice(1).join('::').trim(),
              cardType: 'qa',
              easeFactor: 2.5,
              repetitions: 0,
              intervalDays: 0,
              dueDate: now,
            });
          }
        }
      });

      // 2. Parse Cloze highlights ==answer==
      const clozeRegex = /([^\n.!?]*==([^=]+)==[^\n.!?]*)/g;
      let match: RegExpExecArray | null;
      let clozeIdx = 0;
      while ((match = clozeRegex.exec(content)) !== null) {
        const fullSentence = (match[1] || '').trim();
        const answer = (match[2] || '').trim();
        if (answer && fullSentence.length > answer.length) {
          const clozeFront = fullSentence.replace(`==${answer}==`, '[ ... ]');
          extracted.push({
            id: `${note.id}_cloze_${clozeIdx++}`,
            noteId: note.id,
            noteTitle: note.title,
            front: `Complete the sentence from "${note.title}":\n\n${clozeFront}`,
            back: answer,
            cardType: 'cloze',
            easeFactor: 2.5,
            repetitions: 0,
            intervalDays: 0,
            dueDate: now,
          });
        }
      }
    });

    // If no explicit syntax is present in notes yet, generate default study deck
    if (extracted.length === 0) {
      notes.slice(0, 5).forEach((n: NoteItem, i: number) => {
        extracted.push({
          id: `sample_${i}`,
          noteId: n.id,
          noteTitle: n.title,
          front: `What are the core concepts covered in [[${n.title}]]?`,
          back: n.content?.slice(0, 200) || 'Key takeaways from this note.',
          cardType: 'qa',
          easeFactor: 2.5,
          repetitions: 1,
          intervalDays: 1,
          dueDate: now,
        });
      });
    }

    setCards(extracted);
  }, [notes]);

  useEffect(() => {
    extractCardsFromNotes();
  }, [extractCardsFromNotes]);

  // Filtered Cards Deck
  const activeDeck = useMemo(() => {
    return cards.filter((card) => {
      const matchesSearch = 
        card.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.back.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.noteTitle.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterMode === 'mastered') return card.repetitions >= 4;
      if (filterMode === 'due') {
        const due = new Date(card.dueDate);
        return due <= new Date() || card.repetitions === 0;
      }
      return true;
    });
  }, [cards, filterMode, searchQuery]);

  const currentCard = activeDeck[currentCardIndex] || null;

  // SuperMemo-2 rating handler
  const handleRating = (quality: number) => {
    if (!currentCard) return;

    // SM-2 Calculation
    let newInterval = 1;
    let newReps = currentCard.repetitions;
    let newEase = currentCard.easeFactor;

    if (quality >= 3) {
      if (newReps === 0) newInterval = 1;
      else if (newReps === 1) newInterval = 6;
      else newInterval = Math.max(1, Math.round(currentCard.intervalDays * newEase));
      newReps += 1;
    } else {
      newInterval = 1;
      newReps = 0;
    }

    newEase = Math.max(1.3, Number((newEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))).toFixed(2)));
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + newInterval);

    // Update in local state
    setCards((prev) =>
      prev.map((c) =>
        c.id === currentCard.id
          ? {
              ...c,
              easeFactor: newEase,
              repetitions: newReps,
              intervalDays: newInterval,
              dueDate: nextDue.toISOString(),
              lastReviewedAt: new Date().toISOString(),
            }
          : c
      )
    );

    setIsFlipped(false);
    setSessionReviewedCount((prev) => prev + 1);

    if (currentCardIndex < activeDeck.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      setCurrentCardIndex(0);
    }
  };

  // Keyboard navigation for power users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped) {
        if (e.key === '1') handleRating(1);
        if (e.key === '2') handleRating(2);
        if (e.key === '3') handleRating(4);
        if (e.key === '4') handleRating(5);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentCard]);

  // Handle manual card addition
  const handleAddManualCard = () => {
    if (!newFront.trim() || !newBack.trim()) return;
    const note = notes.find((n: NoteItem) => n.id === selectedNoteId) || notes[0];

    const newCard: Flashcard = {
      id: `manual_${Date.now()}`,
      noteId: note?.id || 'manual',
      noteTitle: note?.title || 'Manual Flashcard',
      front: newFront.trim(),
      back: newBack.trim(),
      cardType: 'qa',
      easeFactor: 2.5,
      repetitions: 0,
      intervalDays: 0,
      dueDate: new Date().toISOString(),
    };

    setCards((prev) => [newCard, ...prev]);
    setNewFront('');
    setNewBack('');
    setIsAddingCard(false);
  };

  const masteredCount = cards.filter((c) => c.repetitions >= 4).length;
  const learningCount = cards.filter((c) => c.repetitions < 4).length;
  const dueCount = cards.filter((c) => new Date(c.dueDate) <= new Date() || c.repetitions === 0).length;
  const retentionPct = cards.length > 0 ? Math.round((masteredCount / cards.length) * 100) : 100;

  return (
    <div className="h-full flex flex-col bg-[#090A0F] text-slate-100 font-sans select-none overflow-y-auto">
      {/* Top Banner & Stats Overview */}
      <div className="p-4 border-b border-[#1F2433] bg-[#0F1117]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-[#18162B] border border-[#302856] rounded-md text-indigo-400">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold tracking-wide font-mono text-white flex items-center gap-2">
                  Spaced Repetition & Knowledge Retention
                  <span className="px-1.5 py-0.2 text-[9px] font-mono bg-[#18162B] text-indigo-300 border border-[#302856] rounded">
                    SM-2
                  </span>
                </h2>
                <p className="text-[10px] text-[#64748B] font-mono">
                  Active recall deck parsed from <code className="text-indigo-300 bg-[#141722] px-1 rounded">Question::Answer</code> and <code className="text-indigo-300 bg-[#141722] px-1 rounded">==cloze==</code>
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stat Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#2B1B10] border border-[#4D2E14] rounded-md">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <div className="text-[10px] font-mono">
                <span className="text-[#64748B]">Streak: </span>
                <strong className="text-amber-300">{streakDays}d</strong>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#102319] border border-[#1B432C] rounded-md">
              <Trophy className="w-3.5 h-3.5 text-emerald-400" />
              <div className="text-[10px] font-mono">
                <span className="text-[#64748B]">Retention: </span>
                <strong className="text-emerald-300">{retentionPct}%</strong>
              </div>
            </div>

            <button
              onClick={() => setIsAddingCard(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-md text-xs font-mono font-medium transition-colors shadow-sm"
            >
              <Plus className="w-3 h-3" />
              <span>Add Card</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-3">
          <div className="p-2.5 bg-[#090A0F] border border-[#1F2433] rounded-md flex items-center justify-between">
            <div>
              <span className="text-[9px] text-[#64748B] font-mono uppercase">Due Today</span>
              <p className="text-sm font-mono font-bold text-amber-400">{dueCount}</p>
            </div>
            <div className="p-1 bg-[#2B1B10] rounded text-amber-400 border border-[#4D2E14]">
              <RotateCw className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="p-2.5 bg-[#090A0F] border border-[#1F2433] rounded-md flex items-center justify-between">
            <div>
              <span className="text-[9px] text-[#64748B] font-mono uppercase">Learning Cards</span>
              <p className="text-sm font-mono font-bold text-sky-400">{learningCount}</p>
            </div>
            <div className="p-1 bg-[#121E2E] rounded text-sky-400 border border-[#1B324D]">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="p-2.5 bg-[#090A0F] border border-[#1F2433] rounded-md flex items-center justify-between">
            <div>
              <span className="text-[9px] text-[#64748B] font-mono uppercase">Mastered Cards</span>
              <p className="text-sm font-mono font-bold text-emerald-400">{masteredCount}</p>
            </div>
            <div className="p-1 bg-[#102319] rounded text-emerald-400 border border-[#1B432C]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="p-2.5 bg-[#090A0F] border border-[#1F2433] rounded-md flex items-center justify-between">
            <div>
              <span className="text-[9px] text-[#64748B] font-mono uppercase">Session Reviews</span>
              <p className="text-sm font-mono font-bold text-indigo-400">{sessionReviewedCount}</p>
            </div>
            <div className="p-1 bg-[#18162B] rounded text-indigo-400 border border-[#302856]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Review Area */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col items-center justify-center">
        {/* Deck Filter Tabs & Search */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-2.5 mb-4">
          <div className="flex items-center gap-1 p-0.5 bg-[#090A0F] border border-[#1F2433] rounded-md">
            <button
              onClick={() => { setFilterMode('due'); setCurrentCardIndex(0); setIsFlipped(false); }}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                filterMode === 'due'
                  ? 'bg-[#4F46E5] text-white shadow-sm'
                  : 'text-[#64748B] hover:text-white'
              }`}
            >
              Due ({dueCount})
            </button>
            <button
              onClick={() => { setFilterMode('all'); setCurrentCardIndex(0); setIsFlipped(false); }}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                filterMode === 'all'
                  ? 'bg-[#4F46E5] text-white shadow-sm'
                  : 'text-[#64748B] hover:text-white'
              }`}
            >
              All ({cards.length})
            </button>
            <button
              onClick={() => { setFilterMode('mastered'); setCurrentCardIndex(0); setIsFlipped(false); }}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                filterMode === 'mastered'
                  ? 'bg-[#4F46E5] text-white shadow-sm'
                  : 'text-[#64748B] hover:text-white'
              }`}
            >
              Mastered ({masteredCount})
            </button>
          </div>

          <div className="relative w-full md:w-60">
            <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search cards in deck..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#090A0F] border border-[#1F2433] rounded-md text-xs text-slate-200 placeholder-[#475569] focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        {/* 3D Flip Card Container */}
        {currentCard ? (
          <div className="w-full flex flex-col items-center gap-4">
            {/* Card Progress Indicator */}
            <div className="w-full flex items-center justify-between text-[11px] font-mono text-[#64748B]">
              <span>Card {currentCardIndex + 1} of {activeDeck.length}</span>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.2 text-[9px] font-mono bg-[#090A0F] border border-[#1F2433] rounded text-slate-400">
                  Ease: {currentCard.easeFactor}x
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-mono bg-[#090A0F] border border-[#1F2433] rounded text-slate-400">
                  Reps: {currentCard.repetitions}
                </span>
              </div>
            </div>

            {/* Interactive Flashcard Card */}
            <div
              onClick={() => setIsFlipped((prev) => !prev)}
              className="w-full min-h-[280px] p-6 bg-[#0F1117] border border-[#1F2433] hover:border-[#2E364B] rounded-lg shadow-xl flex flex-col justify-between cursor-pointer transition-colors duration-200 relative group overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <Layers className="w-20 h-20 text-indigo-400" />
              </div>

              {/* Card Meta Header */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.2 text-[9px] font-mono uppercase bg-[#18162B] text-indigo-300 border border-[#302856] rounded">
                    {currentCard.cardType === 'cloze' ? 'Cloze' : 'Q&A'}
                  </span>
                  <span className="text-[11px] font-mono text-[#64748B] flex items-center gap-1">
                    source: <strong className="text-slate-300">[[{currentCard.noteTitle}]]</strong>
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#64748B]">Space to flip</span>
              </div>

              {/* Card Content Area */}
              <div className="my-4 z-10">
                {!isFlipped ? (
                  <div>
                    <span className="text-[9px] font-mono uppercase text-indigo-400 block mb-1.5">
                      Prompt / Question
                    </span>
                    <p className="text-base md:text-lg font-mono text-slate-100 leading-relaxed whitespace-pre-wrap">
                      {currentCard.front}
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="text-[9px] font-mono uppercase text-emerald-400 block mb-1.5 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Verified Answer
                    </span>
                    <div className="p-3 bg-[#102319] border border-[#1B432C] rounded-md">
                      <p className="text-base md:text-lg font-mono text-emerald-200 leading-relaxed whitespace-pre-wrap">
                        {currentCard.back}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Card Footer */}
              <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B] pt-3 border-t border-[#1F2433] z-10">
                <span>Interval: {currentCard.intervalDays}d</span>
                <span className="flex items-center gap-1 text-indigo-300 font-mono">
                  {isFlipped ? 'Answer Revealed' : 'Click to Reveal'}
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* SM-2 Quality Rating Buttons */}
            {isFlipped ? (
              <div className="w-full flex flex-col items-center gap-2">
                <span className="text-[10px] font-mono text-[#64748B]">Rate recall grade:</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
                  <button
                    onClick={() => handleRating(1)}
                    className="p-2.5 bg-[#0F1117] hover:bg-[#181216] border border-[#1F2433] hover:border-rose-900 rounded-md text-left transition-colors"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-rose-400 font-mono">1. Again</span>
                      <kbd className="px-1 py-0.2 text-[9px] bg-[#2B1215] text-rose-300 rounded font-mono">1</kbd>
                    </div>
                    <span className="text-[9px] text-[#64748B] font-mono">Reset (1d)</span>
                  </button>

                  <button
                    onClick={() => handleRating(2)}
                    className="p-2.5 bg-[#0F1117] hover:bg-[#1C1510] border border-[#1F2433] hover:border-amber-900 rounded-md text-left transition-colors"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-amber-400 font-mono">2. Hard</span>
                      <kbd className="px-1 py-0.2 text-[9px] bg-[#2B1B10] text-amber-300 rounded font-mono">2</kbd>
                    </div>
                    <span className="text-[9px] text-[#64748B] font-mono">Effort required (1d)</span>
                  </button>

                  <button
                    onClick={() => handleRating(4)}
                    className="p-2.5 bg-[#0F1117] hover:bg-[#121A26] border border-[#1F2433] hover:border-sky-900 rounded-md text-left transition-colors"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-sky-400 font-mono">3. Good</span>
                      <kbd className="px-1 py-0.2 text-[9px] bg-[#121E2E] text-sky-300 rounded font-mono">3</kbd>
                    </div>
                    <span className="text-[9px] text-[#64748B] font-mono">Correct interval</span>
                  </button>

                  <button
                    onClick={() => handleRating(5)}
                    className="p-2.5 bg-[#0F1117] hover:bg-[#101F18] border border-[#1F2433] hover:border-emerald-900 rounded-md text-left transition-colors"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-emerald-400 font-mono">4. Easy</span>
                      <kbd className="px-1 py-0.2 text-[9px] bg-[#102319] text-emerald-300 rounded font-mono">4</kbd>
                    </div>
                    <span className="text-[9px] text-[#64748B] font-mono">Instant mastery</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFlipped(true)}
                  className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-md text-xs font-mono font-medium transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Reveal Answer (Space)</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentCardIndex((prev) => (prev + 1) % activeDeck.length);
                    setIsFlipped(false);
                  }}
                  className="px-3 py-2 bg-[#0F1117] hover:bg-[#141722] border border-[#1F2433] text-[#94A3B8] rounded-md text-xs font-mono transition-colors"
                >
                  Skip Card
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center bg-[#0F1117] border border-[#1F2433] rounded-lg max-w-md w-full font-mono">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-white mb-1">Queue Completed</h3>
            <p className="text-[10px] text-[#64748B] mb-3">
              All cards due for review in this deck are completed.
            </p>
            <button
              onClick={() => { setFilterMode('all'); setCurrentCardIndex(0); }}
              className="px-3 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-md text-xs font-mono font-medium transition-colors"
            >
              Review Full Deck
            </button>
          </div>
        )}
      </div>

      {/* Manual Card Creation Modal */}
      {isAddingCard && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0F1117] border border-[#242A3C] rounded-lg max-w-lg w-full p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1F2433]">
              <h3 className="text-xs font-bold text-white font-mono flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                Add Custom Flashcard
              </h3>
              <button
                onClick={() => setIsAddingCard(false)}
                className="text-[#64748B] hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-[10px] font-mono text-[#94A3B8] block mb-1">Target Note</label>
              <select
                value={selectedNoteId}
                onChange={(e) => setSelectedNoteId(e.target.value)}
                className="w-full p-2 bg-[#090A0F] border border-[#242A3C] rounded-md text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              >
                {notes.map((n: NoteItem) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono text-[#94A3B8] block mb-1">Question / Prompt (Front)</label>
              <textarea
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                rows={3}
                placeholder="e.g. What is the difference between synchronous and asynchronous consensus?"
                className="w-full p-2.5 bg-[#090A0F] border border-[#242A3C] rounded-md text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-[#94A3B8] block mb-1">Answer / Explanation (Back)</label>
              <textarea
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                rows={3}
                placeholder="e.g. Synchronous assumes bounded message delay, whereas asynchronous makes no timing assumptions."
                className="w-full p-2.5 bg-[#090A0F] border border-[#242A3C] rounded-md text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1F2433]">
              <button
                onClick={() => setIsAddingCard(false)}
                className="px-3 py-1 bg-[#090A0F] hover:bg-[#141722] border border-[#242A3C] rounded-md text-xs font-mono text-[#94A3B8]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddManualCard}
                className="px-3.5 py-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-md text-xs font-mono font-medium"
              >
                Save Flashcard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
