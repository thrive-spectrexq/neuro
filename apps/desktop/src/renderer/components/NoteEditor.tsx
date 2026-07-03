import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { debounce } from 'lodash';
import { useNoteStore } from '../store/noteStore';
import { useNotes, useUpdateNote } from '../hooks/useNotes';

export default function NoteEditor() {
  const { activeNoteId } = useNoteStore();
  const { data: notes } = useNotes();
  const updateNoteMutation = useUpdateNote();

  const activeNote = notes?.find(n => n.id === activeNoteId);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Sync local state when active note changes
  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title);
      setContent(activeNote.content);
    } else {
      setTitle('');
      setContent('');
    }
  }, [activeNote?.id]); // Only run when the ID changes to prevent overriding unsaved local changes

  // Debounced save
  const debouncedSave = useMemo(
    () =>
      debounce((id: string, newTitle: string, newContent: string) => {
        const note = notes?.find(n => n.id === id);
        if (note) {
          updateNoteMutation.mutate({
            ...note,
            title: newTitle,
            content: newContent
          });
        }
      }, 1000),
    [notes, updateNoteMutation]
  );

  // Clean up debounce on unmount
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

  const handleContentChange = useCallback((value: string) => {
    setContent(value);
    if (activeNoteId) {
      debouncedSave(activeNoteId, title, value);
    }
  }, [activeNoteId, title, debouncedSave]);

  if (!activeNoteId) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background text-gray-500">
        Select a note or create a new one
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="p-4 border-b border-white/5">
        <input 
          type="text" 
          placeholder="Note Title" 
          className="bg-transparent text-2xl font-bold text-white outline-none w-full"
          value={title}
          onChange={handleTitleChange}
        />
      </div>
      <div className="flex-1 overflow-auto">
        <CodeMirror
          value={content}
          height="100%"
          theme={oneDark}
          extensions={[
            markdown({ base: markdownLanguage, codeLanguages: languages }),
          ]}
          onChange={handleContentChange}
          className="h-full text-base [&_.cm-editor]:h-full [&_.cm-scroller]:font-mono"
        />
      </div>
    </div>
  );
}
