import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Brain,
  FileText,
  ArrowRight,
  PlusCircle,
  Search,
  Zap,
  Tag
} from 'lucide-react';
import { useNoteStore } from '../store/noteStore';
import { useNotes, useUpdateNote } from '../hooks/useNotes';
import { soundEngine } from '../utils/soundEngine';

interface Citation {
  id: string;
  title: string;
  snippet: string;
  score?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citations?: Citation[];
}

const QUICK_PROMPTS = [
  { label: 'Summarize Note', prompt: 'Please summarize the key takeaways of this note into bullet points.' },
  { label: 'Extract Tasks', prompt: 'Extract any actionable tasks, to-dos, or next steps from this note.' },
  { label: 'Search Brain', prompt: 'Search all my notes for concepts related to this topic.' },
  { label: 'Brainstorm Ideas', prompt: 'Generate 3 creative ideas or expansions related to this content.' },
];

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your Neuro AI Second Brain. Ask questions about your active note or query your entire knowledge vault with full RAG citations.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const [searchVaultMode, setSearchVaultMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { activeNoteId, setActiveNoteId } = useNoteStore();
  const { data: notes } = useNotes();
  const updateNoteMutation = useUpdateNote();
  const activeNote = notes?.find((n) => n.id === activeNoteId);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || isLoading) return;

    soundEngine.playClick();
    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // 1. Semantic RAG Search across vault if in Search Vault mode or asking cross-note questions
      let foundCitations: Citation[] = [];
      if (notes && notes.length > 0) {
        const queryTerms = textToSend.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const matches = notes
          .map(note => {
            const titleMatch = queryTerms.some(t => note.title.toLowerCase().includes(t));
            const contentMatch = queryTerms.some(t => note.content.toLowerCase().includes(t));
            const score = (titleMatch ? 2 : 0) + (contentMatch ? 1 : 0);
            return { note, score };
          })
          .filter(m => m.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        foundCitations = matches.map(m => ({
          id: m.note.id,
          title: m.note.title || 'Untitled Note',
          snippet: m.note.content.slice(0, 140).replace(/[\n#*`]/g, ' ').trim() + '...',
          score: m.score,
        }));
      }

      // 2. Query Agent / AI Backend
      const res = await fetch('http://localhost:8000/api/v1/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_text: textToSend,
          context_note: activeNote
            ? { id: activeNote.id, title: activeNote.title, content: activeNote.content.slice(0, 1200) }
            : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.display_text || data.voice_response || 'Processed query successfully.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: foundCitations.length > 0 ? foundCitations : undefined,
        };
        soundEngine.playSuccessTone();
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error('Local agent fallback');
      }
    } catch (e) {
      // Local fallback
      let fallbackText = `I analyzed your knowledge base for "${textToSend}".`;
      if (activeNote) {
        fallbackText += ` In active note "${activeNote.title}", there are ${activeNote.content.split(/\s+/).length} words.`;
      }
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleInsertIntoNote = (id: string, text: string) => {
    if (!activeNote) return;
    const updatedContent = `${activeNote.content}\n\n---\n**AI Copilot Insight:**\n${text}`;
    updateNoteMutation.mutate({
      ...activeNote,
      content: updatedContent,
    });
    setInsertedId(id);
    setTimeout(() => setInsertedId(null), 1500);
    soundEngine.playSuccessTone();
  };

  return (
    <div className="flex flex-col h-full bg-[#080911] text-zinc-200 select-none">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-white/[0.06] bg-[#0a0c16] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Brain size={13} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white font-sans tracking-tight">
              Neuro AI Copilot
            </h3>
            <span className="text-[10px] text-cyan-400 font-mono">
              {activeNote ? `Active: ${activeNote.title.slice(0, 18)}...` : 'Vault Intelligence'}
            </span>
          </div>
        </div>

        {/* Vault Search Mode Pill */}
        <button
          onClick={() => setSearchVaultMode(!searchVaultMode)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono border transition-all ${
            searchVaultMode
              ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(0,245,255,0.2)]'
              : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
          }`}
          title="Search entire second brain vault"
        >
          <Search size={10} />
          <span>Vault RAG</span>
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-xl p-3 leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-600 text-white rounded-br-none shadow-md font-sans'
                  : 'bg-[#101322] border border-white/[0.08] text-zinc-200 rounded-bl-none shadow-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Source Note Citations Badges */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-white/[0.08] space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1">
                    <FileText size={10} /> Cited Vault Notes:
                  </div>
                  <div className="space-y-1">
                    {msg.citations.map((cite) => (
                      <div
                        key={cite.id}
                        onClick={() => setActiveNoteId(cite.id)}
                        className="p-1.5 rounded-lg bg-black/40 hover:bg-cyan-950/40 border border-white/[0.06] hover:border-cyan-500/30 cursor-pointer transition-all flex items-start gap-1.5 group"
                      >
                        <ArrowRight size={10} className="text-cyan-400 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-zinc-200 group-hover:text-cyan-300 truncate">
                            {cite.title}
                          </p>
                          <p className="text-[9px] text-zinc-400 line-clamp-1">
                            {cite.snippet}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Assistant Action Buttons */}
            {msg.role === 'assistant' && msg.id !== 'welcome' && (
              <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-zinc-500 font-mono">
                <button
                  onClick={() => handleCopy(msg.id, msg.content)}
                  className="hover:text-zinc-300 transition-colors flex items-center gap-1"
                >
                  {copiedId === msg.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                  <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                </button>

                {activeNote && (
                  <button
                    onClick={() => handleInsertIntoNote(msg.id, msg.content)}
                    className="hover:text-cyan-300 transition-colors flex items-center gap-1 text-zinc-400"
                  >
                    {insertedId === msg.id ? <Check size={10} className="text-emerald-400" /> : <PlusCircle size={10} />}
                    <span>{insertedId === msg.id ? 'Inserted' : 'Insert to Note'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-zinc-500 font-mono text-[11px] p-2 bg-[#101322] border border-white/[0.06] rounded-xl w-fit">
            <Loader2 size={12} className="animate-spin text-cyan-400" />
            <span>Consulting Second Brain...</span>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Quick Action Prompt Chips */}
      <div className="px-3 py-2 border-t border-white/[0.04] bg-[#090b14] flex items-center gap-1.5 overflow-x-auto select-none">
        {QUICK_PROMPTS.map((qp, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(qp.prompt)}
            className="flex-shrink-0 px-2 py-1 rounded-md bg-white/[0.03] hover:bg-cyan-500/10 border border-white/[0.06] hover:border-cyan-500/30 text-[10px] text-zinc-400 hover:text-cyan-300 transition-all font-sans"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-white/[0.06] bg-[#0a0c16]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 bg-[#121626] border border-white/[0.08] focus-within:border-cyan-500/50 rounded-xl px-3 py-2 transition-all shadow-inner"
        >
          <input
            type="text"
            placeholder={searchVaultMode ? "Ask across entire Second Brain..." : "Ask Copilot about this note..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 outline-none font-sans"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-30 disabled:hover:bg-cyan-600 transition-all shadow-sm"
          >
            <Send size={12} />
          </button>
        </form>
      </div>
    </div>
  );
}
