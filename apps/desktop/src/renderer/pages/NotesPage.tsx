import React from 'react';
import { useNotes, useCreateNote } from '../hooks/useNotes';
import { useNoteStore } from '../store/noteStore';

interface NotesPageProps {
  onNavigate?: (page: 'editor') => void;
}

export default function NotesPage({ onNavigate }: NotesPageProps) {
  const { data: notes, isLoading } = useNotes();
  const createNoteMutation = useCreateNote();
  const { setActiveNoteId } = useNoteStore();

  const handleNoteClick = (id: string) => {
    setActiveNoteId(id);
    if (onNavigate) {
      onNavigate('editor');
    }
  };

  const handleCreateNote = () => {
    createNoteMutation.mutate({
      title: 'New Note',
      content: '# New Note\n\nStart typing here...',
      tags: []
    }, {
      onSuccess: (newNote) => {
        handleNoteClick(newNote.id);
      }
    });
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Your Notes</h1>
        <button 
          onClick={handleCreateNote}
          className="bg-accent-blue text-white px-4 py-2 rounded-lg font-medium hover:bg-accent-blue/80 transition-colors"
        >
          New Note
        </button>
      </div>
      
      {isLoading ? (
        <div className="text-gray-400">Loading notes...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes?.map(note => (
            <div 
              key={note.id} 
              onClick={() => handleNoteClick(note.id)}
              className="glass-panel p-5 rounded-2xl cursor-pointer hover:border-accent-purple/50 transition-colors group"
            >
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-accent-blue transition-colors">
                {note.title || 'Untitled Note'}
              </h3>
              <p className="text-gray-400 text-sm line-clamp-3">
                {note.content.substring(0, 150)}
              </p>
              <div className="mt-4 flex gap-2">
                {note.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-white/5 rounded text-xs text-accent-cyan">#{tag}</span>
                ))}
              </div>
            </div>
          ))}
          {notes?.length === 0 && (
            <div className="text-gray-400 col-span-full">No notes yet. Create one!</div>
          )}
        </div>
      )}
    </div>
  );
}
