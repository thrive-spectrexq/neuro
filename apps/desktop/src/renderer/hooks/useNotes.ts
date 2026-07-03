import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Note } from '../store/noteStore';

// In-memory mock DB for now since we don't have a real backend connected
let mockNotes: Note[] = [
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

// Mock API
const fetchNotes = async (): Promise<Note[]> => {
  return new Promise(resolve => setTimeout(() => resolve([...mockNotes]), 200));
};

const createNote = async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> => {
  const newNote: Note = {
    ...note,
    id: Math.random().toString(36).substring(7),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  mockNotes.unshift(newNote);
  return new Promise(resolve => setTimeout(() => resolve(newNote), 200));
};

const updateNote = async (note: Note): Promise<Note> => {
  mockNotes = mockNotes.map(n => n.id === note.id ? { ...note, updatedAt: Date.now() } : n);
  return new Promise(resolve => setTimeout(() => resolve(note), 200));
};

export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: fetchNotes,
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
