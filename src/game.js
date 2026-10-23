# Игровой цикл
export const Game = {
  canvas: null,
  ctx: null,
  width: 640,
  height: 480,
  lastTime: 0,
  deltaTime: 0,
  running: false,
  state: 'menu', // menu | playing | paused | gameover

  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.lastTime = performance.now();
    this.running = true;
    this.loop();
  },

  loop(now) {
    if (!this.running) return;
    this.deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (this.state === 'playing') {
      this.update(this.deltaTime);
    }
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  },

  update(dt) {
    // Переопределяется логикой игры
  },

  render() {
    const { ctx, width, height } = this;
    ctx.fillStyle = '#0b0c10';
    ctx.fillRect(0, 0, width, height);
  },

  setState(state) {
    this.state = state;
  }
};
