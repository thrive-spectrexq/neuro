import React, { useEffect, useCallback, useState } from 'react';
import {
  FileText,
  Edit3,
  Network,
  Search,
  Settings,
  Sparkles,
  ChevronRight,
  Radio,
  Brain,
  Activity,
  Upload,
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
  item: (typeof navItems)[number];
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
      className={`relative w-full aspect-square rounded-2xl flex items-center justify-center transition-all duration-200 ease-out group ${
        isActive
          ? 'bg-white/[0.12] text-white shadow-sm border border-white/[0.1]'
          : 'text-[#86868B] hover:text-[#F5F5F7] hover:bg-white/[0.06] border border-transparent'
      }`}
      title={`${item.label} (Alt+${item.shortcut})`}
    >
      {/* Apple Blue active indicator bar */}
      <span
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-[#0071E3] shadow-[0_0_8px_rgba(0,113,227,0.6)] transition-all duration-200 ease-out ${
          isActive ? 'h-4 opacity-100' : 'h-0 opacity-0'
        }`}
      />
      <Icon
        size={18}
        className={`transition-all duration-200 ${
          isActive ? 'text-white scale-105' : 'group-hover:scale-105 group-hover:text-[#F5F5F7]'
        }`}
      />

      {/* Apple Frosted Tooltip */}
      {showTooltip && (
        <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none animate-in fade-in duration-150">
          <div className="px-2.5 py-1.5 rounded-xl bg-[#1C1C22]/95 backdrop-blur-xl border border-white/[0.12] shadow-xl whitespace-nowrap flex items-center gap-2">
            <span className="text-[11px] font-medium tracking-tight text-[#F5F5F7]">
              {item.label}
            </span>
            <kbd className="text-[9px] px-1 py-0.5 rounded bg-white/[0.08] border border-white/[0.08] text-[#86868B] font-mono">
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
      className="w-10 h-10 rounded-2xl bg-gradient-to-br from-white/[0.1] to-white/[0.02] border border-white/[0.12] flex items-center justify-center cursor-pointer hover:border-[#0071E3]/60 hover:shadow-[0_0_20px_rgba(0,113,227,0.25)] transition-all duration-200 group relative no-drag"
      title="Neuro — AI Workspace"
    >
      {/* Iridescent Apple Intelligence Core */}
      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#0071E3] via-[#5E5CE6] to-[#BF5AF2] p-[1.5px] shadow-sm group-hover:scale-105 transition-transform duration-200">
        <div className="w-full h-full rounded-full bg-[#000000] flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
        </div>
      </div>
    </div>
  );
}

function AgentSummonButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full aspect-square rounded-2xl bg-gradient-to-b from-[#0071E3]/20 via-[#5E5CE6]/15 to-transparent border border-[#0071E3]/30 hover:border-[#0071E3]/60 hover:shadow-[0_0_20px_rgba(0,113,227,0.3)] text-[#0A84FF] hover:text-white transition-all duration-200 flex items-center justify-center group relative"
      title="Neuro Intelligence (Ctrl+Space / 'Hey Neuro')"
    >
      <Sparkles
        size={16}
        className="group-hover:scale-110 transition-transform text-[#0A84FF] group-hover:text-white"
      />
      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#0071E3] animate-pulse shadow-[0_0_8px_#0071E3]" />
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
    [onNavigate],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Separate settings from main nav for bottom placement
  const mainNavItems = navItems.filter((i) => i.id !== 'settings');
  const settingsItem = navItems.find((i) => i.id === 'settings')!;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#000000] text-[#F5F5F7] font-sans">
      {/* ═══ Apple macOS Translucent Sidebar ═══ */}
      <aside className="w-sidebar flex flex-col items-center bg-[#0B0B0E]/85 backdrop-blur-2xl border-r border-white/[0.08] z-30 flex-shrink-0 select-none titlebar-drag">
        {/* Brand Mark */}
        <div className="h-header flex items-center justify-center flex-shrink-0 border-b border-white/[0.06]">
          <BrandMark onClick={() => onNavigate('notes')} />
        </div>

        {/* Primary Navigation */}
        <nav className="flex flex-col gap-1.5 flex-1 w-full px-2.5 pt-3 no-drag overflow-y-auto">
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
        <div className="w-full px-2.5 pb-3 no-drag flex flex-col items-center gap-2">
          {/* Subtle divider */}
          <div className="w-8 h-px bg-white/[0.08] mb-0.5" />

          {/* Neuro Intelligence Summon */}
          <AgentSummonButton onClick={onOpenJarvis} />

          {/* Settings */}
          <NavButton
            item={settingsItem}
            isActive={currentPage === 'settings'}
            onClick={() => onNavigate('settings')}
          />

          {/* Version pill */}
          <div className="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono text-[#86868B] bg-white/[0.04] border border-white/[0.06] select-none">
            v0.2.1
          </div>
        </div>
      </aside>

      {/* ═══ Main Content Area ═══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#000000]">
        {/* Apple macOS Unified Header Bar */}
        <header className="h-header w-full titlebar-drag flex items-center justify-between px-5 border-b border-white/[0.08] bg-[#0A0A0D]/75 backdrop-blur-2xl select-none z-20 flex-shrink-0">
          {/* Breadcrumb */}
          <div className="no-drag flex items-center gap-2 text-xs">
            <span className="text-[#F5F5F7] font-semibold tracking-tight">Neuro</span>
            <ChevronRight size={12} className="text-[#86868B]" />
            <div className="flex items-center gap-1.5">
              {(() => {
                const activeItem = navItems.find((n) => n.id === currentPage);
                const ActiveIcon = activeItem?.icon || FileText;
                return (
                  <>
                    <ActiveIcon size={13} className="text-[#0A84FF]" />
                    <span className="capitalize text-[#A1A1A6] font-medium tracking-tight">
                      {activeItem?.label || currentPage}
                    </span>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Center Spotlight Command Pill */}
          <div className="no-drag">
            <button
              onClick={onOpenJarvis}
              className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.09] hover:border-white/[0.16] text-[#A1A1A6] hover:text-[#F5F5F7] text-xs transition-all duration-150 group shadow-sm"
            >
              <Search
                size={13}
                className="text-[#86868B] group-hover:text-[#0A84FF] transition-colors"
              />
              <span className="text-xs font-normal tracking-tight">
                Spotlight & Intelligence...
              </span>
              <kbd className="text-[10px] px-1.5 py-0.5 bg-black/40 rounded-md border border-white/[0.08] text-[#86868B] font-mono">
                Ctrl+Space
              </kbd>
            </button>
          </div>

          {/* Right Status Cluster */}
          <div className="no-drag flex items-center gap-2 text-xs">
            {/* Desktop Orb Button */}
            <button
              onClick={() => (window as any).electronAPI?.createOrbWindow()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-[#A1A1A6] hover:text-[#F5F5F7] text-[11px] font-medium transition-all"
              title="Spawn Floating Desktop Orb"
            >
              <Radio size={10} className="text-[#30D158]" />
              <span>Orb</span>
            </button>

            {/* Engine Status */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#30D158]/10 border border-[#30D158]/20 text-[#30D158] text-[11px] font-medium tracking-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] shadow-[0_0_6px_#30D158]" />
              <span>Ready</span>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-auto animate-fade-in bg-[#000000]">{children}</main>
      </div>
    </div>
  );
}
