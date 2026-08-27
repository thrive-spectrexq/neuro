import React, { useEffect, useCallback, useState } from 'react';
import {
  FileText,
  Edit3,
  Network,
  Search,
  Settings,
  Zap,
  ChevronRight,
  Radio,
  Brain,
  Shield,
  Upload,
  Activity,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: any) => void;
  onOpenJarvis?: () => void;
}

const navItems = [
  { id: 'notes', icon: FileText, label: 'Notes', shortcut: '1' },
  { id: 'editor', icon: Edit3, label: 'Editor', shortcut: '2' },
  { id: 'graph', icon: Network, label: 'Graph', shortcut: '3' },
  { id: 'flashcards', icon: Brain, label: 'Recall', shortcut: '4' },
  { id: 'search', icon: Search, label: 'Search', shortcut: '5' },
  { id: 'vault-health', icon: Activity, label: 'Vault Health', shortcut: '7' },
  { id: 'ingest', icon: Upload, label: 'Ingest', shortcut: '8' },
  { id: 'settings', icon: Settings, label: 'Settings', shortcut: '6' },
];

function NavButton({
  item,
  isActive,
  onClick,
}: {
  item: typeof navItems[number];
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={`relative w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 ease-out group ${
        isActive
          ? 'bg-white/[0.08] text-white shadow-sm border border-white/[0.08]'
          : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
      }`}
      title={`${item.label} (Alt+${item.shortcut})`}
    >
      {/* Active indicator bar — slides in */}
      <span
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-brand-cyan shadow-glow-cyan transition-all duration-200 ease-out-expo ${
          isActive ? 'h-4 opacity-100' : 'h-0 opacity-0'
        }`}
      />
      <Icon
        size={18}
        className={`transition-all duration-200 ${
          isActive
            ? 'text-brand-cyan-light scale-105'
            : 'group-hover:scale-105 group-hover:text-zinc-200'
        }`}
      />

      {/* Floating tooltip */}
      {showTooltip && (
        <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none animate-fade-in">
          <div className="px-2.5 py-1.5 rounded-lg bg-surface-elevated border border-white/[0.1] shadow-elevated whitespace-nowrap flex items-center gap-2">
            <span className="text-[11px] font-semibold text-zinc-200">{item.label}</span>
            <kbd className="text-[9px] px-1 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-zinc-500 font-mono">
              Alt+{item.shortcut}
            </kbd>
          </div>
        </div>
      )}
    </button>
  );
}

function BrandMark({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-cyan/20 via-brand-primary/15 to-brand-cyan/5 border border-brand-cyan/25 flex items-center justify-center cursor-pointer hover:border-brand-cyan/50 transition-all duration-200 group relative no-drag"
      title="Neuro — AI Second Brain"
    >
      {/* Outer pulse ring */}
      <div className="absolute inset-0 rounded-xl bg-brand-cyan/10 animate-pulse-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
      {/* Inner core */}
      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-brand-cyan to-brand-primary flex items-center justify-center shadow-glow-cyan group-hover:scale-110 transition-transform duration-200">
        <div className="w-1.5 h-1.5 rounded-full bg-white" />
      </div>
    </div>
  );
}

function AgentSummonButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full aspect-square rounded-xl bg-gradient-to-b from-brand-cyan/15 to-brand-primary/8 border border-brand-cyan/25 text-brand-cyan hover:border-brand-cyan/50 hover:shadow-glow-cyan transition-all duration-200 flex items-center justify-center group relative"
      title="Summon Neuro Agent (Ctrl+Space / 'Hey Neuro')"
    >
      <Zap size={17} className="group-hover:scale-110 transition-transform text-brand-cyan" />
      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand-cyan animate-pulse shadow-glow-cyan" />
    </button>
  );
}

export default function Layout({ children, currentPage, onNavigate, onOpenJarvis }: LayoutProps) {
  // Keyboard shortcut handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const item = navItems.find((n) => n.shortcut === e.key);
        if (item) {
          e.preventDefault();
          onNavigate(item.id);
        }
      }
    },
    [onNavigate]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Separate settings from main nav for bottom placement
  const mainNavItems = navItems.filter((i) => i.id !== 'settings');
  const settingsItem = navItems.find((i) => i.id === 'settings')!;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-zinc-100 font-sans">
      {/* ═══ Sidebar Navigation ═══ */}
      <aside className="w-sidebar flex flex-col items-center bg-background-secondary border-r border-white/[0.06] z-30 flex-shrink-0 select-none titlebar-drag">
        {/* Brand Mark */}
        <div className="h-header flex items-center justify-center flex-shrink-0 border-b border-white/[0.04]">
          <BrandMark onClick={() => onNavigate('notes')} />
        </div>

        {/* Primary Navigation */}
        <nav className="flex flex-col gap-1 flex-1 w-full px-2.5 pt-3 no-drag overflow-y-auto">
          {mainNavItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={currentPage === item.id}
              onClick={() => onNavigate(item.id)}
            />
          ))}
        </nav>

        {/* Bottom Section: Divider + Agent + Settings + Version */}
        <div className="w-full px-2.5 pb-3 no-drag flex flex-col items-center gap-1.5">
          {/* Subtle divider */}
          <div className="w-8 h-px bg-white/[0.06] mb-1" />

          {/* Agent summon */}
          <AgentSummonButton onClick={onOpenJarvis} />

          {/* Settings */}
          <NavButton
            item={settingsItem}
            isActive={currentPage === 'settings'}
            onClick={() => onNavigate('settings')}
          />

          {/* Version pill */}
          <div className="mt-1 px-2 py-0.5 rounded-pill text-[9px] font-mono text-zinc-600 select-none">
            v0.1.1
          </div>
        </div>
      </aside>

      {/* ═══ Main Content Area ═══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-background">
        {/* Header Bar */}
        <header className="h-header w-full titlebar-drag flex items-center justify-between px-4 border-b border-white/[0.05] bg-background-secondary/80 backdrop-blur-md select-none z-20 flex-shrink-0">
          {/* Breadcrumb */}
          <div className="no-drag flex items-center gap-2 text-[11px]">
            <span className="text-zinc-300 font-semibold tracking-tight">Neuro</span>
            <ChevronRight size={11} className="text-zinc-600" />
            <div className="flex items-center gap-1.5">
              {(() => {
                const activeItem = navItems.find((n) => n.id === currentPage);
                const ActiveIcon = activeItem?.icon || FileText;
                return (
                  <>
                    <ActiveIcon size={12} className="text-zinc-500" />
                    <span className="capitalize text-zinc-400 font-medium">
                      {activeItem?.label || currentPage}
                    </span>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Center Command Pill */}
          <div className="no-drag">
            <button
              onClick={onOpenJarvis}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-button bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1] text-zinc-400 hover:text-zinc-200 text-xs transition-all duration-150 group"
            >
              <Search size={12} className="text-zinc-500 group-hover:text-brand-cyan transition-colors" />
              <span className="text-[11px] font-sans">Command & Voice Agent...</span>
              <kbd className="text-[9px] px-1.5 py-0.5 bg-black/30 rounded border border-white/[0.06] text-zinc-500 font-mono">
                Ctrl+Space
              </kbd>
            </button>
          </div>

          {/* Right Status Cluster */}
          <div className="no-drag flex items-center gap-2 text-[11px]">
            {/* Desktop Orb Button */}
            <button
              onClick={() => (window as any).electronAPI?.createOrbWindow()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono hover:bg-cyan-900/30 hover:border-cyan-500/35 transition-all duration-150"
              title="Spawn Floating Neon Desktop Orb"
            >
              <Radio size={9} className="text-cyan-400 animate-pulse" />
              <span>Orb</span>
            </button>

            {/* Engine Status */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-emerald-950/30 border border-emerald-500/15 text-emerald-400 text-[10px] font-mono">
              <span className="status-dot-online" />
              <span>Ready</span>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
