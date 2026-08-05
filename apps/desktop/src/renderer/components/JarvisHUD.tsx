import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Command,
  Send,
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
} from 'lucide-react';
import { useJarvisAgent, AgentExecutionResponse } from '../hooks/useJarvisAgent';
import { soundEngine } from '../utils/soundEngine';

interface JarvisHUDProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_COMMANDS = [
  { label: 'Open Brave', cmd: 'open brave', icon: ExternalLink },
  { label: 'Play Spotify', cmd: 'play starboy on spotify', icon: Play },
  { label: 'Open VS Code', cmd: 'open vscode', icon: Terminal },
  { label: 'Add Quick Note', cmd: 'add this to note: brainstorming agent features', icon: FileText },
  { label: 'Set Reminder', cmd: 'set a reminder in 15 minutes to review pull request', icon: Clock },
  { label: 'Google Search', cmd: 'search quantum computing on google', icon: Search },
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
  } = useJarvisAgent();

  const [inputVal, setInputVal] = useState('');
  const [localHistory, setLocalHistory] = useState<AgentExecutionResponse[]>([]);
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

  // Audio effect when HUD opens
  useEffect(() => {
    if (isOpen) {
      soundEngine.playWakeChime();
      setTimeout(() => {
        inputRef.current?.focus();
        if (isSpeechSupported && !isListening) {
          startListening();
        }
      }, 150);
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

  // Live Audio Spectrum Canvas Visualizer
  const startAudioVisualizer = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
      if (!stream) return;
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
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

      const render = () => {
        animFrameRef.current = requestAnimationFrame(render);
        analyser.getByteFrequencyData(dataArray);

        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 38;

        // Draw dynamic reactive neon circular bars
        const totalBars = 32;
        for (let i = 0; i < totalBars; i++) {
          const angle = (i * 2 * Math.PI) / totalBars;
          const val = dataArray[i % bufferLength] || 10;
          const barHeight = Math.max(4, (val / 255) * 28);

          const x1 = centerX + Math.cos(angle) * radius;
          const y1 = centerY + Math.sin(angle) * radius;
          const x2 = centerX + Math.cos(angle) * (radius + barHeight);
          const y2 = centerY + Math.sin(angle) * (radius + barHeight);

          canvasCtx.beginPath();
          canvasCtx.moveTo(x1, y1);
          canvasCtx.lineTo(x2, y2);
          canvasCtx.strokeStyle = isListening
            ? `rgba(6, 182, 212, ${0.4 + (val / 255) * 0.6})`
            : `rgba(124, 58, 237, 0.4)`;
          canvasCtx.lineWidth = 2.5;
          canvasCtx.lineCap = 'round';
          canvasCtx.stroke();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      {/* HUD Container */}
      <div className="w-full max-w-2xl bg-surface/95 border border-accent-purple/30 rounded-3xl shadow-[0_0_60px_rgba(124,58,237,0.3)] overflow-hidden flex flex-col max-h-[88vh] relative">
        
        {/* Glowing Top Cyber Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-panel via-surface to-panel">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-accent-purple via-accent-blue to-accent-cyan shadow-lg ${
                isListening ? 'animate-pulse ring-4 ring-accent-cyan/30' : ''
              }`}>
                <Zap size={22} className="text-white" />
              </div>
              {isListening && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-cyan rounded-full animate-ping" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-1.5 font-sans">
                  NEURO <span className="text-accent-cyan tracking-wider">JARVIS</span>
                </h2>
                <span className="px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30 rounded-full">
                  OS Native Agent
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {isProcessing
                  ? '⚡ Executing action...'
                  : isListening
                  ? '🎙️ Listening for speech ("Neuro wake up", "Open Brave", "Play Spotify")...'
                  : 'Zero-API-Key Offline Engine Ready'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Clear History */}
            {localHistory.length > 0 && (
              <button
                onClick={() => setLocalHistory([])}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Clear activity feed"
              >
                <Trash2 size={16} />
              </button>
            )}

            {/* Voice Mute Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-xl border transition-colors ${
                isMuted
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
              title={isMuted ? 'Unmute voice responses' : 'Mute voice responses'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            {/* Mic Toggle */}
            <button
              onClick={() => {
                soundEngine.playClick();
                toggleListening();
              }}
              className={`p-2 rounded-xl border transition-all ${
                isListening
                  ? 'bg-accent-cyan/20 border-accent-cyan/50 text-accent-cyan shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
              title={isListening ? 'Stop listening' : 'Start microphone listening'}
            >
              {isListening ? <Mic size={18} /> : <MicOff size={18} />}
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
              title="Close HUD (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Live Audio Spectrum Canvas & Visualizer Core */}
        <div className="py-6 px-6 bg-background/60 flex flex-col items-center justify-center border-b border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-accent-purple/10 via-transparent to-transparent pointer-events-none" />

          {/* Reactor & Waveform Canvas */}
          <div className="relative w-36 h-36 flex items-center justify-center my-1">
            <canvas
              ref={canvasRef}
              width={144}
              height={144}
              className="absolute inset-0 z-0 pointer-events-none"
            />
            
            {/* Spinning Neon Ring */}
            <div
              className={`absolute inset-2 rounded-full border border-dashed border-accent-cyan/40 ${
                isListening ? 'animate-spin' : ''
              }`}
              style={{ animationDuration: '8s' }}
            />

            {/* Glowing Core Reactor */}
            <div
              className={`w-16 h-16 rounded-full bg-gradient-to-tr from-accent-purple to-accent-cyan flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.5)] z-10 ${
                isListening ? 'scale-110' : 'scale-100'
              } transition-transform duration-300`}
            >
              <Sparkles size={24} className="text-white animate-pulse" />
            </div>
          </div>

          {/* Real-time Voice Transcript Ticker */}
          <div className="mt-3 text-center min-h-[28px] max-w-lg">
            {transcript ? (
              <p className="text-sm font-medium text-accent-cyan animate-pulse">
                "{transcript}"
              </p>
            ) : isListening ? (
              <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent-cyan animate-ping" />
                Listening for speech... Say "Open Brave", "Play Spotify", or "Add to note"
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Tap microphone or type command below to trigger instant OS actions
              </p>
            )}
          </div>
        </div>

        {/* Quick Command Chips */}
        <div className="p-4 border-b border-white/5 bg-panel/40 flex flex-wrap gap-2">
          {QUICK_COMMANDS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => handleQuickCommand(item.cmd)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-accent-purple/50 hover:bg-accent-purple/10 text-xs text-gray-300 hover:text-white transition-all disabled:opacity-50"
              >
                <Icon size={13} className="text-accent-cyan" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Action History & Execution Cards */}
        <div ref={scrollRef} className="flex-1 p-5 overflow-y-auto space-y-3 min-h-[160px] max-h-[250px]">
          {localHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-6 text-gray-500">
              <Cpu size={32} className="mb-2 opacity-40 text-accent-purple" />
              <p className="text-sm">No commands executed yet.</p>
              <p className="text-xs text-gray-600 mt-1">
                Say "Neuro wake up", "Open Spotify", "Open VSCode", or "Set a reminder"
              </p>
            </div>
          ) : (
            localHistory.map((item, idx) => (
              <div
                key={idx}
                className="glass-panel p-4 rounded-2xl border border-white/10 hover:border-accent-purple/30 transition-all flex items-start justify-between gap-3 bg-panel/70"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    {item.success ? (
                      <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {item.tool_name || 'Direct Command'}
                    </span>
                    {item.is_offline_native && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/60 text-accent-cyan border border-accent-cyan/20">
                        Native OS
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-white">
                    {item.display_text || item.voice_response}
                  </p>
                  <p className="text-xs text-gray-400 italic">
                    Prompt: "{item.input_text}"
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Command Input Bar */}
        <div className="p-4 border-t border-white/10 bg-panel/90">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ask JARVIS... (e.g., 'open brave', 'play jazz on spotify', 'add to note')"
                disabled={isProcessing}
                className="w-full bg-background/80 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-accent-purple/60 focus:ring-2 focus:ring-accent-purple/20 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-gray-500 font-mono">
                <Command size={12} />
                <span>Enter</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!inputVal.trim() || isProcessing}
              className="p-3 bg-gradient-to-r from-accent-purple to-accent-blue hover:from-accent-purple/80 hover:to-accent-blue/80 text-white rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-accent-purple/20 flex-shrink-0"
              title="Execute command"
            >
              <Send size={18} />
            </button>
          </form>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-500 px-1">
            <span>Global Hotkey: <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-gray-300">Ctrl + Space</kbd></span>
            <span>Wake Word: <span className="text-accent-cyan">"Neuro wake up"</span></span>
          </div>
        </div>

      </div>
    </div>
  );
}
