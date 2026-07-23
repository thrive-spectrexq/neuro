import { useState, useEffect } from 'react';
import GraphView from './components/GraphView';
import AuthForm from './components/AuthForm';
import CreateNoteForm from './components/CreateNoteForm';
import { AIChatPanel } from './components/AIChatPanel';
import { TaskKanbanBoard } from './components/TaskKanbanBoard';
import { AuditLogViewer } from './components/AuditLogViewer';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { useAuthStore } from './stores/authStore';
import { Brain, LogOut, Network, CheckSquare, Shield, Sparkles, Search, Command } from 'lucide-react';
import { VoiceAssistant } from './components/VoiceAssistant';

type ActiveTab = 'graph' | 'tasks' | 'audit';

export default function App() {
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const [activeTab, setActiveTab] = useState<ActiveTab>('graph');
  const [showAIChat, setShowAIChat] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global keyboard shortcut listener (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
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

  return (
    <div className="h-full w-full flex flex-col relative bg-[#090A0F] overflow-hidden font-sans text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Refined Ambient Glow Backdrop */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[300px] bg-indigo-600/[0.07] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-sky-600/[0.05] rounded-full blur-[140px] pointer-events-none" />

      {/* Sleek Navigation Bar */}
      <nav className="relative z-20 flex justify-between items-center px-6 py-3 border-b border-white/[0.08] bg-[#0E1017]/80 backdrop-blur-xl">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 rounded-xl shadow-md border border-white/10">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-white tracking-tight">Neuro</h1>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Zero-Knowledge Vault
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">Local-First AI Knowledge Engine</p>
          </div>
        </div>

        {/* Center Command Palette Search Bar */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="flex items-center gap-3 px-4 py-2 bg-black/40 hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/20 rounded-xl text-slate-400 hover:text-slate-200 transition-all text-xs font-sans w-72 justify-between group shadow-inner"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
            <span>Search or type command...</span>
          </div>
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 rounded">
            <Command className="w-2.5 h-2.5" />K
          </span>
        </button>

        {/* Right Tab Switcher & User Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-black/40 border border-white/[0.08] rounded-xl gap-1">
            <button
              onClick={() => setActiveTab('graph')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'graph'
                  ? 'bg-indigo-600 text-white shadow-md border border-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Graph & Notes
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'tasks'
                  ? 'bg-indigo-600 text-white shadow-md border border-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'audit'
                  ? 'bg-indigo-600 text-white shadow-md border border-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Audit Log
            </button>
          </div>

          <div className="h-4 w-px bg-white/10" />

          <button
            onClick={() => setShowAIChat(!showAIChat)}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all shadow-md active:scale-95 ${
              showAIChat
                ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40'
                : 'neuro-button-secondary'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            {showAIChat ? 'Hide AI' : 'AI Assistant'}
          </button>

          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 rounded-xl transition-all active:scale-95"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Main Content Workspace */}
      <div className="relative z-10 flex-grow flex p-5 gap-5 h-[calc(100vh-61px)] overflow-hidden">
        {/* Primary Workspace View */}
        <div className="flex-grow h-full overflow-hidden flex gap-5">
          {activeTab === 'graph' && (
            <>
              <div className="w-[400px] flex-shrink-0 h-full">
                <CreateNoteForm />
              </div>
              <div className="flex-grow relative h-full glass-panel rounded-2xl overflow-hidden border border-white/[0.08]">
                <GraphView />
              </div>
            </>
          )}

          {activeTab === 'tasks' && (
            <div className="w-full h-full">
              <TaskKanbanBoard />
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="w-full h-full">
              <AuditLogViewer />
            </div>
          )}
        </div>

        {/* Collapsible AI Assistant Panel */}
        {showAIChat && (
          <div className="w-[400px] flex-shrink-0 h-full animate-in slide-in-from-right duration-250">
            <AIChatPanel onClose={() => setShowAIChat(false)} />
          </div>
        )}
      </div>

      {/* Command Palette Modal */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={setActiveTab}
      />

      {/* Voice Assistant */}
      <VoiceAssistant />
    </div>
  );
}
