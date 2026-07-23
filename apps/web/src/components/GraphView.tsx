import { useRef, useCallback, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useGraph } from '../hooks/useGraph';
import { Network, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

export default function GraphView() {
  const { data, isPending, error } = useGraph();
  const fgRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverNode, setHoverNode] = useState<any>(null);

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
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 800);
      fgRef.current.zoom(3.5, 1200);
    }
  }, []);

  const handleResetZoom = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(800, 40);
    }
  };

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

  const safeData = {
    nodes: data?.nodes || [],
    links: data?.links || (data as any)?.edges || []
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-[#090A0F] overflow-hidden flex-grow relative">
      {/* Header Info Overlay */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 glass-panel px-3.5 py-2 rounded-xl border border-white/10 shadow-lg">
        <Network className="w-4 h-4 text-indigo-400" />
        <div>
          <h2 className="text-xs font-bold text-white tracking-wide">Knowledge Graph</h2>
          <p className="text-[10px] text-slate-400 font-mono">
            {safeData.nodes.length} Nodes · {safeData.links.length} Links
          </p>
        </div>
      </div>

      {/* Control Buttons Overlay */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 glass-panel p-1 rounded-xl border border-white/10 shadow-lg">
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

      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={safeData}
        nodeLabel="name"
        nodeRelSize={6}
        linkColor={(link: any) => {
          if (!hoverNode) return 'rgba(99, 102, 241, 0.15)';
          return (link.source.id === hoverNode.id || link.target.id === hoverNode.id)
            ? 'rgba(99, 102, 241, 0.7)'
            : 'rgba(99, 102, 241, 0.04)';
        }}
        linkWidth={(link: any) => {
          if (!hoverNode) return 1.2;
          return (link.source.id === hoverNode.id || link.target.id === hoverNode.id) ? 2.5 : 0.8;
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
          const isHovered = hoverNode && hoverNode.id === node.id;

          // Draw subtle outer glow ring on hover
          if (isHovered) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeRadius * 2.2, 0, 2 * Math.PI, false);
            ctx.fillStyle = isNote ? 'rgba(129, 140, 248, 0.2)' : 'rgba(56, 189, 248, 0.2)';
            ctx.fill();
          }

          // Draw node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, isHovered ? nodeRadius * 1.4 : nodeRadius, 0, 2 * Math.PI, false);
          ctx.fillStyle = nodeColor;
          ctx.fill();
          
          if (isHovered) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2 / globalScale;
            ctx.stroke();
          }

          // Draw crisp text label
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = isHovered ? 'rgba(255, 255, 255, 1)' : 'rgba(226, 232, 240, 0.75)';
          ctx.fillText(label, node.x, node.y + (isHovered ? nodeRadius * 1.4 : nodeRadius) + 2);
        }}
      />
    </div>
  );
}
