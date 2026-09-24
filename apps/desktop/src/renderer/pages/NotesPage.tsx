import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  FileText,
  Tag,
  Clock,
  Trash2,
  BookOpen,
  Download,
  Upload,
  FileUp,
  CheckCircle2,
  Link,
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

  const handleCreateNote = (
    templateTitle = 'Untitled Note',
    templateContent = '# Untitled Note\n\nStart capturing knowledge or ideas here...',
  ) => {
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
      },
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
      if (
        file.name.endsWith('.md') ||
        file.name.endsWith('.txt') ||
        file.name.endsWith('.markdown')
      ) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const rawText = (e.target?.result as string) || '';
          const cleanFileName = file.name.replace(/\.(md|txt|markdown)$/, '');

          // Extract first heading as title if present
          const headingMatch = rawText.match(/^#\s+(.+)$/m);
          const title = headingMatch && headingMatch[1] ? headingMatch[1].trim() : cleanFileName;

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
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(notes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `neuro_vault_backup_${new Date().toISOString().slice(0, 10)}.json`,
    );
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
        isDraggingFile ? 'bg-[#0071E3]/10 ring-2 ring-[#0071E3] ring-inset' : ''
      }`}
    >
      {/* Drag & Drop Overlay Feedback */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xl flex flex-col items-center justify-center text-[#0A84FF] pointer-events-none animate-in fade-in duration-150">
          <FileUp size={48} className="animate-bounce mb-3" />
          <p className="text-lg font-bold tracking-tight text-white">
            Drop Markdown (.md) files to import into Neuro
          </p>
          <p className="text-xs text-[#86868B] mt-1">
            Files will be indexed and linked to your knowledge vault
          </p>
        </div>
      )}

      {/* Apple Notes Workspace Header */}
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7 animate-in fade-in duration-200">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="page-title">Notes & Knowledge</h1>
            <div className="flex items-center gap-2">
              <span className="badge-neutral flex items-center gap-1.5">
                <FileText size={11} />
                {notes?.length || 0} notes
              </span>
              <span className="badge-neutral flex items-center gap-1.5">
                <Tag size={11} />
                {allTags.length} tags
              </span>
              {importStatus && (
                <span className="badge-emerald flex items-center gap-1.5 animate-in fade-in duration-150">
                  <CheckCircle2 size={11} /> {importStatus}
                </span>
              )}
            </div>
          </div>
          <p className="page-subtitle">
            Personal knowledge vault with bi-directional wiki linking, semantic search, and Markdown
            import.
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Spotlight Filter */}
          <div className="relative w-56">
            <Search
              size={13}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B] pointer-events-none"
            />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-full bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.1] border border-white/[0.09] focus:border-[#0071E3] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 text-[#F5F5F7] placeholder-[#86868B] transition-all"
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
            <Upload size={13} className="text-[#0A84FF]" />
            <span>Import</span>
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportVault}
            className="btn-secondary"
            title="Export all vault notes as JSON backup"
          >
            <Download size={13} className="text-[#A1A1A6]" />
            <span>Export</span>
          </button>

          {/* New Note Button */}
          <button onClick={() => handleCreateNote()} className="btn-primary">
            <Plus size={14} />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Tag Filter Bar */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-2 animate-in fade-in duration-200">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium tracking-tight transition-all duration-150 ${
              selectedTag === null
                ? 'bg-white/[0.14] text-white shadow-sm border border-white/[0.1]'
                : 'text-[#86868B] hover:text-[#F5F5F7] hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            All Notes
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`px-3 py-1 rounded-full text-xs font-mono transition-all duration-150 flex items-center gap-1.5 ${
                selectedTag === tag
                  ? 'bg-[#0071E3]/20 text-[#0A84FF] border border-[#0071E3]/40 shadow-sm'
                  : 'bg-white/[0.04] text-[#86868B] hover:text-[#F5F5F7] border border-white/[0.06] hover:border-white/[0.1]'
              }`}
            >
              <Tag size={11} className={selectedTag === tag ? 'opacity-90' : 'opacity-50'} />
              <span>#{tag}</span>
            </button>
          ))}
        </div>
      )}

      {/* Notes Grid */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-[#86868B] text-xs font-mono animate-pulse">
          Loading knowledge repository...
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 rounded-3xl border border-dashed border-white/[0.1] bg-white/[0.02] animate-in scale-in duration-200">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4 text-[#86868B]">
            <BookOpen size={24} />
          </div>
          <h3 className="text-base font-semibold text-[#F5F5F7] mb-2 tracking-tight">
            {searchFilter || selectedTag ? 'No matching notes found' : 'Your Second Brain is Empty'}
          </h3>
          <p className="text-xs text-[#86868B] max-w-md mb-6 leading-relaxed">
            {searchFilter || selectedTag
              ? 'Try changing your search keywords or clearing active tag filters.'
              : 'Create your first note or drag-and-drop your existing Markdown vault.'}
          </p>
          <button onClick={() => handleCreateNote()} className="btn-primary">
            <Plus size={14} />
            <span>Create First Note</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => handleNoteClick(note.id)}
              className="card-surface p-4.5 group flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <h3 className="text-sm font-semibold tracking-tight text-[#F5F5F7] group-hover:text-[#0A84FF] transition-colors line-clamp-1">
                    {note.title || 'Untitled Note'}
                  </h3>
                  <button
                    onClick={(e) => handleDeleteNote(e, note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-[#86868B] hover:text-[#FF453A] transition-all rounded-lg hover:bg-[#FF453A]/10"
                    title="Delete Note"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <p className="text-xs text-[#A1A1A6] line-clamp-3 leading-relaxed mb-4">
                  {getCleanSnippet(note.content) || (
                    <span className="italic text-[#6E6E73]">Empty note...</span>
                  )}
                </p>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#86868B] font-mono">
                <div className="flex items-center gap-1.5">
                  <Clock size={11} className="opacity-70" />
                  <span>
                    {new Date(note.updatedAt || note.createdAt || Date.now()).toLocaleDateString(
                      undefined,
                      { month: 'short', day: 'numeric', year: 'numeric' },
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {getWikilinkCount(note.content) > 0 && (
                    <div
                      className="flex items-center gap-1 text-[#86868B]"
                      title={`${getWikilinkCount(note.content)} linked references`}
                    >
                      <Link size={11} />
                      <span>{getWikilinkCount(note.content)}</span>
                    </div>
                  )}

                  {note.tags && note.tags.length > 0 && (
                    <div className="flex items-center gap-1 text-[#86868B]">
                      <Tag size={11} className="opacity-70" />
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
        className="md:hidden fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full shadow-[0_4px_20px_rgba(0,113,227,0.4)] transition-transform hover:scale-105 active:scale-95 z-40 font-medium text-xs tracking-tight"
      >
        <Plus size={16} />
        <span>Quick Note</span>
      </button>
    </div>
  );
}
