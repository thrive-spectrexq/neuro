import React, { useState, useEffect } from 'react';
import { Search, FileText, Tag, ArrowRight, Sparkles, Filter, Clock, Hash, CornerDownLeft } from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { useNoteStore } from '../store/noteStore';
import { soundEngine } from '../utils/soundEngine';

interface SearchPageProps {
  onNavigate?: (page: 'editor' | 'notes') => void;
}

export default function SearchPage({ onNavigate }: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'notes' | 'tags'>('all');
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
      try {
        // Try backend hybrid search
        const res = await fetch(`http://localhost:8000/api/v1/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            setResults(data.results);
            setIsSearching(false);
            return;
          }
        }
      } catch (e) {
        // Local fallback
      }

      // Fallback local note search
      const q = query.toLowerCase();
      const matched = (notes || []).filter((note) => {
        const titleMatch = note.title.toLowerCase().includes(q);
        const contentMatch = note.content.toLowerCase().includes(q);
        const tagMatch = note.tags?.some((t) => t.toLowerCase().includes(q));
        if (filterType === 'tags') return tagMatch;
        return titleMatch || contentMatch || tagMatch;
      });

      setResults(
        matched.map((n) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          tags: n.tags,
          score: 1.0,
          type: 'note',
        }))
      );
      setIsSearching(false);
    }, 200);

    return () => clearTimeout(timeout);
  }, [query, filterType, notes]);

  const handleSelectResult = (noteId: string) => {
    soundEngine.playClick();
    setActiveNoteId(noteId);
    if (onNavigate) {
      onNavigate('editor');
    }
  };

  return (
    <div className="p-8 h-full flex flex-col max-w-4xl mx-auto overflow-y-auto select-none">
      
      {/* Search Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Knowledge Search
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary-light text-[11px] font-mono">
            Hybrid FTS & Vector
          </span>
        </div>
        <p className="text-xs text-zinc-400 font-sans">
          Query your personal second brain across all notes, tags, and semantic embeddings.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by keywords, ideas, or [[links]]..."
          className="w-full bg-[#0d101a] border border-white/[0.08] rounded-2xl pl-12 pr-20 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-primary/60 focus:ring-1 focus:ring-brand-primary/20 shadow-card transition-all font-sans"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white px-2 py-1 bg-white/[0.06] rounded-md font-mono"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 text-xs">
        <span className="text-zinc-500 flex items-center gap-1 mr-1 text-[11px] font-mono">
          <Filter size={12} /> Scope:
        </span>
        {(['all', 'notes', 'tags'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1 rounded-xl capitalize font-medium transition-all ${
              filterType === t
                ? 'bg-white/[0.1] text-white border border-white/[0.1]'
                : 'text-zinc-500 hover:text-zinc-300 bg-white/[0.02] border border-white/[0.04]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Results List */}
      <div className="flex-1 space-y-2.5">
        {isSearching && (
          <div className="text-xs text-zinc-400 py-12 text-center flex items-center justify-center gap-2 font-mono">
            <Sparkles size={14} className="text-brand-cyan animate-spin" />
            <span>Scanning knowledge graph...</span>
          </div>
        )}

        {!isSearching && query && results.length === 0 && (
          <div className="p-8 rounded-2xl border border-white/[0.06] bg-[#0c0f18] text-center text-zinc-400">
            <p className="text-sm font-medium text-zinc-200 mb-1">No matches found for "{query}"</p>
            <p className="text-xs text-zinc-500">
              Try asking Neuro using the voice agent or refining your search keywords.
            </p>
          </div>
        )}

        {!isSearching &&
          results.map((item, idx) => (
            <div
              key={item.id || idx}
              onClick={() => handleSelectResult(item.id)}
              className="p-4 rounded-2xl border border-white/[0.06] bg-[#0c0f18] hover:border-brand-primary/40 hover:bg-[#111524] cursor-pointer transition-all group flex items-start justify-between gap-4 shadow-sm"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-brand-cyan flex-shrink-0" />
                  <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-brand-primary-light transition-colors truncate">
                    {item.title || 'Untitled Note'}
                  </h3>
                </div>

                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed font-sans">
                  {item.content || item.snippet}
                </p>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-1">
                    {item.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-0.2 bg-white/[0.04] text-zinc-400 text-[10px] rounded-md flex items-center gap-0.5 border border-white/[0.06] font-mono"
                      >
                        <Hash size={10} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center text-zinc-600 group-hover:text-brand-primary group-hover:translate-x-1 transition-all pt-1">
                <ArrowRight size={16} />
              </div>
            </div>
          ))}

        {!query && (
          <div className="py-16 flex flex-col items-center justify-center text-center text-zinc-500">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
              <Search size={20} className="text-zinc-500" />
            </div>
            <p className="text-xs font-medium text-zinc-300">Type any concept or note title above</p>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-sm">
              Supports full-text indexing, fuzzy search, and conceptual associations across your entire brain.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
