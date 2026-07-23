import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, FileText, RefreshCw, X, Terminal } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  sources?: { id: string; title: string }[];
}

export function AIChatPanel({ onClose }: { onClose?: () => void }) {
  const token = useAuthStore((state) => state.token);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Hello! I am Neuro AI, your local-first knowledge assistant. Ask me anything grounded in your notes, research, or tasks.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const prompt = textToSend || input;
    if (!prompt.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: prompt,
          use_rag: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI response');
      }

      const data = await response.json();
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.response || data.text || 'Analyzed your knowledge base. Here are the relevant findings.',
        sources: data.sources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'Neuro AI is operating in offline mode. Connect an API key (Ollama, OpenAI, or Anthropic) in settings for full RAG response.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Synthesize my recent notes',
    'What tasks are currently pending?',
    'Find connections between my projects',
  ];

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-[#0E1017]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-600/30 border border-indigo-500/40 rounded-xl">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Neuro RAG Assistant
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                RAG Active
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">Grounding responses in your local notes</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-7 h-7 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-indigo-400" />
              </div>
            )}
            <div className={`max-w-[82%] flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-md font-sans'
                    : 'bg-[#141622] text-slate-200 rounded-bl-none border border-white/[0.08]'
                }`}
              >
                {msg.text}

                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1">
                    <p className="text-[10px] font-semibold text-sky-400 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Grounded In:
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {msg.sources.map((src) => (
                        <span
                          key={src.id}
                          className="px-2 py-0.5 text-[10px] bg-white/5 hover:bg-white/10 text-slate-300 rounded border border-white/10 cursor-pointer transition-all"
                        >
                          {src.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-400 mt-1 px-1">{msg.timestamp}</span>
            </div>
            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-4 h-4 text-sky-400" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 items-center">
            <div className="w-7 h-7 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-indigo-400 animate-spin" />
            </div>
            <div className="bg-[#141622] p-3 rounded-2xl rounded-bl-none text-xs text-slate-400 border border-white/[0.08] flex items-center gap-2 font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              Synthesizing local knowledge base...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto border-t border-white/[0.06] bg-[#0E1017]/60 no-scrollbar">
        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 flex-shrink-0">
          <Terminal className="w-3 h-3 text-sky-400" /> Suggested:
        </span>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="px-2.5 py-1 text-[11px] neuro-button-secondary rounded-lg whitespace-nowrap transition-all"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-white/[0.08] bg-[#0E1017]/90 backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Neuro AI..."
            className="flex-1 neuro-input rounded-xl px-4 py-2 text-xs text-white placeholder-slate-400 font-sans"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 neuro-button-primary rounded-xl text-white disabled:opacity-50 transition-all flex items-center justify-center"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
