import React, { useState, useEffect } from 'react';
import { debounce } from '@neuro/shared';

export interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Spotlight search...',
}) => {
  const [value, setValue] = useState('');

  const debouncedSearch = React.useCallback(
    debounce((q: string) => onSearch(q), 300),
    [onSearch],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSearch(newValue);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative w-full max-w-md group">
      <input
        id="global-search"
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-9 pr-14 py-2 text-xs rounded-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.1] border border-white/[0.1] hover:border-white/[0.16] focus:border-[#0071E3] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 text-[#F5F5F7] placeholder:text-[#86868B] transition-all duration-150 backdrop-blur-md"
      />
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B] group-focus-within:text-[#0A84FF] transition-colors pointer-events-none">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#86868B] bg-white/[0.08] px-1.5 py-0.5 rounded-md border border-white/[0.08] pointer-events-none">
        ⌘K
      </div>
    </div>
  );
};
