import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  FileText,
  Plus,
  Sparkles,
  Network,
  Brain,
  Activity,
  Upload,
  Settings,
  LayoutGrid,
  ArrowRight,
  CornerDownLeft,
  X,
  Tag,
  Clock,
  LucideIcon,
} from 'lucide-react';
import { useNotes, useCreateNote } from '../hooks/useNotes';
import { useNoteStore, Note } from '../store/noteStore';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: any) => void;
  onOpenJarvis?: () => void;
}

interface PaletteAction {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Actions' | 'Navigation' | 'Tools';
  icon: LucideIcon;
  shortcut?: string;
  run: () => void | Promise<void>;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onOpenJarvis,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: notes = [] } = useNotes();
  const { setActiveNoteId } = useNoteStore();
  const createNoteMutation = useCreateNote();

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Global keyboard shortcut to open palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open palette
          (window as any).__openCommandPalette?.();
        }
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Actions list
  const baseActions: PaletteAction[] = useMemo(
    () => [
      {
        id: 'new-note',
        title: query.trim() ? `Create note: "${query.trim()}"` : 'Create New Note',
        subtitle: 'Start writing immediately in the editor',
        category: 'Actions',
        icon: Plus,
        shortcut: 'Enter',
        run: async () => {
          const noteTitle = query.trim() || 'Untitled Note';
          try {
            const newNote = await createNoteMutation.mutateAsync({
              title: noteTitle,
              content: `# ${noteTitle}\n\n`,
              tags: ['quick-note'],
            });
            setActiveNoteId(newNote.id);
            onNavigate('editor');
            onClose();
          } catch {
            onNavigate('editor');
            onClose();
          }
        },
      },
      {
        id: 'open-jarvis',
        title: 'Summon Neuro Intelligence (AI Copilot)',
        subtitle: 'Natural language agent for vault synthesis & audio transcription',
        category: 'Tools',
        icon: Sparkles,
        shortcut: 'Ctrl+Space',
        run: () => {
          onClose();
          onOpenJarvis?.();
        },
      },
      {
        id: 'nav-canvas',
        title: 'Open Canvas Studio',
        subtitle: 'Spatial visual mind-mapping and JSON Canvas 1.0 graph',
        category: 'Navigation',
        icon: LayoutGrid,
        run: () => {
          onNavigate('canvas');
          onClose();
        },
      },
      {
        id: 'nav-graph',
        title: 'Explore Knowledge Graph',
        subtitle: 'Interactive 2D/3D topological network of your vault',
        category: 'Navigation',
        icon: Network,
        shortcut: 'Alt+3',
        run: () => {
          onNavigate('graph');
          onClose();
        },
      },
      {
        id: 'nav-flashcards',
        title: 'Start Spaced Repetition Recall',
        subtitle: 'Active recall flashcards generated from your notes',
        category: 'Navigation',
        icon: Brain,
        shortcut: 'Alt+4',
        run: () => {
          onNavigate('flashcards');
          onClose();
        },
      },
      {
        id: 'nav-health',
        title: 'Run Vault Health Diagnostics',
        subtitle: 'Detect broken [[wikilinks]], orphan notes, and metadata gaps',
        category: 'Tools',
        icon: Activity,
        shortcut: 'Alt+7',
        run: () => {
          onNavigate('vault-health');
          onClose();
        },
      },
      {
        id: 'nav-ingest',
        title: 'Ingest Documents & Web URLs',
        subtitle: 'Extract clean markdown and import external research into your vault',
        category: 'Tools',
        icon: Upload,
        shortcut: 'Alt+8',
        run: () => {
          onNavigate('ingest');
          onClose();
        },
      },
      {
        id: 'nav-settings',
        title: 'Workspace Settings',
        subtitle: 'LLM providers, embedding models, and vault path configuration',
        category: 'Navigation',
        icon: Settings,
        shortcut: 'Alt+6',
        run: () => {
          onNavigate('settings');
          onClose();
        },
      },
    ],
    [query, createNoteMutation, setActiveNoteId, onNavigate, onClose, onOpenJarvis],
  );

  // Filter notes and actions based on user query
  const filteredNotes = useMemo(() => {
    if (!query.trim()) {
      // Show up to 5 recent notes if query is empty
      return notes.slice(0, 5);
    }
    const q = query.toLowerCase();
    return notes
      .filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.tags?.some((t) => t.toLowerCase().includes(q)) ||
          n.content.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [notes, query]);

  const filteredActions = useMemo(() => {
    if (!query.trim()) return baseActions;
    const q = query.toLowerCase();
    return baseActions.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle?.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }, [baseActions, query]);

  // Combine items into unified selectable list
  type UnifiedItem = { type: 'action'; data: PaletteAction } | { type: 'note'; data: Note };

  const allItems: UnifiedItem[] = useMemo(() => {
    const items: UnifiedItem[] = [];
    filteredActions.forEach((a) => items.push({ type: 'action', data: a }));
    filteredNotes.forEach((n) => items.push({ type: 'note', data: n }));
    return items;
  }, [filteredActions, filteredNotes]);

  // Handle arrow navigation and selection
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % Math.max(1, allItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = allItems[selectedIndex];
      if (current) {
        if (current.type === 'action') {
          current.data.run();
        } else {
          setActiveNoteId(current.data.id);
          onNavigate('editor');
          onClose();
        }
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#0F1117]/95 border border-white/[0.12] shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/[0.08] gap-3">
          <Search size={18} className="text-[#0A84FF] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, search notes, or jump to a view..."
            className="flex-1 bg-transparent text-sm text-[#F5F5F7] placeholder-[#86868B] focus:outline-none tracking-tight font-sans"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-[#86868B] hover:text-[#F5F5F7] hover:bg-white/[0.08] transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="px-2 py-0.5 rounded-md text-[10px] font-mono text-[#86868B] bg-white/[0.06] border border-white/[0.08]">
            Esc to close
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {allItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#86868B]">
              No notes or actions matching "{query}"
            </div>
          ) : (
            <>
              {/* Group 1: Actions */}
              {filteredActions.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-[#86868B] uppercase tracking-wider">
                    Commands & Actions
                  </div>
                  {filteredActions.map((action, idx) => {
                    const isSelected = selectedIndex === idx;
                    const Icon = action.icon;
                    return (
                      <div
                        key={action.id}
                        data-index={idx}
                        onClick={() => action.run()}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-[#0071E3] text-white shadow-sm'
                            : 'text-[#F5F5F7] hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg border ${
                              isSelected
                                ? 'bg-white/20 border-white/20 text-white'
                                : 'bg-white/[0.06] border-white/[0.08] text-[#0A84FF]'
                            }`}
                          >
                            <Icon size={15} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium tracking-tight truncate">
                              {action.title}
                            </div>
                            {action.subtitle && (
                              <div
                                className={`text-[11px] truncate ${
                                  isSelected ? 'text-white/80' : 'text-[#86868B]'
                                }`}
                              >
                                {action.subtitle}
                              </div>
                            )}
                          </div>
                        </div>

                        {action.shortcut && (
                          <kbd
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                              isSelected
                                ? 'bg-white/20 border-white/30 text-white'
                                : 'bg-white/[0.04] border-white/[0.08] text-[#86868B]'
                            }`}
                          >
                            {action.shortcut}
                          </kbd>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Group 2: Notes */}
              {filteredNotes.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-[#86868B] uppercase tracking-wider flex items-center justify-between">
                    <span>{query.trim() ? 'Matching Notes' : 'Recent Notes'}</span>
                    <span className="font-normal lowercase font-mono">
                      {filteredNotes.length} notes
                    </span>
                  </div>
                  {filteredNotes.map((note, noteIdx) => {
                    const globalIdx = filteredActions.length + noteIdx;
                    const isSelected = selectedIndex === globalIdx;
                    return (
                      <div
                        key={note.id}
                        data-index={globalIdx}
                        onClick={() => {
                          setActiveNoteId(note.id);
                          onNavigate('editor');
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-[#0071E3] text-white shadow-sm'
                            : 'text-[#F5F5F7] hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg border ${
                              isSelected
                                ? 'bg-white/20 border-white/20 text-white'
                                : 'bg-white/[0.06] border-white/[0.08] text-[#30D158]'
                            }`}
                          >
                            <FileText size={15} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium tracking-tight truncate">
                              {note.title}
                            </div>
                            <div
                              className={`text-[11px] truncate flex items-center gap-2 ${
                                isSelected ? 'text-white/80' : 'text-[#86868B]'
                              }`}
                            >
                              <span>
                                {note.content.replace(/^#+\s+/gm, '').slice(0, 50) || 'Empty note'}
                              </span>
                              {note.tags && note.tags.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Tag size={10} />
                                  {note.tags.join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          {isSelected && (
                            <span className="text-[10px] text-white/80 flex items-center gap-1 font-mono">
                              Open note <CornerDownLeft size={10} />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2 bg-black/40 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#86868B]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[9px] font-mono">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[9px] font-mono">
                ↓
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[9px] font-mono">
                ↵
              </kbd>
              select
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0A84FF]" />
            <span className="font-mono text-[10px]">Universal Spotlight</span>
          </div>
        </div>
      </div>
    </div>
  );
}
