import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  CornerDownLeft,
  ExternalLink,
  Play,
  FileText,
  Search,
  Terminal,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Trash2,
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
  {
    id: 'antigravity',
    label: '🚀 Antigravity Pair Programmer',
    cmd: 'open antigravity',
    category: 'AI Coding',
    icon: Sparkles,
    hotkey: '1',
  },
  {
    id: 'claude',
    label: '🤖 Claude Code CLI',
    cmd: 'open claude code',
    category: 'AI Coding',
    icon: Terminal,
    hotkey: '2',
  },
  {
    id: 'codex',
    label: '🧠 Codex Agent',
    cmd: 'open codex',
    category: 'AI Coding',
    icon: Sparkles,
    hotkey: '3',
  },
  {
    id: 'coding_session',
    label: '⚡ Resume Coding Session',
    cmd: 'continue my coding session',
    category: 'Dev',
    icon: Code,
    hotkey: '4',
  },
  {
    id: 'cursor',
    label: '💻 Open Cursor IDE',
    cmd: 'open cursor',
    category: 'Dev',
    icon: Terminal,
    hotkey: '5',
  },
  {
    id: 'vscode',
    label: '📝 Open VS Code',
    cmd: 'open vscode',
    category: 'Dev',
    icon: Terminal,
    hotkey: '6',
  },
  {
    id: 'github',
    label: '🐙 Open GitHub',
    cmd: 'open github',
    category: 'Dev',
    icon: ExternalLink,
    hotkey: '7',
  },
  {
    id: 'docker',
    label: '🐳 Launch Docker',
    cmd: 'open docker',
    category: 'Dev',
    icon: ExternalLink,
    hotkey: '8',
  },
  {
    id: 'spotify',
    label: '🎵 Play on Spotify',
    cmd: 'play synthwave on spotify',
    category: 'Media',
    icon: Play,
    hotkey: '9',
  },
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
    voiceLevel,
    activationThreshold,
  } = useJarvisAgent();

  const [inputVal, setInputVal] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [localHistory, setLocalHistory] = useState<AgentExecutionResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'console' | 'actions'>('console');

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

  // Live Fluid Siri-Style Harmonic Spectrum Canvas Visualizer
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

        phase += 0.04;

        // Draw smooth symmetric Apple Siri wave bars
        const barCount = 32;
        const barWidth = 3;
        const gap = (width - barCount * barWidth) / (barCount + 1);

        for (let i = 0; i < barCount; i++) {
          const freqIndex = Math.floor((i / barCount) * (bufferLength / 2));
          const freqVal = dataArray[freqIndex] || 0;

          const wave = isListening
            ? Math.max(4, (freqVal / 255) * (height * 0.8) + Math.sin(phase + i * 0.25) * 4)
            : Math.max(3, Math.sin(phase + i * 0.25) * 5 + 3);

          const x = gap + i * (barWidth + gap);
          const y = centerY - wave / 2;

          // Apple Intelligence gradient: Blue -> Indigo -> Violet -> Mint
          const gradient = canvasCtx.createLinearGradient(0, y, 0, y + wave);
          if (isListening) {
            gradient.addColorStop(0, '#0A84FF');
            gradient.addColorStop(0.5, '#5E5CE6');
            gradient.addColorStop(1, '#BF5AF2');
          } else {
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
          }

          canvasCtx.fillStyle = gradient;
          canvasCtx.beginPath();
          canvasCtx.roundRect(x, y, barWidth, wave, 1.5);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-2xl animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Apple Intelligence Frosted Glass Sheet Surface */}
      <div
        className="w-full max-w-2xl bg-[#14141A]/92 backdrop-blur-3xl border border-white/[0.12] rounded-3xl shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[86vh] relative animate-in scale-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control & Status Bar */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          {/* Agent Identity & Live State Pill */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0071E3] via-[#5E5CE6] to-[#BF5AF2] p-[1.5px] shadow-sm">
                <div className="w-full h-full rounded-full bg-[#14141A] flex items-center justify-center text-[#0A84FF]">
                  <Sparkles size={15} className={isListening ? 'animate-pulse' : ''} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tracking-tight text-[#F5F5F7] font-sans">
                    Neuro Intelligence
                  </span>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08]">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isProcessing
                          ? 'bg-[#FF9F0A] animate-ping'
                          : isListening
                            ? 'bg-[#30D158] animate-pulse shadow-[0_0_6px_#30D158]'
                            : 'bg-[#86868B]'
                      }`}
                    />
                    <span className="text-[10px] font-medium tracking-tight text-[#A1A1A6]">
                      {isProcessing
                        ? 'Processing'
                        : isListening
                          ? 'Listening ("Hey Neuro")'
                          : 'Standby'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls & Dismiss */}
          <div className="flex items-center gap-2">
            {/* Apple Segmented View Mode Tabs */}
            <div className="flex items-center bg-black/40 p-0.5 rounded-full border border-white/[0.08]">
              <button
                onClick={() => setActiveTab('console')}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-150 ${
                  activeTab === 'console'
                    ? 'bg-white/[0.14] text-white shadow-sm'
                    : 'text-[#86868B] hover:text-[#F5F5F7]'
                }`}
              >
                Activity
              </button>
              <button
                onClick={() => setActiveTab('actions')}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-150 ${
                  activeTab === 'actions'
                    ? 'bg-white/[0.14] text-white shadow-sm'
                    : 'text-[#86868B] hover:text-[#F5F5F7]'
                }`}
              >
                Actions
              </button>
            </div>

            {/* Clear History */}
            {localHistory.length > 0 && (
              <button
                onClick={() => setLocalHistory([])}
                className="w-7 h-7 rounded-full text-[#86868B] hover:text-[#F5F5F7] hover:bg-white/[0.08] transition-colors flex items-center justify-center"
                title="Clear activity log"
              >
                <Trash2 size={13} />
              </button>
            )}

            {/* Voice Mute Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                isMuted
                  ? 'text-[#FF453A] bg-[#FF453A]/15'
                  : 'text-[#86868B] hover:text-[#F5F5F7] hover:bg-white/[0.08]'
              }`}
              title={isMuted ? 'Unmute voice' : 'Mute voice'}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            {/* Mic Toggle */}
            <button
              onClick={() => {
                soundEngine.playClick();
                toggleListening();
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                isListening
                  ? 'text-[#30D158] bg-[#30D158]/15 ring-1 ring-[#30D158]/40'
                  : 'text-[#86868B] hover:text-[#F5F5F7] hover:bg-white/[0.08]'
              }`}
              title={isListening ? 'Stop microphone' : 'Start microphone'}
            >
              {isListening ? <Mic size={14} /> : <MicOff size={14} />}
            </button>

            <div className="w-px h-4 bg-white/[0.1] mx-0.5" />

            {/* Close Button */}
            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-[#A1A1A6] hover:text-white flex items-center justify-center text-xs transition-colors"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Dynamic Voice Waveform & Streaming Transcript Section */}
        <div className="px-6 py-4 bg-black/30 border-b border-white/[0.06] flex items-center justify-between gap-6">
          {/* Transcript / State Display */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Radio
                size={12}
                className={isListening ? 'text-[#0A84FF] animate-pulse' : 'text-[#86868B]'}
              />
              <span className="text-[10px] font-mono tracking-wider uppercase text-[#86868B]">
                {isProcessing
                  ? 'Executing OS Command'
                  : isListening
                    ? 'Voice Stream'
                    : 'Ready for input'}
              </span>
            </div>

            {transcript ? (
              <p className="text-sm font-medium text-white tracking-tight truncate font-sans">
                "{transcript}"
              </p>
            ) : isListening ? (
              <p className="text-xs text-[#A1A1A6] font-sans tracking-tight">
                Listening for <span className="text-white font-medium">"Hey Neuro"</span> or direct
                instructions...
              </p>
            ) : (
              <p className="text-xs text-[#86868B] font-sans">
                Type or speak an instruction: <span className="text-[#A1A1A6]">"Open Brave"</span>,{' '}
                <span className="text-[#A1A1A6]">"Play Spotify"</span>,{' '}
                <span className="text-[#A1A1A6]">"Add to note"</span>
              </p>
            )}
          </div>

          {/* Fluid Multi-Band Audio Spectrum Canvas & Decibel Meter */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Live Volume Sensitivity Indicator */}
            {isListening && (
              <div className="flex flex-col items-end gap-1 font-mono">
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      voiceLevel === 'optimal'
                        ? 'bg-[#30D158] animate-pulse'
                        : voiceLevel === 'quiet'
                          ? 'bg-[#FF9F0A]'
                          : voiceLevel === 'loud'
                            ? 'bg-[#FF453A]'
                            : 'bg-zinc-600'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-medium tracking-tight ${
                      voiceLevel === 'optimal'
                        ? 'text-[#30D158]'
                        : voiceLevel === 'quiet'
                          ? 'text-[#FF9F0A]'
                          : voiceLevel === 'loud'
                            ? 'text-[#FF453A]'
                            : 'text-[#86868B]'
                    }`}
                  >
                    {voiceLevel === 'optimal'
                      ? 'Optimal Audio'
                      : voiceLevel === 'quiet'
                        ? 'Speak Closer'
                        : voiceLevel === 'loud'
                          ? 'Loud Audio'
                          : 'Listening...'}
                  </span>
                  <span className="text-[#0A84FF] font-semibold ml-1">{audioVolume}%</span>
                </div>

                <div className="relative w-28 h-1 bg-white/[0.08] rounded-full overflow-hidden flex items-center">
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[#0A84FF] z-10 opacity-75"
                    style={{ left: `${activationThreshold}%` }}
                    title={`Threshold (${activationThreshold}%)`}
                  />
                  <div
                    className={`h-full transition-all duration-75 rounded-full ${
                      audioVolume >= 75
                        ? 'bg-gradient-to-r from-[#0071E3] to-[#FF453A]'
                        : audioVolume >= activationThreshold
                          ? 'bg-[#0A84FF]'
                          : 'bg-white/30'
                    }`}
                    style={{ width: `${Math.max(3, audioVolume)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Apple Siri Harmonic Waveform Canvas */}
            <div className="w-32 h-10 flex items-center justify-center flex-shrink-0 bg-black/40 rounded-2xl px-2 border border-white/[0.06]">
              <canvas ref={canvasRef} width={128} height={36} className="w-full h-full" />
            </div>
          </div>
        </div>

        {/* Main Content Area: Console / History or Quick Actions */}
        {activeTab === 'console' ? (
          <div
            ref={scrollRef}
            className="flex-1 p-5 overflow-y-auto space-y-2.5 min-h-[220px] max-h-[300px] bg-black/20"
          >
            {localHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 text-[#86868B]">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3 text-[#A1A1A6]">
                  <Cpu size={18} />
                </div>
                <p className="text-xs font-semibold text-[#F5F5F7] tracking-tight">
                  Autonomous Local Agent Engine
                </p>
                <p className="text-xs text-[#86868B] mt-1 max-w-sm leading-relaxed">
                  Commands execute natively on your device with zero external cloud dependencies.
                  Say <span className="text-[#F5F5F7]">"Hey Neuro"</span> or pick an action.
                </p>
              </div>
            ) : (
              localHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.14] transition-all flex items-start justify-between gap-3 group"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {item.success ? (
                        <CheckCircle2 size={13} className="text-[#30D158] flex-shrink-0" />
                      ) : (
                        <AlertCircle size={13} className="text-[#FF9F0A] flex-shrink-0" />
                      )}

                      <span className="text-[10px] font-mono font-medium text-[#86868B] uppercase tracking-wider">
                        {item.tool_name || 'System Command'}
                      </span>

                      {item.is_offline_native && (
                        <span className="text-[9px] font-mono px-2 py-0.2 rounded-full bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/20">
                          Native
                        </span>
                      )}

                      <span className="text-[10px] text-[#6E6E73] ml-auto font-mono">
                        {new Date().toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-[#F5F5F7] leading-relaxed font-sans">
                      {item.display_text || item.voice_response}
                    </p>

                    <div className="flex items-center gap-1.5 text-[10px] text-[#86868B] font-mono">
                      <span>Input:</span>
                      <span className="text-[#A1A1A6]">"{item.input_text}"</span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      copyToClipboard(item.display_text || item.voice_response || '', `hist-${idx}`)
                    }
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/[0.08] text-[#86868B] hover:text-white transition-opacity"
                    title="Copy output"
                  >
                    {copiedId === `hist-${idx}` ? (
                      <Check size={12} className="text-[#30D158]" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex-1 p-5 overflow-y-auto min-h-[220px] max-h-[300px] bg-black/20">
            <div className="text-[11px] font-semibold text-[#86868B] mb-3 uppercase tracking-wider font-mono">
              Quick Shortcuts & Launchers
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {QUICK_ACTIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleQuickCommand(item.cmd)}
                    disabled={isProcessing}
                    className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-[#0071E3]/50 hover:bg-white/[0.06] transition-all flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[#86868B] group-hover:text-[#0A84FF] transition-colors">
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#F5F5F7] group-hover:text-white truncate">
                          {item.label}
                        </div>
                        <div className="text-[10px] text-[#86868B] font-mono truncate">
                          {item.cmd}
                        </div>
                      </div>
                    </div>
                    <ArrowRight
                      size={12}
                      className="text-[#86868B] group-hover:text-[#0A84FF] group-hover:translate-x-0.5 transition-all flex-shrink-0"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Spotlight Command Input Bar */}
        <div className="p-4 border-t border-white/[0.08] bg-white/[0.02]">
          <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ask Neuro Intelligence... (e.g. 'open brave', 'play jazz on spotify', 'create note')"
                disabled={isProcessing}
                className="w-full bg-white/[0.06] hover:bg-white/[0.08] focus:bg-white/[0.1] border border-white/[0.1] rounded-2xl px-4 py-2.5 text-xs text-[#F5F5F7] placeholder-[#86868B] outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/30 transition-all font-sans"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-[#86868B] font-mono pointer-events-none">
                <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/[0.08] rounded-md text-[#86868B]">
                  ↵ Return
                </kbd>
              </div>
            </div>

            <button
              type="submit"
              disabled={!inputVal.trim() || isProcessing}
              className="px-4 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-medium rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_1px_2px_rgba(0,0,0,0.2)] flex items-center gap-1.5 flex-shrink-0"
              title="Execute"
            >
              <span>Run</span>
              <CornerDownLeft size={12} />
            </button>
          </form>

          {/* Quick Footer Hints */}
          <div className="mt-2.5 flex items-center justify-between text-[10px] text-[#86868B] px-1 font-mono">
            <div className="flex items-center gap-3">
              <span>
                Wake: <strong className="text-[#F5F5F7] font-normal">"Hey Neuro"</strong>
              </span>
              <span>•</span>
              <span>
                Shortcut:{' '}
                <kbd className="px-1.5 py-0.2 bg-white/[0.06] border border-white/[0.08] rounded-md text-[#A1A1A6]">
                  Ctrl + Space
                </kbd>
              </span>
            </div>
            <div className="text-[#86868B]">On-Device Private Intelligence</div>
          </div>
        </div>
      </div>
    </div>
  );
}
