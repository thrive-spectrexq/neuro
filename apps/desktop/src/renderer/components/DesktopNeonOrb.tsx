import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Sparkles, 
  X, 
  Maximize2, 
  Zap, 
  Radio
} from 'lucide-react';
import { useJarvisAgent } from '../hooks/useJarvisAgent';
import { soundEngine } from '../utils/soundEngine';

interface DesktopNeonOrbProps {
  onOpenJarvis?: () => void;
  standaloneMode?: boolean;
}

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
    toggleListening,
    startListening,
    stopListening,
    executeCommand,
    isSpeechSupported,
  } = useJarvisAgent();

  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Dynamic window resizing when in standalone desktop mode
  useEffect(() => {
    if (!standaloneMode || !window.electronAPI?.resizeOrbWindow) return;

    if (isHovered || transcript || lastResult) {
      window.electronAPI.resizeOrbWindow(300, 230);
    } else {
      window.electronAPI.resizeOrbWindow(150, 150);
    }
  }, [standaloneMode, isHovered, transcript, lastResult]);

  // Position state (for in-browser simulation if not standalone)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      return { x: window.innerWidth - 105, y: window.innerHeight - 105 };
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

  // Setup Audio Visualizer
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
      // Audio level fallback
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

  // Window resize bounds keeper
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.min(prev.x, window.innerWidth - 90),
        y: Math.min(prev.y, window.innerHeight - 90),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dragging event handlers
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

  if (!isVisible) return null;

  // Colors based on state
  const getNeonColors = () => {
    switch (orbState) {
      case 'listening':
        return {
          glow: 'rgba(0, 245, 255, 0.5)',
          glowWide: 'rgba(0, 245, 255, 0.2)',
          primary: '#00F5FF',
          border: '#00F5FF',
          status: 'Listening',
        };
      case 'processing':
        return {
          glow: 'rgba(168, 85, 247, 0.6)',
          glowWide: 'rgba(168, 85, 247, 0.25)',
          primary: '#C084FC',
          border: '#A855F7',
          status: 'Processing',
        };
      case 'speaking':
        return {
          glow: 'rgba(16, 185, 129, 0.6)',
          glowWide: 'rgba(16, 185, 129, 0.25)',
          primary: '#34D399',
          border: '#10B981',
          status: 'Responding',
        };
      case 'idle':
      default:
        return {
          glow: 'rgba(99, 102, 241, 0.35)',
          glowWide: 'rgba(99, 102, 241, 0.12)',
          primary: '#818CF8',
          border: '#4F46E5',
          status: isMuted ? 'Muted' : 'Standby',
        };
    }
  };

  const colors = getNeonColors();
  const scaleMultiplier = 1 + (orbState === 'listening' ? audioLevel * 0.25 : 0);

  const handleOrbClick = () => {
    soundEngine.playBeep(isListening ? 400 : 800, 'sine', 0.1);
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
    } else {
      setIsVisible(false);
    }
  };

  const handleSummon = () => {
    if (window.electronAPI?.focusMainWindow) {
      window.electronAPI.focusMainWindow();
    } else if (onOpenJarvis) {
      onOpenJarvis();
    }
  };

  // If standalone, we fill the transparent Electron window with native OS drag
  if (standaloneMode) {
    return (
      <div
        className="w-full h-full relative flex flex-col items-center justify-center titlebar-drag select-none p-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={handleOrbDoubleClick}
      >
        {/* Holographic Concentric Rings */}
        <div className="relative w-24 h-24 flex items-center justify-center cursor-move">
          {/* Ambient Neon Atmosphere */}
          <div
            className="absolute inset-0 rounded-full blur-xl transition-all duration-500 pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${colors.glow} 0%, ${colors.glowWide} 60%, transparent 80%)`,
              transform: `scale(${scaleMultiplier * 1.6})`,
            }}
          />

          {/* Outer Orbit Ring */}
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
              boxShadow: `0 0 20px ${colors.glow}, inset 0 0 14px ${colors.glow}`,
            }}
          />

          {/* Rotating SVG Arc */}
          <svg
            className={`absolute inset-1 w-[80px] h-[80px] pointer-events-none ${
              orbState === 'listening' ? 'animate-[spin_3s_linear_infinite]' : 'animate-[spin_12s_linear_infinite]'
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
              strokeDasharray="36 20 10 20"
              strokeLinecap="round"
              style={{
                filter: `drop-shadow(0 0 8px ${colors.primary})`,
              }}
            />
          </svg>

          {/* Central Core Ball */}
          <div
            onClick={handleOrbClick}
            className="no-drag relative w-14 h-14 rounded-full flex items-center justify-center bg-[#07090E] border-2 cursor-pointer group shadow-2xl transition-all duration-300 active:scale-95 z-20"
            style={{
              borderColor: colors.primary,
              boxShadow: `0 0 26px ${colors.glow}, inset 0 0 16px ${colors.glowWide}`,
            }}
            title={isListening ? 'Click: Pause Voice | Double Click: Open Neuro' : 'Click: Activate Voice | Double Click: Open Neuro'}
          >
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

            {/* Micro Status Light */}
            <span
              className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: isMuted ? '#64748B' : colors.primary,
                boxShadow: `0 0 6px ${colors.primary}`,
              }}
            />
          </div>
        </div>

        {/* Live HUD Floating Bubble */}
        {(isHovered || transcript || lastResult) && (
          <div
            className="no-drag absolute top-2 left-2 right-2 bg-[#090A0F]/95 backdrop-blur-md border rounded-lg p-2 shadow-2xl transition-all font-mono z-30 pointer-events-auto"
            style={{
              borderColor: colors.border,
              boxShadow: `0 8px 24px rgba(0,0,0,0.7), 0 0 14px ${colors.glowWide}`,
            }}
          >
            <div className="flex items-center justify-between border-b border-[#1F2433] pb-1 mb-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full animate-ping"
                  style={{ backgroundColor: colors.primary }}
                />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  Neuro · {colors.status}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleSummon}
                  className="p-1 hover:bg-[#181C28] rounded text-[#94A3B8] hover:text-white transition-colors"
                  title="Open Neuro Workstation"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
                <button
                  onClick={handleClose}
                  className="p-1 hover:bg-[#181C28] rounded text-[#94A3B8] hover:text-rose-400 transition-colors"
                  title="Close Desktop Orb"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {transcript ? (
              <div className="space-y-0.5">
                <div className="text-[9px] text-[#64748B] uppercase">Heard:</div>
                <p className="text-[11px] text-cyan-300 font-sans italic leading-tight">
                  "{transcript}"
                </p>
              </div>
            ) : lastResult ? (
              <div className="space-y-0.5">
                <div className="text-[9px] text-emerald-400 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> Result:
                </div>
                <p className="text-[11px] text-slate-200 font-sans leading-tight">
                  {lastResult.display_text || lastResult.voice_response}
                </p>
              </div>
            ) : (
              <div className="text-[9px] text-[#94A3B8] space-y-0.5">
                <div>• "Open Brave / VS Code"</div>
                <div>• "Take a note about ideas"</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // In-browser / In-page Fallback
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
      {/* Neon Orb Element */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full blur-xl transition-all duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${colors.glow} 0%, ${colors.glowWide} 60%, transparent 80%)`,
            transform: `scale(${scaleMultiplier * 1.5})`,
          }}
        />

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

        <svg
          className={`absolute inset-1.5 w-[68px] h-[68px] pointer-events-none ${
            orbState === 'listening' ? 'animate-[spin_3s_linear_infinite]' : 'animate-[spin_10s_linear_infinite]'
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
            strokeDasharray="36 20 10 20"
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 6px ${colors.primary})`,
            }}
          />
        </svg>

        <div
          onClick={handleOrbClick}
          className="relative w-12 h-12 rounded-full flex items-center justify-center bg-[#07090E] border-2 cursor-pointer group shadow-2xl transition-all duration-300 active:scale-95"
          style={{
            borderColor: colors.primary,
            boxShadow: `0 0 22px ${colors.glow}, inset 0 0 14px ${colors.glowWide}`,
          }}
          title={isListening ? 'Click to pause voice listening' : 'Click to activate voice listening'}
        >
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

          <span
            className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: isMuted ? '#64748B' : colors.primary,
              boxShadow: `0 0 6px ${colors.primary}`,
            }}
          />
        </div>
      </div>

      {/* Interactive Tooltip & Command HUD Box */}
      {(isHovered || transcript || lastResult) && (
        <div
          className="absolute bottom-full right-0 mb-2 w-64 bg-[#090A0F]/95 backdrop-blur-md border rounded-lg p-2.5 shadow-2xl transition-all font-mono pointer-events-auto"
          style={{
            borderColor: colors.border,
            boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 12px ${colors.glowWide}`,
          }}
        >
          <div className="flex items-center justify-between border-b border-[#1F2433] pb-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full animate-ping"
                style={{ backgroundColor: colors.primary }}
              />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                Neuro Voice · {colors.status}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {onOpenJarvis && (
                <button
                  onClick={onOpenJarvis}
                  className="p-1 hover:bg-[#181C28] rounded text-[#94A3B8] hover:text-white transition-colors"
                  title="Summon Full HUD (Ctrl+Space)"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-1 hover:bg-[#181C28] rounded text-[#94A3B8] hover:text-rose-400 transition-colors"
                title="Dismiss Orb"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {transcript ? (
            <div className="space-y-1">
              <div className="text-[9px] text-[#64748B] uppercase">Heard:</div>
              <p className="text-[11px] text-cyan-300 font-sans italic leading-tight">
                "{transcript}"
              </p>
            </div>
          ) : lastResult ? (
            <div className="space-y-1">
              <div className="text-[9px] text-emerald-400 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> Result:
              </div>
              <p className="text-[11px] text-slate-200 font-sans leading-tight">
                {lastResult.display_text || lastResult.voice_response}
              </p>
            </div>
          ) : (
            <div className="space-y-1 text-[#94A3B8]">
              <div className="text-[10px] text-slate-300">
                Voice Commands Active:
              </div>
              <div className="text-[9px] text-[#64748B] space-y-0.5">
                <div>• "Open Brave / Spotify"</div>
                <div>• "Search quantum computing"</div>
                <div>• "Take a note about ideas"</div>
              </div>
            </div>
          )}

          <div className="mt-2 pt-1 border-t border-[#1F2433] flex items-center justify-between text-[9px] text-[#64748B]">
            <span>Drag to place anywhere</span>
            <kbd className="px-1 py-0.2 bg-[#161A26] border border-[#262E44] rounded text-slate-300 text-[8px]">
              Ctrl+Space
            </kbd>
          </div>
        </div>
      )}
    </div>
  );
};
export default DesktopNeonOrb;
