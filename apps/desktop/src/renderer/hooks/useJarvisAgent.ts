import { useState, useEffect, useRef, useCallback } from 'react';
import { soundEngine } from '../utils/soundEngine';

export interface AgentExecutionResponse {
  success: boolean;
  input_text: string;
  tool_name?: string;
  tool_args?: Record<string, any>;
  tool_result?: any;
  voice_response?: string;
  display_text?: string;
  error?: string;
  is_offline_native?: boolean;
  confidence?: number;
}

export function useJarvisAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastResult, setLastResult] = useState<AgentExecutionResponse | null>(null);
  const [history, setHistory] = useState<AgentExecutionResponse[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);

  // Live Sound Wave & Volume Level Meter
  const [audioVolume, setAudioVolume] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [voiceLevel, setVoiceLevel] = useState<'silent' | 'quiet' | 'optimal' | 'loud'>('silent');

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isListeningRef = useRef(false);
  const vadIntervalRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const silenceStartRef = useRef<number | null>(null);

  // Synthesize Speech
  const speakResponse = useCallback((text: string) => {
    if (isMuted || !text) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => 
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David') || v.name.includes('George')) && v.lang.startsWith('en')
        );
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }, [isMuted]);

  // Execute Agent Command
  const executeCommand = useCallback(async (command: string) => {
    if (!command.trim()) return null;

    setIsProcessing(true);
    soundEngine.playProcessingHum();

    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_text: command }),
      });

      if (res.ok) {
        const data: AgentExecutionResponse = await res.json();
        setLastResult(data);
        setHistory(prev => [data, ...prev.slice(0, 19)]);
        
        if (data.voice_response && !isMuted) {
          speakResponse(data.voice_response);
        }
        setIsProcessing(false);
        return data;
      }
    } catch (apiError) {
      // Offline fallback
    }

    // Client-Side Offline Deterministic Fallback
    let fallbackResult: AgentExecutionResponse = {
      success: true,
      input_text: command,
      voice_response: `Executing ${command}`,
      display_text: `Processed: ${command}`,
      is_offline_native: true,
      confidence: 0.9,
    };

    const lower = command.toLowerCase().trim();

    if (lower.includes('volume up') || lower.includes('increase volume') || lower.includes('louder')) {
      await window.electronAPI?.controlMedia('volumeup');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'volume_up',
        voice_response: 'Increasing volume.',
        display_text: '🔊 Volume Increased',
        is_offline_native: true,
        confidence: 0.98,
      };
    } else if (lower.includes('volume down') || lower.includes('decrease volume') || lower.includes('quieter')) {
      await window.electronAPI?.controlMedia('volumedown');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'volume_down',
        voice_response: 'Lowering volume.',
        display_text: '🔉 Volume Decreased',
        is_offline_native: true,
        confidence: 0.98,
      };
    } else if (lower === 'mute' || lower.includes('mute sound') || lower.includes('mute audio')) {
      await window.electronAPI?.controlMedia('mute');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'mute',
        voice_response: 'Toggled system mute.',
        display_text: '🔇 System Mute Toggled',
        is_offline_native: true,
        confidence: 0.98,
      };
    } else if (lower.includes('pause music') || lower.includes('pause') || lower.includes('resume music') || lower === 'play') {
      await window.electronAPI?.controlMedia('playpause');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'media_playpause',
        voice_response: 'Media playback toggled.',
        display_text: '⏯️ Media Play/Pause Toggled',
        is_offline_native: true,
        confidence: 0.98,
      };
    } else if (lower.includes('next song') || lower.includes('next track') || lower.includes('skip song')) {
      await window.electronAPI?.controlMedia('next');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'media_next',
        voice_response: 'Skipping to next track.',
        display_text: '⏭️ Skipped to Next Track',
        is_offline_native: true,
        confidence: 0.98,
      };
    } else if (lower.includes('system status') || lower.includes('memory') || lower.includes('telemetry') || lower.includes('specs')) {
      const stats = await window.electronAPI?.getSystemTelemetry();
      const info = stats
        ? `RAM: ${stats.freeMemoryGb}GB free / ${stats.totalMemoryGb}GB total (${stats.memoryUsagePercent}% used). Uptime: ${stats.uptimeHours}h.`
        : 'System is running smoothly.';
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'system_status',
        voice_response: info,
        display_text: `⚡ System Telemetry: ${info}`,
        is_offline_native: true,
        confidence: 0.98,
      };
    } else if (lower.includes('screenshot') || lower.includes('snip') || lower.includes('capture screen')) {
      await window.electronAPI?.launchApp('snippingtool');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'screenshot',
        voice_response: 'Launching screen snipping tool.',
        display_text: '📸 Snipping Tool Launched',
        is_offline_native: true,
        confidence: 0.98,
      };
    } else if (lower.includes('antigravity')) {
      await window.electronAPI?.launchApp('antigravity');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'launch_antigravity',
        voice_response: 'Launching Antigravity and resuming your pair programming session, sir.',
        display_text: '⚡ Launched Antigravity Coding Assistant',
        is_offline_native: true,
        confidence: 0.98,
      };
    } else if (lower.includes('claude') || lower.includes('claude code')) {
      await window.electronAPI?.launchApp('claude');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'launch_claude',
        voice_response: 'Starting Claude Code in your active project workspace.',
        display_text: '🤖 Launched Claude Code CLI',
        is_offline_native: true,
        confidence: 0.98,
      };
    } else if (lower.includes('codex')) {
      await window.electronAPI?.launchApp('codex');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'launch_codex',
        voice_response: 'Launching Codex CLI assistant.',
        display_text: '🧠 Launched Codex Agent',
        is_offline_native: true,
        confidence: 0.98,
      };
    } else if (lower.includes('aider')) {
      await window.electronAPI?.launchApp('aider');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'launch_aider',
        voice_response: 'Launching Aider AI coding assistant in terminal.',
        display_text: '⚡ Launched Aider AI',
        is_offline_native: true,
        confidence: 0.98,
      };
    } else if (lower.includes('coding') || lower.includes('coding session') || lower.includes('resume coding') || lower.includes('start coding')) {
      await window.electronAPI?.launchApp('antigravity');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'resume_coding',
        voice_response: 'Resuming your active coding session in the project workspace, sir.',
        display_text: '🚀 Resumed AI Coding Session',
        is_offline_native: true,
        confidence: 0.98,
      };
    } else if (lower.includes('cursor')) {
      await window.electronAPI?.launchApp('cursor');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'open_app',
        voice_response: 'Opening Cursor IDE in project workspace.',
        display_text: '💻 Launched Cursor IDE',
        is_offline_native: true,
        confidence: 0.95,
      };
    } else if (lower.includes('windsurf')) {
      await window.electronAPI?.launchApp('windsurf');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'open_app',
        voice_response: 'Opening Windsurf IDE.',
        display_text: '🌊 Launched Windsurf IDE',
        is_offline_native: true,
        confidence: 0.95,
      };
    } else if (lower.includes('zed')) {
      await window.electronAPI?.launchApp('zed');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'open_app',
        voice_response: 'Opening Zed Editor.',
        display_text: '⚡ Launched Zed Editor',
        is_offline_native: true,
        confidence: 0.95,
      };
    } else if (lower.includes('code') || lower.includes('vscode') || lower.includes('vs code')) {
      await window.electronAPI?.launchApp('vscode');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'open_app',
        voice_response: 'Opening Visual Studio Code.',
        display_text: '💻 Launched Visual Studio Code',
        is_offline_native: true,
        confidence: 0.95,
      };
    } else if (lower.includes('docker')) {
      await window.electronAPI?.launchApp('docker');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'open_app',
        voice_response: 'Launching Docker Desktop.',
        display_text: '🐳 Launched Docker Desktop',
        is_offline_native: true,
        confidence: 0.95,
      };
    } else if (lower.includes('github')) {
      await window.electronAPI?.launchApp('github');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'open_app',
        voice_response: 'Opening GitHub.',
        display_text: '🐙 Opened GitHub',
        is_offline_native: true,
        confidence: 0.95,
      };
    } else if (lower.includes('postman')) {
      await window.electronAPI?.launchApp('postman');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'open_app',
        voice_response: 'Opening Postman API client.',
        display_text: '🚀 Opened Postman',
        is_offline_native: true,
        confidence: 0.95,
      };
    } else if (lower.includes('obsidian')) {
      await window.electronAPI?.launchApp('obsidian');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'open_app',
        voice_response: 'Opening Obsidian Vault.',
        display_text: '💎 Opened Obsidian',
        is_offline_native: true,
        confidence: 0.95,
      };
    } else if (lower.includes('notion')) {
      await window.electronAPI?.launchApp('notion');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'open_app',
        voice_response: 'Opening Notion.',
        display_text: '📝 Opened Notion',
        is_offline_native: true,
        confidence: 0.95,
      };
    } else if (lower.includes('figma')) {
      await window.electronAPI?.launchApp('figma');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'open_app',
        voice_response: 'Opening Figma Design.',
        display_text: '🎨 Opened Figma',
        is_offline_native: true,
        confidence: 0.95,
      };
    } else if (lower.includes('brave')) {
      await window.electronAPI?.launchApp('brave');
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'open_app',
        voice_response: 'Opening Brave Browser, sir.',
        display_text: '🚀 Opened Brave Browser',
        is_offline_native: true,
        confidence: 0.95,
      };
    } else if (lower.includes('spotify')) {
      const query = lower.replace(/play|on|spotify|in|song/g, '').trim();
      await window.electronAPI?.launchApp('spotify', query);
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'play_spotify',
        voice_response: query ? `Playing ${query} on Spotify.` : 'Opening Spotify.',
        display_text: query ? `🎵 Playing on Spotify: ${query}` : '🎵 Opened Spotify',
        is_offline_native: true,
        confidence: 0.95,
      };
    } else if (lower.includes('google') || lower.includes('search')) {
      const query = lower.replace(/search|on|google|for/g, '').trim();
      const url = `https://www.google.com/search?q=${encodeURIComponent(query || command)}`;
      await window.electronAPI?.openExternal(url);
      fallbackResult = {
        success: true,
        input_text: command,
        tool_name: 'web_search',
        voice_response: `Searching Google for ${query || command}.`,
        display_text: `🔍 Searched Google: ${query || command}`,
        is_offline_native: true,
        confidence: 0.95,
      };
    } else {
      fallbackResult = {
        success: true,
        input_text: command,
        voice_response: `I heard: ${command}. You can say "Open Antigravity", "Open Claude Code", "Continue coding session", or control your system apps.`,
        display_text: `Recognized: "${command}"`,
        is_offline_native: true,
        confidence: 0.7,
      };
    }

    setLastResult(fallbackResult);
    setHistory(prev => [fallbackResult, ...prev.slice(0, 19)]);
    if (fallbackResult.voice_response) {
      speakResponse(fallbackResult.voice_response);
    }
    setIsProcessing(false);
    return fallbackResult;
  }, [speakResponse, isMuted]);

  // Transcribe recorded audio buffer via local FastAPI endpoint
  const sendAudioForTranscription = async (blob: Blob) => {
    if (blob.size < 500) return;
    try {
      const fd = new FormData();
      fd.append('file', blob, 'speech.webm');
      const res = await fetch('http://127.0.0.1:8000/api/v1/voice/transcribe', {
        method: 'POST',
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text && data.text.trim()) {
          const spoken = data.text.trim();
          setTranscript(spoken);
          executeCommand(spoken);
        }
      }
    } catch (err) {
      console.warn('Voice transcribe error:', err);
    }
  };

  // Start continuous microphone stream with Voice Activity Detection (VAD)
  const startListening = useCallback(async () => {
    try {
      isListeningRef.current = true;
      setIsListening(true);
      soundEngine.playWakeChime();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = ctx;

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let mediaRecorder: MediaRecorder | null = null;

      try {
        mediaRecorder = new MediaRecorder(stream);
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      }
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];
          sendAudioForTranscription(audioBlob);
        }
      };

      // VAD Monitoring Loop (checks volume level every 70ms)
      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = setInterval(() => {
        if (!isListeningRef.current) {
          setAudioVolume(0);
          setIsSpeaking(false);
          setVoiceLevel('silent');
          return;
        }
        analyser.getByteFrequencyData(buffer);

        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i] ?? 0;
        }
        const avgVolume = sum / buffer.length;
        const normalized = Math.min(100, Math.round((avgVolume / 110) * 100));
        setAudioVolume(normalized);

        let level: 'silent' | 'quiet' | 'optimal' | 'loud' = 'silent';
        if (normalized < 6) level = 'silent';
        else if (normalized < 18) level = 'quiet';
        else if (normalized < 75) level = 'optimal';
        else level = 'loud';
        setVoiceLevel(level);

        // Speech threshold (18% amplitude)
        if (normalized >= 18) {
          setIsSpeaking(true);
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            silenceStartRef.current = null;
            if (mediaRecorder && mediaRecorder.state === 'inactive') {
              audioChunksRef.current = [];
              try { mediaRecorder.start(); } catch {}
            }
          }
        } else if (isSpeakingRef.current) {
          // User paused speaking
          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > 850) {
            // >850ms silence detected after speech -> finish recording and transcribe
            isSpeakingRef.current = false;
            setIsSpeaking(false);
            silenceStartRef.current = null;
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              try { mediaRecorder.stop(); } catch {}
            }
          }
        } else {
          setIsSpeaking(false);
        }
      }, 70);

    } catch (err) {
      console.error('Error starting microphone stream:', err);
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [executeCommand]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    isSpeakingRef.current = false;
    silenceStartRef.current = null;
    setIsListening(false);
    setAudioVolume(0);
    setIsSpeaking(false);
    setVoiceLevel('silent');

    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
      mediaRecorderRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening || isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Global hotkey listener
  useEffect(() => {
    if (window.electronAPI?.onToggleJarvisHUD) {
      const cleanup = window.electronAPI.onToggleJarvisHUD(() => {
        setIsOpen(prev => {
          const nextState = !prev;
          if (nextState) {
            startListening();
          } else {
            stopListening();
          }
          return nextState;
        });
      });
      return cleanup;
    }
  }, [startListening, stopListening]);

  return {
    isOpen,
    setIsOpen,
    isListening,
    isProcessing,
    transcript,
    lastResult,
    history,
    isMuted,
    setIsMuted,
    wakeWordEnabled,
    setWakeWordEnabled,
    audioVolume,
    isSpeaking,
    voiceLevel,
    activationThreshold: 18,
    startListening,
    stopListening,
    toggleListening,
    executeCommand,
    isSpeechSupported: true,
  };
}
