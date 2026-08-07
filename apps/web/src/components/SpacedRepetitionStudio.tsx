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
    <div className="h-full flex flex-col bg-[#07090E] text-slate-100 font-sans select-none overflow-y-auto">
      {/* Top Banner & Stats Overview */}
      <div className="p-6 border-b border-white/[0.08] bg-[#0A0C14]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg border border-purple-400/30">
                <BrainCircuit className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  Spaced Repetition & Knowledge Retention
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
                    SM-2 Algorithm
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Daily active recall deck extracted automatically from <code className="text-purple-300 bg-purple-950/40 px-1 rounded">Question::Answer</code> and <code className="text-purple-300 bg-purple-950/40 px-1 rounded">==cloze deletions==</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stat Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
              <div className="text-xs">
                <span className="text-slate-400">Streak: </span>
                <strong className="text-amber-300 font-mono">{streakDays} days</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <div className="text-xs">
                <span className="text-slate-400">Retention: </span>
                <strong className="text-emerald-300 font-mono">{retentionPct}%</strong>
              </div>
            </div>

            <button
              onClick={() => setIsAddingCard(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Card</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-medium">Due Today</span>
              <p className="text-lg font-mono font-bold text-amber-400">{dueCount}</p>
            </div>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <RotateCw className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-medium">Learning Cards</span>
              <p className="text-lg font-mono font-bold text-sky-400">{learningCount}</p>
            </div>
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-medium">Mastered Cards</span>
              <p className="text-lg font-mono font-bold text-emerald-400">{masteredCount}</p>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-medium">Session Reviews</span>
              <p className="text-lg font-mono font-bold text-purple-400">{sessionReviewedCount}</p>
            </div>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Review Area */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col items-center justify-center">
        {/* Deck Filter Tabs & Search */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl">
            <button
              onClick={() => { setFilterMode('due'); setCurrentCardIndex(0); setIsFlipped(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterMode === 'due'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Due For Review ({dueCount})
            </button>
            <button
              onClick={() => { setFilterMode('all'); setCurrentCardIndex(0); setIsFlipped(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterMode === 'all'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Cards ({cards.length})
            </button>
            <button
              onClick={() => { setFilterMode('mastered'); setCurrentCardIndex(0); setIsFlipped(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterMode === 'mastered'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mastered ({masteredCount})
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search cards in deck..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>

        {/* 3D Flip Card Container */}
        {currentCard ? (
          <div className="w-full flex flex-col items-center gap-6">
            {/* Card Progress Indicator */}
            <div className="w-full flex items-center justify-between text-xs text-slate-400">
              <span>Card {currentCardIndex + 1} of {activeDeck.length}</span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 rounded-md text-slate-300">
                  Ease: {currentCard.easeFactor}x
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 rounded-md text-slate-300">
                  Reps: {currentCard.repetitions}
                </span>
              </div>
            </div>

            {/* Interactive Flashcard Card */}
            <div
              onClick={() => setIsFlipped((prev) => !prev)}
              className="w-full min-h-[320px] p-8 bg-gradient-to-b from-[#111422] to-[#0A0C14] border border-white/[0.12] hover:border-purple-500/40 rounded-2xl shadow-2xl flex flex-col justify-between cursor-pointer transition-all duration-300 relative group overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Layers className="w-24 h-24 text-purple-400" />
              </div>

              {/* Card Meta Header */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg">
                    {currentCard.cardType === 'cloze' ? 'Cloze Deletion' : 'Q&A Prompt'}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    from <strong className="text-slate-200">[[{currentCard.noteTitle}]]</strong>
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 italic">Click card or press Space to flip</span>
              </div>

              {/* Card Content Area */}
              <div className="my-6 z-10">
                {!isFlipped ? (
                  <div>
                    <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider block mb-2">
                      Prompt / Question
                    </span>
                    <p className="text-lg md:text-xl font-medium text-slate-100 leading-relaxed whitespace-pre-wrap">
                      {currentCard.front}
                    </p>
                  </div>
                ) : (
                  <div className="animate-in fade-in zoom-in-95 duration-200">
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      Verified Recall Answer
                    </span>
                    <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl">
                      <p className="text-lg md:text-xl font-semibold text-emerald-200 leading-relaxed whitespace-pre-wrap">
                        {currentCard.back}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Card Footer */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-white/[0.06] z-10">
                <span>Next Interval: {currentCard.intervalDays} day(s)</span>
                <span className="flex items-center gap-1 text-purple-300 font-medium">
                  {isFlipped ? 'Answer Revealed' : 'Click to Reveal Answer'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* SM-2 Quality Rating Buttons */}
            {isFlipped ? (
              <div className="w-full flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <span className="text-xs text-slate-400 font-medium">Rate your recall strength:</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                  <button
                    onClick={() => handleRating(1)}
                    className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-xl text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-red-400">1. Again</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-300 rounded font-mono">1</kbd>
                    </div>
                    <span className="text-[10px] text-slate-400">Blackout / Reset (1d)</span>
                  </button>

                  <button
                    onClick={() => handleRating(2)}
                    className="p-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 rounded-xl text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-amber-400">2. Hard</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 rounded font-mono">2</kbd>
                    </div>
                    <span className="text-[10px] text-slate-400">Struggled to recall (1d)</span>
                  </button>

                  <button
                    onClick={() => handleRating(4)}
                    className="p-3 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-500/50 rounded-xl text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-sky-400">3. Good</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] bg-sky-500/20 text-sky-300 rounded font-mono">3</kbd>
                    </div>
                    <span className="text-[10px] text-slate-400">Recalled with effort</span>
                  </button>

                  <button
                    onClick={() => handleRating(5)}
                    className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-emerald-400">4. Easy</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded font-mono">4</kbd>
                    </div>
                    <span className="text-[10px] text-slate-400">Instant mastery recall</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsFlipped(true)}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Reveal Answer (Space)</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentCardIndex((prev) => (prev + 1) % activeDeck.length);
                    setIsFlipped(false);
                  }}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-medium transition-all"
                >
                  Skip Card
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center bg-white/[0.02] border border-white/[0.08] rounded-2xl max-w-md w-full">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">All Caught Up!</h3>
            <p className="text-xs text-slate-400 mb-4">
              You have reviewed all cards due for today in this deck. Great job keeping your streak active!
            </p>
            <button
              onClick={() => { setFilterMode('all'); setCurrentCardIndex(0); }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-all"
            >
              Review All Vault Cards
            </button>
          </div>
        )}
      </div>

      {/* Manual Card Creation Modal */}
      {isAddingCard && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D101C] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                Add Custom Flashcard
              </h3>
              <button
                onClick={() => setIsAddingCard(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Target Note</label>
              <select
                value={selectedNoteId}
                onChange={(e) => setSelectedNoteId(e.target.value)}
                className="w-full p-2 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                {notes.map((n: NoteItem) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Question / Prompt (Front)</label>
              <textarea
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                rows={3}
                placeholder="e.g. What is the difference between synchronous and asynchronous consensus?"
                className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Answer / Explanation (Back)</label>
              <textarea
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                rows={3}
                placeholder="e.g. Synchronous assumes bounded message delay, whereas asynchronous makes no timing assumptions."
                className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddingCard(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAddManualCard}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold"
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
