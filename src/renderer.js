window.Renderer = {
  ctx: null,

  THEME: {
    bg:       '#0e0f13',
    panel:    '#171a21',
    panelHi:  '#1f232c',
    border:   '#2c313c',
    text:     '#d6d9e0',
    muted:    '#8b919e',
    accent:   '#f5c542',
    success:  '#4ade80',
    danger:   '#ef4444',
    select:   '#3b82f6'
  },

  init(ctx) { this.ctx = ctx; },

  rect(x, y, w, h, color) {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  },

  roundRect(x, y, w, h, r, color) {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h); // Защита для старых браузеров
    }
    ctx.fill();
  },

  roundRectStroke(x, y, w, h, r, color, lw = 1) {
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.stroke();
  },

  text(str, x, y, { color = '#d6d9e0', size = '16px', align = 'start', font = 'system-ui', baseline = 'alphabetic', weight = 'normal', style = 'normal' } = {}) {
    const { ctx } = this;
    ctx.fillStyle = color;
    // Если передан полный шрифт с размером, используем его. Иначе собираем из частей.
    ctx.font = font.includes('px') ? font : `${style} ${weight} ${size} ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(str, x, y);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  },

  gradientRect(x, y, w, h, colorTop, colorBottom) {
    const { ctx } = this;
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, colorTop);
    grad.addColorStop(1, colorBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  }
};