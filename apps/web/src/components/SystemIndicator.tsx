import React from 'react';
import { Sparkles, Radio, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useAgentStore } from '../stores/agentStore';

export const SystemIndicator: React.FC = () => {
  const isAssistantOpen = useUIStore((state) => state.isAssistantOpen);
  const toggleAssistant = useUIStore((state) => state.toggleAssistant);
  const isStreaming = useAgentStore((state) => state.isStreaming);
  const suggestionsCount = useAgentStore((state) => state.suggestions.length);

  return (
    <button
      onClick={toggleAssistant}
      className={`h-8 px-2.5 rounded-lg border text-xs font-medium transition-all duration-150 flex items-center gap-2 select-none ${
        isAssistantOpen
          ? 'bg-[#1E1B4B] border-[#4338CA] text-white shadow-sm'
          : 'bg-[#141722] hover:bg-[#1D2230] border-[#242A3C] text-[#94A3B8] hover:text-[#F1F5F9]'
      }`}
      aria-label="Toggle Assistant Drawer"
      aria-expanded={isAssistantOpen}
      title="Toggle Contextual Assistant (⌘J)"
    >
      <div className="flex items-center gap-1.5">
        {isStreaming ? (
          <Radio className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
        )}
        <span className="hidden sm:inline">Assistant</span>
      </div>

      {suggestionsCount > 0 && (
        <span className="px-1.5 py-0.2 text-[10px] font-mono font-semibold bg-teal-600 text-white rounded-full">
          {suggestionsCount}
        </span>
      )}

      <div className="flex items-center gap-1 text-[#64748B]">
        <kbd className="hidden md:inline-block px-1 py-0.5 text-[10px] font-mono bg-[#161A24] border border-[#282E40] rounded text-[#94A3B8]">
          ⌘J
        </kbd>
        {isAssistantOpen ? (
          <PanelRightClose className="w-3.5 h-3.5 text-[#94A3B8]" />
        ) : (
          <PanelRightOpen className="w-3.5 h-3.5 text-[#94A3B8]" />
        )}
      </div>
    </button>
  );
};
