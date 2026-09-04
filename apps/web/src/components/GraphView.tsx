import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useGraph } from '../hooks/useGraph';
import { Network, ZoomIn, ZoomOut, RefreshCw, Download, Search, Map, FileCode, Sparkles, X } from 'lucide-react';

export default function GraphView() {
  const { data, isPending, error } = useGraph();
  const fgRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverNode, setHoverNode] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'note' | 'tag' | 'entity'>('all');
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);
  const [roadmapGoal, setRoadmapGoal] = useState('');
  const [roadmapData, setRoadmapData] = useState<any>(null);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);

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
    if (containerRef.current) {
      const canvas = containerRef.current.querySelector('canvas');
      if (!canvas) return;
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `neuro-knowledge-graph-${Date.now()}.png`;
      link.href = image;
      link.click();
    }
  };

  const handleExportObsidian = () => {
    const link = document.createElement('a');
    link.href = 'http://localhost:8000/api/v1/obsidian/export/zip';
    link.download = `neuro-vault-export.zip`;
    link.target = '_blank';
    link.click();
  };

  const handleGenerateRoadmap = async () => {
    if (!roadmapGoal.trim()) return;
    setIsGeneratingRoadmap(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/roadmap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: roadmapGoal, depth: 'intermediate' }),
      });
      if (res.ok) {
        const json = await res.json();
        setRoadmapData(json);
      }
    } catch (err) {
      console.error('Failed to generate roadmap', err);
    } finally {
      setIsGeneratingRoadmap(false);
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
        <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
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
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 bg-[#0F1117] px-3 py-1.5 rounded-lg border border-[#1F2433] shadow-md">
        <div className="flex items-center gap-2">
          <Network className="w-3.5 h-3.5 text-teal-400" />
          <div>
            <h2 className="text-xs font-bold text-white tracking-wide font-mono">Vault Graph</h2>
            <p className="text-[10px] text-[#64748B] font-mono">
              {filteredData.nodes.length} Nodes · {filteredData.links.length} Links
            </p>
          </div>
        </div>

        <div className="h-4 w-px bg-[#202636] hidden sm:block" />

        {/* Node Search Bar */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-[#090A0F] border border-[#242A3C] rounded-md text-xs text-[#CBD5E1]">
          <Search className="w-3 h-3 text-[#64748B]" />
          <input
            type="text"
            placeholder="Filter nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-white focus:outline-none placeholder-[#475569] w-24 sm:w-32 font-mono"
          />
        </div>

        {/* Node Type Filter */}
        <div className="flex items-center gap-0.5 p-0.5 bg-[#090A0F] border border-[#1F2433] rounded-md">
          {(['all', 'note', 'tag', 'entity'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTypeFilter(filter)}
              className={`px-2 py-0.5 text-[10px] font-mono rounded capitalize transition-colors ${
                typeFilter === filter
                  ? 'bg-[#242A3C] text-white'
                  : 'text-[#64748B] hover:text-[#CBD5E1]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Prerequisite Roadmap Generator Button */}
        <button
          onClick={() => setShowRoadmapModal(true)}
          className="flex items-center gap-1 px-2.5 py-1 bg-[#181C28] hover:bg-[#202638] text-teal-300 border border-teal-500/30 rounded-md text-xs font-medium transition-colors"
          title="Generate Learning Roadmap DAG"
        >
          <Map className="w-3 h-3 text-teal-400" />
          <span>Roadmap</span>
        </button>

        {/* Export Obsidian Markdown Links */}
        <button
          onClick={handleExportObsidian}
          className="flex items-center gap-1 px-2.5 py-1 bg-[#141722] hover:bg-[#1D2230] text-[#94A3B8] hover:text-white border border-[#242A3C] rounded-md text-xs font-medium transition-colors"
          title="Export Obsidian Links"
        >
          <FileCode className="w-3 h-3 text-[#64748B]" />
          <span>Export</span>
        </button>
      </div>

      {/* Control Buttons Overlay */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 bg-[#0F1117] p-1 rounded-lg border border-[#1F2433] shadow-md">
        <button
          onClick={handleExportSnapshot}
          className="p-1 text-[#94A3B8] hover:text-white hover:bg-[#181C26] rounded transition-colors"
          title="Export Snapshot Image"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        <div className="h-3 w-px bg-[#202636]" />
        <button
          onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 1.3, 400)}
          className="p-1 text-[#94A3B8] hover:text-white hover:bg-[#181C26] rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => fgRef.current?.zoom(fgRef.current.zoom() / 1.3, 400)}
          className="p-1 text-[#94A3B8] hover:text-white hover:bg-[#181C26] rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-1 text-[#94A3B8] hover:text-white hover:bg-[#181C26] rounded transition-colors"
          title="Reset View"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Selected Node Inspector Drawer */}
      {selectedNode && (
        <div className="absolute bottom-3 left-3 z-10 bg-[#0F1117] p-3 rounded-lg border border-teal-500/40 max-w-xs text-xs space-y-1 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-white text-xs truncate font-mono">{selectedNode.name}</span>
            <button onClick={() => setSelectedNode(null)} className="text-[#64748B] hover:text-white font-bold">&times;</button>
          </div>
          <p className="text-[10px] text-teal-300 font-mono uppercase tracking-wider">{selectedNode.type || 'Note'}</p>
          <p className="text-[10px] text-[#64748B]">Isolated subgraph ({activeNeighbors.size} connections)</p>
        </div>
      )}

      {/* Roadmap Generator Modal */}
      {showRoadmapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#0F1117] w-full max-w-2xl max-h-[85vh] rounded-lg border border-[#1F2433] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F2433] bg-[#090A0F]">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-[#18162B] border border-[#302856] rounded text-teal-400">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-bold text-white text-xs font-mono">Learning Path & Prerequisite DAG Generator</h3>
              </div>
              <button onClick={() => setShowRoadmapModal(false)} className="text-[#64748B] hover:text-white font-mono text-xs">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto font-mono">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter topic or goal (e.g. Distributed Systems, Rust, Machine Learning)..."
                  value={roadmapGoal}
                  onChange={(e) => setRoadmapGoal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateRoadmap()}
                  className="flex-1 bg-[#090A0F] border border-[#1F2433] rounded-md px-3 py-1.5 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-teal-500 font-mono"
                />
                <button
                  onClick={handleGenerateRoadmap}
                  disabled={isGeneratingRoadmap || !roadmapGoal.trim()}
                  className="px-3 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white rounded-md text-xs font-mono font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {isGeneratingRoadmap ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Generate DAG
                </button>
              </div>

              {roadmapData && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between bg-[#090A0F] border border-[#1F2433] p-3 rounded-md">
                    <div>
                      <h4 className="text-xs font-bold text-white font-mono">{roadmapData.subject}</h4>
                      <p className="text-[10px] text-[#64748B] font-mono">Total estimated duration: ~{roadmapData.total_estimated_hours} hours</p>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#18162B] text-teal-300 rounded border border-[#302856]">
                      {roadmapData.nodes.length} Stages · {roadmapData.edges.length} Dependencies
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-[10px] font-mono uppercase tracking-wider text-[#64748B]">Sequential Learning Sequence</h5>
                    <div className="space-y-2">
                      {roadmapData.nodes.map((node: any, idx: number) => (
                        <div key={node.id} className="p-3 bg-[#090A0F] border border-[#1F2433] rounded-md space-y-1 hover:border-[#2E364B] transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded bg-[#18162B] border border-[#302856] text-teal-300 text-[9px] font-bold flex items-center justify-center font-mono">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-white font-mono">{node.title}</span>
                            </div>
                            <span className="text-[10px] text-[#64748B] font-mono">~{node.estimated_hours}h</span>
                          </div>
                          <p className="text-[11px] text-[#CBD5E1] pl-6">{node.summary}</p>
                          {node.prerequisites && node.prerequisites.length > 0 && (
                            <div className="flex items-center gap-1 pl-6 pt-1">
                              <span className="text-[9px] text-[#64748B] font-mono">Requires:</span>
                              {node.prerequisites.map((pId: string) => (
                                <span key={pId} className="text-[9px] px-1.5 py-0.2 bg-[#141722] text-[#94A3B8] border border-[#1F2433] rounded font-mono">
                                  {pId}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
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
          if (!active) return 'rgba(20, 184, 166, 0.15)';
          const sId = link.source.id || link.source;
          const tId = link.target.id || link.target;
          return (sId === active.id || tId === active.id)
            ? 'rgba(20, 184, 166, 0.85)'
            : 'rgba(20, 184, 166, 0.03)';
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
          const nodeColor = isNote ? '#2DD4BF' : '#38BDF8';
          const nodeRadius = isNote ? 5.5 : 3.8;
          
          const isTargetActive = (selectedNode && selectedNode.id === node.id) || (hoverNode && hoverNode.id === node.id);
          const isNeighbor = activeNeighbors.has(node.id);
          const isDimmed = activeNeighbors.size > 0 && !isNeighbor;

          // Draw subtle outer glow ring on active focus
          if (isTargetActive) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeRadius * 2.2, 0, 2 * Math.PI, false);
            ctx.fillStyle = isNote ? 'rgba(45, 212, 191, 0.3)' : 'rgba(16, 185, 129, 0.3)';
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
