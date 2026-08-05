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
  const [anthropicKey, setAnthropicKey] = useState('');
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
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-8 h-full overflow-y-auto max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span>System Settings</span>
            <span className="text-xs px-2.5 py-1 bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30 rounded-full font-normal">
              v1.2.0 Active
            </span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Configure JARVIS voice agent, default OS tools, AI providers, and knowledge storage.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue hover:from-accent-purple/80 hover:to-accent-blue/80 text-white font-medium shadow-lg shadow-accent-purple/25 transition-all"
        >
          {saved ? <CheckCircle2 size={16} className="text-emerald-300" /> : <Save size={16} />}
          <span>{saved ? 'Saved!' : 'Save Changes'}</span>
        </button>
      </div>

      {/* 1. JARVIS OS Voice Agent Settings */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Zap size={18} className="text-accent-cyan" />
          <span>JARVIS OS Agent & Voice Settings</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3 bg-surface/60">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Wake-Word Listening</h3>
                <p className="text-xs text-gray-400">Activates on "Neuro wake up" or "Hey Neuro"</p>
              </div>
              <input
                type="checkbox"
                checked={wakeWordEnabled}
                onChange={(e) => setWakeWordEnabled(e.target.checked)}
                className="w-5 h-5 accent-accent-cyan cursor-pointer"
              />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3 bg-surface/60">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Voice Speech Responses</h3>
                <p className="text-xs text-gray-400">JARVIS speaks confirmation replies aloud</p>
              </div>
              <input
                type="checkbox"
                checked={voiceResponses}
                onChange={(e) => setVoiceResponses(e.target.checked)}
                className="w-5 h-5 accent-accent-cyan cursor-pointer"
              />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3 bg-surface/60">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Tactile Cyber SFX</h3>
                <p className="text-xs text-gray-400">Synthesized audio chimes & click feedback</p>
              </div>
              <input
                type="checkbox"
                checked={sfxEnabled}
                onChange={(e) => setSfxEnabled(e.target.checked)}
                className="w-5 h-5 accent-accent-cyan cursor-pointer"
              />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3 bg-surface/60">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Global Shortcut</h3>
                <p className="text-xs text-gray-400">Summon JARVIS HUD from any app</p>
              </div>
              <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-accent-cyan font-mono">
                Ctrl + Space
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. OS Integration Preferences */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sliders size={18} className="text-accent-purple" />
          <span>OS Tool Preferences</span>
        </h2>

        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-5 bg-surface/60">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Default Web Browser
              </label>
              <select
                value={browser}
                onChange={(e) => setBrowser(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-accent-purple/50 cursor-pointer"
              >
                <option value="Brave">Brave Browser (Recommended)</option>
                <option value="Chrome">Google Chrome</option>
                <option value="Edge">Microsoft Edge</option>
                <option value="Firefox">Mozilla Firefox</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Default Search Engine
              </label>
              <select
                value={searchEngine}
                onChange={(e) => setSearchEngine(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-accent-purple/50 cursor-pointer"
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
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Cpu size={18} className="text-accent-blue" />
          <span>AI & Intelligence Providers</span>
        </h2>

        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-5 bg-surface/60">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Primary LLM Provider
            </label>
            <select
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value)}
              className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-accent-purple/50 cursor-pointer"
            >
              <option value="Local Ollama (Offline)">Local Ollama (100% Offline & Private)</option>
              <option value="OpenAI">OpenAI (GPT-4o)</option>
              <option value="Anthropic">Anthropic (Claude 3.5 Sonnet)</option>
              <option value="Deterministic Only">Zero-Key Deterministic Only (No LLM)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Ollama Base URL
              </label>
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-accent-purple/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Ollama Model
              </label>
              <input
                type="text"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-accent-purple/50"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Backend Supervisor Diagnostics */}
      <section className="space-y-4 pb-8">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Database size={18} className="text-emerald-400" />
          <span>System & Background Process Supervisor</span>
        </h2>

        <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3 bg-surface/60 text-xs">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <span className="text-gray-400">FastAPI Backend Status</span>
            <span className="flex items-center gap-1.5 font-semibold">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className={backendHealthy ? 'text-emerald-400' : 'text-amber-400'}>
                {backendHealthy ? 'Online (Port 8000)' : 'Supervising'}
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <span className="text-gray-400">Silent Log Target</span>
            <span className="text-gray-300 font-mono">.neuro/logs/backend.log</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400">Knowledge Storage Database</span>
            <span className="text-gray-300 font-mono">SQLite (Local-First WAL)</span>
          </div>
        </div>
      </section>
    </div>
  );
}
