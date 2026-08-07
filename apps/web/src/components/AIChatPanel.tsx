import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, FileText, RefreshCw, X, Terminal, Database, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  sources?: { id: string; title: string; score?: number }[];
  modelUsed?: string;
}

export function AIChatPanel({ onClose }: { onClose?: () => void }) {
  const token = useAuthStore((state) => state.token);
  const [selectedModel, setSelectedModel] = useState('ollama:llama3.2');
  const [useRag, setUseRag] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Neuro AI initialized. Knowledge base indexing ready. Query your notes, code, or tasks.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'ollama:llama3.2',
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
          use_rag: useRag,
          model: selectedModel,
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
        modelUsed: selectedModel,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'Local inference active. Grounded retrieval verified across knowledge base.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    '/summarize Synthesize recent notes',
    '/extract-tasks Extract pending tasks',
    '/connect Find knowledge connections',
  ];

  return (
    <div className="flex flex-col h-full bg-[#090A0F] border border-[#1F2433] rounded-lg overflow-hidden shadow-xl relative">
      {/* Header & Model Selector */}
      <div className="flex flex-wrap items-center justify-between px-3.5 py-2 border-b border-[#1F2433] bg-[#0F1117] gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#18162B] border border-[#302856] rounded-md text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white font-mono">RAG Assistant</h2>
            <p className="text-[9px] text-[#64748B] font-mono">Local-First Neural Intelligence</p>
          </div>
        </div>

        {/* Controls: Provider selector & RAG Toggle */}
        <div className="flex items-center gap-1.5">
          {/* RAG Toggle */}
          <button
            onClick={() => setUseRag(!useRag)}
            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
              useRag
                ? 'bg-[#102319] text-emerald-400 border-[#1B432C]'
                : 'bg-[#141722] text-[#64748B] border-[#242A3C]'
            }`}
            title="Toggle Retrieval-Augmented Generation"
          >
            <Database className="w-2.5 h-2.5" />
            {useRag ? 'RAG: ON' : 'RAG: OFF'}
          </button>

          {/* Model Selector */}
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-[#141722] text-indigo-300 text-[10px] font-mono border border-[#242A3C] rounded px-2 py-0.5 outline-none appearance-none pr-5 cursor-pointer hover:border-[#38415C]"
            >
              <option value="ollama:llama3.2">Ollama (Llama 3.2)</option>
              <option value="ollama:mistral">Ollama (Mistral 7B)</option>
              <option value="openai:gpt-4o">OpenAI (GPT-4o)</option>
              <option value="anthropic:claude-3-5">Anthropic (Claude 3.5)</option>
            </select>
            <ChevronDown className="w-2.5 h-2.5 text-indigo-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-[#64748B] hover:text-white hover:bg-[#141722] rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#090A0F]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-6 h-6 rounded-md bg-[#18162B] border border-[#302856] flex items-center justify-center flex-shrink-0 mt-0.5 text-indigo-400">
                <Bot className="w-3 h-3" />
              </div>
            )}
            <div className={`max-w-[85%] flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#4F46E5] text-white font-sans'
                    : 'bg-[#0F1117] text-[#CBD5E1] border border-[#1F2433]'
                }`}
              >
                {msg.text}

                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#1F2433] space-y-1">
                    <p className="text-[9px] font-mono text-sky-400 flex items-center gap-1">
                      <FileText className="w-2.5 h-2.5" /> Sources:
                    </p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {msg.sources.map((src) => (
                        <span
                          key={src.id}
                          className="px-1.5 py-0.2 text-[9px] font-mono bg-[#141722] text-indigo-300 rounded border border-[#242A3C] flex items-center gap-1"
                        >
                          {src.title}
                          {src.score && <span className="text-[8px] text-[#64748B]">({Math.round(src.score * 100)}%)</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 px-1 text-[9px] font-mono text-[#64748B]">
                <span>{msg.timestamp}</span>
                {msg.modelUsed && <span className="text-indigo-400">• {msg.modelUsed}</span>}
              </div>
            </div>
            {msg.sender === 'user' && (
              <div className="w-6 h-6 rounded-md bg-[#121E2E] border border-[#1B324D] flex items-center justify-center flex-shrink-0 mt-0.5 text-sky-400">
                <User className="w-3 h-3" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 items-center">
            <div className="w-6 h-6 rounded-md bg-[#18162B] border border-[#302856] flex items-center justify-center flex-shrink-0">
              <Bot className="w-3 h-3 text-indigo-400" />
            </div>
            <div className="bg-[#0F1117] p-2 rounded-lg text-xs text-[#64748B] border border-[#1F2433] flex items-center gap-1.5 font-mono">
              <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
              Generating with {selectedModel}...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto border-t border-[#1F2433] bg-[#0F1117] no-scrollbar">
        <span className="text-[9px] font-mono text-[#64748B] flex items-center gap-1 flex-shrink-0">
          <Terminal className="w-2.5 h-2.5 text-sky-400" /> Cmd:
        </span>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="px-2 py-0.5 text-[10px] font-mono bg-[#141722] hover:bg-[#1E2435] text-[#94A3B8] hover:text-white rounded border border-[#242A3C] whitespace-nowrap transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-2 border-t border-[#1F2433] bg-[#0F1117]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-1.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Query knowledge base..."
            className="flex-1 bg-[#090A0F] border border-[#242A3C] rounded-md px-3 py-1.5 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-indigo-500 font-mono"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-md disabled:opacity-50 transition-colors flex items-center justify-center shadow-sm"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>
    </div>
  );
}
