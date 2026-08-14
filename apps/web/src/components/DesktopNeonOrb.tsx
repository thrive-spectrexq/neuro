import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Sparkles, 
  X, 
  Maximize2, 
  Zap,
  Radio,
  Terminal,
  ExternalLink,
  Play,
  FileText,
  Search
} from 'lucide-react';

export interface DesktopNeonOrbProps {
  onSummonHUD?: () => void;
  defaultPosition?: { x: number; y: number };
}

export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking';
export type OrbSizeMode = 'compact' | 'big' | 'giant';

interface SizeConfig {
  orbBoxClass: string;
  coreBallClass: string;
  middleRingClass: string;
  outerRingClass: string;
}

const SIZE_CONFIGS: Record<OrbSizeMode, SizeConfig> = {
  compact: {
    orbBoxClass: 'w-[180px] h-[180px]',
    coreBallClass: 'w-[86px] h-[86px]',
    middleRingClass: 'w-[140px] h-[140px]',
    outerRingClass: 'w-[175px] h-[175px]',
  },
  big: {
    orbBoxClass: 'w-[250px] h-[250px]',
    coreBallClass: 'w-[124px] h-[124px]',
    middleRingClass: 'w-[195px] h-[195px]',
    outerRingClass: 'w-[245px] h-[245px]',
  },
  giant: {
    orbBoxClass: 'w-[320px] h-[320px]',
    coreBallClass: 'w-[160px] h-[160px]',
    middleRingClass: 'w-[250px] h-[250px]',
    outerRingClass: 'w-[315px] h-[315px]',
  },
};

const QUICK_ACTIONS = [
  { label: 'Open Brave', cmd: 'open brave', icon: ExternalLink },
  { label: 'VS Code', cmd: 'open vscode', icon: Terminal },
  { label: 'Quick Note', cmd: 'add note: brainstorm project features', icon: FileText },
  { label: 'Play Music', cmd: 'play synthwave on spotify', icon: Play },
  { label: 'AI Search', cmd: 'search latest quantum computing breakthrough', icon: Search },
];

export const DesktopNeonOrb: React.FC<DesktopNeonOrbProps> = ({
  onSummonHUD,
  defaultPosition,
}) => {
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [transcript, setTranscript] = useState<string>('');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [sizeMode, setSizeMode] = useState<OrbSizeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('neuro_orb_size_web');
      if (saved === 'compact' || saved === 'big' || saved === 'giant') return saved;
    }
    return 'big';
  });

  const sizeCfg = SIZE_CONFIGS[sizeMode];

  // Draggable position state
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (defaultPosition) return defaultPosition;
    if (typeof window !== 'undefined') {
      return { x: window.innerWidth - 280, y: window.innerHeight - 280 };
    }
    return { x: 500, y: 500 };
  });

  const isDraggingRef = useRef<boolean>(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Speech Recognition (Web Speech API / Local Engine)
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setOrbState('listening');
      };

      recognition.onresult = async (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            handleFinalCommand(text.trim());
          } else {
            currentTranscript += text;
          }
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.warn('[DesktopNeonOrb] Speech recognition error:', e.error);
        }
      };

      recognition.onend = () => {
        if (isActive && !isMuted) {
          try {
            recognition.start();
          } catch {
            // Already started or busy
          }
        } else {
          setOrbState('idle');
        }
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.error('[DesktopNeonOrb] Failed to init speech recognition:', e);
    }
  }, [isActive, isMuted]);

  // Handle Voice Command Execution
  const handleFinalCommand = async (rawText: string) => {
    if (!rawText.trim()) return;
    setTranscript(rawText);
    setOrbState('processing');

    try {
      // Execute via Neuro OS FastAPI Backend
      const res = await fetch('http://localhost:8000/api/v1/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: rawText, include_voice: true }),
      });

      if (res.ok) {
        const data = await res.json();
        setOrbState('speaking');
        setLastAction(data.display_text || data.voice_response || `Executed: ${rawText}`);

        // Speak synthesized response if supported
        if ('speechSynthesis' in window && data.voice_response && !isMuted) {
          const utterance = new SpeechSynthesisUtterance(data.voice_response);
          utterance.rate = 1.05;
          utterance.pitch = 1.0;
          utterance.onend = () => {
            setTimeout(() => {
              setOrbState('idle');
              setLastAction(null);
            }, 2000);
          };
          window.speechSynthesis.speak(utterance);
        } else {
          setTimeout(() => {
            setOrbState('idle');
            setLastAction(null);
          }, 3000);
        }
      } else {
        setOrbState('idle');
      }
    } catch {
      setOrbState('idle');
    }
  };

  // Start Mic Audio Visualizer Frequency Meter
  const startAudioAnalyzer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const render = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] ?? 0;
        }
        const avg = sum / bufferLength;
        setAudioLevel(Math.min(1, avg / 128));
        animFrameRef.current = requestAnimationFrame(render);
      };
      render();
    } catch {
      // Audio level fallback simulation
    }
  };

  const stopAudioAnalyzer = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  // Toggle Voice Listening
  const toggleListening = () => {
    if (isMuted || orbState !== 'listening') {
      setIsMuted(false);
      try {
        recognitionRef.current?.start();
      } catch {}
      startAudioAnalyzer();
      setOrbState('listening');
    } else {
      setIsMuted(true);
      try {
        recognitionRef.current?.stop();
      } catch {}
      stopAudioAnalyzer();
      setOrbState('idle');
    }
  };

  const handleSetSizeMode = (newSize: OrbSizeMode) => {
    setSizeMode(newSize);
    try {
      localStorage.setItem('neuro_orb_size_web', newSize);
    } catch {}
  };

  useEffect(() => {
    initSpeechRecognition();
    startAudioAnalyzer();

    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.min(prev.x, window.innerWidth - 260),
        y: Math.min(prev.y, window.innerHeight - 260),
      }));
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        recognitionRef.current?.stop();
      } catch {}
      stopAudioAnalyzer();
    };
  }, [initSpeechRecognition]);

  // Dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.no-drag')) return;
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const newX = Math.max(10, Math.min(window.innerWidth - 260, e.clientX - dragOffsetRef.current.x));
    const newY = Math.max(10, Math.min(window.innerHeight - 260, e.clientY - dragOffsetRef.current.y));
    setPosition({ x: newX, y: newY });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (!isActive) return null;

  // Determine dynamic neon color theme by state
  const getNeonColors = () => {
    switch (orbState) {
      case 'listening':
        return {
          glow: 'rgba(0, 245, 255, 0.65)',
          glowWide: 'rgba(0, 245, 255, 0.28)',
          primary: '#00F5FF',
          secondary: '#38BDF8',
          border: '#00F5FF',
          accent: '#06B6D4',
          status: 'Listening Active',
        };
      case 'processing':
        return {
          glow: 'rgba(168, 85, 247, 0.75)',
          glowWide: 'rgba(192, 132, 252, 0.32)',
          primary: '#C084FC',
          secondary: '#E879F9',
          border: '#A855F7',
          accent: '#9333EA',
          status: 'Processing',
        };
      case 'speaking':
        return {
          glow: 'rgba(16, 185, 129, 0.75)',
          glowWide: 'rgba(52, 211, 153, 0.32)',
          primary: '#34D399',
          secondary: '#6EE7B7',
          border: '#10B981',
          accent: '#059669',
          status: 'Responding',
        };
      case 'idle':
      default:
        return {
          glow: 'rgba(99, 102, 241, 0.45)',
          glowWide: 'rgba(99, 102, 241, 0.18)',
          primary: '#818CF8',
          secondary: '#A5B4FC',
          border: '#6366F1',
          accent: '#4F46E5',
          status: isMuted ? 'Muted / Standby' : 'Ready',
        };
    }
  };

  const colors = getNeonColors();
  const scaleEffect = 1 + (orbState === 'listening' ? audioLevel * 0.35 : 0);

  // Radial Equalizer Bars
  const numBars = 32;
  const radialBars = Array.from({ length: numBars }).map((_, i) => {
    const angle = (i / numBars) * 2 * Math.PI;
    const baseHeight = orbState === 'listening' ? 6 + audioLevel * 22 * ((i % 4) + 1) * 0.4 : 4;
    return { angle, baseHeight };
  });

  return (
    <div
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed top-0 left-0 z-[9999] select-none cursor-grab active:cursor-grabbing transition-transform duration-75 ease-out"
    >
      {/* 1. Holographic Floating Neon Orb */}
      <div className={`relative ${sizeCfg.orbBoxClass} flex items-center justify-center`}>
        {/* Outer Plasma Glow Halo */}
        <div
          className="absolute inset-0 rounded-full blur-3xl transition-all duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${colors.glow} 0%, ${colors.glowWide} 50%, transparent 80%)`,
            transform: `scale(${scaleEffect * 1.5})`,
          }}
        />

        {/* Outer Pulsing Neon Segmented Orbit Ring */}
        <div
          className={`absolute ${sizeCfg.outerRingClass} rounded-full border-2 border-dashed transition-all duration-700 pointer-events-none ${
            orbState === 'processing'
              ? 'animate-spin border-purple-400'
              : orbState === 'listening'
              ? 'animate-pulse border-cyan-400'
              : 'border-indigo-500/50'
          }`}
          style={{
            borderColor: colors.border,
            boxShadow: `0 0 28px ${colors.glow}, inset 0 0 18px ${colors.glowWide}`,
          }}
        />

        {/* Counter-rotating Inner Arc Ring */}
        <svg
          className={`absolute ${sizeCfg.middleRingClass} pointer-events-none ${
            orbState === 'listening' ? 'animate-[spin_4s_linear_infinite]' : 'animate-[spin_14s_linear_infinite]'
          }`}
          viewBox="0 0 200 200"
        >
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke={colors.primary}
            strokeWidth="3.5"
            strokeDasharray="40 20 14 20"
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 10px ${colors.primary})`,
            }}
          />
          <circle
            cx="100"
            cy="100"
            r="76"
            fill="none"
            stroke={colors.secondary}
            strokeWidth="1.8"
            strokeDasharray="12 12 40 12"
            strokeLinecap="round"
            className="opacity-70"
          />
        </svg>

        {/* Radial Audio Frequency Wave Bars */}
        <svg
          className={`absolute ${sizeCfg.orbBoxClass} pointer-events-none transition-opacity duration-300 ${
            orbState === 'listening' || orbState === 'speaking' ? 'opacity-100' : 'opacity-30'
          }`}
          viewBox="0 0 200 200"
        >
          {radialBars.map((bar, idx) => {
            const r1 = 66;
            const r2 = r1 + Math.max(3, bar.baseHeight);
            const x1 = 100 + r1 * Math.cos(bar.angle);
            const y1 = 100 + r1 * Math.sin(bar.angle);
            const x2 = 100 + r2 * Math.cos(bar.angle);
            const y2 = 100 + r2 * Math.sin(bar.angle);
            return (
              <line
                key={idx}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={colors.primary}
                strokeWidth="2.2"
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0 0 4px ${colors.primary})`,
                  opacity: 0.7 + (idx % 3) * 0.15,
                }}
              />
            );
          })}
        </svg>

        {/* Central Core Sphere */}
        <div
          onClick={toggleListening}
          className={`no-drag relative ${sizeCfg.coreBallClass} rounded-full flex flex-col items-center justify-center bg-[#05070f]/95 border-2 cursor-pointer group shadow-[0_0_40px_rgba(0,0,0,0.9)] transition-all duration-300 active:scale-95 z-20`}
          style={{
            borderColor: colors.primary,
            boxShadow: `0 0 32px ${colors.glow}, inset 0 0 20px ${colors.glowWide}`,
          }}
          title={isMuted ? 'Click to Unmute Voice Agent' : 'Click to Mute Voice Agent'}
        >
          {/* Animated Waveform / Neural Micro-Core */}
          <div className="flex items-center gap-1">
            {orbState === 'listening' ? (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-6 bg-cyan-400 rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" />
                <span className="w-1.5 h-9 bg-cyan-300 rounded-full animate-[bounce_0.4s_ease-in-out_infinite_0.1s]" />
                <span className="w-1.5 h-7 bg-cyan-400 rounded-full animate-[bounce_0.5s_ease-in-out_infinite_0.2s]" />
                <span className="w-1.5 h-5 bg-cyan-300 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_0.3s]" />
              </div>
            ) : orbState === 'processing' ? (
              <Sparkles className="w-9 h-9 text-purple-400 animate-pulse" />
            ) : orbState === 'speaking' ? (
              <Volume2 className="w-8 h-8 text-emerald-400 animate-pulse" />
            ) : isMuted ? (
              <MicOff className="w-8 h-8 text-rose-400 group-hover:text-rose-300 transition-colors" />
            ) : (
              <Mic className="w-8 h-8 text-indigo-400 group-hover:text-cyan-300 transition-colors" />
            )}
          </div>

          {/* Status Indicator Dot */}
          <span
            className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: isMuted ? '#F43F5E' : colors.primary,
              boxShadow: `0 0 8px ${isMuted ? '#F43F5E' : colors.primary}`,
            }}
          />
        </div>
      </div>

      {/* 2. Interactive Floating Tooltip & HUD Panel */}
      {(isHovered || transcript || lastAction) && (
        <div
          className="absolute bottom-full right-0 mb-3 w-80 bg-[#080911]/95 backdrop-blur-xl border rounded-2xl p-3 shadow-2xl transition-all font-mono pointer-events-auto"
          style={{
            borderColor: colors.border,
            boxShadow: `0 12px 36px rgba(0,0,0,0.85), 0 0 20px ${colors.glowWide}`,
          }}
        >
          {/* Top Control Bar */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full animate-ping"
                style={{ backgroundColor: colors.primary }}
              />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Neuro Voice · {colors.status}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Size Mode Switcher */}
              <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-0.5 text-[10px]">
                <button
                  onClick={() => handleSetSizeMode('compact')}
                  className={`px-1.5 py-0.5 rounded ${sizeMode === 'compact' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  S
                </button>
                <button
                  onClick={() => handleSetSizeMode('big')}
                  className={`px-1.5 py-0.5 rounded ${sizeMode === 'big' ? 'bg-cyan-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  M
                </button>
                <button
                  onClick={() => handleSetSizeMode('giant')}
                  className={`px-1.5 py-0.5 rounded ${sizeMode === 'giant' ? 'bg-purple-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  L
                </button>
              </div>

              {onSummonHUD && (
                <button
                  onClick={onSummonHUD}
                  className="p-1.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-lg text-zinc-300 hover:text-white transition-colors"
                  title="Summon Full HUD"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsActive(false)}
                className="p-1.5 bg-white/[0.05] hover:bg-rose-900/40 border border-white/10 rounded-lg text-zinc-400 hover:text-rose-400 transition-colors"
                title="Dismiss Orb"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Transcript / Output */}
          {transcript ? (
            <div className="bg-cyan-950/30 border border-cyan-500/30 rounded-xl p-2.5 mb-2">
              <div className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-cyan-400 animate-pulse" /> Voice Heard:
              </div>
              <p className="text-xs text-cyan-200 font-sans italic leading-relaxed">
                "{transcript}"
              </p>
            </div>
          ) : lastAction ? (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-2.5 mb-2">
              <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5 uppercase tracking-wider mb-0.5">
                <Zap className="w-3 h-3" /> Result:
              </div>
              <p className="text-xs text-zinc-100 font-sans leading-relaxed">
                {lastAction}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 mb-2">
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">
                Quick Voice Commands:
              </div>
              <div className="flex flex-wrap gap-1">
                {QUICK_ACTIONS.map((act, i) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => handleFinalCommand(act.cmd)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.06] text-[10px] text-zinc-300 hover:text-cyan-300 transition-all font-sans"
                    >
                      <Icon className="w-2.5 h-2.5 text-cyan-400" />
                      <span>{act.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Hotkey Help */}
          <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[9px] text-zinc-500">
            <span>Drag anywhere</span>
            <kbd className="px-1.5 py-0.5 bg-black/50 border border-white/10 rounded text-zinc-300 font-mono text-[9px]">
              Ctrl+Space
            </kbd>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopNeonOrb;
