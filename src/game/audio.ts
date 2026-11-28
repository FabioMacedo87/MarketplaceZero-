class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private lastSirenTime = 0;
  private sirenToggle = false;
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientGain: GainNode | null = null;
  private lastSpokenLine = '';

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.startCityAmbience(this.ctx);
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      if (this.ambientGain && this.ctx) this.ambientGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.18);
      return;
    }
    const ctx = this.ensureContext();
    if (ctx && this.ambientGain) this.ambientGain.gain.setTargetAtTime(0.018, ctx.currentTime, 0.8);
  }

  private startCityAmbience(ctx: AudioContext) {
    if (this.ambientSource) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * 3));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * 0.32;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    filter.Q.value = 0.35;
    const gain = ctx.createGain();
    gain.gain.value = this.muted ? 0 : 0.018;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    this.ambientSource = source;
    this.ambientGain = gain;
  }

  public speakNpc(text: string, speaker = 'Morador do Porto') {
    if (this.muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const line = text.trim();
    if (!line || line === this.lastSpokenLine) return;
    this.lastSpokenLine = line;
    const utterance = new SpeechSynthesisUtterance(line);
    utterance.lang = 'pt-PT';
    utterance.rate = 0.94;
    utterance.pitch = speaker.toLowerCase().includes('tiago') || speaker.toLowerCase().includes('rui') ? 0.92 : 1.02;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((item) => item.lang.toLowerCase() === 'pt-pt')
      ?? voices.find((item) => item.lang.toLowerCase().startsWith('pt'));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public playShot(weaponId: string = 'pistol') {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (weaponId === 'shotgun') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(165, now);
      osc.frequency.exponentialRampToValueAtTime(34, now + 0.16);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
      return;
    }

    if (weaponId === 'rpg') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.linearRampToValueAtTime(310, now + 0.22);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.27);
      return;
    }

    if (weaponId === 'rifle') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(62, now + 0.09);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
      return;
    }

    const freq = weaponId === 'smg' ? 310 : 240;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.075);
    gain.gain.setValueAtTime(weaponId === 'smg' ? 0.085 : 0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  public playHorn() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [349.23, 440].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.055, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  public playPickup() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.setValueAtTime(780, now + 0.06);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playMissionComplete() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const start = ctx.currentTime + i * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.1, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.19);
    });
  }

  public playCrash() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.14);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playDoor() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(280, now + 0.07);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public tickSiren(wantedStars: number) {
    if (wantedStars <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const nowMs = performance.now();
    if (nowMs - this.lastSirenTime < 460) return;
    this.lastSirenTime = nowMs;
    this.sirenToggle = !this.sirenToggle;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.sirenToggle ? 660 : 880, now);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.34);
  }
}

export const soundEngine = new SoundEngine();
