import React, { useState, useEffect } from 'react';
import { Search, FileText, Tag, ArrowRight, Sparkles, Filter, Clock, Hash } from 'lucide-react';
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
    }, 250);

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
    <div className="p-8 h-full flex flex-col max-w-4xl mx-auto overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <span>Knowledge Search</span>
          <span className="text-xs px-2.5 py-1 bg-accent-purple/20 text-accent-purple border border-accent-purple/30 rounded-full font-normal">
            Hybrid FTS & Vector
          </span>
        </h1>
        <p className="text-sm text-gray-400">
          Query your personal second brain across all notes, tags, and semantic embeddings.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-cyan" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by keywords, ideas, or [[links]]..."
          className="w-full bg-surface border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-base text-white focus:outline-none focus:border-accent-purple/60 focus:ring-2 focus:ring-accent-purple/20 shadow-lg transition-all placeholder-gray-500"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white px-2 py-1 bg-white/5 rounded-md"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 text-xs">
        <span className="text-gray-500 flex items-center gap-1 mr-1">
          <Filter size={13} /> Filter:
        </span>
        {(['all', 'notes', 'tags'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-xl border capitalize transition-all ${
              filterType === t
                ? 'bg-accent-purple/20 border-accent-purple text-white'
                : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Results List */}
      <div className="flex-1 space-y-3">
        {isSearching && (
          <div className="text-sm text-gray-400 py-8 text-center flex items-center justify-center gap-2">
            <Sparkles size={16} className="text-accent-cyan animate-spin" />
            <span>Scanning knowledge graph...</span>
          </div>
        )}

        {!isSearching && query && results.length === 0 && (
          <div className="glass-panel p-8 rounded-2xl text-center text-gray-400">
            <p className="text-base font-medium text-white mb-1">No matches found for "{query}"</p>
            <p className="text-xs text-gray-500">
              Try asking JARVIS using the microphone or refining your search keywords.
            </p>
          </div>
        )}

        {!isSearching &&
          results.map((item, idx) => (
            <div
              key={item.id || idx}
              onClick={() => handleSelectResult(item.id)}
              className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-accent-purple/50 cursor-pointer transition-all group flex items-start justify-between gap-4 bg-surface/60 hover:bg-surface/90"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-accent-cyan flex-shrink-0" />
                  <h3 className="text-base font-semibold text-white group-hover:text-accent-cyan transition-colors">
                    {item.title || 'Untitled Note'}
                  </h3>
                </div>

                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                  {item.content || item.snippet}
                </p>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-1">
                    {item.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-white/5 text-accent-purple text-[10px] rounded-md flex items-center gap-0.5 border border-accent-purple/20"
                      >
                        <Hash size={10} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all pt-1">
                <ArrowRight size={18} />
              </div>
            </div>
          ))}

        {!query && (
          <div className="py-12 flex flex-col items-center justify-center text-center text-gray-500">
            <Search size={40} className="mb-3 opacity-30 text-accent-purple" />
            <p className="text-sm text-gray-400">Type any concept or note title above</p>
            <p className="text-xs text-gray-600 mt-1">
              Supports full-text indexing, fuzzy search, and conceptual associations
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
