// Web Audio API acoustic generator, audio loop engine & device vibration for emergency siren & fake call ringtone

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

// Generate continuous 2-second looping emergency siren PCM WAV in memory
function generateSirenWavUri() {
  try {
    const sampleRate = 22050;
    const duration = 2.0; // 2 seconds per cycle
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    function writeString(v, offset, str) {
      for (let i = 0; i < str.length; i++) {
        v.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(view, 8, 'WAVE');

    // fmt chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono channel
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample

    // data chunk
    writeString(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Continuous siren frequency sweep: 700 Hz -> 1350 Hz -> 700 Hz
    let phase = 0;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Frequency smoothly sweeps with sine modulation
      const freq = 1025 + 325 * Math.sin((2 * Math.PI * t) / duration);
      phase += (2 * Math.PI * freq) / sampleRate;
      // Blend fundamental and harmonic for classic loud emergency siren texture
      const sample = 0.65 * Math.sin(phase) + 0.35 * Math.sin(2 * phase);
      const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 18000)));
      view.setInt16(44 + i * 2, intSample, true);
    }

    return 'data:audio/wav;base64,' + arrayBufferToBase64(buffer);
  } catch (err) {
    console.warn('[AudioService] Could not generate emergency siren WAV data URI:', err);
    return null;
  }
}

class AudioService {
  constructor() {
    this.audioCtx = null;
    this.sirenOsc1 = null;
    this.sirenOsc2 = null;
    this.lfo = null;
    this.lfoGain1 = null;
    this.lfoGain2 = null;
    this.sirenGain = null;
    this.isSirenPlaying = false;

    // Dual-layer audio loop element
    this.sirenAudio = null;
    this.sirenWavUri = null;

    // Keep-alive watchdog & vibration intervals
    this.keepAliveInterval = null;
    this.vibrateInterval = null;

    // Ringtone variables
    this.ringInterval = null;
    this.isRinging = false;

    // Auto-unlock on initial user gesture anywhere in page
    this.setupGestureUnlock();
  }

  getAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();

        // Listen for browser auto-suspension while siren should be active
        this.audioCtx.onstatechange = () => {
          if (this.isSirenPlaying && this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
          }
        };
      }
    }
    return this.audioCtx;
  }

  getSirenAudioElement() {
    if (typeof window === 'undefined') return null;
    if (!this.sirenAudio) {
      if (!this.sirenWavUri) {
        this.sirenWavUri = generateSirenWavUri();
      }
      if (this.sirenWavUri) {
        try {
          const audio = new Audio(this.sirenWavUri);
          audio.loop = true;
          audio.volume = 0.95;
          audio.preload = 'auto';
          this.sirenAudio = audio;
        } catch (err) {
          console.warn('[AudioService] Could not initialize siren Audio element:', err);
        }
      }
    }
    return this.sirenAudio;
  }

  /**
   * Unlock Web Audio API & HTML5 Audio synchronously inside user interactions
   * (e.g., touchstart, mousedown, press-and-hold SOS button).
   */
  unlockAudio() {
    try {
      const ctx = this.getAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().catch((err) => {
            console.warn('[AudioService] AudioContext resume warning:', err);
          });
        }

        // Warm up Web Audio engine
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      }

      // Pre-warm HTML5 Audio element
      const audio = this.getSirenAudioElement();
      if (audio) {
        audio.load();
      }
    } catch (e) {
      console.warn('[AudioService] Could not pre-unlock audio:', e);
    }
  }

  setupGestureUnlock() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      this.unlockAudio();
      ['pointerdown', 'touchstart', 'mousedown', 'keydown', 'click'].forEach((ev) => {
        window.removeEventListener(ev, unlock, true);
      });
    };

    ['pointerdown', 'touchstart', 'mousedown', 'keydown', 'click'].forEach((ev) => {
      window.addEventListener(ev, unlock, { once: true, capture: true, passive: true });
    });
  }

  vibrate(pattern = [500, 250, 500, 250]) {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Ignored
      }
    }
  }

  stopVibrate() {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch (e) {
        // Ignored
      }
    }
  }

  /**
   * Start Acoustic Emergency Siren.
   * Plays continuously in loop until explicitly stopped.
   * Guards against multiple overlapping instances and duplicate loops.
   */
  async startSiren() {
    if (this.isSirenPlaying) {
      // Already running cleanly; ensure it is not paused
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      if (this.sirenAudio && this.sirenAudio.paused) {
        this.sirenAudio.play().catch(() => {});
      }
      return;
    }

    this.isSirenPlaying = true;

    // 1. Start continuous device vibration pulse
    this.vibrate([1000, 250, 1000, 250]);
    if (this.vibrateInterval) clearInterval(this.vibrateInterval);
    this.vibrateInterval = setInterval(() => {
      if (!this.isSirenPlaying) {
        if (this.vibrateInterval) clearInterval(this.vibrateInterval);
        return;
      }
      this.vibrate([1000, 250, 1000, 250]);
    }, 2500);

    // 2. Start HTML5 Looping Audio Element (Native Browser Media Engine Loop)
    const audio = this.getSirenAudioElement();
    if (audio) {
      try {
        audio.currentTime = 0;
        audio.loop = true;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('[AudioService] Audio element autoplay caught:', err);
          });
        }
      } catch (e) {
        console.warn('[AudioService] HTML5 Audio start error:', e);
      }
    }

    // 3. Start Web Audio API Continuous LFO-driven Synthesizer
    const ctx = this.getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch (err) {
          console.warn('[AudioService] AudioContext resume failed:', err);
        }
      }

      try {
        // Clean up any stale nodes
        this.cleanUpWebAudioNodes();

        const now = ctx.currentTime;

        // Master Gain
        this.sirenGain = ctx.createGain();
        this.sirenGain.gain.setValueAtTime(0.4, now);
        this.sirenGain.connect(ctx.destination);

        // Hardware LFO (Continuous smooth pitch cycling: 1.25 Hz = 0.8s cycle)
        this.lfo = ctx.createOscillator();
        this.lfo.type = 'triangle';
        this.lfo.frequency.setValueAtTime(1.25, now);

        // LFO Gain Node 1 (Modulation depth: +/- 320 Hz around base 950 Hz)
        this.lfoGain1 = ctx.createGain();
        this.lfoGain1.gain.setValueAtTime(320, now);
        this.lfo.connect(this.lfoGain1);

        // Primary Siren Oscillator (Piercing Sawtooth)
        this.sirenOsc1 = ctx.createOscillator();
        this.sirenOsc1.type = 'sawtooth';
        this.sirenOsc1.frequency.setValueAtTime(950, now);
        this.lfoGain1.connect(this.sirenOsc1.frequency);
        this.sirenOsc1.connect(this.sirenGain);

        // LFO Gain Node 2 (Modulation depth: +/- 400 Hz around base 1300 Hz)
        this.lfoGain2 = ctx.createGain();
        this.lfoGain2.gain.setValueAtTime(400, now);
        this.lfo.connect(this.lfoGain2);

        // Secondary Harmonic Oscillator (Piercing Sine)
        this.sirenOsc2 = ctx.createOscillator();
        this.sirenOsc2.type = 'sine';
        this.sirenOsc2.frequency.setValueAtTime(1300, now);
        this.lfoGain2.connect(this.sirenOsc2.frequency);
        this.sirenOsc2.connect(this.sirenGain);

        // Start all oscillators; they modulate in hardware DSP indefinitely
        this.sirenOsc1.start(now);
        this.sirenOsc2.start(now);
        this.lfo.start(now);
      } catch (err) {
        console.error('[AudioService] Failed to start Web Audio siren nodes:', err);
      }
    }

    // 4. Keep-alive Watchdog: Prevents browser from suspending during active emergency
    if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
    this.keepAliveInterval = setInterval(() => {
      if (!this.isSirenPlaying) {
        if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
        return;
      }

      // Resume context if suspended
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      // Resume audio element if paused while siren is active
      if (this.sirenAudio && this.sirenAudio.paused) {
        this.sirenAudio.play().catch(() => {});
      }
    }, 1000);
  }

  cleanUpWebAudioNodes() {
    if (this.lfo) {
      try {
        this.lfo.stop();
        this.lfo.disconnect();
      } catch (e) {
        // Ignored
      }
      this.lfo = null;
    }

    if (this.lfoGain1) {
      try {
        this.lfoGain1.disconnect();
      } catch (e) {
        // Ignored
      }
      this.lfoGain1 = null;
    }

    if (this.lfoGain2) {
      try {
        this.lfoGain2.disconnect();
      } catch (e) {
        // Ignored
      }
      this.lfoGain2 = null;
    }

    if (this.sirenOsc1) {
      try {
        this.sirenOsc1.stop();
        this.sirenOsc1.disconnect();
      } catch (e) {
        // Ignored
      }
      this.sirenOsc1 = null;
    }

    if (this.sirenOsc2) {
      try {
        this.sirenOsc2.stop();
        this.sirenOsc2.disconnect();
      } catch (e) {
        // Ignored
      }
      this.sirenOsc2 = null;
    }

    if (this.sirenGain) {
      try {
        this.sirenGain.disconnect();
      } catch (e) {
        // Ignored
      }
      this.sirenGain = null;
    }
  }

  /**
   * Stop Acoustic Emergency Siren immediately.
   * Completely cancels playback and cleans up all audio loops.
   */
  stopSiren() {
    this.isSirenPlaying = false;

    // Clear intervals
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    if (this.vibrateInterval) {
      clearInterval(this.vibrateInterval);
      this.vibrateInterval = null;
    }
    this.stopVibrate();

    // Stop and reset HTML5 Audio element
    if (this.sirenAudio) {
      try {
        this.sirenAudio.pause();
        this.sirenAudio.currentTime = 0;
      } catch (e) {
        // Ignored
      }
    }

    // Stop and disconnect Web Audio nodes
    this.cleanUpWebAudioNodes();
  }

  // --- Simulated Phone Ringtone (Dual Frequency Bell) ---
  startRingtone() {
    if (this.isRinging) return;
    this.isRinging = true;

    const playRingBurst = () => {
      if (!this.isRinging) return;
      this.vibrate([600, 200, 600, 1000]);

      const ctx = this.getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      const gain = ctx.createGain();

      // Standard dual tone frequency: 440Hz + 480Hz
      oscA.frequency.value = 440;
      oscB.frequency.value = 480;

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);

      oscA.connect(gain);
      oscB.connect(gain);
      gain.connect(ctx.destination);

      oscA.start();
      oscB.start();
      oscA.stop(ctx.currentTime + 1.8);
      oscB.stop(ctx.currentTime + 1.8);
    };

    // Play immediately, then every 3.5 seconds
    playRingBurst();
    this.ringInterval = setInterval(playRingBurst, 3500);
  }

  stopRingtone() {
    this.stopVibrate();
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    this.isRinging = false;
  }
}

export const audioAlert = new AudioService();
