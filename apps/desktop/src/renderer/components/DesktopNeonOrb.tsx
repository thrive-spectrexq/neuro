import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Sparkles, 
  X, 
  Minus,
  Maximize2, 
  Zap, 
  Radio,
  Terminal,
  ExternalLink,
  Play,
  FileText,
  Search
} from 'lucide-react';
import { useJarvisAgent } from '../hooks/useJarvisAgent';
import { soundEngine } from '../utils/soundEngine';

interface DesktopNeonOrbProps {
  onOpenJarvis?: () => void;
  standaloneMode?: boolean;
}

type OrbSizeMode = 'compact' | 'big' | 'giant';

interface SizeConfig {
  window: { width: number; height: number };
  orbBoxClass: string;
  coreBallClass: string;
  middleRingClass: string;
  outerRingClass: string;
}

const SIZE_CONFIGS: Record<OrbSizeMode, SizeConfig> = {
  compact: {
    window: { width: 320, height: 400 },
    orbBoxClass: 'w-[190px] h-[190px]',
    coreBallClass: 'w-[90px] h-[90px]',
    middleRingClass: 'w-[150px] h-[150px]',
    outerRingClass: 'w-[185px] h-[185px]',
  },
  big: {
    window: { width: 380, height: 460 },
    orbBoxClass: 'w-[250px] h-[250px]',
    coreBallClass: 'w-[124px] h-[124px]',
    middleRingClass: 'w-[195px] h-[195px]',
    outerRingClass: 'w-[245px] h-[245px]',
  },
  giant: {
    window: { width: 440, height: 530 },
    orbBoxClass: 'w-[310px] h-[310px]',
    coreBallClass: 'w-[155px] h-[155px]',
    middleRingClass: 'w-[245px] h-[245px]',
    outerRingClass: 'w-[305px] h-[305px]',
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
  onOpenJarvis,
  standaloneMode = false,
}) => {
  const {
    isListening,
    isProcessing,
    transcript,
    lastResult,
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

  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const smoothedAudioRef = useRef(0);

  const [sizeMode, setSizeMode] = useState<OrbSizeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('neuro_orb_size');
      if (saved === 'compact' || saved === 'big' || saved === 'giant') return saved;
    }
    return 'big';
  });

  const sizeCfg = SIZE_CONFIGS[sizeMode];

  // Stable window resizing: handles size changes and minimize mode
  useEffect(() => {
    if (!standaloneMode || !window.electronAPI?.resizeOrbWindow) return;
    if (isMinimized) {
      window.electronAPI.resizeOrbWindow(110, 110);
    } else {
      window.electronAPI.resizeOrbWindow(sizeCfg.window.width, sizeCfg.window.height);
    }
  }, [standaloneMode, isMinimized, sizeMode, sizeCfg]);

  // Persist size choice
  const handleSetSizeMode = (newSize: OrbSizeMode) => {
    setSizeMode(newSize);
    try {
      localStorage.setItem('neuro_orb_size', newSize);
    } catch {}
  };

  // Position state (for in-browser simulation if not standalone)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      return { x: window.innerWidth - 300, y: window.innerHeight - 300 };
    }
    return { x: 500, y: 500 };
  });

  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Determine State
  const orbState = isProcessing
    ? 'processing'
    : isListening
    ? 'listening'
    : lastResult && !isMuted
    ? 'speaking'
    : 'idle';

  // Setup Real-Time Web Audio Analyzer with exponential smoothing
  const startAudioAnalyzer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.85;
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
        const target = Math.min(1, avg / 128);
        // Exponential smoothing filter to prevent jitter
        smoothedAudioRef.current = smoothedAudioRef.current * 0.75 + target * 0.25;
        setAudioLevel(smoothedAudioRef.current);
        animFrameRef.current = requestAnimationFrame(render);
      };
      render();
    } catch {
      // Graceful fallback
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
    smoothedAudioRef.current = 0;
    setAudioLevel(0);
  };

  useEffect(() => {
    if (isListening) {
      startAudioAnalyzer();
    } else {
      stopAudioAnalyzer();
    }
    return () => {
      stopAudioAnalyzer();
    };
  }, [isListening]);

  // Window resize bounds keeper for in-browser drag
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.min(prev.x, window.innerWidth - 260),
        y: Math.min(prev.y, window.innerHeight - 260),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // In-browser dragging event handlers
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

  if (!isVisible) return null;

  // Colors and glow tailored for desktop vibrancy
  const getNeonColors = () => {
    switch (orbState) {
      case 'listening':
        return {
          glow: 'rgba(16, 185, 129, 0.65)',
          glowWide: 'rgba(16, 185, 129, 0.28)',
          glowUltra: 'rgba(16, 185, 129, 0.15)',
          primary: '#00F5FF',
          secondary: '#38BDF8',
          border: '#00F5FF',
          accent: '#10B981',
          status: 'Listening Active',
        };
      case 'processing':
        return {
          glow: 'rgba(20, 184, 166, 0.75)',
          glowWide: 'rgba(45, 212, 191, 0.32)',
          glowUltra: 'rgba(236, 72, 153, 0.18)',
          primary: '#C084FC',
          secondary: '#E879F9',
          border: '#A855F7',
          accent: '#9333EA',
          status: 'Processing Query',
        };
      case 'speaking':
        return {
          glow: 'rgba(16, 185, 129, 0.75)',
          glowWide: 'rgba(52, 211, 153, 0.32)',
          glowUltra: 'rgba(16, 185, 129, 0.18)',
          primary: '#34D399',
          secondary: '#6EE7B7',
          border: '#10B981',
          accent: '#059669',
          status: 'Responding',
        };
      case 'idle':
      default:
        return {
          glow: 'rgba(20, 184, 166, 0.45)',
          glowWide: 'rgba(20, 184, 166, 0.18)',
          glowUltra: 'rgba(45, 212, 191, 0.1)',
          primary: '#2DD4BF',
          secondary: '#A5B4FC',
          border: '#14B8A6',
          accent: '#4F46E5',
          status: isMuted ? 'Muted / Standby' : 'Online · Ready',
        };
    }
  };

  const colors = getNeonColors();
  // Clamped smooth scale multiplier
  const scaleMultiplier = 1 + (orbState === 'listening' ? Math.min(0.12, audioLevel * 0.15) : 0);

  const handleOrbClick = () => {
    soundEngine.playBeep(isListening ? 420 : 840, 'sine', 0.12);
    toggleListening();
  };

  const handleOrbDoubleClick = () => {
    if (standaloneMode && window.electronAPI?.focusMainWindow) {
      window.electronAPI.focusMainWindow();
    } else if (onOpenJarvis) {
      onOpenJarvis();
    }
  };

  const handleClose = () => {
    if (standaloneMode && window.electronAPI?.closeOrbWindow) {
      window.electronAPI.closeOrbWindow();
    }
  };

  const handleSummon = () => {
    if (window.electronAPI?.focusMainWindow) {
      window.electronAPI.focusMainWindow();
    } else if (onOpenJarvis) {
      onOpenJarvis();
    }
  };

  const handleExecuteQuickAction = (cmd: string) => {
    executeCommand(cmd);
  };

  // Radial Equalizer Bars (32 bars radiating around circumference)
  const numBars = 32;
  const radialBars = Array.from({ length: numBars }).map((_, i) => {
    const angle = (i / numBars) * 2 * Math.PI;
    const baseHeight = orbState === 'listening' ? 4 + audioLevel * 14 * ((i % 4) + 1) * 0.35 : 3;
    return { angle, baseHeight };
  });

  const isExpanded = isHovered || !!transcript || !!lastResult || isProcessing || isListening;

  // Render standalone desktop window layout
  if (standaloneMode) {
    if (isMinimized) {
      return (
        <div
          className="w-full h-full flex items-center justify-center cursor-pointer select-none no-drag p-2"
          onClick={() => setIsMinimized(false)}
          title="Click to Expand Neuro Desktop Orb"
        >
          <div className="relative w-16 h-16 rounded-full flex items-center justify-center bg-[#05070f]/95 border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.75)] group hover:scale-110 active:scale-95 transition-all">
            <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center">
              {isListening ? (
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              ) : (
                <Zap className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              )}
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#00f5ff] animate-pulse" />
          </div>
        </div>
      );
    }

    return (
      <div
        className="w-full h-full relative flex flex-col items-center justify-end pb-3 select-none overflow-visible"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Live HUD Floating Bubble / Telemetry Console (Smooth pure CSS fade-in) */}
        <div
          className={`no-drag w-full px-2 mb-2 transition-all duration-200 ease-out transform ${
            isExpanded
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <div
            className="bg-[#080911]/95 backdrop-blur-xl border rounded-2xl p-3 shadow-2xl font-mono"
            style={{
              borderColor: colors.border,
              boxShadow: `0 12px 36px rgba(0,0,0,0.85), 0 0 20px ${colors.glowWide}`,
            }}
          >
            {/* Header Control Row */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full animate-ping"
                  style={{ backgroundColor: colors.primary }}
                />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Neuro · {colors.status}
                </span>
              </div>

              {/* Action Buttons & Size Selector */}
              <div className="flex items-center gap-1.5">
                {/* Size Mode Switcher */}
                <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-0.5 text-[10px]">
                  <button
                    onClick={() => handleSetSizeMode('compact')}
                    className={`px-1.5 py-0.5 rounded ${sizeMode === 'compact' ? 'bg-teal-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                    title="Compact Size"
                  >
                    S
                  </button>
                  <button
                    onClick={() => handleSetSizeMode('big')}
                    className={`px-1.5 py-0.5 rounded ${sizeMode === 'big' ? 'bg-emerald-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                    title="Big Size (Default)"
                  >
                    M
                  </button>
                  <button
                    onClick={() => handleSetSizeMode('giant')}
                    className={`px-1.5 py-0.5 rounded ${sizeMode === 'giant' ? 'bg-teal-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                    title="Giant Titan Size"
                  >
                    L
                  </button>
                </div>

                <button
                  onClick={() => {
                    soundEngine.playBeep(isListening ? 420 : 840, 'sine', 0.12);
                    toggleListening();
                  }}
                  className={`p-1.5 rounded-lg border transition-all ${
                    isListening
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)] animate-pulse'
                      : 'bg-white/[0.05] border-white/10 text-zinc-400 hover:text-white hover:border-emerald-500/30'
                  }`}
                  title={isListening ? 'Microphone Active (Click to Pause)' : 'Open Microphone'}
                >
                  {isListening ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5" />}
                </button>

                {/* Minimize to Mini-Orb */}
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-lg text-zinc-300 hover:text-white transition-colors"
                  title="Minimize to Floating Mini-Orb"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                {/* Maximize Neuro Workstation */}
                <button
                  onClick={handleSummon}
                  className="p-1.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-lg text-zinc-300 hover:text-white transition-colors"
                  title="Maximize Neuro Workstation"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                {/* Close/Hide Orb */}
                <button
                  onClick={handleClose}
                  className="p-1.5 bg-white/[0.05] hover:bg-rose-900/40 border border-white/10 hover:border-rose-500/40 rounded-lg text-zinc-400 hover:text-rose-400 transition-colors"
                  title="Close Desktop Orb (Press Alt+O to reopen)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Live Voice Sound Wave & Sensitivity Meter */}
            {isListening && (
              <div className="bg-black/50 border border-white/[0.08] rounded-xl p-2 mb-2 font-mono">
                <div className="flex items-center justify-between text-[10px] mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      voiceLevel === 'optimal' ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' :
                      voiceLevel === 'quiet' ? 'bg-amber-400 animate-pulse' :
                      voiceLevel === 'loud' ? 'bg-rose-400 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'bg-zinc-600'
                    }`} />
                    <span className={`font-semibold ${
                      voiceLevel === 'optimal' ? 'text-emerald-300' :
                      voiceLevel === 'quiet' ? 'text-amber-300' :
                      voiceLevel === 'loud' ? 'text-rose-300' : 'text-zinc-400'
                    }`}>
                      {voiceLevel === 'optimal' ? 'Hearing Clearly (Optimal)' :
                       voiceLevel === 'quiet' ? 'Speak Slightly Louder ⏶' :
                       voiceLevel === 'loud' ? 'Loud Audio ⏷' : 'Listening for Voice...'}
                    </span>
                  </div>
                  <span className="text-emerald-400 font-bold">{audioVolume}%</span>
                </div>

                {/* Multi-segment Level Bar with Activation Threshold Indicator */}
                <div className="relative w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden flex items-center border border-white/[0.06]">
                  {/* Activation Threshold Marker at 18% */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 z-10 opacity-75"
                    style={{ left: `${activationThreshold}%` }}
                    title={`Activation Threshold (${activationThreshold}%)`}
                  />
                  {/* Real-time Voice Volume Fill */}
                  <div
                    className={`h-full transition-all duration-75 rounded-full ${
                      audioVolume >= 75 ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-rose-500' :
                      audioVolume >= activationThreshold ? 'bg-gradient-to-r from-emerald-400 to-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' :
                      'bg-amber-500/60'
                    }`}
                    style={{ width: `${Math.max(3, audioVolume)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Live Heard Transcript / Output */}
            {transcript ? (
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-2.5 mb-2">
                <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> Voice Heard:
                </div>
                <p className="text-xs text-emerald-200 font-sans italic leading-relaxed">
                  "{transcript}"
                </p>
              </div>
            ) : lastResult ? (
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-2.5 mb-2">
                <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5 uppercase tracking-wider mb-0.5">
                  <Zap className="w-3 h-3" /> Agent Execution Result:
                </div>
                <p className="text-xs text-zinc-100 font-sans leading-relaxed">
                  {lastResult.display_text || lastResult.voice_response}
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
                        onClick={() => handleExecuteQuickAction(act.cmd)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.06] text-[10px] text-zinc-300 hover:text-emerald-300 transition-all font-sans"
                      >
                        <Icon className="w-2.5 h-2.5 text-emerald-400" />
                        <span>{act.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer Telemetry Bar */}
            <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[9px] text-zinc-500">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                OS Bridge Active
              </span>
              <div className="flex items-center gap-1">
                <span>Summon:</span>
                <kbd className="px-1.5 py-0.5 bg-black/50 border border-white/10 rounded text-zinc-300 font-mono text-[9px]">
                  Ctrl+Space
                </kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Holographic Glowing Center Orb (Draggable Container) */}
        <div
          className={`relative ${sizeCfg.orbBoxClass} flex items-center justify-center cursor-move titlebar-drag select-none transition-all duration-200`}
          onDoubleClick={handleOrbDoubleClick}
        >
          {/* Deep Volumetric Neon Plasma Atmosphere */}
          <div
            className="absolute inset-0 rounded-full blur-3xl transition-all duration-300 pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${colors.glow} 0%, ${colors.glowWide} 45%, ${colors.glowUltra} 70%, transparent 85%)`,
              transform: `scale(${scaleMultiplier * 1.3})`,
            }}
          />

          {/* Secondary Plasma Core Glow */}
          <div
            className="absolute inset-4 rounded-full blur-xl transition-all duration-200 pointer-events-none opacity-80"
            style={{
              background: `radial-gradient(circle, ${colors.primary} 0%, ${colors.secondary} 30%, transparent 70%)`,
              transform: `scale(${scaleMultiplier * 1.1})`,
            }}
          />

          {/* Outer Cybernetic Segmented Orbit Ring */}
          <div
            className={`absolute ${sizeCfg.outerRingClass} rounded-full border-2 border-dashed transition-all duration-500 pointer-events-none ${
              orbState === 'processing'
                ? 'animate-spin border-teal-400/80'
                : orbState === 'listening'
                ? 'animate-pulse border-emerald-400'
                : 'border-teal-500/50'
            }`}
            style={{
              borderColor: colors.border,
              boxShadow: `0 0 32px ${colors.glow}, inset 0 0 20px ${colors.glowWide}`,
            }}
          />

          {/* Satellite Orbit Nodes (4 Cardinal Points) */}
          <div className={`absolute ${sizeCfg.outerRingClass} rounded-full pointer-events-none ${orbState === 'processing' ? 'animate-[spin_4s_linear_infinite]' : 'animate-[spin_20s_linear_infinite]'}`}>
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_12px_#ffffff] border border-emerald-400" />
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#00f5ff]" />
            <span className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_10px_#2DD4BF]" />
            <span className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-300 shadow-[0_0_10px_#67e8f9]" />
          </div>

          {/* Middle Precision SVG Tachyon Dial */}
          <svg
            className={`absolute ${sizeCfg.middleRingClass} pointer-events-none ${
              orbState === 'listening'
                ? 'animate-[spin_4s_linear_infinite]'
                : orbState === 'processing'
                ? 'animate-[spin_2s_linear_infinite]'
                : 'animate-[spin_14s_linear_infinite]'
            }`}
            viewBox="0 0 200 200"
          >
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke={colors.primary}
              strokeWidth="3.5"
              strokeDasharray="48 24 16 24"
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 10px ${colors.primary})` }}
            />
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke={colors.secondary}
              strokeWidth="2"
              strokeDasharray="18 12 60 12"
              strokeLinecap="round"
              className="opacity-70"
            />
            <circle
              cx="100"
              cy="100"
              r="72"
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.5"
              strokeDasharray="2 10"
            />
          </svg>

          {/* Counter-Rotating Inner Tachyon Ring */}
          <svg
            className={`absolute ${sizeCfg.middleRingClass} pointer-events-none opacity-60 ${
              orbState === 'listening' ? 'animate-[spin_6s_linear_infinite_reverse]' : 'animate-[spin_24s_linear_infinite_reverse]'
            }`}
            viewBox="0 0 200 200"
          >
            <circle
              cx="100"
              cy="100"
              r="68"
              fill="none"
              stroke={colors.accent}
              strokeWidth="2.5"
              strokeDasharray="10 30 40 30"
              strokeLinecap="round"
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

          {/* Central High-Tech Cybernetic Sphere Button */}
          <div
            onClick={handleOrbClick}
            className={`no-drag relative ${sizeCfg.coreBallClass} rounded-full flex flex-col items-center justify-center bg-[#05070f]/95 border-2 cursor-pointer group shadow-[0_0_40px_rgba(0,0,0,0.9)] transition-all duration-200 active:scale-95 z-20`}
            style={{
              borderColor: colors.primary,
              boxShadow: `0 0 35px ${colors.glow}, inset 0 0 24px ${colors.glowWide}`,
            }}
            title={
              isListening
                ? 'Voice Listening Active · Click to Pause | Double Click to Open Neuro'
                : 'Click to Activate Voice · Double Click to Open Neuro'
            }
          >
            {/* Core Animated State Display */}
            <div className="flex flex-col items-center justify-center gap-1.5">
              {orbState === 'listening' ? (
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-6 bg-emerald-400 rounded-full animate-[bounce_0.6s_ease-in-out_infinite] shadow-[0_0_8px_#00f5ff]" />
                  <span className="w-1.5 h-10 bg-emerald-300 rounded-full animate-[bounce_0.4s_ease-in-out_infinite_0.1s] shadow-[0_0_10px_#67e8f9]" />
                  <span className="w-1.5 h-8 bg-emerald-400 rounded-full animate-[bounce_0.5s_ease-in-out_infinite_0.2s] shadow-[0_0_8px_#00f5ff]" />
                  <span className="w-1.5 h-5 bg-emerald-300 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_0.3s] shadow-[0_0_6px_#67e8f9]" />
                </div>
              ) : orbState === 'processing' ? (
                <div className="relative flex items-center justify-center">
                  <Sparkles className="w-9 h-9 text-teal-400 animate-pulse" />
                  <span className="absolute inset-0 w-9 h-9 border-2 border-teal-400/50 border-t-teal-300 rounded-full animate-spin" />
                </div>
              ) : orbState === 'speaking' ? (
                <div className="flex items-center gap-1">
                  <Volume2 className="w-8 h-8 text-emerald-400 animate-pulse" />
                  <div className="flex gap-0.5">
                    <span className="w-1 h-5 bg-emerald-400 rounded-full animate-ping" />
                  </div>
                </div>
              ) : isMuted ? (
                <div className="flex flex-col items-center gap-1">
                  <MicOff className="w-8 h-8 text-rose-400 group-hover:text-rose-300 transition-colors" />
                  <span className="text-[9px] font-mono font-bold text-rose-400 tracking-wider">MUTED</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Mic className="w-8 h-8 text-teal-400 group-hover:text-emerald-300 transition-colors" />
                  <span className="text-[9px] font-mono text-teal-300 tracking-wider">VOICE</span>
                </div>
              )}
            </div>

            {/* Glowing Status Beacon */}
            <span
              className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: isMuted ? '#F43F5E' : colors.primary,
                boxShadow: `0 0 10px ${isMuted ? '#F43F5E' : colors.primary}`,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // In-Browser / In-Page Floating Orb (with Draggable Support)
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
      {/* Floating Tooltip & Command HUD Panel (Rendered above orb in DOM) */}
      {(isHovered || transcript || lastResult) && (
        <div
          className="absolute bottom-full right-0 mb-3 w-80 bg-[#080911]/95 backdrop-blur-xl border rounded-2xl p-3 shadow-2xl font-mono pointer-events-auto transition-all"
          style={{
            borderColor: colors.border,
            boxShadow: `0 12px 36px rgba(0,0,0,0.85), 0 0 20px ${colors.glowWide}`,
          }}
        >
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
              <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-0.5 text-[10px]">
                <button
                  onClick={() => handleSetSizeMode('compact')}
                  className={`px-1.5 py-0.5 rounded ${sizeMode === 'compact' ? 'bg-teal-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  S
                </button>
                <button
                  onClick={() => handleSetSizeMode('big')}
                  className={`px-1.5 py-0.5 rounded ${sizeMode === 'big' ? 'bg-emerald-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  M
                </button>
                <button
                  onClick={() => handleSetSizeMode('giant')}
                  className={`px-1.5 py-0.5 rounded ${sizeMode === 'giant' ? 'bg-teal-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  L
                </button>
              </div>

              {onOpenJarvis && (
                <button
                  onClick={onOpenJarvis}
                  className="p-1.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-lg text-zinc-300 hover:text-white transition-colors"
                  title="Summon Full HUD (Ctrl+Space)"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-1.5 bg-white/[0.05] hover:bg-rose-900/40 border border-white/10 rounded-lg text-zinc-400 hover:text-rose-400 transition-colors"
                title="Dismiss Orb"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {transcript ? (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-2.5 mb-2">
              <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> Voice Heard:
              </div>
              <p className="text-xs text-emerald-200 font-sans italic leading-relaxed">
                "{transcript}"
              </p>
            </div>
          ) : lastResult ? (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-2.5 mb-2">
              <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5 uppercase tracking-wider mb-0.5">
                <Zap className="w-3 h-3" /> Result:
              </div>
              <p className="text-xs text-zinc-100 font-sans leading-relaxed">
                {lastResult.display_text || lastResult.voice_response}
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
                      onClick={() => handleExecuteQuickAction(act.cmd)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.06] text-[10px] text-zinc-300 hover:text-emerald-300 transition-all font-sans"
                    >
                      <Icon className="w-2.5 h-2.5 text-emerald-400" />
                      <span>{act.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[9px] text-zinc-500">
            <span>Drag anywhere</span>
            <kbd className="px-1.5 py-0.5 bg-black/50 border border-white/10 rounded text-zinc-300 font-mono text-[9px]">
              Ctrl+Space
            </kbd>
          </div>
        </div>
      )}

      {/* Neon Holographic Orb Element */}
      <div className={`relative ${sizeCfg.orbBoxClass} flex items-center justify-center`}>
        <div
          className="absolute inset-0 rounded-full blur-3xl transition-all duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${colors.glow} 0%, ${colors.glowWide} 50%, transparent 80%)`,
            transform: `scale(${scaleMultiplier * 1.3})`,
          }}
        />

        <div
          className={`absolute ${sizeCfg.outerRingClass} rounded-full border-2 border-dashed transition-all duration-500 pointer-events-none ${
            orbState === 'processing'
              ? 'animate-spin border-teal-400'
              : orbState === 'listening'
              ? 'animate-pulse border-emerald-400'
              : 'border-teal-500/50'
          }`}
          style={{
            borderColor: colors.border,
            boxShadow: `0 0 28px ${colors.glow}, inset 0 0 18px ${colors.glowWide}`,
          }}
        />

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
            style={{ filter: `drop-shadow(0 0 10px ${colors.primary})` }}
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

        <div
          onClick={handleOrbClick}
          className={`no-drag relative ${sizeCfg.coreBallClass} rounded-full flex flex-col items-center justify-center bg-[#05070f]/95 border-2 cursor-pointer group shadow-[0_0_40px_rgba(0,0,0,0.9)] transition-all duration-200 active:scale-95 z-20`}
          style={{
            borderColor: colors.primary,
            boxShadow: `0 0 32px ${colors.glow}, inset 0 0 20px ${colors.glowWide}`,
          }}
          title={isListening ? 'Click to pause voice listening' : 'Click to activate voice listening'}
        >
          <div className="flex items-center gap-1">
            {orbState === 'listening' ? (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-6 bg-emerald-400 rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" />
                <span className="w-1.5 h-9 bg-emerald-300 rounded-full animate-[bounce_0.4s_ease-in-out_infinite_0.1s]" />
                <span className="w-1.5 h-7 bg-emerald-400 rounded-full animate-[bounce_0.5s_ease-in-out_infinite_0.2s]" />
                <span className="w-1.5 h-5 bg-emerald-300 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_0.3s]" />
              </div>
            ) : orbState === 'processing' ? (
              <Sparkles className="w-9 h-9 text-teal-400 animate-pulse" />
            ) : orbState === 'speaking' ? (
              <Volume2 className="w-8 h-8 text-emerald-400 animate-pulse" />
            ) : isMuted ? (
              <MicOff className="w-8 h-8 text-slate-500 group-hover:text-slate-300 transition-colors" />
            ) : (
              <Mic className="w-8 h-8 text-teal-400 group-hover:text-emerald-300 transition-colors" />
            )}
          </div>

          <span
            className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: isMuted ? '#64748B' : colors.primary,
              boxShadow: `0 0 8px ${colors.primary}`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DesktopNeonOrb;
