import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Trash2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { audioService } from '../../services/audioService';

export interface VoiceControlProps {
  onAudioReady?: (blob: Blob) => void;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({ onAudioReady }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasConsent, setHasConsent] = useState(audioService.getConsent());
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    const unsubscribe = audioService.subscribeLevels((event) => {
      setAudioLevel(event.volume);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleRecord = async () => {
    if (isRecording) {
      const blob = await audioService.stopRecording();
      setIsRecording(false);
      if (blob && onAudioReady) {
        onAudioReady(blob);
      }
    } else {
      const permitted = await audioService.requestPermission();
      if (!permitted) {
        setHasConsent(false);
        return;
      }
      setHasConsent(true);
      const started = await audioService.startRecording();
      if (started) {
        setIsRecording(true);
      }
    }
  };

  const handleDiscard = () => {
    audioService.discardCurrentRecording();
    setIsRecording(false);
    setAudioLevel(0);
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-[#12151E] border border-[#202636] rounded-lg">
      {/* Mic Record Button */}
      <button
        onClick={handleToggleRecord}
        className={`h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150 ${
          isRecording
            ? 'bg-rose-600 text-white animate-pulse'
            : 'bg-[#181C28] hover:bg-[#202638] text-[#CBD5E1] border border-[#2C3347]'
        }`}
        title={isRecording ? 'Stop Recording' : 'Start Voice Note (Whisper)'}
      >
        {isRecording ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
        <span>{isRecording ? 'Recording...' : 'Voice'}</span>
      </button>

      {/* Real-time Level Meter Bar */}
      {isRecording && (
        <div className="flex-1 flex items-center gap-1">
          <div className="flex-1 h-2 bg-[#181C26] rounded-full overflow-hidden border border-[#242938]">
            <div
              className="h-full bg-teal-500 transition-all duration-75"
              style={{ width: `${Math.round(audioLevel * 100)}%` }}
            />
          </div>
          <button
            onClick={handleDiscard}
            className="p-1 text-[#64748B] hover:text-rose-400 rounded hover:bg-[#2D141A] transition-colors"
            title="Discard audio without saving"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Privacy Consent Pill */}
      {!isRecording && (
        <div className="flex items-center gap-1 text-[11px] font-mono text-[#64748B]">
          {hasConsent ? (
            <span className="flex items-center gap-1 text-emerald-500">
              <CheckCircle2 className="w-3 h-3" />
              <span>Mic Ready</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-500">
              <ShieldAlert className="w-3 h-3" />
              <span>Consent Needed</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
