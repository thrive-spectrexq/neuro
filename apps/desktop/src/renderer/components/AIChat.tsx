import React, { useState } from 'react';
import { Send } from 'lucide-react';

export default function AIChat() {
  const [input, setInput] = useState('');

  return (
    <div className="flex flex-col h-full bg-panel">
      <div className="p-4 border-b border-white/5">
        <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">AI Assistant</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-surface p-3 rounded-lg text-sm text-gray-300 border border-white/5">
          Hello! I'm your Neuro AI assistant. How can I help you with your notes today?
        </div>
      </div>
      
      <div className="p-4 border-t border-white/5">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..." 
            className="w-full bg-surface border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-accent-purple/50 pr-10"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-accent-purple p-1">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
