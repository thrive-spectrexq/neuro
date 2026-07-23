import { useState, useEffect, useRef } from 'react';
import { Search, FileText, Sparkles, CheckSquare, Shield, ArrowRight, X } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: 'graph' | 'tasks' | 'audit') => void;
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
}

export function CommandPaletteModal({ isOpen, onClose, onSelectTab }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const token = useAuthStore((state) => state.token);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Live search debounced
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}&limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data || []);
        }
      } catch (err) {
        console.error('Command palette search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, token]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (results.length + 3));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length + 3) % (results.length + 3));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Handle action based on selectedIndex
      if (selectedIndex === 0) {
        onSelectTab('graph');
        onClose();
      } else if (selectedIndex === 1) {
        onSelectTab('tasks');
        onClose();
      } else if (selectedIndex === 2) {
        onSelectTab('audit');
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl glass-panel rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-black/30">
          <Search className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search notes (e.g. 'Quantum', 'Tasks')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="px-2 py-0.5 text-[10px] font-semibold text-slate-400 bg-white/5 border border-white/10 rounded">
            ESC
          </span>
        </div>

        {/* Search Results / Navigation Options */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {/* Quick Actions */}
          {!query && (
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Quick Navigation
            </div>
          )}

          <button
            onClick={() => {
              onSelectTab('graph');
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              selectedIndex === 0 ? 'bg-indigo-600/30 text-white border border-indigo-500/40' : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Knowledge Graph & Notes</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button
            onClick={() => {
              onSelectTab('tasks');
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              selectedIndex === 1 ? 'bg-indigo-600/30 text-white border border-indigo-500/40' : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckSquare className="w-4 h-4 text-sky-400" />
              <span>Task Kanban Board</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button
            onClick={() => {
              onSelectTab('audit');
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              selectedIndex === 2 ? 'bg-indigo-600/30 text-white border border-indigo-500/40' : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Security Audit Logs</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {/* Live Search Results */}
          {query && (
            <div className="mt-2">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Notes Search</span>
                {isLoading && <Sparkles className="w-3 h-3 text-indigo-400 animate-spin" />}
              </div>
              {results.length === 0 && !isLoading && (
                <div className="px-4 py-6 text-center text-xs text-slate-500">
                  No notes found matching "{query}"
                </div>
              )}
              {results.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectTab('graph');
                    onClose();
                  }}
                  className="px-3.5 py-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all flex flex-col gap-1 border border-transparent hover:border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{item.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Note</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{item.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/5 bg-black/20 text-[10px] text-slate-400 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span>Use <kbd className="px-1 py-0.5 bg-white/10 rounded text-slate-300">↑</kbd> <kbd className="px-1 py-0.5 bg-white/10 rounded text-slate-300">↓</kbd> to navigate</span>
            <span><kbd className="px-1 py-0.5 bg-white/10 rounded text-slate-300">↵</kbd> to select</span>
          </div>
          <span>Neuro Command Engine v0.1</span>
        </div>
      </div>
    </div>
  );
}
