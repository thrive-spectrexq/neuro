import React from 'react';
import { Book, Edit3, Network, Search, Settings, Zap } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: any) => void;
  onOpenJarvis?: () => void;
}

export default function Layout({ children, currentPage, onNavigate, onOpenJarvis }: LayoutProps) {
  const navItems = [
    { id: 'notes', icon: Book, label: 'Notes' },
    { id: 'editor', icon: Edit3, label: 'Editor' },
    { id: 'graph', icon: Network, label: 'Graph' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-16 flex flex-col items-center py-4 bg-panel border-r border-white/5 shadow-lg z-10 flex-shrink-0 titlebar-drag">
        {/* Neuro Logo */}
        <div className="w-9 h-9 bg-gradient-to-br from-accent-purple via-accent-blue to-accent-cyan rounded-xl mb-6 shadow-lg shadow-accent-purple/20 flex items-center justify-center flex-shrink-0 cursor-pointer" onClick={() => onNavigate('notes')}>
          <div className="w-3.5 h-3.5 rounded-full bg-white/90 shadow-sm animate-pulse" />
        </div>
        
        {/* Navigation Items */}
        <div className="flex flex-col gap-3 flex-1 mt-1 no-drag">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`p-3 rounded-xl transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-accent-purple/20 text-accent-purple shadow-[0_0_15px_rgba(124,58,237,0.25)] border border-accent-purple/30' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
                }`}
                title={item.label}
              >
                <Icon size={20} className={isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} />
              </button>
            );
          })}
        </div>

        {/* JARVIS Tactical Agent Button */}
        <div className="no-drag mt-auto flex flex-col items-center gap-2">
          <button
            onClick={onOpenJarvis}
            className="relative p-3 rounded-2xl bg-gradient-to-tr from-accent-purple/30 via-accent-cyan/20 to-accent-blue/30 border border-accent-cyan/40 text-accent-cyan hover:scale-110 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-300 group"
            title="JARVIS OS Agent (Ctrl+Space)"
          >
            <Zap size={20} className="group-hover:animate-bounce text-accent-cyan" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent-cyan rounded-full animate-ping" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="h-8 w-full titlebar-drag absolute top-0 left-0 z-50 flex items-center justify-end px-4">
          {/* Subtle status indicator in titlebar */}
          <div className="no-drag flex items-center gap-2 text-[11px] text-gray-500 font-medium">
            <button
              onClick={onOpenJarvis}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-accent-cyan transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>JARVIS</span>
              <kbd className="text-[9px] px-1 bg-black/40 rounded border border-white/10 text-gray-300">Ctrl+Space</kbd>
            </button>
          </div>
        </div>
        <main className="flex-1 overflow-auto pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
