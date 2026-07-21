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
    <div className="flex flex-col h-full glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-accent-purple via-indigo-500 to-accent-blue rounded-xl shadow-lg animate-pulse">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Neuro RAG Assistant
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-accent-purple/30 text-purple-300 border border-purple-500/30 rounded-full">
                Active Context
              </span>
            </h2>
            <p className="text-xs text-gray-400">Grounding responses in your local notes</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-8 h-8 rounded-xl bg-accent-purple/20 border border-accent-purple/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-accent-cyan" />
              </div>
            )}
            <div className={`max-w-[80%] flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-accent-purple to-indigo-600 text-white rounded-br-none shadow-md'
                    : 'glass-panel text-gray-200 rounded-bl-none border border-white/10'
                }`}
              >
                {msg.text}

                {/* Sources list if present */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-white/10 space-y-1">
                    <p className="text-[11px] font-semibold text-accent-cyan flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Grounded In:
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {msg.sources.map((src) => (
                        <span
                          key={src.id}
                          className="px-2 py-0.5 text-[11px] bg-white/5 hover:bg-white/10 text-gray-300 rounded border border-white/10 cursor-pointer transition-all"
                        >
                          {src.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
            </div>
            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-4 h-4 text-accent-blue" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 items-center">
            <div className="w-8 h-8 rounded-xl bg-accent-purple/20 border border-accent-purple/30 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-accent-cyan animate-spin" />
            </div>
            <div className="glass-panel p-3 rounded-2xl rounded-bl-none text-xs text-gray-400 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent-purple" />
              Searching vector database & synthesizing answer...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto border-t border-white/5 no-scrollbar">
        <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1 flex-shrink-0">
          <Terminal className="w-3 h-3 text-accent-cyan" /> Suggested:
        </span>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="px-2.5 py-1 text-xs glass-panel hover:bg-white/10 text-gray-300 rounded-lg whitespace-nowrap transition-all border border-white/10"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-white/10 bg-white/5 backdrop-blur-md">
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
            placeholder="Ask Neuro AI about your notes..."
            className="flex-1 bg-black/40 border border-white/10 focus:border-accent-purple rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-gradient-to-r from-accent-purple to-accent-blue text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-md active:scale-95 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
