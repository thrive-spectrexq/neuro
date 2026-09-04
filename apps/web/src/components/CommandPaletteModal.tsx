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
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/80"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#0F1117] rounded-lg border border-[#242A3C] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-[#1F2433] bg-[#090A0F]">
          <Search className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search notes (e.g. 'Quantum', 'Tasks')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-[#475569] outline-none font-mono"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-[#64748B] hover:text-white rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="px-1.5 py-0.5 text-[9px] font-mono text-[#64748B] bg-[#141722] border border-[#242A3C] rounded">
            ESC
          </span>
        </div>

        {/* Search Results / Navigation Options */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-1">
          {/* Quick Actions */}
          {!query && (
            <div className="px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-[#64748B]">
              Quick Navigation
            </div>
          )}

          <button
            onClick={() => {
              onSelectTab('graph');
              onClose();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors ${
              selectedIndex === 0 ? 'bg-[#18162B] text-white border border-[#302856]' : 'text-[#94A3B8] hover:bg-[#141722]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-3.5 h-3.5 text-teal-400" />
              <span>Knowledge Graph & Notes</span>
            </div>
            <ArrowRight className="w-3 h-3 text-[#475569]" />
          </button>

          <button
            onClick={() => {
              onSelectTab('tasks');
              onClose();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors ${
              selectedIndex === 1 ? 'bg-[#18162B] text-white border border-[#302856]' : 'text-[#94A3B8] hover:bg-[#141722]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
              <span>Task Kanban Board</span>
            </div>
            <ArrowRight className="w-3 h-3 text-[#475569]" />
          </button>

          <button
            onClick={() => {
              onSelectTab('audit');
              onClose();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors ${
              selectedIndex === 2 ? 'bg-[#18162B] text-white border border-[#302856]' : 'text-[#94A3B8] hover:bg-[#141722]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Security Audit Logs</span>
            </div>
            <ArrowRight className="w-3 h-3 text-[#475569]" />
          </button>

          {/* Live Search Results */}
          {query && (
            <div className="mt-1">
              <div className="px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-[#64748B] flex items-center justify-between">
                <span>Notes Search</span>
                {isLoading && <Sparkles className="w-3 h-3 text-teal-400 animate-spin" />}
              </div>
              {results.length === 0 && !isLoading && (
                <div className="px-3 py-4 text-center text-xs font-mono text-[#64748B]">
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
                  className="px-2.5 py-2 rounded-md hover:bg-[#141722] cursor-pointer transition-colors flex flex-col gap-0.5 border border-transparent hover:border-[#242A3C]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono">{item.title}</span>
                    <span className="text-[9px] text-[#64748B] font-mono">Note</span>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] line-clamp-1 font-mono">{item.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 border-t border-[#1F2433] bg-[#090A0F] text-[9px] font-mono text-[#64748B] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span>Navigate: <kbd className="px-1 py-0.2 bg-[#141722] border border-[#242A3C] rounded text-[#94A3B8]">↑</kbd> <kbd className="px-1 py-0.2 bg-[#141722] border border-[#242A3C] rounded text-[#94A3B8]">↓</kbd></span>
            <span>Select: <kbd className="px-1 py-0.2 bg-[#141722] border border-[#242A3C] rounded text-[#94A3B8]">↵</kbd></span>
          </div>
          <span>Neuro Command Palette</span>
        </div>
      </div>
    </div>
  );
}
