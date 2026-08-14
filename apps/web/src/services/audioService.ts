export interface AudioLevelEvent {
  volume: number; // 0.0 to 1.0
  isSpeaking: boolean;
}

export type AudioLevelListener = (event: AudioLevelEvent) => void;

class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private audioChunks: Blob[] = [];
  private listeners: Set<AudioLevelListener> = new Set();
  private hasConsent: boolean = false;

  setConsent(consent: boolean): void {
    this.hasConsent = consent;
    localStorage.setItem('neuro_audio_consent', consent ? 'granted' : 'denied');
  }

  getConsent(): boolean {
    if (!this.hasConsent) {
      this.hasConsent = localStorage.getItem('neuro_audio_consent') === 'granted';
    }
    return this.hasConsent;
  }

  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop initial stream immediately after permission granted
      stream.getTracks().forEach((t) => t.stop());
      this.setConsent(true);
      return true;
    } catch (err) {
      console.warn('Audio permission not granted:', err);
      this.setConsent(false);
      return false;
    }
  }

  async startRecording(onChunkReceived?: (blob: Blob) => void): Promise<boolean> {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      return true;
    }

    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];

      // Audio Context for level analysis
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      this.startLevelMonitoring();

      this.mediaRecorder = new MediaRecorder(this.audioStream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
          onChunkReceived?.(e.data);
        }
      };

      this.mediaRecorder.start(250); // Emit chunk every 250ms
      return true;
    } catch (err) {
      console.error('Failed to start audio recording:', err);
      return false;
    }
  }

  private startLevelMonitoring() {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const checkLevel = () => {
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const val = dataArray[i];
        if (val !== undefined) {
          sum += val;
        }
      }
      const avg = sum / dataArray.length;
      const normalized = Math.min(1, avg / 128); // 0 to 1

      this.listeners.forEach((cb) =>
        cb({
          volume: normalized,
          isSpeaking: normalized > 0.15,
        })
      );

      this.animationFrameId = requestAnimationFrame(checkLevel);
    };

    checkLevel();
  }

  async stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanup();
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  discardCurrentRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    this.audioChunks = [];
    this.cleanup();
  }

  subscribeLevels(listener: AudioLevelListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private cleanup() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.mediaRecorder = null;
  }
}

export const audioService = new AudioService();
