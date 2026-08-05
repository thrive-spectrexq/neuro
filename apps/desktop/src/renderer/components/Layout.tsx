import React from 'react';
import {
  FileText,
  Edit3,
  Network,
  Search,
  Settings,
  Zap,
  Command,
  Activity,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: any) => void;
  onOpenJarvis?: () => void;
}

export default function Layout({ children, currentPage, onNavigate, onOpenJarvis }: LayoutProps) {
  const navItems = [
    { id: 'notes', icon: FileText, label: 'Notes', shortcut: '1' },
    { id: 'editor', icon: Edit3, label: 'Editor', shortcut: '2' },
    { id: 'graph', icon: Network, label: 'Graph', shortcut: '3' },
    { id: 'search', icon: Search, label: 'Search', shortcut: '4' },
    { id: 'settings', icon: Settings, label: 'Settings', shortcut: '5' },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-zinc-100 font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-[68px] flex flex-col items-center py-3.5 bg-[#0a0c14] border-r border-white/[0.06] z-30 flex-shrink-0 select-none titlebar-drag">
        
        {/* Neuro Brand Icon */}
        <div 
          onClick={() => onNavigate('notes')}
          className="w-10 h-10 rounded-xl bg-gradient-to-b from-brand-primary/25 to-brand-primary/5 border border-brand-primary/30 flex items-center justify-center cursor-pointer hover:border-brand-primary/60 transition-all duration-200 shadow-sm no-drag mb-5 group"
          title="Neuro Second Brain"
        >
          <div className="w-4 h-4 rounded-full bg-brand-primary flex items-center justify-center shadow-glow-primary group-hover:scale-110 transition-transform">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </div>
        </div>

        {/* Primary Navigation Items */}
        <nav className="flex flex-col gap-1.5 flex-1 w-full px-2.5 no-drag">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`relative w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-150 group ${
                  isActive
                    ? 'bg-white/[0.08] text-white shadow-sm border border-white/[0.08]'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
                }`}
                title={`${item.label} (Alt+${item.shortcut})`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-brand-primary rounded-r-full shadow-glow-primary" />
                )}
                <Icon size={18} className={`transition-transform duration-150 ${isActive ? 'scale-105 text-brand-primary-light' : 'group-hover:scale-105'}`} />
              </button>
            );
          })}
        </nav>

        {/* Tactical Voice Agent Summon Pill */}
        <div className="no-drag mt-auto flex flex-col items-center gap-3 px-2 w-full">
          <button
            onClick={onOpenJarvis}
            className="w-full aspect-square rounded-xl bg-gradient-to-b from-brand-cyan/20 to-brand-primary/10 border border-brand-cyan/30 text-brand-cyan hover:border-brand-cyan/60 hover:shadow-glow-cyan transition-all duration-200 flex items-center justify-center group relative"
            title="Summon Neuro Agent (Ctrl + Space / 'Hey Neuro')"
          >
            <Zap size={18} className="group-hover:scale-110 transition-transform text-brand-cyan" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
          </button>
        </div>
      </aside>

      {/* Main Content Workspace Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#07080c]">
        
        {/* Custom Window Title Bar & Global Header */}
        <header className="h-9 w-full titlebar-drag flex items-center justify-between px-4 border-b border-white/[0.05] bg-[#090b12]/80 backdrop-blur-md select-none z-20 flex-shrink-0">
          
          {/* Breadcrumb / Workspace Name */}
          <div className="no-drag flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
            <span className="text-zinc-200 font-semibold tracking-tight">Neuro Workspace</span>
            <ChevronRight size={12} className="text-zinc-600" />
            <span className="capitalize text-zinc-400 font-mono text-[11px]">{currentPage}</span>
          </div>

          {/* Center Search Pill / Global Hotkey Trigger */}
          <div className="no-drag">
            <button
              onClick={onOpenJarvis}
              className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-zinc-400 hover:text-zinc-200 text-xs transition-all"
            >
              <Search size={12} className="text-zinc-500" />
              <span className="text-[11px] font-sans">Command & Voice Agent...</span>
              <kbd className="text-[10px] px-1.5 py-0.2 bg-black/40 rounded border border-white/[0.08] text-zinc-400 font-mono">
                Ctrl+Space
              </kbd>
            </button>
          </div>

          {/* Engine Status & Telemetry Pill */}
          <div className="no-drag flex items-center gap-3 text-[11px] text-zinc-500">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Offline Ready</span>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

    </div>
  );
}
