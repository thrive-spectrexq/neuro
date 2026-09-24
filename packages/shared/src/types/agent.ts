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

// --- AI Workspace Platform Types ---

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  modelId?: string;
  tools: string[];
  permissions: Record<string, boolean>;
  isActive: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type ToolCategory = 'os' | 'knowledge' | 'web' | 'media' | 'vision' | 'custom';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  parametersSchema: Record<string, unknown>;
  handlerType: 'builtin' | 'plugin' | 'webhook' | 'mcp';
  handlerConfig: Record<string, unknown>;
  requiresConsent: boolean;
  isActive: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'ollama' | 'local' | 'custom';
  modelType: 'chat' | 'embedding' | 'stt' | 'tts' | 'vision' | 'multimodal';
  capabilities: string[];
  config: Record<string, unknown>;
  isLocal: boolean;
  isDefault: boolean;
  requiresConsent: boolean;
}

export type PolicyType = 'access' | 'consent' | 'retention' | 'audit';

export interface GovernancePolicy {
  id: string;
  name: string;
  policyType: PolicyType;
  resourceType: string;
  rules: Record<string, unknown>;
  isActive: boolean;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  policyId: string;
  consentGiven: boolean;
  consentScope: string;
  grantedAt: string;
  revokedAt: string | null;
}

export interface GovernanceAuditEntry {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown>;
  policyEvaluated: string | null;
  decision: 'allowed' | 'denied' | 'escalated';
  timestamp: string;
}

export interface AgentExecuteRequest {
  command: string;
  context?: Record<string, unknown>;
}

export interface AgentExecuteResponse {
  success: boolean;
  agentId: string;
  agentName: string;
  inputText: string;
  toolName?: string;
  outputText: string;
  voiceResponse: string;
  tokensUsed: number;
  latencyMs: number;
  governanceDecision: string;
}

export interface VisionAnalyzeResponse {
  success: boolean;
  text: string;
  analysis: Record<string, unknown>;
  error?: string;
}

