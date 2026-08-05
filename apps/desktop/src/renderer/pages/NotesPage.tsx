import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  FileText,
  Tag,
  Clock,
  Trash2,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowUpDown,
  BookOpen
} from 'lucide-react';
import { useNotes, useCreateNote, useDeleteNote } from '../hooks/useNotes';
import { useNoteStore } from '../store/noteStore';
import { soundEngine } from '../utils/soundEngine';

interface NotesPageProps {
  onNavigate?: (page: 'editor') => void;
}

export default function NotesPage({ onNavigate }: NotesPageProps) {
  const { data: notes, isLoading } = useNotes();
  const createNoteMutation = useCreateNote();
  const deleteNoteMutation = useDeleteNote();
  const { setActiveNoteId } = useNoteStore();

  const [searchFilter, setSearchFilter] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Compute all unique tags
  const allTags = useMemo(() => {
    if (!notes) return [];
    const tagsSet = new Set<string>();
    notes.forEach((n) => {
      if (n.tags) {
        n.tags.forEach((t) => tagsSet.add(t));
      }
    });
    return Array.from(tagsSet);
  }, [notes]);

  // Filter notes based on search & tag selection
  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    return notes.filter((note) => {
      const matchesSearch =
        !searchFilter ||
        note.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        note.content.toLowerCase().includes(searchFilter.toLowerCase());
      const matchesTag = !selectedTag || (note.tags && note.tags.includes(selectedTag));
      return matchesSearch && matchesTag;
    });
  }, [notes, searchFilter, selectedTag]);

  const handleNoteClick = (id: string) => {
    soundEngine.playClick();
    setActiveNoteId(id);
    if (onNavigate) {
      onNavigate('editor');
    }
  };

  const handleCreateNote = () => {
    soundEngine.playClick();
    createNoteMutation.mutate(
      {
        title: 'Untitled Note',
        content: '# Untitled Note\n\nStart capturing knowledge or ideas here...',
        tags: [],
      },
      {
        onSuccess: (newNote) => {
          handleNoteClick(newNote.id);
        },
      }
    );
  };

  const handleDeleteNote = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    soundEngine.playClick();
    deleteNoteMutation.mutate(id);
  };

  // Helper to strip markdown symbols for clean snippet previews
  const getCleanSnippet = (content: string) => {
    return content
      .replace(/^#+\s+/gm, '')
      .replace(/\[\[(.*?)\]\]/g, '$1')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .trim()
      .slice(0, 120);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col overflow-y-auto select-none">
      
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
              Notes & Knowledge
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] font-mono text-zinc-400">
              {notes?.length || 0} items
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-sans">
            Personal second brain notes with bi-directional wiki linking and full-text search.
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter notes..."
              className="w-full bg-[#0e111a] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand-primary/60 focus:ring-1 focus:ring-brand-primary/20 transition-all font-sans"
            />
          </div>

          {/* New Note Button */}
          <button
            onClick={handleCreateNote}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-primary hover:bg-brand-primary-dark text-white rounded-xl text-xs font-semibold shadow-glow-primary transition-all duration-150"
          >
            <Plus size={14} />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Tag Filter Bar */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedTag === null
                ? 'bg-white/[0.1] text-white border border-white/[0.1]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            All Notes
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1 ${
                selectedTag === tag
                  ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30'
                  : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200 border border-white/[0.05]'
              }`}
            >
              <span>#{tag}</span>
            </button>
          ))}
        </div>
      )}

      {/* Notes Grid */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs font-mono">
          Loading knowledge repository...
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 rounded-2xl border border-dashed border-white/[0.08] bg-[#0a0c14]">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
            <BookOpen size={20} className="text-zinc-500" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200 mb-1">
            {searchFilter || selectedTag ? 'No matching notes found' : 'Your Second Brain is Empty'}
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mb-4">
            {searchFilter || selectedTag
              ? 'Try clearing the search query or tag filters to see all notes.'
              : 'Capture your first note, idea, or run "add this to note: ..." with the voice agent.'}
          </p>
          <button
            onClick={handleCreateNote}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white rounded-xl text-xs font-medium transition-all"
          >
            <Plus size={14} />
            <span>Create First Note</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const cleanSnippet = getCleanSnippet(note.content);
            return (
              <div
                key={note.id}
                onClick={() => handleNoteClick(note.id)}
                className="group relative p-5 rounded-2xl bg-[#0d101a] border border-white/[0.07] hover:border-brand-primary/40 hover:bg-[#111524] transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-card hover:shadow-elevated"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-brand-primary-light transition-colors line-clamp-1">
                      {note.title || 'Untitled Note'}
                    </h3>
                    
                    <button
                      onClick={(e) => handleDeleteNote(e, note.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-500 hover:text-brand-rose hover:bg-brand-rose/10 transition-all"
                      title="Delete note"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 mb-4 font-sans font-normal">
                    {cleanSnippet || 'Empty note content...'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] text-[11px] text-zinc-500">
                  <div className="flex items-center gap-1">
                    <Clock size={11} className="text-zinc-600" />
                    <span className="font-mono text-[10px]">
                      {note.updatedAt || (note as any).updated_at
                        ? new Date(note.updatedAt || (note as any).updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : 'Recent'}
                    </span>
                  </div>

                  {note.tags && note.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-hidden max-w-[60%]">
                      {note.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.2 rounded bg-white/[0.04] text-zinc-400 text-[10px] font-mono border border-white/[0.06] truncate"
                        >
                          #{tag}
                        </span>
                      ))}
                      {note.tags.length > 2 && (
                        <span className="text-[10px] text-zinc-600 font-mono">
                          +{note.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
