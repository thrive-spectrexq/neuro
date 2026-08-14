import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useGraph } from '../hooks/useGraph';
import { ZoomIn, ZoomOut, Maximize2, Network, Search, Filter, Sparkles, Layers } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';
import { useNoteStore } from '../store/noteStore';

export default function GraphView() {
  const { data, isLoading, error } = useGraph();
  const setActiveNoteId = useNoteStore((s) => s.setActiveNoteId);
  const fgRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'notes' | 'tags'>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    
    window.addEventListener('resize', updateDimensions);
    setTimeout(updateDimensions, 100);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Filtered graph data
  const filteredData = useMemo(() => {
    if (!data) return { nodes: [], links: [] };

    let nodes = data.nodes || [];
    if (filterType === 'notes') {
      nodes = nodes.filter((n: any) => n.type === 'note');
    } else if (filterType === 'tags') {
      nodes = nodes.filter((n: any) => n.type === 'tag' || n.id.startsWith('tag-'));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      nodes = nodes.filter((n: any) => n.name?.toLowerCase().includes(q));
    }

    const nodeIds = new Set(nodes.map((n: any) => n.id));
    const links = (data.links || []).filter((l: any) => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return { nodes, links };
  }, [data, searchQuery, filterType]);

  const handleNodeClick = useCallback((node: any) => {
    soundEngine.playClick();
    if (node.type === 'note' && !node.id.startsWith('tag-')) {
      setActiveNoteId(node.id);
    }
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 800);
      fgRef.current.zoom(3.5, 1200);
    }
  }, [setActiveNoteId]);

  const handleZoomIn = () => {
    if (fgRef.current) {
      fgRef.current.zoom(fgRef.current.zoom() * 1.4, 400);
    }
  };

  const handleZoomOut = () => {
    if (fgRef.current) {
      fgRef.current.zoom(fgRef.current.zoom() * 0.7, 400);
    }
  };

  const handleResetZoom = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(600, 40);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#07080c] text-zinc-500 font-mono text-xs">
        Synthesizing knowledge topology...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#07080c] text-brand-rose font-mono text-xs">
        Failed to load knowledge graph
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-[#07080c] overflow-hidden flex-grow relative select-none">
      {/* Floating Graph Header & Search Filter */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Network size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white font-sans tracking-tight">
              Knowledge Graph
            </h2>
            <p className="text-[11px] text-zinc-400 font-mono">
              {filteredData.nodes.length} nodes • {filteredData.links.length} connections
            </p>
          </div>
        </div>

        {/* Live Filter Controls */}
        <div className="flex items-center gap-2 bg-[#0d101a]/95 backdrop-blur-md border border-white/[0.08] p-1.5 rounded-xl shadow-lg">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-black/40 border border-white/[0.06] rounded-lg">
            <Search size={12} className="text-zinc-400" />
            <input
              type="text"
              placeholder="Filter nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-zinc-500 outline-none w-28 font-sans"
            />
          </div>

          <div className="flex items-center bg-black/40 border border-white/[0.06] rounded-lg p-0.5 text-[10px]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 py-1 rounded ${filterType === 'all' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('notes')}
              className={`px-2 py-1 rounded ${filterType === 'notes' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              Notes
            </button>
            <button
              onClick={() => setFilterType('tags')}
              className={`px-2 py-1 rounded ${filterType === 'tags' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              Tags
            </button>
          </div>
        </div>
      </div>

      {/* Floating Graph Controls */}
      <div className="absolute bottom-6 right-6 z-10 flex items-center gap-1.5 p-1 bg-[#0d101a]/90 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-elevated">
        <button
          onClick={handleZoomIn}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        <div className="w-[1px] h-3 bg-white/[0.08]" />
        <button
          onClick={handleResetZoom}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          title="Reset View"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={filteredData}
        nodeLabel="name"
        nodeRelSize={5}
        linkColor={() => 'rgba(99, 102, 241, 0.25)'}
        linkWidth={1.2}
        backgroundColor="#07080c"
        onNodeClick={handleNodeClick}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.name || 'Untitled';
          const fontSize = Math.max(10, 13 / globalScale);
          ctx.font = `${fontSize}px "Plus Jakarta Sans", sans-serif`;
          
          const isNote = node.type === 'note';
          const nodeColor = isNote ? '#6366f1' : '#06b6d4';
          const nodeRadius = isNote ? 5.5 : 4;

          // Draw outer glow aura
          ctx.beginPath();
          ctx.arc(node.x, node.y, nodeRadius + 3, 0, 2 * Math.PI, false);
          ctx.fillStyle = isNote ? 'rgba(99, 102, 241, 0.2)' : 'rgba(6, 182, 212, 0.2)';
          ctx.fill();

          // Draw node core
          ctx.beginPath();
          ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
          ctx.fillStyle = nodeColor;
          ctx.fill();

          // Draw label
          if (globalScale > 0.8 || isNote) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillText(label, node.x, node.y + nodeRadius + 3);
          }
        }}
      />
    </div>
  );
}
