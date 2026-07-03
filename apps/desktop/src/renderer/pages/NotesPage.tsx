import React from 'react';

export default function NotesPage() {
  return (
    <div className="p-8 h-full flex flex-col">
      <h1 className="text-3xl font-bold text-white mb-6">Your Notes</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="glass-panel p-5 rounded-2xl cursor-pointer hover:border-accent-purple/50 transition-colors group">
            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-accent-blue transition-colors">Note Title {i}</h3>
            <p className="text-gray-400 text-sm line-clamp-3">
              This is a preview of the note content. It shows what the note is about before opening it fully in the editor...
            </p>
            <div className="mt-4 flex gap-2">
              <span className="px-2 py-1 bg-white/5 rounded text-xs text-accent-cyan">#tag{i}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
