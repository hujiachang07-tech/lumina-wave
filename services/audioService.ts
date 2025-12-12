class AudioService {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;

  initialize() {
    if (this.context) return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.4;
    
    // Create a simple impulse response for reverb
    this.reverbNode = this.context.createConvolver();
    this.reverbNode.buffer = this.createImpulseResponse(2.5, 2.0);
    
    this.masterGain.connect(this.reverbNode);
    this.reverbNode.connect(this.context.destination);
    // Also connect dry signal
    this.masterGain.connect(this.context.destination);
  }

  private createImpulseResponse(duration: number, decay: number): AudioBuffer {
    const rate = this.context!.sampleRate;
    const length = rate * duration;
    const impulse = this.context!.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      // Exponential decay
      const amp = Math.pow(1 - n, decay); 
      // Noise
      left[i] = (Math.random() * 2 - 1) * amp;
      right[i] = (Math.random() * 2 - 1) * amp;
    }
    return impulse;
  }

  playString(frequency: number, velocity: number = 1.0) {
    if (!this.context || !this.masterGain) this.initialize();
    if (this.context?.state === 'suspended') {
      this.context.resume();
    }

    const osc = this.context!.createOscillator();
    const gain = this.context!.createGain();

    // Use triangle for a clearer, bell-like tone, or sine for pure ethereal
    osc.type = 'triangle'; 
    osc.frequency.setValueAtTime(frequency, this.context!.currentTime);

    // Envelope
    const now = this.context!.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(velocity * 0.5, now + 0.02); // Attack
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0); // Long decay

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 3.5);
  }
}

export const audioService = new AudioService();