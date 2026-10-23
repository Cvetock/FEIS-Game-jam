// Загрузчик ассетов
window.Assets = {
  images: {},
  sounds: {},
  toLoad: 0,
  loaded: 0,
  onComplete: null,

  loadImage(name, src) {
    this.toLoad++;
    const img = new Image();
    img.onload = () => { this.loaded++; this.check(); };
    img.onerror = () => { this.loaded++; this.check(); console.warn('Не загрузился:', src); };
    img.src = src;
    this.images[name] = img;
    return img;
  },

  check() {
    if (this.loaded >= this.toLoad && this.onComplete) this.onComplete();
  },

  async load() {
    if (this.onComplete) this.onComplete();
  }
};