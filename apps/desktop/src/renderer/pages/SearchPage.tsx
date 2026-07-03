import React, { useState } from 'react';
import { Search } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');

  return (
    <div className="p-8 h-full flex flex-col max-w-4xl mx-auto">
      <div className="relative mb-8 mt-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your knowledge base..." 
          className="w-full bg-surface border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-lg text-white focus:outline-none focus:border-accent-purple/50 focus:shadow-[0_0_20px_rgba(124,58,237,0.15)] transition-all"
        />
      </div>

      <div className="flex-1 overflow-auto">
        <div className="text-sm text-gray-400 mb-4">Start typing to search across all notes...</div>
      </div>
    </div>
  );
}
