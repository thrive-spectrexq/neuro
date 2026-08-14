import React, { useState, useMemo, useRef } from 'react';
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
  BookOpen,
  Download,
  Upload,
  FileUp,
  Check,
  CheckCircle2
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
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleCreateNote = (templateTitle = 'Untitled Note', templateContent = '# Untitled Note\n\nStart capturing knowledge or ideas here...') => {
    soundEngine.playClick();
    createNoteMutation.mutate(
      {
        title: templateTitle,
        content: templateContent,
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

  // Import Markdown files
  const processFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    let imported = 0;

    Array.from(files).forEach((file) => {
      if (file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.markdown')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const rawText = (e.target?.result as string) || '';
          const cleanFileName = file.name.replace(/\.(md|txt|markdown)$/, '');
          
          // Extract first heading as title if present
          const headingMatch = rawText.match(/^#\s+(.+)$/m);
          const title = (headingMatch && headingMatch[1]) ? headingMatch[1].trim() : cleanFileName;

          // Extract tags `#tag`
          const tagMatches = rawText.match(/#[a-zA-Z0-9_-]+/g) || [];
          const tags = Array.from(new Set(tagMatches.map((t) => t.slice(1))));

          createNoteMutation.mutate({
            title,
            content: rawText,
            tags,
          });
          imported++;
          setImportStatus(`Imported ${imported} note(s)`);
          setTimeout(() => setImportStatus(null), 3000);
          soundEngine.playSuccessTone();
        };
        reader.readAsText(file);
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    processFiles(e.dataTransfer.files);
  };

  // Export all vault notes as JSON
  const handleExportVault = () => {
    if (!notes || notes.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(notes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `neuro_vault_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    soundEngine.playSuccessTone();
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
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`p-8 max-w-7xl mx-auto h-full flex flex-col overflow-y-auto select-none transition-all ${
        isDraggingFile ? 'bg-cyan-950/20 ring-2 ring-cyan-400 ring-inset' : ''
      }`}
    >
      {/* Drag & Drop Overlay Feedback */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center text-cyan-400 pointer-events-none">
          <FileUp size={48} className="animate-bounce mb-3" />
          <p className="text-lg font-bold">Drop Markdown (.md) files to import into Neuro</p>
          <p className="text-xs text-zinc-400 mt-1">Files will be indexed and linked to your knowledge vault</p>
        </div>
      )}

      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
              Notes & Knowledge Vault
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] font-mono text-cyan-400">
              {notes?.length || 0} notes
            </span>
            {importStatus && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-mono text-emerald-300 flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 size={11} /> {importStatus}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 font-sans">
            Personal second brain notes with bi-directional wiki linking, semantic search, and Markdown import.
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter notes..."
              className="w-full bg-[#0e111a] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60 transition-all font-sans"
            />
          </div>

          {/* Import Markdown Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => processFiles(e.target.files)}
            multiple
            accept=".md,.txt,.markdown"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-all"
            title="Import Markdown Files or Obsidian Notes"
          >
            <Upload size={13} className="text-cyan-400" />
            <span>Import</span>
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportVault}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-all"
            title="Export all vault notes as JSON backup"
          >
            <Download size={13} className="text-purple-400" />
            <span>Export</span>
          </button>

          {/* New Note Button */}
          <button
            onClick={() => handleCreateNote()}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_15px_rgba(0,245,255,0.3)] transition-all duration-150"
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
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
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
          <h3 className="text-sm font-semibold text-zinc-300 mb-1">
            {searchFilter || selectedTag ? 'No matching notes found' : 'Your Second Brain is Empty'}
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mb-5">
            {searchFilter || selectedTag
              ? 'Try changing your search keywords or clearing active tag filters.'
              : 'Create your first note or drag-and-drop your existing Markdown vault.'}
          </p>
          <button
            onClick={() => handleCreateNote()}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_15px_rgba(0,245,255,0.3)] transition-all"
          >
            <Plus size={14} />
            <span>Create First Note</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => handleNoteClick(note.id)}
              className="group p-5 rounded-2xl bg-[#0b0e18] hover:bg-[#101424] border border-white/[0.06] hover:border-cyan-500/40 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1 font-sans">
                    {note.title || 'Untitled Note'}
                  </h3>
                  <button
                    onClick={(e) => handleDeleteNote(e, note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-all rounded-md hover:bg-rose-950/30"
                    title="Delete Note"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed mb-4 font-sans">
                  {getCleanSnippet(note.content) || 'Empty note...'}
                </p>
              </div>

              <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                <div className="flex items-center gap-1">
                  <Clock size={11} />
                  <span>{new Date(note.updatedAt || note.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>

                {note.tags && note.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 bg-white/[0.04] rounded text-[10px] text-cyan-400">
                      #{note.tags[0]}
                    </span>
                    {note.tags.length > 1 && (
                      <span className="text-[10px] text-zinc-600">+{note.tags.length - 1}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
