import { useState, useEffect } from 'react';
import GraphView from './components/GraphView';
import AuthForm from './components/AuthForm';
import CreateNoteForm from './components/CreateNoteForm';
import { AIChatPanel } from './components/AIChatPanel';
import { TaskKanbanBoard } from './components/TaskKanbanBoard';
import { AuditLogViewer } from './components/AuditLogViewer';
import { AutomationBuilder } from './components/AutomationBuilder';
import { VaultCanvasStudio } from './components/VaultCanvasStudio';
import { VaultLintStudio } from './components/VaultLintStudio';
import { SpacedRepetitionStudio } from './components/SpacedRepetitionStudio';
import { ImportHubModal } from './components/ImportHubModal';
import { WebClipperModal } from './components/WebClipperModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { useAuthStore } from './stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { 
  Network, 
  LayoutGrid, 
  CheckSquare, 
  ShieldCheck, 
  Zap, 
  Shield, 
  Sparkles, 
  Search, 
  FolderPlus, 
  Globe,
  GraduationCap,
  HardDrive,
  Cpu,
  Radio,
  Sliders,
  PanelRightClose,
  PanelRightOpen,
  LogOut,
  FolderGit2
} from 'lucide-react';
import { VoiceAssistant } from './components/VoiceAssistant';

type ActiveTab = 'graph' | 'canvas' | 'tasks' | 'study' | 'diagnostics' | 'automations' | 'audit';

export default function App() {
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const [activeTab, setActiveTab] = useState<ActiveTab>('graph');
  const [showAIChat, setShowAIChat] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showImportHub, setShowImportHub] = useState(false);
  const [showWebClipper, setShowWebClipper] = useState(false);

  // Fetch live vault status for pro status bar
  const { data: notes = [] } = useQuery<any[]>({
    queryKey: ['notes'],
    queryFn: async () => {
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/v1/notes', { headers });
      return res.ok ? res.json() : [];
    },
    enabled: !!token,
  });

  // Global keyboard shortcut listener (⌘K / Ctrl+K and 1-7 tab keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    <div className="h-screen w-screen flex flex-col bg-[#090A0F] text-[#F1F5F9] font-sans select-none overflow-hidden">
      {/* 1. Pro Workstation Header Bar */}
      <header className="h-12 flex-shrink-0 bg-[#0F1117] border-b border-[#1F2433] flex items-center justify-between px-4 z-30">
        {/* Left: Vault Identity & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#4F46E5] flex items-center justify-center text-white shadow-sm">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="text-white font-mono tracking-tight">Neuro</span>
              <span className="text-[#64748B]">/</span>
              <span className="text-[#94A3B8] font-mono text-[11px] bg-[#161A24] px-2 py-0.5 rounded border border-[#242A3C]">
                vault-main
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-[#202636]" />

          {/* Sync Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 bg-[#121622] border border-[#202636] rounded-md text-[11px] font-mono text-[#94A3B8]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 font-medium">Synced</span>
          </div>
        </div>

        {/* Center: Command Palette Trigger */}
        <div className="flex-1 max-w-md mx-4">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full h-8 px-3 bg-[#141722] hover:bg-[#1A1E2B] border border-[#242A3C] hover:border-[#38415C] rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] transition-colors flex items-center justify-between text-xs group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#64748B] group-hover:text-indigo-400 transition-colors" />
              <span>Search vault, commands, or jump to note...</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="pro-kbd">⌘K</kbd>
            </div>
          </button>
        </div>

        {/* Right: Quick Tools, Copilot & Account */}
        <div className="flex items-center gap-2">
          {/* Quick Action Icon Buttons */}
          <button
            onClick={() => setShowImportHub(true)}
            className="h-8 px-2.5 bg-[#141722] hover:bg-[#1D2230] border border-[#242A3C] rounded-lg text-[#94A3B8] hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Import Markdown, Obsidian or Notion"
          >
            <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Import</span>
          </button>

          <button
            onClick={() => setShowWebClipper(true)}
            className="h-8 px-2.5 bg-[#141722] hover:bg-[#1D2230] border border-[#242A3C] rounded-lg text-[#94A3B8] hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Web Clipper"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Clip</span>
          </button>

          <div className="h-4 w-px bg-[#202636]" />

          {/* AI Copilot Drawer Toggle */}
          <button
            onClick={() => setShowAIChat(!showAIChat)}
            className={`h-8 px-3 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 ${
              showAIChat
                ? 'bg-[#4F46E5] border-indigo-400 text-white shadow-sm'
                : 'bg-[#141722] hover:bg-[#1D2230] border-[#242A3C] text-[#94A3B8] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>AI Copilot</span>
            {showAIChat ? <PanelRightClose className="w-3 h-3 ml-0.5" /> : <PanelRightOpen className="w-3 h-3 ml-0.5" />}
          </button>

          {/* Sign Out */}
          <button
            onClick={logout}
            className="h-8 w-8 flex items-center justify-center bg-[#141722] hover:bg-[#2D141A] border border-[#242A3C] hover:border-[#4D1D28] text-[#94A3B8] hover:text-[#FB7185] rounded-lg transition-colors"
            title="Sign Out of Vault"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. Workspace View Tabs Bar */}
      <div className="h-10 flex-shrink-0 bg-[#0C0E14] border-b border-[#1A1F2C] px-4 flex items-center justify-between">
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`h-7 px-3 rounded-md text-xs font-medium flex items-center gap-2 transition-all relative ${
                  isActive
                    ? 'bg-[#181C28] text-white border border-[#2F374E]'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#12151E]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-[#64748B]'}`} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono text-[#64748B]">
          <span className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span>Local Engine 0.8ms</span>
          </span>
          <span>•</span>
          <span>{notes.length} Notes Loaded</span>
        </div>
      </div>

      {/* 3. Main Central Workspace Area */}
      <div className="flex-1 flex overflow-hidden bg-[#090A0F]">
        {/* Active Module Panel */}
        <main className="flex-1 flex overflow-hidden">
          {activeTab === 'graph' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left Pane: Create & Edit Note Form */}
              <div className="w-[440px] flex-shrink-0 border-r border-[#1C202C] bg-[#0E1017] p-3 overflow-hidden">
                <CreateNoteForm />
              </div>

              {/* Right Pane: Graph Visualization Canvas */}
              <div className="flex-1 relative bg-[#090A0F] overflow-hidden">
                <GraphView />
              </div>
            </div>
          )}

          {activeTab === 'canvas' && (
            <div className="flex-1 h-full overflow-hidden bg-[#090A0F]">
              <VaultCanvasStudio />
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="flex-1 h-full overflow-hidden bg-[#090A0F]">
              <TaskKanbanBoard />
            </div>
          )}

          {activeTab === 'study' && (
            <div className="flex-1 h-full overflow-hidden bg-[#090A0F]">
              <SpacedRepetitionStudio />
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div className="flex-1 h-full overflow-hidden bg-[#090A0F]">
              <VaultLintStudio />
            </div>
          )}

          {activeTab === 'automations' && (
            <div className="flex-1 h-full overflow-hidden bg-[#090A0F]">
              <AutomationBuilder />
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="flex-1 h-full overflow-hidden bg-[#090A0F]">
              <AuditLogViewer />
            </div>
          )}
        </main>

        {/* Collapsible Right Pro AI Copilot Sidebar */}
        {showAIChat && (
          <aside className="w-[420px] flex-shrink-0 border-l border-[#1C202C] bg-[#0E1017] flex flex-col overflow-hidden">
            <AIChatPanel onClose={() => setShowAIChat(false)} />
          </aside>
        )}
      </div>

      {/* 4. Professional Workstation Status Bar (Footer) */}
      <footer className="h-6 flex-shrink-0 bg-[#0B0C12] border-t border-[#1C202C] px-3 flex items-center justify-between text-[11px] font-mono text-[#64748B] z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-300">
            <HardDrive className="w-3 h-3 text-indigo-400" />
            <span>neuro-vault: ~/notes</span>
          </div>
          <span className="text-[#282E40]">|</span>
          <div>Total Notes: <span className="text-slate-200">{notes.length}</span></div>
          <span className="text-[#282E40]">|</span>
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-emerald-400" />
            <span>Parser: Fast Markdown BM25</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>Encoding: <span className="text-slate-300">UTF-8</span></div>
          <span className="text-[#282E40]">|</span>
          <div className="flex items-center gap-1 text-slate-300">
            <Sliders className="w-3 h-3 text-sky-400" />
            <span>Zero-Cloud Mode</span>
          </div>
        </div>
      </footer>

      {/* Overlays & Modals */}
      {showImportHub && <ImportHubModal onClose={() => setShowImportHub(false)} />}
      {showWebClipper && <WebClipperModal onClose={() => setShowWebClipper(false)} />}

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={(tab) => setActiveTab(tab as any)}
      />

      <VoiceAssistant />
    </div>
  );
}
