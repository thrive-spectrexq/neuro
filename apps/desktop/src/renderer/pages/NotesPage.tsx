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
  CheckCircle2,
  Link
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

  // Helper to count wikilinks
  const getWikilinkCount = (content: string) => {
    const matches = content.match(/\[\[(.*?)\]\]/g);
    return matches ? matches.length : 0;
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`page-container ${
        isDraggingFile ? 'bg-cyan-950/20 ring-2 ring-cyan-400 ring-inset' : ''
      }`}
    >
      {/* Drag & Drop Overlay Feedback */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center text-brand-cyan pointer-events-none animate-fade-in">
          <FileUp size={48} className="animate-bounce mb-3" />
          <p className="text-lg font-bold">Drop Markdown (.md) files to import into Neuro</p>
          <p className="text-xs text-text-muted mt-1">Files will be indexed and linked to your knowledge vault</p>
        </div>
      )}

      {/* Workspace Header */}
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7 animate-fade-in">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="page-title">
              Notes & Knowledge Vault
            </h1>
            <div className="flex items-center gap-2">
              <span className="badge-neutral flex items-center gap-1">
                <FileText size={12} />
                {notes?.length || 0} notes
              </span>
              <span className="badge-neutral flex items-center gap-1">
                <Tag size={12} />
                {allTags.length} tags
              </span>
              {importStatus && (
                <span className="badge-emerald flex items-center gap-1 animate-fade-in">
                  <CheckCircle2 size={12} /> {importStatus}
                </span>
              )}
            </div>
          </div>
          <p className="page-subtitle">
            Personal second brain notes with bi-directional wiki linking, semantic search, and Markdown import.
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Search */}
          <div className="relative w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter notes..."
              className="input-base pl-9 w-full"
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
            className="btn-secondary"
            title="Import Markdown Files or Obsidian Notes"
          >
            <Upload size={14} className="text-brand-cyan" />
            <span>Import</span>
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportVault}
            className="btn-secondary"
            title="Export all vault notes as JSON backup"
          >
            <Download size={14} className="text-brand-primary" />
            <span>Export</span>
          </button>

          {/* New Note Button */}
          <button
            onClick={() => handleCreateNote()}
            className="btn-primary"
          >
            <Plus size={16} />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Tag Filter Bar */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedTag === null
                ? 'bg-surface-elevated text-text-primary border border-surface-elevated'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent'
            }`}
          >
            All Notes
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                selectedTag === tag
                  ? 'badge-cyan'
                  : 'bg-surface text-text-secondary hover:text-text-primary border border-surface hover:border-surface-elevated'
              }`}
            >
              <Tag size={12} className={selectedTag === tag ? 'opacity-70' : 'opacity-50'} />
              <span>{tag}</span>
            </button>
          ))}
        </div>
      )}

      {/* Notes Grid */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm font-mono animate-pulse">
          Loading knowledge repository...
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 rounded-2xl border border-dashed border-surface-elevated card-surface-static animate-scale-in">
          <div className="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center mb-4">
            <BookOpen size={24} className="text-text-muted" />
          </div>
          <h3 className="text-base font-semibold text-text-primary mb-2">
            {searchFilter || selectedTag ? 'No matching notes found' : 'Your Second Brain is Empty'}
          </h3>
          <p className="text-sm text-text-secondary max-w-md mb-6">
            {searchFilter || selectedTag
              ? 'Try changing your search keywords or clearing active tag filters.'
              : 'Create your first note or drag-and-drop your existing Markdown vault.'}
          </p>
          <button
            onClick={() => handleCreateNote()}
            className="btn-primary"
          >
            <Plus size={16} />
            <span>Create First Note</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
          {filteredNotes.map((note, index) => (
            <div
              key={note.id}
              onClick={() => handleNoteClick(note.id)}
              className="card-surface group flex flex-col justify-between animate-scale-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-sm font-bold text-text-primary group-hover:text-brand-cyan transition-colors line-clamp-1">
                    {note.title || 'Untitled Note'}
                  </h3>
                  <button
                    onClick={(e) => handleDeleteNote(e, note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-text-muted hover:text-rose-400 transition-all rounded-md hover:bg-rose-500/10"
                    title="Delete Note"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <p className="text-xs text-text-secondary line-clamp-4 leading-relaxed mb-4">
                  {getCleanSnippet(note.content) || <span className="italic text-text-tertiary">Empty note...</span>}
                </p>
              </div>

              <div className="pt-3 border-t border-surface-elevated flex items-center justify-between text-xs text-text-muted font-mono">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="opacity-70" />
                  <span>{new Date(note.updatedAt || note.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  {getWikilinkCount(note.content) > 0 && (
                    <div className="flex items-center gap-1 text-text-tertiary" title={`${getWikilinkCount(note.content)} linked references`}>
                      <Link size={12} />
                      <span>{getWikilinkCount(note.content)}</span>
                    </div>
                  )}

                  {note.tags && note.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Tag size={12} className="opacity-70" />
                      <span>{note.tags.length}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button for Mobile */}
      <button
        onClick={() => handleCreateNote()}
        className="md:hidden fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 bg-brand-cyan hover:bg-cyan-500 text-background rounded-full shadow-[0_0_20px_rgba(0,245,255,0.3)] transition-transform hover:scale-105 active:scale-95 z-40 font-semibold text-sm"
      >
        <Plus size={18} />
        <span>Quick Note</span>
      </button>
    </div>
  );
}
