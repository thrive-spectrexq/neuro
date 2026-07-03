import React from 'react';
import NoteEditor from '../components/NoteEditor';
import AIChat from '../components/AIChat';

export default function EditorPage() {
  return (
    <div className="flex h-full w-full">
      <div className="flex-1 border-r border-white/5">
        <NoteEditor />
      </div>
      <div className="w-80 flex-shrink-0 bg-panel">
        <AIChat />
      </div>
    </div>
  );
}
