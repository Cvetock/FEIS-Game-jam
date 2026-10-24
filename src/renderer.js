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
    select:   '#3b82f6',
    warn:     '#f97316',
    hero:     '#a855f7',
    paper:    '#e9dfc6',
    paperInk: '#2a2519'
  },

  init(ctx) { this.ctx = ctx; },

  // '#rrggbb' + альфа → 'rgba(r,g,b,a)'
  alpha(hex, a) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  },

  rect(x, y, w, h, color) {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  },

  roundRect(x, y, w, h, r, color) {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    ctx.fill();
  },

  roundRectStroke(x, y, w, h, r, color, lw = 1) {
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    ctx.stroke();
  },

  text(str, x, y, { color = '#d6d9e0', size = '16px', align = 'start', font = 'system-ui', baseline = 'alphabetic', weight = 'normal', style = 'normal' } = {}) {
    const { ctx } = this;
    ctx.fillStyle = color;
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
  },

  // Лёгкое свечение вокруг прямоугольника (используется для индикатора угрозы)
  glowRect(x, y, w, h, color, blur) {
    const { ctx } = this;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  },

  // Разбивает текст на строки по ширине (для отчётов и описаний)
  wrapText(text, maxWidth, font) {
    const { ctx } = this;
    const prev = ctx.font;
    ctx.font = font;
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    ctx.font = prev;
    return lines;
  },

  // === Рисование изображений ===
  drawImage(name, x, y, w, h) {
    const img = window.Assets.get(name);
    if (img && img.complete && img.naturalWidth > 0) {
      this.ctx.drawImage(img, x, y, w, h);
      return true;
    }
    return false;
  },

  // Изображение с осмысленным фолбэком: если арта нет — цветная плитка с буквой.
  drawIcon(name, x, y, w, h, { label = '', color = '#2c313c' } = {}) {
    if (this.drawImage(name, x, y, w, h)) return true;
    this.roundRect(x, y, w, h, 5, color);
    this.roundRectStroke(x, y, w, h, 5, this.THEME.border, 1);
    if (label) {
      this.text(String(label).charAt(0).toUpperCase(), x + w / 2, y + h / 2 + h * 0.18, {
        color: '#0e0f13', align: 'center', font: `bold ${Math.round(h * 0.5)}px system-ui`
      });
    }
    return false;
  },

  // Рисует карточку с фоном и иконкой/изображением по центру
  drawCard(name, x, y, w, h, borderColor = null) {
    const ctx = this.ctx;
    this.roundRect(x, y, w, h, 8, '#1a1520');
    this.roundRectStroke(x, y, w, h, 8, borderColor || this.border, 1.5);

    const pad = 8;
    const imgW = w - pad * 2;
    const imgH = h - pad * 2 - 30;
    const drawn = this.drawImage(name, x + pad, y + pad, imgW, imgH);

    if (!drawn) {
      ctx.fillStyle = '#2d1f14';
      ctx.fillRect(x + pad, y + pad, imgW, imgH);
      ctx.fillStyle = this.muted;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(name, x + w / 2, y + h / 2);
      ctx.textAlign = 'start';
    }
    return drawn;
  },

  // Иконка монстра в списке
  drawMonsterIcon(name, x, y, size) {
    if (this.drawImage(name, x, y, size, size)) return true;
    this.roundRect(x, y, size, size, 4, '#1a1520');
    this.roundRectStroke(x, y, size, size, 4, this.border, 1);
    return false;
  }
};
