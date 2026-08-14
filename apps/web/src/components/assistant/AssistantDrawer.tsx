import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Square, 
  Database, 
  Layers, 
  Info
} from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAgentStore } from '../../stores/agentStore';
import { agentClient } from '../../services/agentClient';
import { SuggestionCard } from './SuggestionCard';
import { VoiceControl } from './VoiceControl';

export const AssistantDrawer: React.FC = () => {
  const isAssistantOpen = useUIStore((state) => state.isAssistantOpen);
  const toggleAssistant = useUIStore((state) => state.toggleAssistant);

  const {
    selectedModel,
    setSelectedModel,
    useRag,
    setUseRag,
    isStreaming,
    setIsStreaming,
    streamingText,
    setStreamingText,
    appendStreamingText,
    suggestions,
    addSuggestion,
    clearSuggestions,
  } = useAgentStore();

  const [prompt, setPrompt] = useState('');

  if (!isAssistantOpen) {
    return null;
  }

  const handleSendPrompt = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || isStreaming) return;

    const currentPrompt = prompt;
    setPrompt('');
    setIsStreaming(true);
    setStreamingText('');

    await agentClient.streamSuggestion(
      {
        prompt: currentPrompt,
        useRag,
        model: selectedModel,
      },
      {
        onChunk: (chunk) => {
          if (!chunk.isComplete) {
            appendStreamingText(chunk.deltaText);
          }
        },
        onSuggestion: (suggestion) => {
          addSuggestion(suggestion);
          setStreamingText('');
          setIsStreaming(false);
        },
        onError: (err) => {
          console.error('Agent error:', err);
          setIsStreaming(false);
        },
        onDone: () => {
          setIsStreaming(false);
        },
      }
    );
  };

  const handleCancel = () => {
    agentClient.cancelCurrentStream();
    setIsStreaming(false);
    setStreamingText('');
  };

  return (
    <aside
      className="w-[400px] flex-shrink-0 border-l border-[#1C202C] bg-[#0E1017] flex flex-col h-full overflow-hidden select-none z-20"
      aria-label="Contextual Assistant Drawer"
    >
      {/* Header */}
      <div className="h-12 border-b border-[#1C202C] px-3.5 flex items-center justify-between bg-[#11131C]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#4F46E5] flex items-center justify-center text-white">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[#F1F5F9] leading-none">
              Contextual Assistant
            </h2>
            <span className="text-[10px] text-[#64748B] font-mono">Tools & Suggestions</span>
          </div>
        </div>

        <button
          onClick={toggleAssistant}
          className="p-1 text-[#64748B] hover:text-[#F1F5F9] rounded hover:bg-[#1C202C] transition-colors"
          title="Close Drawer (⌘J)"
          aria-label="Close Drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Model & RAG Settings Toolbar */}
      <div className="px-3.5 py-2 border-b border-[#1A1F2C] bg-[#0C0E14] flex items-center justify-between text-xs">
        {/* Model Selector */}
        <div className="relative flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#64748B]" />
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-[#141722] text-[#CBD5E1] text-[11px] font-mono border border-[#242A3C] rounded px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ollama:llama3.2">llama3.2 (Local)</option>
            <option value="ollama:deepseek-r1:8b">deepseek-r1:8b (Local)</option>
            <option value="openai:gpt-4o-mini">gpt-4o-mini (Cloud)</option>
            <option value="claude:sonnet-3.5">claude-3.5-sonnet (Cloud)</option>
          </select>
        </div>

        {/* RAG Toggle */}
        <button
          onClick={() => setUseRag(!useRag)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
            useRag
              ? 'bg-[#1E1B4B] border-[#3730A3] text-indigo-300'
              : 'bg-[#141722] border-[#242A3C] text-[#64748B]'
          }`}
          title="Toggle Vault RAG Grounding"
        >
          <Database className="w-3 h-3" />
          <span>RAG</span>
        </button>
      </div>

      {/* Suggestion Feed & Streaming Area */}
      <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3">
        {/* Voice control integration */}
        <VoiceControl />

        {/* Live Streaming State */}
        {isStreaming && (
          <div
            role="status"
            aria-live="polite"
            className="bg-[#12151E] border border-indigo-950/60 rounded-lg p-3 flex flex-col gap-2 animate-fadeIn"
          >
            <div className="flex items-center justify-between text-xs text-indigo-400 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                <span>Thinking & Streaming...</span>
              </span>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 text-[11px] text-[#FDA4AF] hover:text-rose-300 bg-[#2D141A] border border-[#881337] px-2 py-0.5 rounded transition-colors"
              >
                <Square className="w-2.5 h-2.5" />
                <span>Stop</span>
              </button>
            </div>
            <div className="text-xs text-[#CBD5E1] font-mono whitespace-pre-wrap leading-relaxed">
              {streamingText || 'Synthesizing response from notes...'}
            </div>
          </div>
        )}

        {/* Suggestions List */}
        {suggestions.length === 0 && !isStreaming ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#64748B]">
            <Info className="w-8 h-8 mb-2 opacity-50 text-indigo-400" />
            <p className="text-xs font-medium text-[#94A3B8]">No active suggestions</p>
            <p className="text-[11px] mt-1">
              Ask questions about your vault or request note summaries and linting fixes.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {suggestions.length > 1 && (
              <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B] px-0.5">
                <span>{suggestions.length} Suggestions</span>
                <button
                  onClick={clearSuggestions}
                  className="hover:text-rose-400 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}

            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onApply={(sug) => {
                  console.log('Applied suggestion:', sug.id);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Query Input Footer */}
      <form
        onSubmit={handleSendPrompt}
        className="p-3 border-t border-[#1C202C] bg-[#10121A] flex items-center gap-2"
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask vault or prompt assistant..."
          disabled={isStreaming}
          className="flex-1 h-8 bg-[#141722] border border-[#242A3C] focus:border-indigo-500 rounded-md px-3 text-xs text-[#F1F5F9] placeholder-[#64748B] outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || isStreaming}
          className="h-8 w-8 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-40 disabled:hover:bg-[#4F46E5] text-white rounded-md flex items-center justify-center transition-colors"
          title="Send query"
          aria-label="Send query"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </aside>
  );
};
