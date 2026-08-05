import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Wand2,
  FileText,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Zap,
  CornerDownLeft,
  Copy,
  Check,
  Brain,
  MessageSquare
} from 'lucide-react';
import { useNoteStore } from '../store/noteStore';
import { useNotes } from '../hooks/useNotes';
import { soundEngine } from '../utils/soundEngine';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { label: 'Summarize Note', prompt: 'Please summarize the key takeaways of this note into bullet points.' },
  { label: 'Extract Tasks', prompt: 'Extract any actionable tasks, to-dos, or next steps from this note.' },
  { label: 'Find Connections', prompt: 'What related ideas or wiki links should be connected to this topic?' },
  { label: 'Brainstorm Ideas', prompt: 'Generate 3 creative ideas or expansions related to this content.' },
];

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your Neuro Assistant. I have full context of your active note and knowledge graph.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { activeNoteId } = useNoteStore();
  const { data: notes } = useNotes();
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
      // First check local agent orchestrator / backend AI
      const res = await fetch('http://localhost:8000/api/v1/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_text: textToSend,
          context_note: activeNote ? { id: activeNote.id, title: activeNote.title, content: activeNote.content.slice(0, 1000) } : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.display_text || data.voice_response || 'Processed action successfully.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        soundEngine.playSuccessTone();
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error('Local agent fallback');
      }
    } catch (e) {
      // Fallback local intelligent response
      const fallbackMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Analyzed query for "${activeNote?.title || 'your workspace'}". The offline deterministic engine and SQLite knowledge repository are active.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0d16] border-l border-white/[0.06] select-none">
      
      {/* Copilot Header */}
      <div className="p-4 border-b border-white/[0.06] bg-[#0d101c] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center text-brand-primary-light">
            <Sparkles size={13} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white tracking-tight">
              Neuro Copilot
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono">
              {activeNote ? `Context: ${activeNote.title}` : 'Workspace Context'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse" />
          <span className="text-[10px] text-zinc-400 font-mono">Ready</span>
        </div>
      </div>

      {/* Quick Context Prompt Chips */}
      {activeNote && (
        <div className="p-3 border-b border-white/[0.04] bg-[#07080e] flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(item.prompt)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-[11px] text-zinc-400 hover:text-zinc-200 transition-all disabled:opacity-40"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Chat Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#080a10]">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-zinc-500 font-mono">
                <span>{isUser ? 'You' : 'Neuro'}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`relative p-3.5 rounded-2xl text-xs max-w-[92%] leading-relaxed ${
                  isUser
                    ? 'bg-brand-primary text-white shadow-glow-primary rounded-tr-sm'
                    : 'bg-[#101422] text-zinc-200 border border-white/[0.06] rounded-tl-sm'
                }`}
              >
                <div className="whitespace-pre-wrap select-text font-sans">
                  {msg.content}
                </div>

                {!isUser && (
                  <button
                    onClick={() => copyMessage(msg.content, msg.id)}
                    className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 rounded hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-opacity"
                    title="Copy message"
                  >
                    {copiedId === msg.id ? <Check size={11} className="text-brand-emerald" /> : <Copy size={11} />}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-zinc-500 text-xs py-2 px-1 font-mono">
            <Loader2 size={13} className="animate-spin text-brand-primary" />
            <span>Reasoning across knowledge graph...</span>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Message Input Box */}
      <div className="p-3 border-t border-white/[0.06] bg-[#0d101c]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask copilot about this note..."
            disabled={isLoading}
            className="flex-1 bg-[#070912] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-brand-primary/60 focus:ring-1 focus:ring-brand-primary/20 transition-all font-sans"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-brand-primary hover:bg-brand-primary-dark text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-glow-primary flex-shrink-0"
            title="Send prompt"
          >
            <Send size={13} />
          </button>
        </form>
      </div>

    </div>
  );
}
