import React, { useState } from 'react';
import GraphView from '../components/GraphView';
import { useGraph } from '../hooks/useGraph';
import {
  Atom,
  CircleDot,
  Grid3x3,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
} from 'lucide-react';

export default function GraphPage() {
  const [layoutMode, setLayoutMode] = useState<'force' | 'radial' | 'grid'>('force');
  const [showFilters, setShowFilters] = useState(false);

  const { data: graphData } = useGraph();
  const nodesCount = graphData?.nodes?.length || 0;
  const edgesCount = graphData?.links?.length || (graphData as any)?.edges?.length || 0;
  const tagNodesCount = (graphData?.nodes || []).filter(
    (n: any) => n.type === 'tag' || n.group === 'tag',
  ).length;

  return (
    <div className="h-full w-full flex flex-col relative bg-[#000000]">
      {/* 1. Floating Toolbar (top-left) */}
      <div className="absolute top-4 left-4 z-10 glass-surface p-2 rounded-2xl border border-white/[0.08] flex items-center gap-2 animate-in fade-in shadow-xl">
        <div className="flex items-center gap-1 bg-black/40 rounded-full p-1">
          <button
            className={`p-1.5 rounded-full transition-colors ${layoutMode === 'force' ? 'bg-[#0071E3]/20 text-[#0A84FF]' : 'btn-ghost'}`}
            onClick={() => setLayoutMode('force')}
            title="Force Layout"
          >
            <Atom size={16} />
          </button>
          <button
            className={`p-1.5 rounded-full transition-colors ${layoutMode === 'radial' ? 'bg-[#0071E3]/20 text-[#0A84FF]' : 'btn-ghost'}`}
            onClick={() => setLayoutMode('radial')}
            title="Radial Layout"
          >
            <CircleDot size={16} />
          </button>
          <button
            className={`p-1.5 rounded-full transition-colors ${layoutMode === 'grid' ? 'bg-[#0071E3]/20 text-[#0A84FF]' : 'btn-ghost'}`}
            onClick={() => setLayoutMode('grid')}
            title="Grid Layout"
          >
            <Grid3x3 size={16} />
          </button>
        </div>

        <div className="w-[1px] h-6 bg-white/[0.08]" />

        <div className="relative">
          <button
            className={`p-1.5 rounded-full transition-colors flex items-center gap-1.5 ${showFilters ? 'bg-[#0071E3]/20 text-[#0A84FF]' : 'btn-ghost'}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Filters"
          >
            <Filter size={16} />
          </button>

          {showFilters && (
            <div className="absolute top-full left-0 mt-2 w-56 glass-surface p-3.5 rounded-2xl border border-white/[0.1] animate-in fade-in shadow-xl">
              <h4 className="text-xs font-semibold text-white mb-2 section-label">Graph Filter</h4>
              <div className="text-xs text-[#86868B]">
                {nodesCount > 0
                  ? `${nodesCount} nodes active in force simulation.`
                  : 'No nodes loaded.'}
              </div>
            </div>
          )}
        </div>

        <div className="w-[1px] h-6 bg-white/[0.08]" />

        <div className="flex items-center gap-1 bg-black/40 rounded-full p-1">
          <button
            className="btn-ghost p-1.5 rounded-full"
            title="Zoom In"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent('graph-action', { detail: { action: 'zoomIn' } }),
              )
            }
          >
            <ZoomIn size={16} />
          </button>
          <button
            className="btn-ghost p-1.5 rounded-full"
            title="Zoom Out"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent('graph-action', { detail: { action: 'zoomOut' } }),
              )
            }
          >
            <ZoomOut size={16} />
          </button>
          <button
            className="btn-ghost p-1.5 rounded-full"
            title="Fit to Screen"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('graph-action', { detail: { action: 'fit' } }))
            }
          >
            <Maximize2 size={16} />
          </button>
        </div>

        <div className="w-[1px] h-6 bg-white/[0.08]" />

        <button
          className="btn-ghost p-1.5 rounded-full"
          title="Refresh"
          onClick={() =>
            window.dispatchEvent(new CustomEvent('graph-action', { detail: { action: 'refresh' } }))
          }
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* 2. Real Stats Overlay (top-right) */}
      <div className="absolute top-4 right-4 z-10 glass-surface p-4 rounded-2xl border border-white/[0.08] flex flex-col gap-2.5 animate-in fade-in shadow-xl min-w-[150px]">
        <h3 className="section-label text-[#86868B] mb-0">Graph Topology</h3>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-[#86868B]">Nodes</span>
            <span className="badge-blue text-[11px] font-mono">{nodesCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-[#86868B]">Edges</span>
            <span className="badge-blue text-[11px] font-mono">{edgesCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-[#86868B]">Tags</span>
            <span className="badge-neutral text-[11px] font-mono">{tagNodesCount}</span>
          </div>
        </div>
      </div>

      {/* 5. Legend (bottom-left) */}
      <div className="absolute bottom-4 left-4 z-10 glass-surface p-3.5 rounded-2xl border border-white/[0.08] animate-in fade-in min-w-[130px]">
        <h3 className="section-label text-[#86868B] mb-2">Legend</h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0A84FF] shadow-[0_0_8px_rgba(10,132,255,0.6)]"></div>
            <span className="text-xs text-[#A1A1A6]">Note Node</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#30D158] shadow-[0_0_8px_rgba(48,209,88,0.6)]"></div>
            <span className="text-xs text-[#A1A1A6]">Tag Node</span>
          </div>
        </div>
      </div>

      {/* 3. Full-height graph container */}
      <div className="flex-1 w-full h-full relative z-0">
        <GraphView />
      </div>
    </div>
  );
}
