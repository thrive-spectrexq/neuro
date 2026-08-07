import { useState } from 'react';
import { 
  Network, 
  Plus, 
  Download, 
  Sparkles, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Type, 
  Trash2,
  Edit3,
  Check
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const OBSIDIAN_COLORS = [
  { name: 'Red', hex: '#e06c75' },
  { name: 'Orange', hex: '#d19a66' },
  { name: 'Yellow', hex: '#e5c07b' },
  { name: 'Green', hex: '#98c379' },
  { name: 'Cyan', hex: '#56b6c2' },
  { name: 'Purple', hex: '#c678dd' },
  { name: 'Indigo', hex: '#6366f1' },
];

interface CanvasNode {
  id: string;
  type: 'note' | 'text' | 'group';
  text?: string;
  file?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  label?: string;
  fromSide?: 'top' | 'right' | 'bottom' | 'left';
  toSide?: 'top' | 'right' | 'bottom' | 'left';
  color?: string;
}

export function VaultCanvasStudio() {
  const token = useAuthStore((state) => state.token);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 100, y: 100 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [roadmapGoal, setRoadmapGoal] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const handleSetNodeColor = (colorHex: string) => {
    if (!selectedNodeId) return;
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNodeId ? { ...n, color: colorHex } : n))
    );
  };

  const handleUpdateNodeText = (id: string, newText: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, text: newText } : n))
    );
  };

  const [nodes, setNodes] = useState<CanvasNode[]>([
    {
      id: 'node-1',
      type: 'note',
      file: 'Index.md',
      text: '# Second Brain Hub\nCentral knowledge entrypoint and core synthesis index.',
      x: 80,
      y: 80,
      width: 280,
      height: 140,
      color: '#6366f1',
    },
    {
      id: 'node-2',
      type: 'note',
      file: 'Neuro AI Architecture.md',
      text: '# Local RAG Engine\nDeterministic retrieval with Okapi BM25 and vector embeddings.',
      x: 440,
      y: 60,
      width: 290,
      height: 140,
      color: '#06b6d4',
    },
    {
      id: 'node-3',
      type: 'text',
      text: '⚡ Milestone: High-Speed Memory\nAchieved 12ms deterministic local query latencies across zero-knowledge encrypted notes.',
      x: 440,
      y: 260,
      width: 290,
      height: 130,
      color: '#10b981',
    },
    {
      id: 'node-4',
      type: 'note',
      file: 'PARA Methodology.md',
      text: '# Projects & Areas\nActive actionable outcomes and standard operating areas.',
      x: 80,
      y: 280,
      width: 280,
      height: 130,
      color: '#f59e0b',
    },
  ]);

  const [edges, setEdges] = useState<CanvasEdge[]>([
    {
      id: 'edge-1-2',
      fromNode: 'node-1',
      toNode: 'node-2',
      label: 'powers',
      color: '#818cf8',
    },
    {
      id: 'edge-2-3',
      fromNode: 'node-2',
      toNode: 'node-3',
      label: 'yields',
      color: '#22d3ee',
    },
    {
      id: 'edge-1-4',
      fromNode: 'node-1',
      toNode: 'node-4',
      label: 'structures',
      color: '#fbbf24',
    },
  ]);

  // Add new text card
  const handleAddTextCard = () => {
    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      type: 'text',
      text: 'New Knowledge Card\nWrite insights, synthesis, or goals here.',
      x: Math.round(-pan.x + 250 + Math.random() * 80),
      y: Math.round(-pan.y + 200 + Math.random() * 80),
      width: 260,
      height: 120,
      color: '#a855f7',
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  // Add new note card
  const handleAddNoteCard = () => {
    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      type: 'note',
      file: `Research_${Date.now().toString().slice(-4)}.md`,
      text: '# New Vault Note\nLinked to knowledge matrix.',
      x: Math.round(-pan.x + 250 + Math.random() * 80),
      y: Math.round(-pan.y + 200 + Math.random() * 80),
      width: 280,
      height: 130,
      color: '#06b6d4',
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  // Delete selected node
  const handleDeleteSelected = () => {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setEdges((prev) => prev.filter((e) => e.fromNode !== selectedNodeId && e.toNode !== selectedNodeId));
    setSelectedNodeId(null);
  };

  // Export JSON Canvas 1.0 specification
  const handleExportJSONCanvas = () => {
    const canvasSpec = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        ...(n.file ? { file: n.file } : {}),
        ...(n.text ? { text: n.text } : {}),
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        color: n.color,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        fromNode: e.fromNode,
        toNode: e.toNode,
        ...(e.label ? { label: e.label } : {}),
        color: e.color,
      })),
    };

    const blob = new Blob([JSON.stringify(canvasSpec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neuro_vault_matrix_${Date.now()}.canvas`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // AI Roadmap Generator directly to Canvas
  const handleGenerateRoadmapCanvas = async () => {
    if (!roadmapGoal.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/v1/roadmap/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ goal: roadmapGoal, depth: 'intermediate' }),
      });

      if (res.ok) {
        const data = await res.json();
        const generatedNodes: CanvasNode[] = (data.nodes || []).map((node: any, idx: number) => ({
          id: node.id || `roadmap-${idx}`,
          type: 'text',
          text: `🎯 ${node.title || node.label}\n${node.description || 'Actionable mastery milestone'}`,
          x: 100 + (idx % 3) * 320,
          y: 100 + Math.floor(idx / 3) * 180,
          width: 280,
          height: 130,
          color: idx === 0 ? '#6366f1' : idx === (data.nodes.length - 1) ? '#10b981' : '#06b6d4',
        }));

        const generatedEdges: CanvasEdge[] = (data.edges || []).map((edge: any, idx: number) => ({
          id: `edge-rm-${idx}`,
          fromNode: edge.source || edge.from,
          toNode: edge.target || edge.to,
          label: edge.label || 'unlocks',
          color: '#818cf8',
        }));

        if (generatedNodes.length > 0) {
          setNodes(generatedNodes);
          setEdges(generatedEdges);
          setPan({ x: 50, y: 50 });
          setZoom(0.9);
        }
      }
    } catch (err) {
      console.error('Roadmap canvas generation error:', err);
    } finally {
      setIsGenerating(false);
      setRoadmapGoal('');
    }
  };

  // Mouse pan & drag interactions
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.canvas-node-card')) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    setSelectedNodeId(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    } else if (draggingNodeId) {
      setNodes((prev) =>
        prev.map((node) => {
          if (node.id === draggingNodeId) {
            return {
              ...node,
              x: Math.round((e.clientX - pan.x - dragOffset.x) / zoom),
              y: Math.round((e.clientY - pan.y - dragOffset.y) / zoom),
            };
          }
          return node;
        })
      );
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setDraggingNodeId(node.id);
    setDragOffset({
      x: e.clientX - pan.x - node.x * zoom,
      y: e.clientY - pan.y - node.y * zoom,
    });
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#090A0F] border border-[#1F2433] rounded-lg overflow-hidden select-none relative">
      {/* Canvas Top Action HUD */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1F2433] bg-[#0F1117] z-30">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#161A24] border border-[#242A3C] rounded-lg text-indigo-400">
            <Network className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-white tracking-wide font-mono">JSON Canvas Studio</h2>
              <span className="px-1.5 py-0.5 text-[9px] font-mono bg-[#161A24] text-indigo-300 border border-[#282E40] rounded">
                JSON Canvas 1.0
              </span>
            </div>
            <p className="text-[10px] text-[#64748B]">Visual spatial mind-mapping & native Obsidian .canvas interoperability</p>
          </div>
        </div>

        {/* AI Goal to Canvas Input */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={roadmapGoal}
              onChange={(e) => setRoadmapGoal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateRoadmapCanvas()}
              placeholder="Synthesize roadmap nodes (e.g. Master Rust)..."
              className="w-64 bg-[#090A0F] border border-[#242A3C] rounded-md px-3 py-1 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <button
            onClick={handleGenerateRoadmapCanvas}
            disabled={isGenerating || !roadmapGoal.trim()}
            className="flex items-center gap-1 px-3 py-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-md text-xs font-medium disabled:opacity-50 transition-colors shadow-sm"
          >
            <Sparkles className="w-3 h-3 text-indigo-200" />
            <span>{isGenerating ? 'Synthesizing...' : 'Generate'}</span>
          </button>
        </div>

        {/* Canvas Toolbar */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleAddNoteCard}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#141722] hover:bg-[#1D2230] text-[#CBD5E1] hover:text-white border border-[#242A3C] rounded-md text-xs font-medium transition-colors"
            title="Add Linked Note Card"
          >
            <Plus className="w-3 h-3 text-sky-400" />
            <span>Note</span>
          </button>
          <button
            onClick={handleAddTextCard}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#141722] hover:bg-[#1D2230] text-[#CBD5E1] hover:text-white border border-[#242A3C] rounded-md text-xs font-medium transition-colors"
            title="Add Sticky Text Node"
          >
            <Type className="w-3 h-3 text-purple-400" />
            <span>Text</span>
          </button>
          {/* Node Customization Palette when a Node is Selected */}
          {selectedNodeId && (
            <div className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-xl">
              <span className="text-[10px] text-slate-400 font-mono mr-1">Color:</span>
              {OBSIDIAN_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => handleSetNodeColor(c.hex)}
                  className="w-4 h-4 rounded-full border border-white/20 hover:scale-125 transition-transform"
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
              <div className="h-3 w-px bg-white/10 mx-1" />
              <button
                onClick={() => setEditingNodeId(editingNodeId === selectedNodeId ? null : selectedNodeId)}
                className={`p-1 rounded-lg text-xs transition-all ${
                  editingNodeId === selectedNodeId
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title="Edit Card Markdown"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {selectedNodeId && (
            <button
              onClick={handleDeleteSelected}
              className="p-1.5 text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 rounded-xl transition-all"
              title="Delete Selected Node"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div className="h-4 w-px bg-white/10 mx-1" />
          <button
            onClick={handleExportJSONCanvas}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all shadow-md"
            title="Export .canvas for Obsidian"
          >
            <Download className="w-3.5 h-3.5" />
            Export .canvas
          </button>
        </div>
      </div>

      {/* Interactive Infinite Canvas Space */}
      <div
        className="flex-1 w-full h-full relative overflow-hidden neuro-dots-pattern bg-[#07080C] cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDownCanvas}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Render Connection Edges */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <marker
              id="canvas-arrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#818cf8" />
            </marker>
          </defs>
          {edges.map((edge) => {
            const fromNode = nodes.find((n) => n.id === edge.fromNode);
            const toNode = nodes.find((n) => n.id === edge.toNode);
            if (!fromNode || !toNode) return null;

            const x1 = pan.x + (fromNode.x + fromNode.width / 2) * zoom;
            const y1 = pan.y + (fromNode.y + fromNode.height / 2) * zoom;
            const x2 = pan.x + (toNode.x + toNode.width / 2) * zoom;
            const y2 = pan.y + (toNode.y + toNode.height / 2) * zoom;

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            return (
              <g key={edge.id}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={edge.color || '#6366f1'}
                  strokeWidth={2 * zoom}
                  strokeDasharray="4 4"
                  markerEnd="url(#canvas-arrow)"
                  className="opacity-75"
                />
                {edge.label && (
                  <text
                    x={midX}
                    y={midY - 6}
                    fill="#cbd5e1"
                    fontSize={10 * Math.max(0.7, zoom)}
                    textAnchor="middle"
                    className="font-mono font-medium fill-slate-300"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Render Canvas Nodes */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                className={`canvas-node-card absolute pointer-events-auto rounded-lg border transition-all cursor-move flex flex-col overflow-hidden ${
                  isSelected
                    ? 'border-indigo-400 ring-1 ring-indigo-500 shadow-xl'
                    : 'border-[#242A3C] hover:border-[#38415C]'
                }`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                  minHeight: `${node.height}px`,
                  backgroundColor: '#12151E',
                }}
              >
                {/* Node Header */}
                <div
                  className="px-2.5 py-1.5 border-b border-[#1F2433] flex items-center justify-between"
                  style={{
                    backgroundColor: node.color ? `${node.color}20` : '#161A24',
                  }}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: node.color || '#6366f1' }}
                    />
                    <span className="text-[11px] font-mono font-bold text-white truncate">
                      {node.file || (node.type === 'note' ? 'Vault Note' : 'Text Card')}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-[#090A0F] text-[#94A3B8] border border-[#242A3C]">
                    {node.type}
                  </span>
                </div>

                {/* Node Content Body */}
                <div 
                  className="p-3 text-xs text-[#CBD5E1] font-sans leading-relaxed flex-1 select-text"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingNodeId(node.id);
                  }}
                >
                  {editingNodeId === node.id ? (
                    <div className="flex flex-col gap-2 h-full">
                      <textarea
                        value={node.text || ''}
                        onChange={(e) => handleUpdateNodeText(node.id, e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        autoFocus
                        rows={5}
                        className="w-full p-2 bg-[#090A0F] border border-indigo-500 rounded text-xs text-white font-mono focus:outline-none resize-none"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingNodeId(null);
                        }}
                        className="self-end px-2 py-1 bg-[#4F46E5] text-white text-[10px] font-semibold rounded flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Done
                      </button>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap font-mono text-[11px]">
                      {node.text}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Zoom & Pan Navigation Controls */}
        <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1 p-1 bg-[#0F1117] border border-[#1F2433] rounded-lg shadow-xl">
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
            className="p-1 text-[#94A3B8] hover:text-white hover:bg-[#181C26] rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-[#64748B] px-1.5">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
            className="p-1 text-[#94A3B8] hover:text-white hover:bg-[#181C26] rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="p-1 text-[#94A3B8] hover:text-white hover:bg-[#181C26] rounded transition-colors"
            title="Reset Pan & Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
