import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutGrid,
  Plus,
  Type,
  FileText,
  Sparkles,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Move,
  Link2,
} from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { useNoteStore } from '../store/noteStore';

interface CanvasNode {
  id: string;
  type: 'text' | 'note';
  file?: string;
  text?: string;
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
  color?: string;
}

const PALETTE_COLORS = ['#0071E3', '#30D158', '#FF9F0A', '#BF5AF2', '#FF375F', '#64D2FF'];

export default function CanvasPage({ onNavigate }: { onNavigate?: (page: any) => void }) {
  const { data: notes = [] } = useNotes();
  const { setActiveNoteId } = useNoteStore();

  const [nodes, setNodes] = useState<CanvasNode[]>(() => {
    try {
      const saved = localStorage.getItem('neuro_desktop_canvas');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.nodes)) return parsed.nodes;
      }
    } catch {}
    return [];
  });

  const [edges, setEdges] = useState<CanvasEdge[]>(() => {
    try {
      const saved = localStorage.getItem('neuro_desktop_canvas');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.edges)) return parsed.edges;
      }
    } catch {}
    return [];
  });

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [aiGoal, setAiGoal] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync to local storage and remote canvas API
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('neuro_desktop_canvas', JSON.stringify({ nodes, edges }));
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/obsidian/canvas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodes, edges }),
        }).catch(() => {});
      } catch {}
    }, 1200);
    return () => clearTimeout(timer);
  }, [nodes, edges]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && (e.target as HTMLElement).classList.contains('canvas-background')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedNodeId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (draggingNodeId) {
      const newX = Math.round((e.clientX - pan.x - dragOffset.x) / zoom);
      const newY = Math.round((e.clientY - pan.y - dragOffset.y) / zoom);
      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n)),
      );
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Zoom with scroll wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.min(2.5, Math.max(0.4, prev * zoomFactor)));
  };

  // Node Dragging Start
  const handleNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);

    if (connectingFromId && connectingFromId !== node.id) {
      // Connect nodes with edge
      const newEdge: CanvasEdge = {
        id: `edge-${connectingFromId}-${node.id}-${Date.now().toString().slice(-4)}`,
        fromNode: connectingFromId,
        toNode: node.id,
        color: '#0A84FF',
      };
      setEdges((prev) => [...prev, newEdge]);
      setConnectingFromId(null);
      return;
    }

    setDraggingNodeId(node.id);
    setDragOffset({
      x: e.clientX - pan.x - node.x * zoom,
      y: e.clientY - pan.y - node.y * zoom,
    });
  };

  // Add linked note card
  const handleAddNoteCard = () => {
    const randomNote = notes.length > 0 ? notes[Math.floor(Math.random() * notes.length)] : null;
    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      type: 'note',
      file: randomNote?.title
        ? `${randomNote.title}.md`
        : `Note_${Date.now().toString().slice(-4)}.md`,
      text: randomNote?.content
        ? randomNote.content.slice(0, 100)
        : '# New Vault Note\nConnected thought.',
      x: Math.round(-pan.x / zoom + 180 + Math.random() * 80),
      y: Math.round(-pan.y / zoom + 120 + Math.random() * 80),
      width: 280,
      height: 140,
      color: '#0071E3',
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  // Add text card
  const handleAddTextCard = () => {
    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      type: 'text',
      text: 'Insight or synthesis note...',
      x: Math.round(-pan.x / zoom + 180 + Math.random() * 80),
      y: Math.round(-pan.y / zoom + 120 + Math.random() * 80),
      width: 260,
      height: 120,
      color: '#30D158',
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  // Delete node
  const handleDeleteSelected = () => {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setEdges((prev) =>
      prev.filter((e) => e.fromNode !== selectedNodeId && e.toNode !== selectedNodeId),
    );
    setSelectedNodeId(null);
  };

  // AI Roadmap Synthesis
  const handleSynthesizeRoadmap = () => {
    if (!aiGoal.trim()) return;
    setIsSynthesizing(true);
    setTimeout(() => {
      const centerX = Math.round(-pan.x / zoom + 260);
      const centerY = Math.round(-pan.y / zoom + 160);

      const rootNode: CanvasNode = {
        id: `goal-root-${Date.now()}`,
        type: 'text',
        text: `🎯 Core Objective:\n${aiGoal.trim()}`,
        x: centerX,
        y: centerY,
        width: 280,
        height: 120,
        color: '#0071E3',
      };

      const step1: CanvasNode = {
        id: `step-1-${Date.now()}`,
        type: 'note',
        file: 'Phase 1 - Discovery.md',
        text: '# Foundations & Theory\nAnalyze requirements, core literature, and constraints.',
        x: centerX + 340,
        y: centerY - 80,
        width: 260,
        height: 120,
        color: '#30D158',
      };

      const step2: CanvasNode = {
        id: `step-2-${Date.now()}`,
        type: 'note',
        file: 'Phase 2 - Execution.md',
        text: '# Implementation & Testing\nIterative prototyping and verification loops.',
        x: centerX + 340,
        y: centerY + 80,
        width: 260,
        height: 120,
        color: '#FF9F0A',
      };

      const edge1: CanvasEdge = {
        id: `e-${rootNode.id}-${step1.id}`,
        fromNode: rootNode.id,
        toNode: step1.id,
        label: 'initiates',
        color: '#30D158',
      };

      const edge2: CanvasEdge = {
        id: `e-${rootNode.id}-${step2.id}`,
        fromNode: rootNode.id,
        toNode: step2.id,
        label: 'leads to',
        color: '#FF9F0A',
      };

      setNodes((prev) => [...prev, rootNode, step1, step2]);
      setEdges((prev) => [...prev, edge1, edge2]);
      setAiGoal('');
      setIsSynthesizing(false);
    }, 600);
  };

  // Export JSON Canvas 1.0
  const handleExportJSON = () => {
    const spec = {
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
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vault-canvas-${Date.now()}.canvas`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className="canvas-background relative w-full h-full bg-[#000000] overflow-hidden select-none cursor-grab active:cursor-grabbing"
      style={{
        backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px)`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-6 right-6 z-30 flex items-center justify-between pointer-events-none">
        {/* Title & Badge */}
        <div className="flex items-center gap-3 p-2 rounded-2xl bg-[#1C1C22]/80 backdrop-blur-xl border border-white/[0.1] shadow-xl pointer-events-auto">
          <div className="p-2 rounded-xl bg-white/[0.08] text-[#0A84FF]">
            <LayoutGrid size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#F5F5F7]">Canvas Studio</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#0071E3]/20 border border-[#0071E3]/30 text-[#0A84FF] font-mono">
                JSON Canvas 1.0
              </span>
            </div>
            <p className="text-[11px] text-[#86868B]">
              Spatial mind-mapping with native Obsidian interoperability
            </p>
          </div>
        </div>

        {/* AI Synthesis Prompt */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#1C1C22]/80 backdrop-blur-xl border border-white/[0.1] shadow-xl pointer-events-auto">
          <input
            type="text"
            value={aiGoal}
            onChange={(e) => setAiGoal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSynthesizeRoadmap()}
            placeholder="Synthesize roadmap nodes (e.g. LLM Fine-Tuning)..."
            className="w-64 bg-transparent text-xs text-[#F5F5F7] placeholder-[#86868B] px-3 py-1.5 focus:outline-none font-sans"
          />
          <button
            onClick={handleSynthesizeRoadmap}
            disabled={isSynthesizing || !aiGoal.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-medium transition-all disabled:opacity-50 shadow-sm"
          >
            <Sparkles size={12} />
            <span>{isSynthesizing ? 'Synthesizing...' : 'Generate'}</span>
          </button>
        </div>

        {/* Actions Cluster */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#1C1C22]/80 backdrop-blur-xl border border-white/[0.1] shadow-xl pointer-events-auto">
          <button
            onClick={handleAddNoteCard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-[#F5F5F7] text-xs font-medium transition-all"
            title="Add Note Card"
          >
            <FileText size={13} className="text-[#0A84FF]" />
            <span>Note</span>
          </button>
          <button
            onClick={handleAddTextCard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-[#F5F5F7] text-xs font-medium transition-all"
            title="Add Text Sticky"
          >
            <Type size={13} className="text-[#30D158]" />
            <span>Text</span>
          </button>

          {selectedNodeId && (
            <>
              <div className="w-px h-5 bg-white/[0.1] mx-1" />
              <button
                onClick={() => setConnectingFromId(selectedNodeId)}
                className={`p-1.5 rounded-xl border text-xs font-medium transition-all ${
                  connectingFromId === selectedNodeId
                    ? 'bg-[#0071E3] text-white border-[#0071E3]'
                    : 'bg-white/[0.06] hover:bg-white/[0.1] text-[#A1A1A6] border-white/[0.08]'
                }`}
                title="Connect arrow to another node"
              >
                <Link2 size={13} />
              </button>
              <button
                onClick={handleDeleteSelected}
                className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-all"
                title="Delete Selected Node"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}

          <div className="w-px h-5 bg-white/[0.1] mx-1" />

          <button
            onClick={handleExportJSON}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-[#A1A1A6] hover:text-white transition-all"
            title="Export .canvas specification"
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      {/* SVG Canvas Edges Layer */}
      <svg
        className="absolute inset-0 pointer-events-none w-full h-full"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <marker
            id="desktop-arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill="#0A84FF" />
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

          return (
            <g key={edge.id}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={edge.color || '#0A84FF'}
                strokeWidth={2 * zoom}
                strokeDasharray="4 4"
                markerEnd="url(#desktop-arrow)"
                className="opacity-80"
              />
              {edge.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 6}
                  fill="#A1A1A6"
                  fontSize={10 * Math.max(0.7, zoom)}
                  textAnchor="middle"
                  className="font-mono font-medium fill-[#A1A1A6]"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Empty State Overlay */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          <div className="p-8 rounded-3xl bg-[#1C1C22]/80 backdrop-blur-2xl border border-white/[0.1] text-center max-w-sm pointer-events-auto shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-[#0A84FF]">
              <LayoutGrid size={24} />
            </div>
            <h3 className="text-sm font-semibold text-[#F5F5F7] mb-1.5">Canvas is Ready</h3>
            <p className="text-xs text-[#86868B] leading-relaxed mb-5">
              Add note cards, text nodes, or synthesize a visual topic roadmap to map out your
              second brain spatially.
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={handleAddNoteCard}
                className="px-3 py-1.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-medium transition-all shadow-sm"
              >
                + Add Note Card
              </button>
              <button
                onClick={handleAddTextCard}
                className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-[#F5F5F7] text-xs font-medium transition-all"
              >
                + Add Text Sticky
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Nodes Viewport */}
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
              className={`absolute pointer-events-auto rounded-2xl border transition-all cursor-move flex flex-col overflow-hidden backdrop-blur-xl ${
                isSelected
                  ? 'border-[#0A84FF] ring-2 ring-[#0A84FF]/40 shadow-2xl scale-[1.01]'
                  : 'border-white/[0.1] hover:border-white/[0.2] shadow-xl'
              }`}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width}px`,
                minHeight: `${node.height}px`,
                backgroundColor: 'rgba(28, 28, 34, 0.92)',
              }}
            >
              {/* Node Card Header */}
              <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: node.color || '#0071E3' }}
                  />
                  <span className="text-[11px] font-semibold text-[#F5F5F7] truncate font-mono">
                    {node.file || (node.type === 'note' ? 'Note Card' : 'Sticky Text')}
                  </span>
                </div>
                {node.type === 'note' && (
                  <button
                    onClick={() => {
                      const match = notes.find((n) => `${n.title}.md` === node.file);
                      if (match) {
                        setActiveNoteId(match.id);
                        onNavigate?.('editor');
                      }
                    }}
                    className="text-[10px] text-[#0A84FF] hover:underline font-mono"
                  >
                    Open
                  </button>
                )}
              </div>

              {/* Node Card Content */}
              <div className="p-3 flex-1 flex flex-col">
                <textarea
                  value={node.text || ''}
                  onChange={(e) => {
                    const newText = e.target.value;
                    setNodes((prev) =>
                      prev.map((n) => (n.id === node.id ? { ...n, text: newText } : n)),
                    );
                  }}
                  className="w-full flex-1 bg-transparent text-xs text-[#F5F5F7] placeholder-[#86868B] resize-none focus:outline-none font-sans leading-relaxed"
                  placeholder="Card content..."
                />
              </div>

              {/* Color Bar */}
              <div className="px-3 py-1.5 bg-black/30 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-[9px] text-[#86868B] font-mono">
                  {node.x}, {node.y}
                </span>
                <div className="flex items-center gap-1">
                  {PALETTE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() =>
                        setNodes((prev) =>
                          prev.map((n) => (n.id === node.id ? { ...n, color: c } : n)),
                        )
                      }
                      className="w-2.5 h-2.5 rounded-full transition-transform hover:scale-125"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Floating Zoom Controls */}
      <div className="absolute bottom-6 right-6 z-30 flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#1C1C22]/80 backdrop-blur-xl border border-white/[0.1] shadow-xl">
        <button
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
          className="p-1.5 rounded-xl text-[#86868B] hover:text-[#F5F5F7] hover:bg-white/[0.08] transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        <span className="text-[11px] font-mono text-[#F5F5F7] px-2 font-medium">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
          className="p-1.5 rounded-xl text-[#86868B] hover:text-[#F5F5F7] hover:bg-white/[0.08] transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
        <div className="w-px h-4 bg-white/[0.1] mx-0.5" />
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="p-1.5 rounded-xl text-[#86868B] hover:text-[#F5F5F7] hover:bg-white/[0.08] transition-colors"
          title="Reset View"
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  );
}
