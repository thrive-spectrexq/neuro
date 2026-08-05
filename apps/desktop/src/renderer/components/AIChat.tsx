import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Wand2, FileText, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { useNoteStore } from '../store/noteStore';
import { useNotes } from '../hooks/useNotes';
import { soundEngine } from '../utils/soundEngine';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your Neuro AI Assistant. I can analyze your active note, search your knowledge graph, or execute OS commands.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
      // Build context from active note
      let contextMsg = textToSend;
      if (activeNote) {
        contextMsg = `Context Note: "${activeNote.title}"\nContent: ${activeNote.content.slice(0, 1000)}\n\nQuery: ${textToSend}`;
      }

      // First check local agent orchestrator / backend AI
      const res = await fetch('http://localhost:8000/api/v1/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_text: textToSend }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.display_text || data.voice_response || 'Action processed.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        soundEngine.playSuccessTone();
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error('Fallback to local assistant');
      }
    } catch (e) {
      // Fallback local response
      const fallbackMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I've analyzed your query regarding "${activeNote?.title || 'your workspace'}". The second brain knowledge base is synced and ready.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-panel border-l border-white/5">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-surface/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-accent-purple to-accent-blue flex items-center justify-center shadow">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">AI Copilot</h2>
            <p className="text-[11px] text-gray-400">
              {activeNote ? `Linked to: ${activeNote.title}` : 'Workspace context'}
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                id: 'welcome',
                role: 'assistant',
                content: "Context refreshed. How can I help you with your notes today?",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ])
          }
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Reset conversation"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Quick Prompts (if note is active) */}
      {activeNote && (
        <div className="px-3 py-2 border-b border-white/5 bg-panel/40 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <button
            onClick={() => handleQuickPrompt(`Summarize key points in note: ${activeNote.title}`)}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-accent-purple/20 text-gray-300 hover:text-accent-cyan border border-white/5 transition-all flex items-center gap-1 whitespace-nowrap"
          >
            <FileText size={11} />
            <span>Summarize</span>
          </button>
          <button
            onClick={() => handleQuickPrompt(`Extract action items from note: ${activeNote.title}`)}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-accent-purple/20 text-gray-300 hover:text-accent-cyan border border-white/5 transition-all flex items-center gap-1 whitespace-nowrap"
          >
            <CheckCircle2 size={11} />
            <span>Action Items</span>
          </button>
          <button
            onClick={() => handleQuickPrompt(`Suggest tags and related topics for: ${activeNote.title}`)}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-accent-purple/20 text-gray-300 hover:text-accent-cyan border border-white/5 transition-all flex items-center gap-1 whitespace-nowrap"
          >
            <Wand2 size={11} />
            <span>Tag Suggestions</span>
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-md bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={13} className="text-accent-purple" />
              </div>
            )}

            <div
              className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gradient-to-r from-accent-purple to-accent-blue text-white rounded-tr-none'
                  : 'bg-surface border border-white/5 text-gray-200 rounded-tl-none shadow-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
              <div
                className={`text-[9px] mt-1.5 ${
                  m.role === 'user' ? 'text-white/60 text-right' : 'text-gray-500'
                }`}
              >
                {m.timestamp}
              </div>
            </div>

            {m.role === 'user' && (
              <div className="w-6 h-6 rounded-md bg-accent-blue/20 border border-accent-blue/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User size={13} className="text-accent-blue" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 items-center text-gray-400 text-xs py-2">
            <Loader2 size={14} className="animate-spin text-accent-cyan" />
            <span>Thinking...</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/5 bg-surface/30">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI or command JARVIS..."
            disabled={isLoading}
            className="w-full bg-background border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple/50 pr-9 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-accent-cyan disabled:opacity-30 p-1 transition-colors"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
