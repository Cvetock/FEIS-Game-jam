window.Game = {
  canvas: null,
  ctx: null,
  width: 640,     // логическая ширина (дизайн-пространство)
  height: 480,    // логическая высота
  zoom: 1.5,      // коэффициент увеличения окна (640×480 → 960×720)
  lastTime: 0,
  deltaTime: 0,
  running: false,
  state: 'agency',
  agency: null,

  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    const dpr = window.devicePixelRatio || 1;

    // Физический буфер: логический размер × zoom × HiDPI
    const bw = Math.round(this.width * this.zoom);
    const bh = Math.round(this.height * this.zoom);
    this.canvas.width = Math.round(bw * dpr);
    this.canvas.height = Math.round(bh * dpr);
    this.canvas.style.width = bw + 'px';
    this.canvas.style.height = bh + 'px';

    // Логический размер для корректного ввода (src/input.js)
    this.canvas._logicalW = this.width;
    this.canvas._logicalH = this.height;

    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(this.zoom * dpr, this.zoom * dpr);

    this.lastTime = performance.now();
    this.running = true;

    if (window.Models) {
      this.agency = window.Models.createAgency();
    } else {
      console.error("Models не загружены!");
    }
  },

  loop(now) {
    if (!this.running) return;
    this.deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.update(this.deltaTime);
    this.render();
  },

  update(dt) {},
  render() {},

  setState(state) {
    this.state = state;
  }
};
