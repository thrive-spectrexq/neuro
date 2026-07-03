import { create } from 'zustand';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

interface NoteState {
  activeNoteId: string | null;
  setActiveNoteId: (id: string | null) => void;
}

export const useNoteStore = create<NoteState>((set) => ({
  activeNoteId: null,
  setActiveNoteId: (id) => set({ activeNoteId: id }),
}));
