import React from 'react';
import { Book, Edit3, Network, Search, Settings } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: any) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
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
        <div className="w-8 h-8 bg-gradient-to-br from-accent-purple to-accent-blue rounded-lg mb-8 shadow-lg flex-shrink-0" />
        
        <div className="flex flex-col gap-4 flex-1 mt-4 no-drag">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`p-3 rounded-xl transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-accent-purple/20 text-accent-purple shadow-[0_0_15px_rgba(124,58,237,0.2)]' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
                title={item.label}
              >
                <Icon size={20} className={isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="h-8 w-full titlebar-drag absolute top-0 left-0 z-50"></div>
        <main className="flex-1 overflow-auto pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
