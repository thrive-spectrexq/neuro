import { useState, useEffect, useRef, useCallback } from 'react';

export interface AgentExecutionResponse {
  success: boolean;
  input_text: string;
  tool_name?: string;
  parameters?: Record<string, any>;
  tool_result?: {
    success: boolean;
    tool_name: string;
    message: string;
    data?: any;
    voice_feedback?: string;
  };
  voice_response: string;
  display_text: string;
  is_offline_native: boolean;
  confidence: number;
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

  const recognitionRef = useRef<any>(null);
  const isSpeechSupported = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  // Speech synthesis speaker
  const speakResponse = useCallback((text: string) => {
    if (isMuted || !text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('David') || v.name.includes('Daniel') || v.lang.startsWith('en'))
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }, [isMuted]);

  // Execute command via API or fallback
  const executeCommand = useCallback(async (command: string): Promise<AgentExecutionResponse> => {
    if (!command.trim()) {
      return {
        success: false,
        input_text: command,
        voice_response: "I'm listening, sir.",
        display_text: "I'm listening. How can I assist you?",
        is_offline_native: true,
        confidence: 1.0,
      };
    }

    setIsProcessing(true);

    try {
      // Call backend FastAPI Agent API
      const res = await fetch('http://127.0.0.1:8000/api/v1/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, include_voice: true }),
      });

      if (res.ok) {
        const data: AgentExecutionResponse = await res.json();
        setLastResult(data);
        setHistory(prev => [data, ...prev.slice(0, 19)]);
        
        // Speak voice feedback
        if (data.voice_response) {
          speakResponse(data.voice_response);
        }

        // Show native notification if electron is active
        if (window.electronAPI?.showNotification && data.display_text) {
          window.electronAPI.showNotification('Neuro JARVIS', data.display_text);
        }

        setIsProcessing(false);
        return data;
      }
    } catch (apiError) {
      console.warn('FastAPI backend not reachable, performing client-side OS execution:', apiError);
    }

    // Client-Side Offline Deterministic Fallback if backend is booting or offline
    let fallbackResult: AgentExecutionResponse = {
      success: true,
      input_text: command,
      voice_response: `Executing ${command}`,
      display_text: `Processed: ${command}`,
      is_offline_native: true,
      confidence: 0.9,
    };

    const lower = command.toLowerCase().trim();

    if (lower.includes('brave')) {
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
    } else if (lower.includes('code') || lower.includes('vscode')) {
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
        voice_response: `I heard: ${command}. You can ask to open Brave, play Spotify, or launch VS Code.`,
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

  // Setup Web Speech Recognition
  const startListening = useCallback(() => {
    if (!isSpeechSupported) {
      console.warn('Speech recognition is not supported in this environment');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }

        const currentText = (finalTranscript || interimTranscript).trim();
        setTranscript(currentText);

        // Check for wake phrases or completed commands
        if (finalTranscript.trim()) {
          const cleaned = finalTranscript.trim();
          executeCommand(cleaned);
          setTranscript('');
        }
      };

      recognition.onerror = (err: any) => {
        if (err.error !== 'no-speech') {
          console.warn('Speech recognition event:', err.error);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error('Error starting speech recognition:', e);
      setIsListening(false);
    }
  }, [isSpeechSupported, executeCommand]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Listen for global hotkey from Electron main process
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
    startListening,
    stopListening,
    toggleListening,
    executeCommand,
    isSpeechSupported,
  };
}
