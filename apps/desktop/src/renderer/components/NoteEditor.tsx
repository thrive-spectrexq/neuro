import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { debounce } from 'lodash';
import {
  FileText,
  Clock,
  Hash,
  CheckCircle2,
  Share2,
  Sparkles,
  Layers,
  Tag as TagIcon
} from 'lucide-react';
import { useNoteStore } from '../store/noteStore';
import { useNotes, useUpdateNote } from '../hooks/useNotes';

export default function NoteEditor() {
  const { activeNoteId } = useNoteStore();
  const { data: notes } = useNotes();
  const updateNoteMutation = useUpdateNote();

  const activeNote = notes?.find((n) => n.id === activeNoteId);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state when active note changes
  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title);
      setContent(activeNote.content);
    } else {
      setTitle('');
      setContent('');
    }
  }, [activeNote?.id]);

  // Debounced save
  const debouncedSave = useMemo(
    () =>
      debounce((id: string, newTitle: string, newContent: string) => {
        const note = notes?.find((n) => n.id === id);
        if (note) {
          setIsSaving(true);
          updateNoteMutation.mutate(
            {
              ...note,
              title: newTitle,
              content: newContent,
            },
            {
              onSettled: () => {
                setTimeout(() => setIsSaving(false), 500);
              },
            }
          );
        }
      }, 800),
    [notes, updateNoteMutation]
  );

  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (activeNoteId) {
      debouncedSave(activeNoteId, newTitle, content);
    }
  };

  const handleContentChange = useCallback(
    (value: string) => {
      setContent(value);
      if (activeNoteId) {
        debouncedSave(activeNoteId, title, value);
      }
    },
    [activeNoteId, title, debouncedSave]
  );

  // Metrics
  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }, [content]);

  const charCount = useMemo(() => {
    return content.length;
  }, [content]);

  if (!activeNoteId) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#07080c] text-zinc-500 p-8 select-none">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
          <FileText size={20} className="text-zinc-500" />
        </div>
        <p className="text-sm font-medium text-zinc-300">No Note Selected</p>
        <p className="text-xs text-zinc-500 mt-1">Select a note from the Notes tab or create a new one.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#07080c]">
      
      {/* Editor Header & Meta Toolbar */}
      <div className="px-8 pt-6 pb-4 border-b border-white/[0.05] bg-[#090b12] flex items-center justify-between gap-4 select-none">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            placeholder="Note Title..."
            value={title}
            onChange={handleTitleChange}
            className="bg-transparent text-xl font-bold text-white placeholder-zinc-600 outline-none w-full font-sans tracking-tight"
          />
        </div>

        {/* Note Statistics & Save Status */}
        <div className="flex items-center gap-4 text-zinc-500 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary/60" />
            <span>{wordCount} words</span>
          </div>

          <div className="w-[1px] h-3 bg-white/[0.08]" />

          <div className="flex items-center gap-1">
            <CheckCircle2 size={12} className={isSaving ? 'text-brand-amber animate-spin' : 'text-brand-emerald'} />
            <span className="text-[11px] text-zinc-400">
              {isSaving ? 'Saving...' : 'Saved locally'}
            </span>
          </div>
        </div>
      </div>

      {/* CodeMirror Markdown Canvas */}
      <div className="flex-1 overflow-hidden relative">
        <CodeMirror
          value={content}
          height="100%"
          theme={oneDark}
          extensions={[
            markdown({ base: markdownLanguage, codeLanguages: languages }),
          ]}
          onChange={handleContentChange}
          className="h-full text-[13px] leading-relaxed [&_.cm-editor]:h-full [&_.cm-editor]:bg-transparent [&_.cm-scroller]:p-8 [&_.cm-content]:font-mono [&_.cm-line]:py-0.5"
        />
      </div>
    </div>
  );
}
