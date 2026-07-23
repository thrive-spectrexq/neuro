export class AudioStreamingService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;

  private onStateChange: (state: 'idle' | 'listening' | 'speaking') => void;

  constructor(onStateChange: (state: 'idle' | 'listening' | 'speaking') => void) {
    this.onStateChange = onStateChange;
  }

  public async start() {
    this.onStateChange('listening');
    
    // Connect WebSocket
    const wsUrl = `ws://localhost:8000/api/v1/voice/stream`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = async () => {
      console.log('Connected to Neuro Voice.');
      await this.initMicrophone();
    };

    this.ws.onmessage = async (event) => {
      // Received audio from Neuro (TTS)
      if (event.data instanceof Blob) {
        this.onStateChange('speaking');
        const arrayBuffer = await event.data.arrayBuffer();
        this.playAudio(arrayBuffer);
      }
    };

    this.ws.onclose = () => {
      console.log('Disconnected from Neuro Voice.');
      this.stop();
    };
  }

  private async initMicrophone() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      // ScriptProcessor is deprecated but widely used for raw PCM extraction in browsers easily
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = this.floatTo16BitPCM(inputData);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(pcm16);
        }
      };

      this.microphone.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      this.stop();
    }
  }

  private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0, offset = 0; i < float32Array.length; i++, offset += 2) {
      const val = float32Array[i] ?? 0;
      const s = Math.max(-1, Math.min(1, val));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  }

  private playAudio(arrayBuffer: ArrayBuffer) {
    if (!this.audioContext) return;
    
    // Pipecat sends raw 24kHz PCM 16-bit audio. We need to decode or play it.
    // For a real implementation, we might send WAV headers or use an AudioWorklet.
    // Assuming simple conversion for MVP here.
    const view = new Int16Array(arrayBuffer);
    const floatArray = new Float32Array(view.length);
    for (let i = 0; i < view.length; i++) {
      floatArray[i] = (view[i] ?? 0) / 32768.0;
    }
    
    const audioBuffer = this.audioContext.createBuffer(1, floatArray.length, 24000);
    audioBuffer.getChannelData(0).set(floatArray);
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    source.start();
    
    source.onended = () => {
      this.onStateChange('listening');
    };
  }

  public stop() {
    this.onStateChange('idle');
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
