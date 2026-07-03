import React from 'react';

import GraphView from './components/GraphView';
import AuthForm from './components/AuthForm';
import { useAuthStore } from './stores/authStore';

export default function App() {
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);

  if (!token) {
    return <AuthForm />;
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#0a0a0a]">
      <div className="flex justify-between items-center p-4 border-b border-gray-800">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-400 mb-2">
            Neuro Web
          </h1>
          <p className="text-gray-400">Your AI-powered second brain, accessible anywhere.</p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </div>
      <div className="flex-grow flex p-4">
        <GraphView />
      </div>
    </div>
  );
}
