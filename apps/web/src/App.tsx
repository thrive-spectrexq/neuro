import GraphView from './components/GraphView';
import AuthForm from './components/AuthForm';
import CreateNoteForm from './components/CreateNoteForm';
import { useAuthStore } from './stores/authStore';
import { Brain, LogOut } from 'lucide-react';

export default function App() {
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);

  if (!token) {
    return <AuthForm />;
  }

  return (
    <div className="h-full w-full flex flex-col relative bg-background overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-purple/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-blue/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Glass Navigation Bar */}
      <nav className="relative z-10 flex justify-between items-center px-6 py-4 glass-panel border-b-0 border-x-0 rounded-none border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-accent-purple to-accent-blue rounded-xl shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Neuro
            </h1>
            <p className="text-[10px] text-accent-cyan font-semibold tracking-[0.2em] uppercase">Second Brain</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white glass-panel rounded-lg transition-all hover:bg-white/5 active:scale-95"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </nav>

      {/* Main Content Area */}
      <div className="relative z-10 flex-grow flex p-6 gap-6 h-[calc(100vh-80px)]">
        <div className="w-[340px] flex-shrink-0 h-full">
          <CreateNoteForm />
        </div>
        <div className="flex-grow relative h-full glass-panel rounded-2xl overflow-hidden shadow-2xl">
          <GraphView />
        </div>
      </div>
    </div>
  );
}
