import { Note } from './note';

export interface SearchResult {
  id: string;
  score: number;
  note: Note;
  highlights?: Record<string, string[]>;
}

export interface SearchQuery {
  query: string;
  projectId?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}
