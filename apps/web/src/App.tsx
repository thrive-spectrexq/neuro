import { useState } from 'react';
import GraphView from './components/GraphView';
import AuthForm from './components/AuthForm';
import CreateNoteForm from './components/CreateNoteForm';
import { AIChatPanel } from './components/AIChatPanel';
import { TaskKanbanBoard } from './components/TaskKanbanBoard';
import { AuditLogViewer } from './components/AuditLogViewer';
import { useAuthStore } from './stores/authStore';
import { Brain, LogOut, Network, CheckSquare, Shield, Sparkles } from 'lucide-react';
import { VoiceAssistant } from './components/VoiceAssistant';

type ActiveTab = 'graph' | 'tasks' | 'audit';

export default function App() {
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const [activeTab, setActiveTab] = useState<ActiveTab>('graph');
  const [showAIChat, setShowAIChat] = useState(false);

  if (!token) {
    return <AuthForm />;
  }

  return (
    <div className="h-full w-full flex flex-col relative bg-background overflow-hidden font-sans">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-accent-purple/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent-blue/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Glass Navigation Bar */}
      <nav className="relative z-20 flex justify-between items-center px-6 py-3.5 glass-panel border-b-0 border-x-0 rounded-none border-t border-white/5 shadow-lg">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-accent-purple via-indigo-600 to-accent-blue rounded-xl shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400">
              Neuro
            </h1>
            <p className="text-[10px] text-accent-cyan font-bold tracking-[0.2em] uppercase">AI Second Brain</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 glass-panel p-1 rounded-xl border border-white/10 bg-black/20">
          <button
            onClick={() => setActiveTab('graph')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'graph'
                ? 'bg-gradient-to-r from-accent-purple to-accent-blue text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            Knowledge Graph
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'tasks'
                ? 'bg-gradient-to-r from-accent-purple to-accent-blue text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Task Kanban
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'audit'
                ? 'bg-gradient-to-r from-accent-purple to-accent-blue text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Audit & Compliance
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAIChat(!showAIChat)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border transition-all shadow-md active:scale-95 ${
              showAIChat
                ? 'bg-accent-purple/30 text-purple-200 border-purple-500/50 shadow-purple-500/20'
                : 'glass-panel text-gray-300 hover:text-white border-white/10 hover:border-white/20'
            }`}
          >
            <Sparkles className="w-4 h-4 text-accent-cyan" />
            {showAIChat ? 'Hide AI Assistant' : 'AI Assistant'}
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-300 hover:text-white glass-panel rounded-xl transition-all hover:bg-white/5 border border-white/10 active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="relative z-10 flex-grow flex p-6 gap-6 h-[calc(100vh-73px)] overflow-hidden">
        {/* Primary View */}
        <div className="flex-grow h-full overflow-hidden flex gap-6">
          {activeTab === 'graph' && (
            <>
              <div className="w-[360px] flex-shrink-0 h-full">
                <CreateNoteForm />
              </div>
              <div className="flex-grow relative h-full glass-panel rounded-2xl overflow-hidden shadow-2xl border border-white/10">
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
          <div className="w-[420px] flex-shrink-0 h-full animate-in slide-in-from-right duration-300">
            <AIChatPanel onClose={() => setShowAIChat(false)} />
          </div>
        )}
      </div>

      {/* Voice Assistant */}
      <VoiceAssistant />
    </div>
  );
}
