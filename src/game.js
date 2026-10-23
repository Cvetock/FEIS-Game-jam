window.Game = {
  canvas: null,
  ctx: null,
  width: 640,
  height: 480,
  lastTime: 0,
  deltaTime: 0,
  running: false,
  state: 'agency',
  agency: null,

  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    const dpr = window.devicePixelRatio || 1;
    this.width = 640;
    this.height = 480;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';

    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(dpr, dpr);

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