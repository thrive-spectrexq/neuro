import React, { useRef, useCallback, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useGraph } from '../hooks/useGraph';
import { ZoomIn, ZoomOut, Maximize2, Sparkles, Network } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

export default function GraphView() {
  const { data, isLoading, error } = useGraph();
  const fgRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
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

  const handleNodeClick = useCallback((node: any) => {
    soundEngine.playClick();
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 800);
      fgRef.current.zoom(3.5, 1200);
    }
  }, []);

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
      
      {/* Floating Graph Header */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center text-brand-primary-light pointer-events-auto">
            <Network size={14} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white font-sans tracking-tight">
              Knowledge Graph
            </h2>
            <p className="text-[11px] text-zinc-400 font-mono">
              {data?.nodes?.length || 0} nodes • {data?.links?.length || 0} connections
            </p>
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
        graphData={data || { nodes: [], links: [] }}
        nodeLabel="name"
        nodeRelSize={5}
        linkColor={() => 'rgba(99, 102, 241, 0.2)'}
        linkWidth={1.2}
        backgroundColor="#07080c"
        onNodeClick={handleNodeClick}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.name;
          const fontSize = Math.max(10, 13 / globalScale);
          ctx.font = `${fontSize}px "Plus Jakarta Sans", sans-serif`;
          
          const isNote = node.type === 'note';
          const nodeColor = isNote ? '#6366f1' : '#06b6d4';
          const nodeRadius = isNote ? 5 : 3.5;

          // Draw outer glow aura
          ctx.beginPath();
          ctx.arc(node.x, node.y, nodeRadius + 3, 0, 2 * Math.PI, false);
          ctx.fillStyle = isNote ? 'rgba(99, 102, 241, 0.15)' : 'rgba(6, 182, 212, 0.15)';
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
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.fillText(label, node.x, node.y + nodeRadius + 3);
          }
        }}
      />
    </div>
  );
}
