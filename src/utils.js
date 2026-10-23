// Утилиты
window.Utils = {
  _uid: 0,
  uid() { return ++this._uid; },

  rand(min, max) { return Math.random() * (max - min) + min; },
  randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
  chance(p = 0.5) { return Math.random() < p; },

  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  clamp(v, min, max) { return Math.min(Math.max(v, min), max); },
  lerp(a, b, t) { return a + (b - a) * t; },
  round(v, n = 0) { const k = Math.pow(10, n); return Math.round(v * k) / k; }
};