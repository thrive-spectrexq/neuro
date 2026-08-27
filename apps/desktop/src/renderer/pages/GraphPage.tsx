import React, { useState } from 'react';
import GraphView from '../components/GraphView';
import { 
  Atom, 
  CircleDot, 
  Grid3x3, 
  Filter, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RefreshCw 
} from 'lucide-react';

export default function GraphPage() {
  const [layoutMode, setLayoutMode] = useState<'force' | 'radial' | 'grid'>('force');
  const [showFilters, setShowFilters] = useState(false);

  // Mock stats - in a real app these might come from a store or the GraphView
  const stats = {
    nodes: 124,
    edges: 342,
    clusters: 8
  };

  return (
    <div className="h-full w-full flex flex-col relative bg-background">
      {/* 1. Floating Toolbar (top-left) */}
      <div className="absolute top-4 left-4 z-10 glass-surface p-2 rounded-lg border border-white/10 flex items-center gap-2 animate-fade-in shadow-xl">
        <div className="flex items-center gap-1 bg-black/20 rounded-md p-1">
          <button 
            className={`p-1.5 rounded-md transition-colors ${layoutMode === 'force' ? 'bg-indigo-500/20 text-indigo-400' : 'btn-ghost'}`}
            onClick={() => setLayoutMode('force')}
            title="Force Layout"
          >
            <Atom size={16} />
          </button>
          <button 
            className={`p-1.5 rounded-md transition-colors ${layoutMode === 'radial' ? 'bg-indigo-500/20 text-indigo-400' : 'btn-ghost'}`}
            onClick={() => setLayoutMode('radial')}
            title="Radial Layout"
          >
            <CircleDot size={16} />
          </button>
          <button 
            className={`p-1.5 rounded-md transition-colors ${layoutMode === 'grid' ? 'bg-indigo-500/20 text-indigo-400' : 'btn-ghost'}`}
            onClick={() => setLayoutMode('grid')}
            title="Grid Layout"
          >
            <Grid3x3 size={16} />
          </button>
        </div>
        
        <div className="w-[1px] h-6 bg-white/10" />
        
        <div className="relative">
          <button 
            className={`p-1.5 rounded-md transition-colors flex items-center gap-1.5 ${showFilters ? 'bg-indigo-500/20 text-indigo-400' : 'btn-ghost'}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Filters"
          >
            <Filter size={16} />
          </button>
          
          {showFilters && (
            <div className="absolute top-full left-0 mt-2 w-56 glass-surface p-3 rounded-lg border border-white/10 animate-fade-in shadow-xl">
              <h4 className="text-xs font-semibold text-white mb-2 section-label">Filter Settings</h4>
              <div className="text-xs text-zinc-400">Filter controls coming soon...</div>
            </div>
          )}
        </div>
        
        <div className="w-[1px] h-6 bg-white/10" />

        <div className="flex items-center gap-1 bg-black/20 rounded-md p-1">
          <button className="btn-ghost p-1.5 rounded-md" title="Zoom In"><ZoomIn size={16} /></button>
          <button className="btn-ghost p-1.5 rounded-md" title="Zoom Out"><ZoomOut size={16} /></button>
          <button className="btn-ghost p-1.5 rounded-md" title="Fit to Screen"><Maximize2 size={16} /></button>
        </div>

        <div className="w-[1px] h-6 bg-white/10" />
        
        <button className="btn-ghost p-1.5 rounded-md" title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* 2. Stats Overlay (top-right) */}
      <div className="absolute top-4 right-4 z-10 glass-surface p-4 rounded-lg border border-white/10 flex flex-col gap-3 animate-fade-in shadow-xl min-w-[160px]">
        <h3 className="section-label text-white/70">Network Stats</h3>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-zinc-400">Nodes</span>
            <span className="badge-cyan">{stats.nodes}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-zinc-400">Edges</span>
            <span className="badge-emerald">{stats.edges}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-zinc-400">Clusters</span>
            <span className="badge-neutral">{stats.clusters}</span>
          </div>
        </div>
      </div>

      {/* 5. Legend (bottom-left) */}
      <div className="absolute bottom-4 left-4 z-10 glass-surface p-3 rounded-lg border border-white/10 animate-fade-in min-w-[120px]">
        <h3 className="section-label text-white/70 mb-2.5">Legend</h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
            <span className="text-xs text-zinc-300">Note Node</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></div>
            <span className="text-xs text-zinc-300">Tag Node</span>
          </div>
        </div>
      </div>

      {/* 4. Minimap Placeholder (bottom-right) */}
      <div className="absolute bottom-4 right-4 z-10 glass-surface border border-white/10 rounded-lg w-[192px] h-[128px] flex flex-col items-center justify-center animate-fade-in overflow-hidden shadow-xl">
        <span className="text-xs font-bold text-zinc-500/50 uppercase tracking-[0.2em]">Minimap</span>
      </div>

      {/* 3. Full-height graph container */}
      <div className="flex-1 w-full h-full relative z-0">
        <GraphView />
      </div>
    </div>
  );
}
