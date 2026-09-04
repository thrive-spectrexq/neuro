import React from 'react';
import { AgentSuggestion } from '@neuro/shared';
import { Check, Plus, HelpCircle, X, ExternalLink, Cpu } from 'lucide-react';
import { useAgentStore } from '../../stores/agentStore';

export interface SuggestionCardProps {
  suggestion: AgentSuggestion;
  onApply?: (suggestion: AgentSuggestion) => void;
  onInsert?: (suggestion: AgentSuggestion) => void;
  onExplain?: (suggestion: AgentSuggestion) => void;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onApply,
  onInsert,
  onExplain,
}) => {
  const removeSuggestion = useAgentStore((state) => state.removeSuggestion);

  const handleAction = (actionType: string) => {
    switch (actionType) {
      case 'apply':
        onApply?.(suggestion);
        removeSuggestion(suggestion.id);
        break;
      case 'insert':
        onInsert?.(suggestion);
        removeSuggestion(suggestion.id);
        break;
      case 'explain':
        onExplain?.(suggestion);
        break;
      case 'dismiss':
      default:
        removeSuggestion(suggestion.id);
        break;
    }
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    completion: { label: 'Completion', color: 'text-sky-400 bg-sky-950/40 border-sky-800/50' },
    lint_fix: { label: 'Lint Fix', color: 'text-amber-400 bg-amber-950/40 border-amber-800/50' },
    flashcard: { label: 'Recall Card', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50' },
    task: { label: 'Task Item', color: 'text-teal-400 bg-teal-950/40 border-teal-800/50' },
    search_synthesis: { label: 'Synthesis', color: 'text-teal-400 bg-teal-950/40 border-teal-800/50' },
    refactor: { label: 'Refactor', color: 'text-rose-400 bg-rose-950/40 border-rose-800/50' },
    explanation: { label: 'Insight', color: 'text-slate-300 bg-slate-800/40 border-slate-700/50' },
  };

  const badgeInfo = typeLabels[suggestion.type] || {
    label: 'Suggestion',
    color: 'text-slate-300 bg-slate-800/40 border-slate-700/50',
  };

  return (
    <div className="bg-[#12151D] border border-[#202636] hover:border-[#2F374E] rounded-lg p-3 transition-colors duration-150 flex flex-col gap-2.5">
      {/* Header: Type, Timestamp, Model & Dismiss */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-medium font-mono px-2 py-0.5 rounded border ${badgeInfo.color}`}
          >
            {badgeInfo.label}
          </span>
          {suggestion.metadata?.model && (
            <span className="text-[10px] font-mono text-[#64748B] flex items-center gap-1">
              <Cpu className="w-3 h-3 text-[#64748B]" />
              {String(suggestion.metadata.model).split(':').pop()}
            </span>
          )}
        </div>

        <button
          onClick={() => handleAction('dismiss')}
          className="text-[#64748B] hover:text-[#F1F5F9] p-1 rounded hover:bg-[#1C202C] transition-colors"
          title="Dismiss suggestion"
          aria-label="Dismiss suggestion"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="text-xs text-[#CBD5E1] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-sans">
        {suggestion.text}
      </div>

      {/* Citations / Provenance if present */}
      {suggestion.citations && suggestion.citations.length > 0 && (
        <div className="pt-2 border-t border-[#1C202C] flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
            Citations & Sources
          </span>
          <div className="flex flex-wrap gap-1.5">
            {suggestion.citations.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 text-[10px] bg-[#161A24] text-[#94A3B8] border border-[#262C3E] px-2 py-0.5 rounded max-w-[200px] truncate"
                title={c.snippet || c.title}
              >
                <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 text-teal-400" />
                <span className="truncate">{c.title}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 border-t border-[#1C202C] flex items-center justify-end gap-1.5">
        {suggestion.actions.map((act) => {
          if (act.action === 'apply') {
            return (
              <button
                key={act.id}
                onClick={() => handleAction('apply')}
                className="h-7 px-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-3 h-3" />
                <span>{act.label}</span>
              </button>
            );
          }
          if (act.action === 'insert') {
            return (
              <button
                key={act.id}
                onClick={() => handleAction('insert')}
                className="h-7 px-2.5 bg-[#151822] hover:bg-[#1D2230] text-[#CBD5E1] hover:text-white border border-[#262C3E] text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3 h-3 text-teal-400" />
                <span>{act.label}</span>
              </button>
            );
          }
          if (act.action === 'explain') {
            return (
              <button
                key={act.id}
                onClick={() => handleAction('explain')}
                className="h-7 px-2 bg-transparent hover:bg-[#1C202C] text-[#94A3B8] hover:text-white text-xs rounded-md flex items-center gap-1 transition-colors"
              >
                <HelpCircle className="w-3 h-3" />
                <span>{act.label}</span>
              </button>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};
