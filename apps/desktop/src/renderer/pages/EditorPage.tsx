import React, { useState, useEffect } from 'react';
import NoteEditor from '../components/NoteEditor';
import AIChat from '../components/AIChat';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';

export default function EditorPage() {
  const [showAssistant, setShowAssistant] = useState(true);
  const [isZenMode, setIsZenMode] = useState(false);

  // Esc key exits Zen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZenMode]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background relative">
      {/* Primary Markdown Editor Canvas */}
      <div className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
        <NoteEditor isZenMode={isZenMode} onToggleZenMode={() => setIsZenMode((z) => !z)} />
      </div>

      {/* AI Assistant Sidebar Toggle Button (Hidden in Zen Mode) */}
      {!isZenMode && (
        <button
          onClick={() => setShowAssistant(!showAssistant)}
          className="absolute right-4 top-4 z-20 p-2 rounded-xl bg-[#121624] border border-white/[0.08] hover:border-brand-primary/40 text-zinc-400 hover:text-white transition-all shadow-md"
          title={showAssistant ? 'Collapse AI Copilot' : 'Expand AI Copilot'}
        >
          {showAssistant ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
        </button>
      )}

      {/* AI Copilot Side Pane (Hidden in Zen Mode) */}
      {!isZenMode && showAssistant && (
        <aside className="w-88 w-[340px] flex-shrink-0 h-full border-l border-white/[0.06] bg-[#090c15] animate-in slide-in-from-right duration-200">
          <AIChat />
        </aside>
      )}
    </div>
  );
}
