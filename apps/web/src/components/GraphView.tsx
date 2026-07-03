import React, { useRef, useCallback, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useGraph } from '../hooks/useGraph';

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
    // Initial dimensions update
    setTimeout(updateDimensions, 100);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    if (fgRef.current) {
      // Pan to node
      fgRef.current.centerAt(node.x, node.y, 1000);
      // Zoom in
      fgRef.current.zoom(4, 2000);
    }
    
    if (node.type === 'note') {
      console.log('Navigate to note ID:', node.id);
      // In a real app, you'd use a router hook here like useNavigate
    }
  }, []);

  if (isPending) return <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a] text-purple-400">Loading graph data...</div>;
  if (error) return <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a] text-red-500">Error loading graph data: {(error as Error).message}</div>;
  if (!data) return <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a] text-gray-400">No graph data available</div>;

  // Safely fallback if the backend returns edges instead of links
  const safeData = {
    nodes: data.nodes || [],
    links: data.links || (data as any).edges || []
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-[#0a0a0a] overflow-hidden flex-grow relative">
      <div className="absolute top-4 left-4 z-10 text-white pointer-events-none">
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-400">Knowledge Graph</h2>
      </div>
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={safeData}
        nodeLabel="name"
        nodeColor={(node: any) => node.type === 'note' ? '#a855f7' : '#3b82f6'} // Electric purple for notes, bright blue for tags
        nodeRelSize={6}
        linkColor={(link: any) => {
          if (!hoverNode) return 'rgba(168, 85, 247, 0.2)';
          return (link.source.id === hoverNode.id || link.target.id === hoverNode.id)
            ? 'rgba(168, 85, 247, 0.8)'
            : 'rgba(168, 85, 247, 0.05)';
        }}
        linkWidth={(link: any) => {
          if (!hoverNode) return 1.5;
          return (link.source.id === hoverNode.id || link.target.id === hoverNode.id) ? 3 : 1;
        }}
        backgroundColor="#0a0a0a" // dark theme
        onNodeHover={setHoverNode}
        onNodeClick={handleNodeClick}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 14 / globalScale;
          ctx.font = `${fontSize}px Inter, sans-serif`;
          
          const isNote = node.type === 'note';
          const nodeColor = isNote ? '#a855f7' : '#3b82f6';
          const nodeRadius = isNote ? 6 : 4;
          const isHovered = hoverNode && hoverNode.id === node.id;

          // Draw node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, isHovered ? nodeRadius * 1.5 : nodeRadius, 0, 2 * Math.PI, false);
          ctx.fillStyle = nodeColor;
          ctx.fill();
          
          if (isHovered) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1 / globalScale;
            ctx.stroke();
          }

          // Draw label
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = isHovered ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.8)';
          ctx.fillText(label, node.x, node.y + (isHovered ? nodeRadius * 1.5 : nodeRadius) + 2);
        }}
      />
    </div>
  );
}
