import React, { useState } from 'react';

export default function NoteEditor() {
  const [content, setContent] = useState('# New Note\n\nStart typing here...');

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="p-4 border-b border-white/5">
        <input 
          type="text" 
          placeholder="Note Title" 
          className="bg-transparent text-2xl font-bold text-white outline-none w-full"
          defaultValue="New Note"
        />
      </div>
      <div className="flex-1 p-4">
        {/* Placeholder for CodeMirror */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-full bg-transparent text-gray-300 outline-none resize-none font-mono text-sm leading-relaxed"
          placeholder="Start typing..."
        />
      </div>
    </div>
  );
}
