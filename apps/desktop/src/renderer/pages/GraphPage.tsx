import React from 'react';
import GraphView from '../components/GraphView';

export default function GraphPage() {
  return (
    <div className="h-full w-full flex flex-col relative">
      <div className="absolute top-4 left-4 z-10 glass-panel px-4 py-2 rounded-lg">
        <h2 className="text-sm font-semibold text-white">Network Graph</h2>
      </div>
      <div className="flex-1">
        <GraphView />
      </div>
    </div>
  );
}
