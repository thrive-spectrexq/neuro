export type SuggestionActionType = 'apply' | 'insert' | 'save' | 'explain' | 'dismiss';

export interface SuggestionAction {
  id: string;
  label: string;
  action: SuggestionActionType;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  payload?: Record<string, unknown>;
}

export interface CitationReference {
  id: string;
  title: string;
  snippet?: string;
  score?: number;
  uri?: string;
}

export type SuggestionCategory = 
  | 'completion'
  | 'lint_fix'
  | 'flashcard'
  | 'task'
  | 'search_synthesis'
  | 'refactor'
  | 'explanation';

export interface AgentSuggestion {
  id: string;
  type: SuggestionCategory;
  title?: string;
  text: string;
  citations?: CitationReference[];
  confidence?: number;
  actions: SuggestionAction[];
  metadata?: {
    model?: string;
    tokensUsed?: number;
    latencyMs?: number;
    provenanceTraceId?: string;
    targetNoteId?: string;
    targetBlockId?: string;
    [key: string]: unknown;
  };
  createdAt: string;
}

export interface AgentStreamChunk {
  id: string;
  deltaText: string;
  isComplete: boolean;
  suggestion?: AgentSuggestion;
  error?: string;
}
