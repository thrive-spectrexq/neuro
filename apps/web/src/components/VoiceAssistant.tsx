import React, { useState, useEffect, useRef } from 'react';
import { AudioStreamingService } from '../services/audio';

export const VoiceAssistant: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [state, setState] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const audioServiceRef = useRef<AudioStreamingService | null>(null);

  useEffect(() => {
    return () => {
      if (audioServiceRef.current) {
        audioServiceRef.current.stop();
      }
    };
  }, []);

  const toggleAssistant = async () => {
    if (isActive) {
      audioServiceRef.current?.stop();
      setIsActive(false);
      setState('idle');
    } else {
      setIsActive(true);
      const service = new AudioStreamingService((newState) => {
        setState(newState);
      });
      audioServiceRef.current = service;
      await service.start();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4">
      {isActive && (
        <div className="bg-slate-800 text-slate-200 px-4 py-2 rounded-full shadow-lg border border-slate-700 animate-fade-in">
          {state === 'listening' ? 'Listening...' : 'Speaking...'}
        </div>
      )}
      <button 
        onClick={toggleAssistant}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl border-2 ${
          isActive 
            ? 'bg-blue-500 border-blue-400 shadow-blue-500/50' 
            : 'bg-slate-800 border-slate-600 hover:bg-slate-700'
        }`}
      >
        <div className={`w-6 h-6 rounded-full bg-white transition-transform ${
          isActive && state === 'speaking' ? 'animate-pulse scale-125' : ''
        } ${isActive && state === 'listening' ? 'scale-110' : ''}`} />
      </button>
    </div>
  );
};
