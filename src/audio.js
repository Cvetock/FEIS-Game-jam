// Звук: Web Audio API, короткие синтезированные SFX (файлы не нужны).
// Имена событий совпадают с docs/specs/spec_sound.md.
window.Audio = {
  ctx: null,
  started: false,
  enabled: true,

  init() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) this.ctx = new AudioContext();
  },

  ensureStarted() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    this.started = true;
  },

  // Каждое событие — набор нот {f, t, d, g, delay}
  _sfx: {
    click:      [{ f: 700,  t: 'sine',     d: 0.05, g: 0.10 }],
    select:     [{ f: 520,  t: 'square',   d: 0.06, g: 0.08 }, { f: 780, t: 'sine', d: 0.08, g: 0.08, delay: 0.05 }],
    hover:      [{ f: 900,  t: 'sine',     d: 0.03, g: 0.04 }],
    hire:       [{ f: 523,  t: 'sine',     d: 0.10, g: 0.10 }, { f: 659, t: 'sine', d: 0.10, g: 0.10, delay: 0.08 }, { f: 880, t: 'sine', d: 0.18, g: 0.10, delay: 0.16 }],
    reject:     [{ f: 320,  t: 'sawtooth', d: 0.12, g: 0.09 }, { f: 180, t: 'sawtooth', d: 0.18, g: 0.09, delay: 0.12 }],
    depart:     [{ f: 220,  t: 'triangle', d: 0.12, g: 0.09 }, { f: 330, t: 'triangle', d: 0.12, g: 0.09, delay: 0.10 }, { f: 440, t: 'triangle', d: 0.16, g: 0.08, delay: 0.20 }],
    report:     [{ f: 420,  t: 'triangle', d: 0.09, g: 0.07 }],
    success:    [{ f: 660,  t: 'sine',     d: 0.10, g: 0.10 }, { f: 880, t: 'sine', d: 0.16, g: 0.10, delay: 0.10 }],
    fail:       [{ f: 200,  t: 'sawtooth', d: 0.22, g: 0.09 }],
    overkill:   [{ f: 120,  t: 'sawtooth', d: 0.30, g: 0.12 }, { f: 90, t: 'sawtooth', d: 0.40, g: 0.12, delay: 0.10 }],
    injury:     [{ f: 240,  t: 'sawtooth', d: 0.15, g: 0.08 }],
    lost:       [{ f: 160,  t: 'sine',     d: 0.45, g: 0.09 }],
    lie:        [{ f: 1200, t: 'sine',     d: 0.05, g: 0.05 }, { f: 900, t: 'sine', d: 0.05, g: 0.05, delay: 0.07 }],
    rival:      [{ f: 300,  t: 'square',   d: 0.08, g: 0.08 }, { f: 260, t: 'square', d: 0.10, g: 0.08, delay: 0.12 }],
    upgrade:    [{ f: 440,  t: 'sine',     d: 0.10, g: 0.10 }, { f: 660, t: 'sine', d: 0.10, g: 0.10, delay: 0.10 }, { f: 880, t: 'sine', d: 0.16, g: 0.10, delay: 0.20 }],
    new_day:    [{ f: 392,  t: 'triangle', d: 0.14, g: 0.09 }, { f: 523, t: 'triangle', d: 0.14, g: 0.09, delay: 0.14 }, { f: 659, t: 'triangle', d: 0.22, g: 0.09, delay: 0.28 }],
    tender:     [{ f: 196,  t: 'sine',     d: 0.35, g: 0.10 }, { f: 262, t: 'sine', d: 0.35, g: 0.10, delay: 0.20 }],
    win:        [{ f: 523,  t: 'sine',     d: 0.14, g: 0.10 }, { f: 659, t: 'sine', d: 0.14, g: 0.10, delay: 0.14 }, { f: 784, t: 'sine', d: 0.14, g: 0.10, delay: 0.28 }, { f: 1047, t: 'sine', d: 0.40, g: 0.10, delay: 0.42 }],
    lose:       [{ f: 392,  t: 'triangle', d: 0.20, g: 0.09 }, { f: 330, t: 'triangle', d: 0.20, g: 0.09, delay: 0.20 }, { f: 262, t: 'triangle', d: 0.20, g: 0.09, delay: 0.40 }, { f: 196, t: 'triangle', d: 0.50, g: 0.09, delay: 0.60 }],
    transition: [{ f: 320,  t: 'sine',     d: 0.05, g: 0.05 }]
  },

  playSfx(type = 'click') {
    if (!this.ctx || !this.enabled) return;
    this.ensureStarted();
    const notes = this._sfx[type] || this._sfx.click;

    notes.forEach(note => {
      const startAt = this.ctx.currentTime + (note.delay || 0);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = note.t || 'sine';
      osc.frequency.setValueAtTime(note.f, startAt);
      gain.gain.setValueAtTime(note.g || 0.08, startAt);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + note.d);
      osc.start(startAt);
      osc.stop(startAt + note.d + 0.02);
    });
  },

  playMusic() {
    // Музыкальная петля появится вместе с ассетами звукорежиссёра.
  }
};
