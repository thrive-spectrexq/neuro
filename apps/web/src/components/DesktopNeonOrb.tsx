import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Sparkles, 
  X, 
  Maximize2, 
  Zap
} from 'lucide-react';

export interface DesktopNeonOrbProps {
  onSummonHUD?: () => void;
  defaultPosition?: { x: number; y: number };
}

export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking';

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

  // Draggable position state
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (defaultPosition) return defaultPosition;
    if (typeof window !== 'undefined') {
      return { x: window.innerWidth - 110, y: window.innerHeight - 110 };
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
      console.warn('[DesktopNeonOrb] SpeechRecognition not supported in this browser.');
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
        body: JSON.stringify({ raw_text: rawText }),
      });

      if (res.ok) {
        const data = await res.json();
        setOrbState('speaking');
        setLastAction(data.response_text || data.message || `Executed: ${rawText}`);

        // Speak synthesized response if supported
        if ('speechSynthesis' in window && data.response_text) {
          const utterance = new SpeechSynthesisUtterance(data.response_text);
          utterance.rate = 1.05;
          utterance.pitch = 1.0;
          utterance.onend = () => {
            setTimeout(() => {
              setOrbState('idle');
              setLastAction(null);
            }, 2500);
          };
          window.speechSynthesis.speak(utterance);
        } else {
          setTimeout(() => {
            setOrbState('idle');
            setLastAction(null);
          }, 3500);
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
  };

  // Toggle Voice Listening
  const toggleListening = () => {
    if (isMuted) {
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

  useEffect(() => {
    initSpeechRecognition();
    startAudioAnalyzer();

    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.min(prev.x, window.innerWidth - 90),
        y: Math.min(prev.y, window.innerHeight - 90),
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
    if ((e.target as HTMLElement).closest('button')) return;
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const newX = Math.max(10, Math.min(window.innerWidth - 86, e.clientX - dragOffsetRef.current.x));
    const newY = Math.max(10, Math.min(window.innerHeight - 86, e.clientY - dragOffsetRef.current.y));
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
          glow: 'rgba(0, 245, 255, 0.45)',
          glowWide: 'rgba(0, 245, 255, 0.18)',
          primary: '#00F5FF',
          secondary: '#3B82F6',
          border: '#00F5FF',
          core: '#06B6D4',
          status: 'Listening',
        };
      case 'processing':
        return {
          glow: 'rgba(168, 85, 247, 0.55)',
          glowWide: 'rgba(168, 85, 247, 0.22)',
          primary: '#C084FC',
          secondary: '#6366F1',
          border: '#A855F7',
          core: '#8B5CF6',
          status: 'Processing',
        };
      case 'speaking':
        return {
          glow: 'rgba(16, 185, 129, 0.55)',
          glowWide: 'rgba(16, 185, 129, 0.22)',
          primary: '#34D399',
          secondary: '#00F5FF',
          border: '#10B981',
          core: '#059669',
          status: 'Speaking',
        };
      case 'idle':
      default:
        return {
          glow: 'rgba(99, 102, 241, 0.35)',
          glowWide: 'rgba(99, 102, 241, 0.12)',
          primary: '#818CF8',
          secondary: '#6366F1',
          border: '#4F46E5',
          core: '#4338CA',
          status: isMuted ? 'Muted' : 'Standby',
        };
    }
  };

  const colors = getNeonColors();
  const scaleEffect = 1 + (orbState === 'listening' ? audioLevel * 0.22 : 0);

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
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Outer Glow Halo */}
        <div
          className="absolute inset-0 rounded-full blur-xl transition-all duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${colors.glow} 0%, ${colors.glowWide} 60%, transparent 80%)`,
            transform: `scale(${scaleEffect * 1.5})`,
          }}
        />

        {/* Outer Pulsing Neon Ring */}
        <div
          className={`absolute inset-0.5 rounded-full border border-dashed transition-all duration-500 pointer-events-none ${
            orbState === 'processing'
              ? 'animate-spin border-purple-400'
              : orbState === 'listening'
              ? 'animate-pulse border-cyan-400'
              : 'border-indigo-500/40'
          }`}
          style={{
            borderColor: colors.border,
            boxShadow: `0 0 16px ${colors.glow}, inset 0 0 12px ${colors.glow}`,
          }}
        />

        {/* Counter-rotating Inner Arc Ring */}
        <svg
          className={`absolute inset-1.5 w-[68px] h-[68px] pointer-events-none ${
            orbState === 'listening' ? 'animate-[spin_4s_linear_infinite]' : 'animate-[spin_12s_linear_infinite]'
          }`}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke={colors.primary}
            strokeWidth="2.5"
            strokeDasharray="40 18 12 18"
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 6px ${colors.primary})`,
            }}
          />
        </svg>

        {/* Central Core Sphere */}
        <div
          onClick={toggleListening}
          className="relative w-12 h-12 rounded-full flex items-center justify-center bg-[#07090E] border-2 cursor-pointer group shadow-2xl transition-all duration-300 active:scale-95"
          style={{
            borderColor: colors.primary,
            boxShadow: `0 0 20px ${colors.glow}, inset 0 0 14px ${colors.glowWide}`,
          }}
          title={isMuted ? 'Click to Unmute Voice Agent' : 'Click to Mute Voice Agent'}
        >
          {/* Animated Waveform / Neural Micro-Core */}
          <div className="flex items-center gap-0.5">
            {orbState === 'listening' ? (
              <>
                <span className="w-0.5 h-3 bg-cyan-400 rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" />
                <span className="w-0.5 h-5 bg-cyan-300 rounded-full animate-[bounce_0.4s_ease-in-out_infinite_0.1s]" />
                <span className="w-0.5 h-4 bg-cyan-400 rounded-full animate-[bounce_0.5s_ease-in-out_infinite_0.2s]" />
                <span className="w-0.5 h-2 bg-cyan-300 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_0.3s]" />
              </>
            ) : orbState === 'processing' ? (
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            ) : orbState === 'speaking' ? (
              <Volume2 className="w-5 h-5 text-emerald-400 animate-pulse" />
            ) : isMuted ? (
              <MicOff className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
            ) : (
              <Mic className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
            )}
          </div>

          {/* Micro Status Beacon */}
          <span
            className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: isMuted ? '#64748B' : colors.primary,
              boxShadow: `0 0 6px ${colors.primary}`,
            }}
          />
        </div>
      </div>

      {/* 2. Interactive Tooltip & Live Speech Bubble */}
      {(isHovered || transcript || lastAction) && (
        <div
          className="absolute bottom-full right-0 mb-2 w-64 bg-[#090A0F]/95 backdrop-blur-md border rounded-lg p-2.5 shadow-2xl transition-all font-mono pointer-events-auto"
          style={{
            borderColor: colors.border,
            boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 12px ${colors.glowWide}`,
          }}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-[#1F2433] pb-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full animate-ping"
                style={{ backgroundColor: colors.primary }}
              />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                Neuro OS · {colors.status}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {onSummonHUD && (
                <button
                  onClick={onSummonHUD}
                  className="p-1 hover:bg-[#181C28] rounded text-[#94A3B8] hover:text-white transition-colors"
                  title="Summon Full HUD"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => setIsActive(false)}
                className="p-1 hover:bg-[#181C28] rounded text-[#94A3B8] hover:text-rose-400 transition-colors"
                title="Hide Desktop Orb"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Transcript / Action Display */}
          {transcript ? (
            <div className="space-y-1">
              <div className="text-[9px] text-[#64748B] uppercase">Heard:</div>
              <p className="text-[11px] text-cyan-300 font-sans italic leading-tight">
                "{transcript}"
              </p>
            </div>
          ) : lastAction ? (
            <div className="space-y-1">
              <div className="text-[9px] text-emerald-400 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> Action Result:
              </div>
              <p className="text-[11px] text-slate-200 font-sans leading-tight">
                {lastAction}
              </p>
            </div>
          ) : (
            <div className="space-y-1 text-[#94A3B8]">
              <div className="text-[10px] text-slate-300">
                Say <span className="text-indigo-300 font-bold">"Hey Neuro"</span> or command:
              </div>
              <div className="text-[9px] text-[#64748B] space-y-0.5">
                <div>• "Open Brave / VS Code"</div>
                <div>• "Play starboy on Spotify"</div>
                <div>• "Take a note about meeting"</div>
              </div>
            </div>
          )}

          {/* Hotkey hint */}
          <div className="mt-2 pt-1 border-t border-[#1F2433] flex items-center justify-between text-[9px] text-[#64748B]">
            <span>Drag to reposition</span>
            <kbd className="px-1 py-0.2 bg-[#161A26] border border-[#262E44] rounded text-slate-300 text-[8px]">
              Ctrl+Space
            </kbd>
          </div>
        </div>
      )}
    </div>
  );
};
