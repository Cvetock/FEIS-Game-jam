# Отрисовка: helper-функции и камера
export const Renderer = {
  ctx: null,

  init(ctx) { this.ctx = ctx; },

  clear() {
    const { ctx } = this;
    ctx.fillStyle = '#0b0c10';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  },

  rect(x, y, w, h, color) {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  },

  rectStroke(x, y, w, h, color, lineWidth = 2) {
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x, y, w, h);
  },

  circle(x, y, r, color) {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  },

  text(str, x, y, { color = '#eee', size = '16px', align = 'start', font = 'system-ui' } = {}) {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.font = `${size} ${font}`;
    ctx.textAlign = align;
    ctx.fillText(str, x, y);
  },

  grid(step = 40, color = '#222') {
    const { ctx } = this;
    const { width, height } = ctx.canvas;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += step) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
    }
    for (let i = 0; i < height; i += step) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
    }
  }
};
