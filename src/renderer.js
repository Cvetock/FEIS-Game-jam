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

  // === Рисование изображений ===
  drawImage(name, x, y, w, h) {
    const img = window.Assets.get(name);
    if (img && img.complete && img.naturalWidth > 0) {
      this.ctx.drawImage(img, x, y, w, h);
      return true;
    }
    return false;
  },

  // Рисует карточку с фоном и иконкой/изображением по центру
  drawCard(name, x, y, w, h, borderColor = null) {
    const ctx = this.ctx;
    // Фон карточки
    this.roundRect(x, y, w, h, 8, '#1a1520');
    this.roundRectStroke(x, y, w, h, 8, borderColor || this.border, 1.5);

    // Внутренняя область для изображения
    const pad = 8;
    const imgW = w - pad * 2;
    const imgH = h - pad * 2 - 30; // место для текста снизу
    const drawn = this.drawImage(name, x + pad, y + pad, imgW, imgH);

    // Если изображения нет — рисуем заглушку
    if (!drawn) {
      ctx.fillStyle = '#2d1f14';
      ctx.fillRect(x + pad, y + pad, imgW, imgH);
      ctx.fillStyle = this.muted;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(name, x + w / 2, y + h / 2);
    }

    return drawn;
  },

  // Рисует иконку монстра в списке
  drawMonsterIcon(name, x, y, size) {
    const img = window.Assets.get(name);
    if (img && img.complete && img.naturalWidth > 0) {
      this.ctx.drawImage(img, x, y, size, size);
      return true;
    }
    // Fallback: цветной квадрат с границей
    this.roundRect(x, y, size, size, 4, '#1a1520');
    this.roundRectStroke(x, y, size, size, 4, this.border, 1);
    return false;
  }
};
