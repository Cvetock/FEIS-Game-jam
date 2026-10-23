// Звук: Web Audio API
window.Audio = {
  ctx: null,
  started: false,

  init() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) this.ctx = new AudioContext();
  },

  ensureStarted() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    this.started = true;
  },

  playSfx(type = 'click') {
    if (!this.ctx) return;
    this.ensureStarted();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    const cfgs = {
      click:  { freq: 800,  type: 'sine',     dur: 0.08 },
      select: { freq: 600,  type: 'square',   dur: 0.1 },
      pick:   { freq: 1000, type: 'sine',     dur: 0.1 },
      hit:    { freq: 150,  type: 'sawtooth', dur: 0.2 },
      win:    { freq: 880,  type: 'sine',     dur: 0.4 },
      lose:   { freq: 120,  type: 'sawtooth', dur: 0.5 },
      ui:     { freq: 440,  type: 'sine',     dur: 0.05 }
    };
    const cfg = cfgs[type] || cfgs.click;

    osc.type = cfg.type;
    osc.frequency.setValueAtTime(cfg.freq, now);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + cfg.dur);
    osc.start(now);
    osc.stop(now + cfg.dur);
  },

  playMusic(loop = true) {
    // заглушка
  }
};