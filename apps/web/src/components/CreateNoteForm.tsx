import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { NoteEditor } from './NoteEditor';
import { AlertCircle } from 'lucide-react';

export default function CreateNoteForm() {
  const [error, setError] = useState('');
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  const createNoteMutation = useMutation({
    mutationFn: async (noteData: { title: string; content: string; tags: string[] }) => {
      const response = await fetch('/api/v1/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(noteData),
      });

      if (!response.ok) {
        throw new Error('Failed to create note in vault');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graph'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setError('');
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const handleSaveNote = (noteData: { title: string; content: string; tags: string[] }) => {
    if (!noteData.title.trim() || !noteData.content.trim()) return;
    createNoteMutation.mutate(noteData);
  };

  return (
    <div className="h-full flex flex-col gap-2">
      {error && (
        <div className="text-xs text-rose-300 p-2.5 bg-[#2A1218] rounded-md border border-[#4E1C27] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <NoteEditor onSave={handleSaveNote} />
      </div>
    </div>
  );
}
