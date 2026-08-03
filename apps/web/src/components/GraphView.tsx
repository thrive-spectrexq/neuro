import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useGraph } from '../hooks/useGraph';
import { Network, ZoomIn, ZoomOut, RefreshCw, Download, Search } from 'lucide-react';

export default function GraphView() {
  const { data, isPending, error } = useGraph();
  const fgRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverNode, setHoverNode] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'note' | 'tag' | 'entity'>('all');

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

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode((prev: any) => (prev?.id === node.id ? null : node));
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 800);
      fgRef.current.zoom(3.5, 1200);
    }
  }, []);

  const handleResetZoom = () => {
    setSelectedNode(null);
    if (fgRef.current) {
      fgRef.current.zoomToFit(800, 40);
    }
  };

  const handleExportSnapshot = () => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (canvas) {
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `neuro-knowledge-graph-${Date.now()}.png`;
      link.href = image;
      link.click();
    }
  };

  const rawNodes = data?.nodes || [];
  const rawLinks = data?.links || (data as any)?.edges || [];

  // Filter nodes based on search and type
  const filteredData = useMemo(() => {
    let nodes = rawNodes;
    if (typeFilter !== 'all') {
      nodes = nodes.filter((n: any) => (n.type || 'note') === typeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      nodes = nodes.filter((n: any) => n.name.toLowerCase().includes(q));
    }
    const nodeIds = new Set(nodes.map((n: any) => n.id));
    const links = rawLinks.filter((l: any) => nodeIds.has(l.source.id || l.source) && nodeIds.has(l.target.id || l.target));

    return { nodes, links };
  }, [rawNodes, rawLinks, typeFilter, searchQuery]);

  // Set of neighbor node IDs when a node is selected or hovered
  const activeNeighbors = useMemo(() => {
    const targetNode = selectedNode || hoverNode;
    if (!targetNode) return new Set();
    const set = new Set([targetNode.id]);
    filteredData.links.forEach((link: any) => {
      const sId = link.source.id || link.source;
      const tId = link.target.id || link.target;
      if (sId === targetNode.id) set.add(tId);
      if (tId === targetNode.id) set.add(sId);
    });
    return set;
  }, [selectedNode, hoverNode, filteredData.links]);

  if (isPending) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#090A0F] text-slate-400 gap-2 text-xs font-mono">
        <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
        Rendering Knowledge Graph...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#090A0F] text-rose-400 text-xs font-mono">
        Failed to load graph data: {(error as Error).message}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-[#090A0F] overflow-hidden flex-grow relative">
      {/* Header & Filter Controls Overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-3 glass-panel px-3.5 py-2 rounded-xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-indigo-400" />
          <div>
            <h2 className="text-xs font-bold text-white tracking-wide">Knowledge Graph</h2>
            <p className="text-[10px] text-slate-400 font-mono">
              {filteredData.nodes.length} Nodes · {filteredData.links.length} Links
            </p>
          </div>
        </div>

        <div className="h-4 w-px bg-white/10 hidden sm:block" />

        {/* Node Search Bar */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/40 border border-white/10 rounded-lg text-xs text-slate-300">
          <Search className="w-3 h-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search graph..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none text-xs text-white placeholder-slate-500 w-24 sm:w-32"
          />
        </div>

        {/* Node Type Selector */}
        <div className="flex items-center gap-1 p-0.5 bg-black/40 border border-white/10 rounded-lg">
          {(['all', 'note', 'tag', 'entity'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2 py-0.5 text-[10px] font-semibold capitalize rounded transition-all ${
                typeFilter === t ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Control Buttons Overlay */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 glass-panel p-1 rounded-xl border border-white/10 shadow-lg">
        <button
          onClick={handleExportSnapshot}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          title="Export Image Snapshot"
        >
          <Download className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-white/10" />
        <button
          onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 1.3, 400)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => fgRef.current?.zoom(fgRef.current.zoom() / 1.3, 400)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          title="Reset View"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Selected Node Inspector Drawer */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 z-10 glass-panel p-3.5 rounded-xl border border-indigo-500/30 max-w-xs text-xs space-y-1.5 shadow-2xl">
          <div className="flex items-center justify-between gap-2">
            <span className="font-extrabold text-white text-sm truncate">{selectedNode.name}</span>
            <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white font-bold">&times;</button>
          </div>
          <p className="text-[11px] text-indigo-300 font-mono uppercase tracking-wider">{selectedNode.type || 'Note'}</p>
          <p className="text-[11px] text-slate-400">Neighborhood isolated ({activeNeighbors.size} connected elements)</p>
        </div>
      )}

      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={filteredData}
        nodeLabel="name"
        nodeRelSize={6}
        linkColor={(link: any) => {
          const active = selectedNode || hoverNode;
          if (!active) return 'rgba(99, 102, 241, 0.15)';
          const sId = link.source.id || link.source;
          const tId = link.target.id || link.target;
          return (sId === active.id || tId === active.id)
            ? 'rgba(99, 102, 241, 0.85)'
            : 'rgba(99, 102, 241, 0.03)';
        }}
        linkWidth={(link: any) => {
          const active = selectedNode || hoverNode;
          if (!active) return 1.2;
          const sId = link.source.id || link.source;
          const tId = link.target.id || link.target;
          return (sId === active.id || tId === active.id) ? 2.5 : 0.5;
        }}
        backgroundColor="#090A0F"
        onNodeHover={setHoverNode}
        onNodeClick={handleNodeClick}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px "Plus Jakarta Sans", sans-serif`;
          
          const isNote = node.type === 'note';
          const nodeColor = isNote ? '#818CF8' : '#38BDF8';
          const nodeRadius = isNote ? 5.5 : 3.8;
          
          const isTargetActive = (selectedNode && selectedNode.id === node.id) || (hoverNode && hoverNode.id === node.id);
          const isNeighbor = activeNeighbors.has(node.id);
          const isDimmed = activeNeighbors.size > 0 && !isNeighbor;

          // Draw subtle outer glow ring on active focus
          if (isTargetActive) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeRadius * 2.2, 0, 2 * Math.PI, false);
            ctx.fillStyle = isNote ? 'rgba(129, 140, 248, 0.3)' : 'rgba(56, 189, 248, 0.3)';
            ctx.fill();
          }

          // Draw node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, isTargetActive ? nodeRadius * 1.5 : nodeRadius, 0, 2 * Math.PI, false);
          ctx.fillStyle = isDimmed ? 'rgba(148, 163, 184, 0.15)' : nodeColor;
          ctx.fill();
          
          if (isTargetActive) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.4 / globalScale;
            ctx.stroke();
          }

          // Draw crisp text label
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = isDimmed
            ? 'rgba(148, 163, 184, 0.2)'
            : (isTargetActive ? 'rgba(255, 255, 255, 1)' : 'rgba(226, 232, 240, 0.75)');
          ctx.fillText(label, node.x, node.y + (isTargetActive ? nodeRadius * 1.5 : nodeRadius) + 2);
        }}
      />
    </div>
  );
}

