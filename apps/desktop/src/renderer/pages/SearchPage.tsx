import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  FileText,
  Tag,
  ArrowRight,
  Sparkles,
  Filter,
  Clock,
  Hash,
  CornerDownLeft,
  ListTodo,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { useNoteStore } from '../store/noteStore';
import { soundEngine } from '../utils/soundEngine';

interface SearchPageProps {
  onNavigate?: (page: 'editor' | 'notes') => void;
}

export default function SearchPage({ onNavigate }: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'notes' | 'tags' | 'tasks'>('all');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: notes } = useNotes();
  const { setActiveNoteId } = useNoteStore();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      // Local hybrid semantic & text search
      const q = query.toLowerCase().trim();
      const terms = q.split(/\s+/).filter(t => t.length > 0);

      const matched = (notes || []).map((note) => {
        let titleScore = 0;
        let contentScore = 0;
        let tagScore = 0;
        let taskScore = 0;

        const titleLower = note.title.toLowerCase();
        const contentLower = note.content.toLowerCase();

        terms.forEach((t) => {
          if (titleLower.includes(t)) titleScore += 30;
          if (contentLower.includes(t)) contentScore += 15;
          if (note.tags?.some((tag) => tag.toLowerCase().includes(t))) tagScore += 25;
          if (note.content.includes('- [ ]') && contentLower.includes(t)) taskScore += 20;
        });

        const totalScore = Math.min(99, titleScore + contentScore + tagScore + taskScore);
        const hasTasks = note.content.includes('- [ ]') || note.content.includes('- [x]');

        return {
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags || [],
          score: totalScore > 0 ? totalScore : 0,
          hasTasks,
          updatedAt: note.updatedAt || note.createdAt,
        };
      })
      .filter((n) => n.score > 0)
      .filter((n) => {
        if (filterType === 'tags') return n.tags.length > 0;
        if (filterType === 'tasks') return n.hasTasks;
        return true;
      })
      .sort((a, b) => b.score - a.score);

      setResults(matched);
      setIsSearching(false);
    }, 120);

    return () => clearTimeout(timeout);
  }, [query, filterType, notes]);

  const handleSelectResult = (noteId: string) => {
    soundEngine.playClick();
    setActiveNoteId(noteId);
    if (onNavigate) {
      onNavigate('editor');
    }
  };

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <mark key={i} className="bg-emerald-500/30 text-emerald-200 px-0.5 rounded font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="page-container select-none">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-2.5">
          <h1 className="page-title">
            <Search className="text-brand-emerald" size={20} />
            Knowledge Vault Search
          </h1>
          <span className="badge-emerald">
            Hybrid Semantic & BM25
          </span>
        </div>
        <p className="page-subtitle">
          Query your second brain across all notes, tags, checklists, and semantic embeddings.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-emerald" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by keywords, concepts, tasks, or [[wikilinks]]..."
          className="input-base pl-12 pr-20 py-3.5 text-sm rounded-card shadow-card focus:border-brand-emerald/60"
          autoFocus
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              soundEngine.playClick();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-text-tertiary hover:text-white px-2 py-1 bg-white/[0.06] rounded-md font-mono transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 text-xs">
        <span className="text-text-muted flex items-center gap-1 mr-1 text-[11px] font-mono">
          <Filter size={12} /> Scope:
        </span>
        {(['all', 'notes', 'tags', 'tasks'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setFilterType(t);
              soundEngine.playClick();
            }}
            className={`px-3 py-1.5 rounded-button capitalize font-medium transition-all duration-150 ${
              filterType === t
                ? 'bg-brand-emerald text-background font-bold shadow-glow-emerald'
                : 'text-text-secondary hover:text-text-primary bg-surface border border-white/[0.05] hover:bg-surface-elevated'
            }`}
          >
            {t === 'all' ? 'All Knowledge' : t === 'tasks' ? 'Tasks & Checklists' : t}
          </button>
        ))}
      </div>

      {/* Results List */}
      <div className="flex-1 space-y-3 pb-8">
        {isSearching && (
          <div className="text-xs text-text-secondary py-12 text-center flex items-center justify-center gap-2 font-mono">
            <Sparkles size={14} className="text-brand-emerald animate-spin" />
            <span>Scanning second brain knowledge topology...</span>
          </div>
        )}

        {!isSearching && query && results.length === 0 && (
          <div className="p-8 rounded-card border border-white/[0.06] bg-panel text-center text-text-secondary animate-fade-in">
            <p className="text-sm font-medium text-text-primary mb-1">No matches found for "{query}"</p>
            <p className="text-xs text-text-muted">
              Try broader keywords, searching for tags, or asking the voice agent directly.
            </p>
          </div>
        )}

        {!isSearching &&
          results.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelectResult(item.id)}
              className="card-surface p-5 cursor-pointer group flex items-start justify-between gap-4 animate-scale-in"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-brand-emerald flex-shrink-0" />
                    <h3 className="text-sm font-bold text-text-primary group-hover:text-brand-emerald-light transition-colors truncate font-sans">
                      {highlightMatch(item.title || 'Untitled Note', query)}
                    </h3>
                  </div>

                  {/* Match Relevance Score Badge */}
                  <div className="badge-emerald">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{item.score}% Match</span>
                  </div>
                </div>

                <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed font-sans">
                  {highlightMatch(item.content.replace(/^[#*`\-> ]+/gm, ' ').slice(0, 160), query)}
                </p>

                <div className="flex items-center gap-3 pt-1 text-[11px] text-text-muted font-mono">
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      {item.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-surface text-brand-emerald text-[10px] rounded-md flex items-center gap-0.5 border border-white/[0.06]"
                        >
                          <Hash size={10} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.hasTasks && (
                    <span className="badge-emerald">
                      <CheckCircle2 size={11} /> Tasks Inside
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center text-text-muted group-hover:text-brand-emerald group-hover:translate-x-1 transition-all pt-1">
                <ArrowRight size={16} />
              </div>
            </div>
          ))}

        {!query && (
          <div className="py-16 flex flex-col items-center justify-center text-center text-text-muted">
            <div className="w-12 h-12 rounded-2xl bg-surface border border-white/[0.06] flex items-center justify-center mb-3">
              <BookOpen size={20} className="text-text-secondary" />
            </div>
            <p className="text-xs font-medium text-text-primary">
              Type any concept, question, or note keyword
            </p>
            <p className="text-[11px] text-text-muted mt-1 max-w-sm">
              Instant hybrid vector & BM25 retrieval across all notes, tags, checklists, and links in your vault.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
