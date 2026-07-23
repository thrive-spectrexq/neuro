import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { NoteEditor } from './NoteEditor';

export default function CreateNoteForm() {
  const [error, setError] = useState('');
  
  const token = useAuthStore(state => state.token);
  const queryClient = useQueryClient();

  const createNoteMutation = useMutation({
    mutationFn: async (noteData: { title: string; content: string; tags: string[] }) => {
      const response = await fetch('/api/v1/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(noteData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create note');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graph'] });
      setError('');
    },
    onError: (err: any) => {
      setError(err.message);
    }
  });

  const handleSaveNote = (noteData: { title: string; content: string; tags: string[] }) => {
    if (!noteData.title.trim() || !noteData.content.trim()) return;
    createNoteMutation.mutate(noteData);
  };

  return (
    <div className="h-full flex flex-col gap-2">
      {error && (
        <div className="text-sm text-red-400 p-3 bg-red-900/20 rounded-lg border border-red-900/50 backdrop-blur-sm">
          {error}
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <NoteEditor onSave={handleSaveNote} />
      </div>
    </div>
  );
}
