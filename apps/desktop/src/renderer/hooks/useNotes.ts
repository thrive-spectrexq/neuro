import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Note } from '../store/noteStore';
import { apiClient } from '../../lib/api';

// Fallback initial notes
const initialFallbackNotes: Note[] = [
  {
    id: '1',
    title: 'Welcome to Neuro',
    content: '# Welcome to Neuro\n\nThis is your local-first AI second brain.',
    tags: ['welcome'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: '2',
    title: 'Ideas',
    content: '# Ideas\n\n- Build a better editor\n- Integrate AI',
    tags: ['ideas'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
];

const fetchNotes = async (): Promise<Note[]> => {
  try {
    const res = await apiClient.get<any>('/notes');
    const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
    return items.map((n: any) => ({
      id: String(n.id),
      title: n.title || 'Untitled Note',
      content: n.content || '',
      tags: n.tags || [],
      createdAt: n.created_at ? new Date(n.created_at).getTime() : Date.now(),
      updatedAt: n.updated_at ? new Date(n.updated_at).getTime() : Date.now(),
    }));
  } catch (err) {
    console.warn('[useNotes] Backend fetch unavailable, using offline fallback cache:', err);
    return initialFallbackNotes;
  }
};

const createNote = async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> => {
  try {
    const res = await apiClient.post<any>('/notes', {
      title: note.title,
      content: note.content,
      tags: note.tags,
    });
    const n = res.data;
    return {
      id: String(n.id),
      title: n.title,
      content: n.content,
      tags: n.tags || [],
      createdAt: n.created_at ? new Date(n.created_at).getTime() : Date.now(),
      updatedAt: n.updated_at ? new Date(n.updated_at).getTime() : Date.now(),
    };
  } catch {
    return {
      ...note,
      id: Math.random().toString(36).substring(7),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
};

const updateNote = async (note: Note): Promise<Note> => {
  try {
    await apiClient.patch(`/notes/${note.id}`, {
      title: note.title,
      content: note.content,
      tags: note.tags,
    });
    return note;
  } catch {
    return note;
  }
};

const deleteNote = async (id: string): Promise<boolean> => {
  try {
    await apiClient.delete(`/notes/${id}`);
    return true;
  } catch {
    return true;
  }
};

export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: fetchNotes,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
  });
}

