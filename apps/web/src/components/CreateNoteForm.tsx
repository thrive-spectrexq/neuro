import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';

export default function CreateNoteForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
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
      // Refresh the graph
      queryClient.invalidateQueries({ queryKey: ['graph'] });
      setTitle('');
      setContent('');
      setTagsInput('');
      setError('');
    },
    onError: (err: any) => {
      setError(err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    
    // Parse comma-separated tags
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
      
    createNoteMutation.mutate({ title, content, tags });
  };

  return (
    <div className="glass-panel rounded-2xl p-6 h-full flex flex-col shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-2 h-6 bg-gradient-to-b from-accent-purple to-accent-blue rounded-full block"></span>
        Capture Thought
      </h2>
      
      {error && (
        <div className="text-sm text-red-400 mb-4 p-3 bg-red-900/20 rounded-lg border border-red-900/50 backdrop-blur-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col flex-grow gap-5">
        <div className="group">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-accent-purple transition-colors">Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-white focus:ring-2 focus:ring-accent-purple focus:border-transparent focus:outline-none transition-all"
            placeholder="E.g., Quantum Computing"
          />
        </div>
        
        <div className="flex-grow flex flex-col group">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-accent-purple transition-colors">Content</label>
          <textarea
            required
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full flex-grow px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-white focus:ring-2 focus:ring-accent-purple focus:border-transparent focus:outline-none resize-none transition-all"
            placeholder="Write your thoughts here... Use [[note-id]] to link!"
          />
        </div>
        
        <div className="group">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-accent-purple transition-colors">Tags (comma separated)</label>
          <input
            type="text"
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
            className="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-white focus:ring-2 focus:ring-accent-purple focus:border-transparent focus:outline-none transition-all"
            placeholder="tech, ai, research"
          />
        </div>

        <button
          type="submit"
          disabled={createNoteMutation.isPending}
          className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-accent-purple to-accent-blue hover:opacity-90 shadow-lg hover:shadow-accent-purple/25 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
        >
          {createNoteMutation.isPending ? 'Saving...' : 'Create Note'}
        </button>
      </form>
    </div>
  );
}
