export interface Note {
  id: string;
  title: string;
  content: string;
  projectId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteCreate {
  title: string;
  content: string;
  projectId?: string;
  tags?: string[];
}

export interface NoteUpdate {
  title?: string;
  content?: string;
  projectId?: string;
  tags?: string[];
}

export interface NoteListResponse {
  notes: Note[];
  total: number;
  page: number;
  limit: number;
}
