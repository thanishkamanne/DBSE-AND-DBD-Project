// Web Audio API acoustic generator & device vibration for emergency siren & fake call ringtone

class AudioService {
  constructor() {
    this.audioCtx = null;
    this.sirenOsc1 = null;
    this.sirenGain = null;
    this.sirenInterval = null;
    this.isSirenPlaying = false;

    // Ringtone variables
    this.ringInterval = null;
    this.isRinging = false;
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
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

  // --- Acoustic Emergency Siren ---
  startSiren() {
    if (this.isSirenPlaying) return;
    const ctx = this.getAudioContext();
    this.vibrate([1000, 200, 1000, 200, 1000]);
    if (!ctx) return;

    this.sirenGain = ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0.3, ctx.currentTime);
    this.sirenGain.connect(ctx.destination);

    this.sirenOsc1 = ctx.createOscillator();
    this.sirenOsc1.type = 'sawtooth';
    this.sirenOsc1.frequency.setValueAtTime(750, ctx.currentTime);
    this.sirenOsc1.connect(this.sirenGain);
    this.sirenOsc1.start();

    let high = false;
    this.sirenInterval = setInterval(() => {
      if (!this.sirenOsc1 || !ctx) return;
      const targetFreq = high ? 750 : 1200;
      this.sirenOsc1.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.1);
      high = !high;
    }, 450);

    this.isSirenPlaying = true;
  }

  stopSiren() {
    this.stopVibrate();
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
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
    if (this.sirenGain) {
      try {
        this.sirenGain.disconnect();
      } catch (e) {
        // Ignored
      }
      this.sirenGain = null;
    }
    this.isSirenPlaying = false;
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
