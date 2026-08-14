import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Command,
  CornerDownLeft,
  ExternalLink,
  Play,
  FileText,
  Clock,
  Search,
  Terminal,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Zap,
  Trash2,
  Layers,
  ArrowRight,
  Radio,
  Copy,
  Check,
  Code,
  type LucideIcon,
} from 'lucide-react';
import { useJarvisAgent, AgentExecutionResponse } from '../hooks/useJarvisAgent';
import { soundEngine } from '../utils/soundEngine';

interface JarvisHUDProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QuickAction {
  id: string;
  label: string;
  cmd: string;
  category: string;
  icon: LucideIcon;
  hotkey?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'antigravity', label: '🚀 Antigravity Pair Programmer', cmd: 'open antigravity', category: 'AI Coding', icon: Sparkles, hotkey: '1' },
  { id: 'claude', label: '🤖 Claude Code CLI', cmd: 'open claude code', category: 'AI Coding', icon: Terminal, hotkey: '2' },
  { id: 'codex', label: '🧠 Codex Agent', cmd: 'open codex', category: 'AI Coding', icon: Zap, hotkey: '3' },
  { id: 'coding_session', label: '⚡ Resume Coding Session', cmd: 'continue my coding session', category: 'Dev', icon: Code, hotkey: '4' },
  { id: 'cursor', label: '💻 Open Cursor IDE', cmd: 'open cursor', category: 'Dev', icon: Terminal, hotkey: '5' },
  { id: 'vscode', label: '📝 Open VS Code', cmd: 'open vscode', category: 'Dev', icon: Terminal, hotkey: '6' },
  { id: 'github', label: '🐙 Open GitHub', cmd: 'open github', category: 'Dev', icon: ExternalLink, hotkey: '7' },
  { id: 'docker', label: '🐳 Launch Docker', cmd: 'open docker', category: 'Dev', icon: ExternalLink, hotkey: '8' },
  { id: 'spotify', label: '🎵 Play on Spotify', cmd: 'play synthwave on spotify', category: 'Media', icon: Play, hotkey: '9' },
];

export default function JarvisHUD({ isOpen, onClose }: JarvisHUDProps) {
  const {
    isListening,
    isProcessing,
    transcript,
    lastResult,
    history,
    isMuted,
    setIsMuted,
    toggleListening,
    startListening,
    stopListening,
    executeCommand,
    isSpeechSupported,
    audioVolume,
    isSpeaking,
    voiceLevel,
    activationThreshold,
  } = useJarvisAgent();

  const [inputVal, setInputVal] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [localHistory, setLocalHistory] = useState<AgentExecutionResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'console' | 'actions' | 'telemetry'>('console');

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Sync history
  useEffect(() => {
    setLocalHistory(history);
  }, [history]);

  // Audio effect and mic on opening HUD
  useEffect(() => {
    if (isOpen) {
      soundEngine.playWakeChime();
      setTimeout(() => {
        inputRef.current?.focus();
        if (isSpeechSupported && !isListening) {
          startListening();
        }
      }, 100);
      startAudioVisualizer();
    } else {
      stopListening();
      stopAudioVisualizer();
    }
    return () => {
      stopAudioVisualizer();
    };
  }, [isOpen, isSpeechSupported]);

  // Handle Mute state
  useEffect(() => {
    soundEngine.setMuted(isMuted);
  }, [isMuted]);

  // Play success sound when command completes
  useEffect(() => {
    if (lastResult?.success) {
      soundEngine.playSuccessTone();
    }
  }, [lastResult]);

  // Keyboard shortcut listener within HUD
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Live Fluid Harmonic Spectrum Canvas Visualizer
  const startAudioVisualizer = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
      if (!stream) return;
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasCtx = canvas.getContext('2d');
      if (!canvasCtx) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let phase = 0;

      const render = () => {
        animFrameRef.current = requestAnimationFrame(render);
        analyser.getByteFrequencyData(dataArray);

        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        const width = canvas.width;
        const height = canvas.height;
        const centerY = height / 2;

        // Calculate average audio level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] ?? 0;
        }
        const avg = sum / bufferLength;
        phase += 0.04;

        // Draw smooth symmetric wave bars
        const barCount = 36;
        const barWidth = 3;
        const gap = (width - barCount * barWidth) / (barCount + 1);

        for (let i = 0; i < barCount; i++) {
          const freqIndex = Math.floor((i / barCount) * (bufferLength / 2));
          const freqVal = dataArray[freqIndex] || 0;
          
          // Combine frequency data with subtle harmonic breathing
          const wave = isListening 
            ? Math.max(4, (freqVal / 255) * (height * 0.75) + Math.sin(phase + i * 0.2) * 4)
            : Math.max(3, Math.sin(phase + i * 0.2) * 6 + 4);

          const x = gap + i * (barWidth + gap);
          const y = centerY - wave / 2;

          // Gradient color from Cyan to Neural Violet
          const gradient = canvasCtx.createLinearGradient(0, y, 0, y + wave);
          if (isListening) {
            gradient.addColorStop(0, '#22d3ee');
            gradient.addColorStop(0.5, '#6366f1');
            gradient.addColorStop(1, '#818cf8');
          } else {
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
          }

          canvasCtx.fillStyle = gradient;
          canvasCtx.beginPath();
          canvasCtx.roundRect(x, y, barWidth, wave, 2);
          canvasCtx.fill();
        }
      };
      render();
    } catch (e) {
      console.warn('Could not initialize audio visualizer:', e);
    }
  };

  const stopAudioVisualizer = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isProcessing) return;
    const cmd = inputVal.trim();
    setInputVal('');
    soundEngine.playClick();
    await executeCommand(cmd);
  };

  const handleQuickCommand = async (cmd: string) => {
    if (isProcessing) return;
    soundEngine.playClick();
    await executeCommand(cmd);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-150 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Precision Obsidian Command Surface */}
      <div 
        className="w-full max-w-2xl bg-[#0b0e17] border border-white/[0.09] rounded-2xl shadow-elevated overflow-hidden flex flex-col max-h-[86vh] relative animate-in scale-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Control & Status Bar */}
        <div className="px-5 py-3.5 border-b border-white/[0.07] flex items-center justify-between bg-[#0e121e]">
          
          {/* Agent Identity & Live State Pill */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center text-brand-primary-light">
                <Zap size={14} className={isListening ? 'animate-pulse' : ''} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold tracking-tight text-white uppercase font-sans">
                    Neuro Agent
                  </span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                    <span 
                      className={`w-1.5 h-1.5 rounded-full ${
                        isProcessing 
                          ? 'bg-brand-amber animate-ping' 
                          : isListening 
                          ? 'bg-brand-cyan animate-pulse shadow-glow-cyan' 
                          : 'bg-zinc-500'
                      }`} 
                    />
                    <span className="text-[10px] font-medium tracking-wide text-zinc-400">
                      {isProcessing ? 'Executing' : isListening ? 'Listening ("Hey Neuro")' : 'Standby'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls & Dismiss */}
          <div className="flex items-center gap-1.5">
            {/* View Mode Tabs */}
            <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/[0.05] mr-2">
              <button
                onClick={() => setActiveTab('console')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  activeTab === 'console' 
                    ? 'bg-white/[0.08] text-white shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Console
              </button>
              <button
                onClick={() => setActiveTab('actions')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  activeTab === 'actions' 
                    ? 'bg-white/[0.08] text-white shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Actions
              </button>
            </div>

            {/* Clear History */}
            {localHistory.length > 0 && (
              <button
                onClick={() => setLocalHistory([])}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
                title="Clear activity log"
              >
                <Trash2 size={14} />
              </button>
            )}

            {/* Voice Mute Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-1.5 rounded-lg transition-colors ${
                isMuted
                  ? 'text-brand-rose bg-brand-rose/10'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
              }`}
              title={isMuted ? 'Unmute voice responses' : 'Mute voice responses'}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            {/* Mic Toggle */}
            <button
              onClick={() => {
                soundEngine.playClick();
                toggleListening();
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                isListening
                  ? 'text-brand-cyan bg-brand-cyan/10 ring-1 ring-brand-cyan/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
              }`}
              title={isListening ? 'Stop listening' : 'Start microphone listening'}
            >
              {isListening ? <Mic size={14} /> : <MicOff size={14} />}
            </button>

            <div className="w-[1px] h-4 bg-white/[0.08] mx-1" />

            {/* Close Button */}
            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              title="Close (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Dynamic Voice Waveform & Streaming Transcript Section */}
        <div className="px-6 py-4 bg-[#090b12] border-b border-white/[0.05] flex items-center justify-between gap-6">
          
          {/* Transcript / State Display */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Radio size={12} className={isListening ? 'text-brand-cyan animate-pulse' : 'text-zinc-500'} />
              <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-500">
                {isProcessing ? 'Agent Active' : isListening ? 'Voice Stream' : 'Ready'}
              </span>
            </div>

            {transcript ? (
              <p className="text-sm font-medium text-brand-cyan-light tracking-tight truncate font-sans">
                "{transcript}"
              </p>
            ) : isListening ? (
              <p className="text-xs text-zinc-400 font-sans tracking-tight">
                Listening for wake-word <span className="text-white font-medium">"Hey Neuro"</span> or direct commands...
              </p>
            ) : (
              <p className="text-xs text-zinc-500 font-sans">
                Type or speak an OS instruction: <span className="text-zinc-400">"Open Brave"</span>, <span className="text-zinc-400">"Play Spotify"</span>, <span className="text-zinc-400">"Add to note"</span>
              </p>
            )}
          </div>

          {/* Fluid Multi-Band Audio Spectrum Canvas & Decibel Meter */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Live Volume Sensitivity VU Meter */}
            {isListening && (
              <div className="flex flex-col items-end gap-1 font-mono">
                <div className="flex items-center gap-1 text-[10px]">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    voiceLevel === 'optimal' ? 'bg-emerald-400 animate-pulse' :
                    voiceLevel === 'quiet' ? 'bg-amber-400' :
                    voiceLevel === 'loud' ? 'bg-rose-400' : 'bg-zinc-600'
                  }`} />
                  <span className={`text-[10px] font-medium ${
                    voiceLevel === 'optimal' ? 'text-emerald-300' :
                    voiceLevel === 'quiet' ? 'text-amber-300' :
                    voiceLevel === 'loud' ? 'text-rose-300' : 'text-zinc-500'
                  }`}>
                    {voiceLevel === 'optimal' ? 'Optimal Audio' :
                     voiceLevel === 'quiet' ? 'Speak Louder ⏶' :
                     voiceLevel === 'loud' ? 'Loud Audio ⏷' : 'Listening...'}
                  </span>
                  <span className="text-cyan-400 font-bold ml-1">{audioVolume}%</span>
                </div>

                <div className="relative w-28 h-1.5 bg-zinc-900 rounded-full overflow-hidden flex items-center border border-white/[0.06]">
                  {/* Activation threshold indicator line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-10 opacity-75"
                    style={{ left: `${activationThreshold}%` }}
                    title={`Activation Threshold (${activationThreshold}%)`}
                  />
                  <div
                    className={`h-full transition-all duration-75 rounded-full ${
                      audioVolume >= 75 ? 'bg-gradient-to-r from-cyan-500 via-emerald-400 to-rose-500' :
                      audioVolume >= activationThreshold ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' :
                      'bg-amber-500/60'
                    }`}
                    style={{ width: `${Math.max(3, audioVolume)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Audio Waveform Canvas */}
            <div className="w-32 h-10 flex items-center justify-center flex-shrink-0 bg-black/40 rounded-xl px-2 border border-white/[0.04]">
              <canvas
                ref={canvasRef}
                width={128}
                height={36}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* Main Content Area: Console / History or Quick Actions */}
        {activeTab === 'console' ? (
          <div ref={scrollRef} className="flex-1 p-5 overflow-y-auto space-y-2.5 min-h-[220px] max-h-[300px] bg-[#07080e]">
            {localHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 text-zinc-500">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
                  <Cpu size={18} className="text-zinc-400" />
                </div>
                <p className="text-xs font-medium text-zinc-300">Deterministic OS Execution Engine</p>
                <p className="text-[11px] text-zinc-500 mt-1 max-w-sm">
                  Commands execute locally with zero external API latency. Try saying <span className="text-zinc-400">"Hey Neuro"</span> or choose a quick action.
                </p>
              </div>
            ) : (
              localHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-white/[0.06] bg-[#0e121d] hover:border-white/[0.12] transition-all flex items-start justify-between gap-3 group"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {item.success ? (
                        <CheckCircle2 size={13} className="text-brand-emerald flex-shrink-0" />
                      ) : (
                        <AlertCircle size={13} className="text-brand-amber flex-shrink-0" />
                      )}
                      
                      <span className="text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider">
                        {item.tool_name || 'System Command'}
                      </span>

                      {item.is_offline_native && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
                          Native
                        </span>
                      )}

                      <span className="text-[10px] text-zinc-600 ml-auto font-mono">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-zinc-200 leading-relaxed font-sans">
                      {item.display_text || item.voice_response}
                    </p>

                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                      <span>Input:</span>
                      <span className="text-zinc-400">"{item.input_text}"</span>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard(item.display_text || item.voice_response || '', `hist-${idx}`)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-opacity"
                    title="Copy output"
                  >
                    {copiedId === `hist-${idx}` ? <Check size={12} className="text-brand-emerald" /> : <Copy size={12} />}
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex-1 p-5 overflow-y-auto min-h-[220px] max-h-[300px] bg-[#07080e]">
            <div className="text-xs font-medium text-zinc-400 mb-3 uppercase tracking-wider font-mono">
              Available Native Commands
            </div>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleQuickCommand(item.cmd)}
                    disabled={isProcessing}
                    className="p-3 rounded-xl bg-[#0e121d] border border-white/[0.06] hover:border-brand-primary/40 hover:bg-[#121626] transition-all flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 group-hover:text-brand-cyan transition-colors">
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">
                          {item.label}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono truncate">
                          {item.cmd}
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={12} className="text-zinc-600 group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Command Input Bar */}
        <div className="p-3.5 border-t border-white/[0.07] bg-[#0d101a]">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ask Neuro... (e.g. 'open brave', 'play jazz on spotify', 'add to note')"
                disabled={isProcessing}
                className="w-full bg-[#070910] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-brand-primary/60 focus:ring-1 focus:ring-brand-primary/30 transition-all font-sans"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-zinc-500 font-mono pointer-events-none">
                <kbd className="px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded text-zinc-400">↵ Enter</kbd>
              </div>
            </div>

            <button
              type="submit"
              disabled={!inputVal.trim() || isProcessing}
              className="px-3 py-2.5 bg-brand-primary hover:bg-brand-primary-dark text-white text-xs font-medium rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-glow-primary flex items-center gap-1.5 flex-shrink-0"
              title="Execute command"
            >
              <span>Run</span>
              <CornerDownLeft size={12} />
            </button>
          </form>

          {/* Quick Footer Hints */}
          <div className="mt-2.5 flex items-center justify-between text-[10px] text-zinc-500 px-1 font-mono">
            <div className="flex items-center gap-3">
              <span>Wake: <strong className="text-zinc-300 font-normal">"Hey Neuro"</strong></span>
              <span>•</span>
              <span>Shortcut: <kbd className="px-1 py-0.2 bg-white/[0.04] border border-white/[0.08] rounded text-zinc-400">Ctrl + Space</kbd></span>
            </div>
            <div className="text-zinc-500">
              Zero API Key Offline Execution
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
