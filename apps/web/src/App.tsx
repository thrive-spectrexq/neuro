import React, { useEffect, lazy, Suspense } from 'react';
import GraphView from './components/GraphView';
import AuthForm from './components/AuthForm';
import CreateNoteForm from './components/CreateNoteForm';
import { SystemIndicator } from './components/SystemIndicator';
import { AssistantDrawer } from './components/assistant/AssistantDrawer';
import { ImportHubModal } from './components/ImportHubModal';
import { WebClipperModal } from './components/WebClipperModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { VoiceAssistant } from './components/VoiceAssistant';
import { useAuthStore } from './stores/authStore';
import { useUIStore, ActiveTab } from './stores/uiStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from './services/apiClient';
import {
  Network,
  LayoutGrid,
  CheckSquare,
  ShieldCheck,
  Zap,
  Shield,
  Search,
  FolderPlus,
  Globe,
  GraduationCap,
  HardDrive,
  Cpu,
  Radio,
  Sliders,
  LogOut,
  FolderGit2,
  Loader2,
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';

// Code-split heavy studios for faster initial load
const TaskKanbanBoard = lazy(() =>
  import('./components/TaskKanbanBoard').then((m) => ({ default: m.TaskKanbanBoard })),
);
const VaultCanvasStudio = lazy(() =>
  import('./components/VaultCanvasStudio').then((m) => ({ default: m.VaultCanvasStudio })),
);
const SpacedRepetitionStudio = lazy(() =>
  import('./components/SpacedRepetitionStudio').then((m) => ({
    default: m.SpacedRepetitionStudio,
  })),
);
const VaultLintStudio = lazy(() =>
  import('./components/VaultLintStudio').then((m) => ({ default: m.VaultLintStudio })),
);
const AutomationBuilder = lazy(() =>
  import('./components/AutomationBuilder').then((m) => ({ default: m.AutomationBuilder })),
);
const AuditLogViewer = lazy(() =>
  import('./components/AuditLogViewer').then((m) => ({ default: m.AuditLogViewer })),
);

const StudioLoadingSkeleton: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex-1 h-full flex flex-col items-center justify-center bg-[#000000] text-[#86868B]">
    <Loader2 className="w-6 h-6 animate-spin text-[#0A84FF] mb-2" />
    <span className="text-xs font-mono">Loading {title}...</span>
  </div>
);

export default function App() {
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);

  const {
    activeTab,
    setActiveTab,
    toggleAssistant,
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    showImportHub,
    setShowImportHub,
    showWebClipper,
    setShowWebClipper,
  } = useUIStore();

  // Fetch live vault status for status bar using apiClient
  const { data: notes = [] } = useQuery<any[]>({
    queryKey: ['notes'],
    queryFn: async () => {
      return apiClient.get<any[]>('/notes');
    },
    enabled: !!token,
  });

  // Global keyboard shortcuts (⌘K / Ctrl+K for Search, ⌘J / Ctrl+J for Assistant)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        toggleAssistant();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen, toggleAssistant]);

  if (!token) {
    return <AuthForm />;
  }

  const navItems: { id: ActiveTab; label: string; icon: any; shortcut: string }[] = [
    { id: 'graph', label: 'Graph & Notes', icon: Network, shortcut: '1' },
    { id: 'canvas', label: 'Canvas Studio', icon: LayoutGrid, shortcut: '2' },
    { id: 'tasks', label: 'Task Kanban', icon: CheckSquare, shortcut: '3' },
    { id: 'study', label: 'Study & Recall', icon: GraduationCap, shortcut: '4' },
    { id: 'diagnostics', label: 'Diagnostics', icon: ShieldCheck, shortcut: '5' },
    { id: 'automations', label: 'Automations', icon: Zap, shortcut: '6' },
    { id: 'audit', label: 'Audit Log', icon: Shield, shortcut: '7' },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-[#000000] text-[#F5F5F7] font-sans select-none overflow-hidden">
      {/* 1. Apple macOS Sequoia Style Toolbar */}
      <header className="h-12 flex-shrink-0 bg-[#0A0A0D]/80 backdrop-blur-2xl border-b border-white/[0.08] flex items-center justify-between px-5 z-30">
        {/* Left: Vault Identity & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#0071E3] via-[#5E5CE6] to-[#BF5AF2] flex items-center justify-center text-white shadow-sm p-[1.5px]">
              <div className="w-full h-full rounded-[10px] bg-black flex items-center justify-center">
                <FolderGit2 className="w-3.5 h-3.5 text-[#0A84FF]" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="text-[#F5F5F7] font-medium tracking-tight">Neuro</span>
              <span className="text-[#86868B]">/</span>
              <span className="text-[#A1A1A6] font-mono text-[11px] bg-white/[0.06] px-2 py-0.5 rounded-full border border-white/[0.08]">
                vault-main
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-white/[0.08]" />

          {/* Sync Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 bg-white/[0.05] border border-white/[0.08] rounded-full text-[11px] font-medium text-[#A1A1A6]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] shadow-[0_0_6px_#30D158]" />
            <span className="text-[#30D158] font-medium">Synced</span>
          </div>
        </div>

        {/* Center: Spotlight Command Palette Trigger */}
        <div className="flex-1 max-w-md mx-4">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full h-8 px-4 bg-white/[0.06] hover:bg-white/[0.09] border border-white/[0.09] hover:border-white/[0.16] rounded-full text-[#86868B] hover:text-[#F5F5F7] transition-all flex items-center justify-between text-xs group shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#86868B] group-hover:text-[#0A84FF] transition-colors" />
              <span className="font-normal tracking-tight">
                Search vault, commands, or jump to note...
              </span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="text-[10px] font-mono text-[#86868B] bg-black/40 px-1.5 py-0.5 rounded border border-white/[0.08]">
                ⌘K
              </kbd>
            </div>
          </button>
        </div>

        {/* Right: Quick Tools, System Indicator & Account */}
        <div className="flex items-center gap-2">
          {/* Quick Action Pill Buttons */}
          <button
            onClick={() => setShowImportHub(true)}
            className="h-7 px-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-full text-[#A1A1A6] hover:text-white transition-all flex items-center gap-1.5 text-xs font-medium"
            title="Import Markdown, Obsidian or Notion"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#0A84FF]" />
            <span className="hidden sm:inline">Import</span>
          </button>

          <button
            onClick={() => setShowWebClipper(true)}
            className="h-7 px-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-full text-[#A1A1A6] hover:text-white transition-all flex items-center gap-1.5 text-xs font-medium"
            title="Web Clipper"
          >
            <Globe className="w-3.5 h-3.5 text-[#5E5CE6]" />
            <span className="hidden sm:inline">Clip</span>
          </button>

          <div className="h-4 w-px bg-white/[0.08]" />

          {/* Contextual System & Assistant Indicator */}
          <SystemIndicator />

          {/* Sign Out */}
          <button
            onClick={logout}
            className="h-7 w-7 flex items-center justify-center bg-white/[0.06] hover:bg-[#FF453A]/15 border border-white/[0.08] hover:border-[#FF453A]/30 text-[#86868B] hover:text-[#FF453A] rounded-full transition-colors"
            title="Sign Out of Vault"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. Apple Segmented Control Navigation Bar */}
      <div className="h-11 flex-shrink-0 bg-[#000000] border-b border-white/[0.06] px-5 flex items-center justify-between">
        <nav className="flex items-center bg-white/[0.04] p-0.5 rounded-full border border-white/[0.07] overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`h-7 px-3.5 rounded-full text-xs font-medium tracking-tight flex items-center gap-2 transition-all duration-150 relative ${
                  isActive
                    ? 'bg-white/[0.14] text-white shadow-sm border border-white/[0.1]'
                    : 'text-[#86868B] hover:text-[#F5F5F7]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#0A84FF]' : 'text-[#86868B]'}`} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-[#0A84FF] shadow-[0_0_4px_#0A84FF]" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono text-[#86868B]">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-[#30D158]" />
            <span>Local Engine 0.8ms</span>
          </span>
          <span>•</span>
          <span>{notes.length} Notes Loaded</span>
        </div>
      </div>

      {/* 3. Main Central Workspace Area */}
      <div className="flex-1 flex overflow-hidden bg-[#000000]">
        {/* Active Module Panel */}
        <main className="flex-1 flex overflow-hidden">
          {activeTab === 'graph' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left Pane: Create & Edit Note Form */}
              <div className="w-[440px] flex-shrink-0 border-r border-white/[0.08] bg-[#0A0A0D] p-3 overflow-hidden">
                <CreateNoteForm />
              </div>

              {/* Right Pane: Graph Visualization Canvas */}
              <div className="flex-1 relative bg-[#000000] overflow-hidden">
                <GraphView />
              </div>
            </div>
          )}

          {activeTab === 'canvas' && (
            <Suspense fallback={<StudioLoadingSkeleton title="Canvas Studio" />}>
              <div className="flex-1 h-full overflow-hidden bg-[#000000]">
                <VaultCanvasStudio />
              </div>
            </Suspense>
          )}

          {activeTab === 'tasks' && (
            <Suspense fallback={<StudioLoadingSkeleton title="Task Board" />}>
              <div className="flex-1 h-full overflow-hidden bg-[#000000]">
                <TaskKanbanBoard />
              </div>
            </Suspense>
          )}

          {activeTab === 'study' && (
            <Suspense fallback={<StudioLoadingSkeleton title="Study & Recall" />}>
              <div className="flex-1 h-full overflow-hidden bg-[#000000]">
                <SpacedRepetitionStudio />
              </div>
            </Suspense>
          )}

          {activeTab === 'diagnostics' && (
            <Suspense fallback={<StudioLoadingSkeleton title="Diagnostics Studio" />}>
              <div className="flex-1 h-full overflow-hidden bg-[#000000]">
                <VaultLintStudio />
              </div>
            </Suspense>
          )}

          {activeTab === 'automations' && (
            <Suspense fallback={<StudioLoadingSkeleton title="Automation Builder" />}>
              <div className="flex-1 h-full overflow-hidden bg-[#000000]">
                <AutomationBuilder />
              </div>
            </Suspense>
          )}

          {activeTab === 'audit' && (
            <Suspense fallback={<StudioLoadingSkeleton title="Audit Log Viewer" />}>
              <div className="flex-1 h-full overflow-hidden bg-[#000000]">
                <AuditLogViewer />
              </div>
            </Suspense>
          )}
        </main>

        {/* Collapsible Right Contextual Assistant Drawer */}
        <AssistantDrawer />
      </div>

      {/* 4. Apple Minimalist Status Bar (Footer) */}
      <footer className="h-6 flex-shrink-0 bg-[#070709] border-t border-white/[0.06] px-4 flex items-center justify-between text-[11px] font-mono text-[#86868B] z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[#A1A1A6]">
            <HardDrive className="w-3 h-3 text-[#0A84FF]" />
            <span>neuro-vault: ~/notes</span>
          </div>
          <span className="text-white/[0.1]">|</span>
          <div>
            Total Notes: <span className="text-[#F5F5F7]">{notes.length}</span>
          </div>
          <span className="text-white/[0.1]">|</span>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-[#30D158]" />
            <span>Parser: Fast Markdown BM25</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            Encoding: <span className="text-[#A1A1A6]">UTF-8</span>
          </div>
          <span className="text-white/[0.1]">|</span>
          <div className="flex items-center gap-1.5 text-[#A1A1A6]">
            <Sliders className="w-3 h-3 text-[#0A84FF]" />
            <span>Zero-Cloud Mode</span>
          </div>
        </div>
      </footer>

      {/* Overlays & Modals */}
      {showImportHub && <ImportHubModal onClose={() => setShowImportHub(false)} />}
      {showWebClipper && <WebClipperModal onClose={() => setShowWebClipper(false)} />}

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectTab={(tab) => setActiveTab(tab as any)}
      />

      <VoiceAssistant />
      <Toaster position="bottom-right" />
    </div>
  );
}
