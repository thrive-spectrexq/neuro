import React, { useState } from 'react';
import NoteEditor from '../components/NoteEditor';
import AIChat from '../components/AIChat';
import { PanelRightClose, PanelRightOpen, Sparkles } from 'lucide-react';

export default function EditorPage() {
  const [showAssistant, setShowAssistant] = useState(true);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background relative">
      
      {/* Primary Markdown Editor Canvas */}
      <div className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
        <NoteEditor />
      </div>

      {/* AI Assistant Sidebar Toggle Button */}
      <button
        onClick={() => setShowAssistant(!showAssistant)}
        className="absolute right-4 top-4 z-20 p-2 rounded-xl bg-[#121624] border border-white/[0.08] hover:border-brand-primary/40 text-zinc-400 hover:text-white transition-all shadow-md"
        title={showAssistant ? 'Collapse AI Copilot' : 'Expand AI Copilot'}
      >
        {showAssistant ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
      </button>

      {/* AI Copilot Side Pane */}
      {showAssistant && (
        <aside className="w-88 w-[340px] flex-shrink-0 h-full border-l border-white/[0.06] bg-[#090c15] animate-in slide-in-from-right duration-200">
          <AIChat />
        </aside>
      )}
    </div>
  );
}
