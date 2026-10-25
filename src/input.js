// Ввод: клавиатура, мышь, тач
window.Input = {
  keys: new Set(),
  mouse: { x: 0, y: 0, down: false, clicked: false },

  init(element) {
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    // Пересчет координат: CSS-пиксели → логические 640×480 (с учётом zoom и HiDPI)
    const getPos = (e) => {
      const rect = element.getBoundingClientRect();
      const logicalWidth = element._logicalW || (element.width / (window.devicePixelRatio || 1));
      const logicalHeight = element._logicalH || (element.height / (window.devicePixelRatio || 1));

      return {
        x: (e.clientX - rect.left) * (logicalWidth / rect.width),
        y: (e.clientY - rect.top) * (logicalHeight / rect.height)
      };
    };

    element.addEventListener('mousedown', (e) => {
      this.mouse.down = true;
      this.mouse.clicked = true;
      const pos = getPos(e);
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
    });

    element.addEventListener('mouseup', () => { this.mouse.down = false; });

    element.addEventListener('mousemove', (e) => {
      const pos = getPos(e);
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
    });

    element.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.mouse.clicked = true;
      const t = e.touches[0];
      const pos = getPos(t);
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
    }, { passive: false });
  },

  // Возвращает координаты клика и сбрасывает флаг
  consumeClick() {
    if (this.mouse.clicked) {
      this.mouse.clicked = false;
      return { x: this.mouse.x, y: this.mouse.y };
    }
    return null;
  },

  isKeyPressed(code) { return this.keys.has(code); }
};