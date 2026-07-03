import React from 'react';

import GraphView from './components/GraphView';

export default function App() {
  return (
    <div className="h-full w-full flex flex-col bg-[#0a0a0a]">
      <div className="text-center p-4">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-400 mb-2">
          Neuro Web
        </h1>
        <p className="text-gray-400">Your AI-powered second brain, accessible anywhere.</p>
      </div>
      <div className="flex-grow flex p-4">
        <GraphView />
      </div>
    </div>
  );
}
