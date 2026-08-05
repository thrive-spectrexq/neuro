import React, { useState, useEffect } from 'react';
import {
  Mic,
  Volume2,
  Globe,
  Sliders,
  Database,
  Cpu,
  Zap,
  Save,
  CheckCircle2,
  Radio,
  ExternalLink,
  Shield,
  Key,
  Laptop
} from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

export default function SettingsPage() {
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
  const [voiceResponses, setVoiceResponses] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [browser, setBrowser] = useState('Brave');
  const [searchEngine, setSearchEngine] = useState('Google');
  const [aiProvider, setAiProvider] = useState('Local Ollama (Offline)');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3.2');
  const [openaiKey, setOpenaiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    // Check backend health
    fetch('http://localhost:8000/api/v1/agent/tools')
      .then((res) => setBackendHealthy(res.ok))
      .catch(() => setBackendHealthy(false));
  }, []);

  const handleSave = () => {
    soundEngine.playSuccessTone();
    soundEngine.setMuted(!sfxEnabled);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-8 h-full overflow-y-auto max-w-4xl mx-auto space-y-7 select-none font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
              System Settings
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary-light text-[11px] font-mono">
              v1.2.0 Active
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-sans">
            Configure Neuro voice engine, default OS integrations, LLM providers, and background processes.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white text-xs font-semibold shadow-glow-primary transition-all"
        >
          {saved ? <CheckCircle2 size={14} className="text-emerald-300" /> : <Save size={14} />}
          <span>{saved ? 'Saved Successfully' : 'Save Changes'}</span>
        </button>
      </div>

      {/* 1. Neuro OS Voice Agent Settings */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 font-mono uppercase tracking-wider">
          <Zap size={14} className="text-brand-cyan" />
          <span>Neuro Voice Agent</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl border border-white/[0.06] bg-[#0c0f18] flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-zinc-200">Wake-Word Listening</h3>
              <p className="text-[11px] text-zinc-400">Activates microphone on "Hey Neuro"</p>
            </div>
            <input
              type="checkbox"
              checked={wakeWordEnabled}
              onChange={(e) => setWakeWordEnabled(e.target.checked)}
              className="w-4 h-4 accent-brand-primary cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-2xl border border-white/[0.06] bg-[#0c0f18] flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-zinc-200">Voice Speech Responses</h3>
              <p className="text-[11px] text-zinc-400">Speaks action confirmation audio</p>
            </div>
            <input
              type="checkbox"
              checked={voiceResponses}
              onChange={(e) => setVoiceResponses(e.target.checked)}
              className="w-4 h-4 accent-brand-primary cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-2xl border border-white/[0.06] bg-[#0c0f18] flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-zinc-200">Tactile Audio Chimes</h3>
              <p className="text-[11px] text-zinc-400">Synthesized spatial clicks & feedback</p>
            </div>
            <input
              type="checkbox"
              checked={sfxEnabled}
              onChange={(e) => setSfxEnabled(e.target.checked)}
              className="w-4 h-4 accent-brand-primary cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-2xl border border-white/[0.06] bg-[#0c0f18] flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-zinc-200">Global Shortcut</h3>
              <p className="text-[11px] text-zinc-400">Summon agent HUD from any application</p>
            </div>
            <span className="px-2 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded text-[11px] text-brand-cyan font-mono">
              Ctrl + Space
            </span>
          </div>
        </div>
      </section>

      {/* 2. OS Integration Preferences */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 font-mono uppercase tracking-wider">
          <Laptop size={14} className="text-brand-primary-light" />
          <span>OS Tool Preferences</span>
        </h2>

        <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#0c0f18] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
                Default Web Browser
              </label>
              <select
                value={browser}
                onChange={(e) => setBrowser(e.target.value)}
                className="w-full bg-[#070910] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-zinc-200 outline-none focus:border-brand-primary/50 cursor-pointer"
              >
                <option value="Brave">Brave Browser (Recommended)</option>
                <option value="Chrome">Google Chrome</option>
                <option value="Edge">Microsoft Edge</option>
                <option value="Firefox">Mozilla Firefox</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
                Default Search Engine
              </label>
              <select
                value={searchEngine}
                onChange={(e) => setSearchEngine(e.target.value)}
                className="w-full bg-[#070910] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-zinc-200 outline-none focus:border-brand-primary/50 cursor-pointer"
              >
                <option value="Google">Google Search</option>
                <option value="DuckDuckGo">DuckDuckGo (Privacy)</option>
                <option value="YouTube">YouTube</option>
                <option value="GitHub">GitHub</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* 3. AI Providers Configuration */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 font-mono uppercase tracking-wider">
          <Cpu size={14} className="text-brand-cyan" />
          <span>AI Intelligence Runtime</span>
        </h2>

        <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#0c0f18] space-y-4">
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
              Primary Model Engine
            </label>
            <select
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value)}
              className="w-full bg-[#070910] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-zinc-200 outline-none focus:border-brand-primary/50 cursor-pointer"
            >
              <option value="Local Ollama (Offline)">Local Ollama (100% Offline & Private)</option>
              <option value="OpenAI">OpenAI (GPT-4o)</option>
              <option value="Anthropic">Anthropic (Claude 3.5 Sonnet)</option>
              <option value="Deterministic Only">Zero-Key Deterministic Only (No LLM)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                Ollama Base URL
              </label>
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                className="w-full bg-[#070910] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-zinc-200 outline-none focus:border-brand-primary/50 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                Ollama Model Tag
              </label>
              <input
                type="text"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                className="w-full bg-[#070910] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-zinc-200 outline-none focus:border-brand-primary/50 font-mono"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Backend Supervisor Diagnostics */}
      <section className="space-y-3 pb-8">
        <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 font-mono uppercase tracking-wider">
          <Database size={14} className="text-brand-emerald" />
          <span>Silent Background Supervisor</span>
        </h2>

        <div className="p-4 rounded-2xl border border-white/[0.06] bg-[#0c0f18] space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
            <span className="text-zinc-400">FastAPI Backend Status</span>
            <span className="flex items-center gap-1.5 font-medium">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  backendHealthy ? 'bg-brand-emerald animate-pulse' : 'bg-brand-amber'
                }`}
              />
              <span className={backendHealthy ? 'text-brand-emerald' : 'text-brand-amber'}>
                {backendHealthy ? 'Online (Port 8000)' : 'Supervising'}
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
            <span className="text-zinc-400">Silent Log Target</span>
            <span className="text-zinc-300 font-mono text-[11px]">.neuro/logs/backend.log</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Knowledge Storage</span>
            <span className="text-zinc-300 font-mono text-[11px]">SQLite (Local WAL Mode)</span>
          </div>
        </div>
      </section>
    </div>
  );
}
