import { create } from 'zustand';
import { AgentSuggestion } from '@neuro/shared';

interface AgentState {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  useRag: boolean;
  setUseRag: (useRag: boolean) => void;
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  streamingText: string;
  setStreamingText: (text: string) => void;
  appendStreamingText: (delta: string) => void;
  suggestions: AgentSuggestion[];
  addSuggestion: (suggestion: AgentSuggestion) => void;
  removeSuggestion: (id: string) => void;
  clearSuggestions: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  selectedModel: 'ollama:llama3.2',
  setSelectedModel: (model) => set({ selectedModel: model }),
  useRag: true,
  setUseRag: (useRag) => set({ useRag }),
  isStreaming: false,
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  streamingText: '',
  setStreamingText: (streamingText) => set({ streamingText }),
  appendStreamingText: (delta) =>
    set((state) => ({ streamingText: state.streamingText + delta })),
  suggestions: [],
  addSuggestion: (suggestion) =>
    set((state) => ({ suggestions: [suggestion, ...state.suggestions] })),
  removeSuggestion: (id) =>
    set((state) => ({
      suggestions: state.suggestions.filter((s) => s.id !== id),
    })),
  clearSuggestions: () => set({ suggestions: [] }),
}));
