# Ввод: клавиатура, мышь, тач
export const Input = {
  keys: new Set(),
  mouse: { x: 0, y: 0, down: false },
  touch: { x: 0, y: 0, active: false },

  init(element) {
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    element.addEventListener('mousedown', () => { this.mouse.down = true; });
    element.addEventListener('mouseup', () => { this.mouse.down = false; });
    element.addEventListener('mousemove', (e) => {
      const rect = element.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });

    element.addEventListener('touchstart', (e) => {
      this.touch.active = true;
      const t = e.touches[0];
      const rect = element.getBoundingClientRect();
      this.touch.x = t.clientX - rect.left;
      this.touch.y = t.clientY - rect.top;
    }, { passive: false });
    element.addEventListener('touchend', () => { this.touch.active = false; });
    element.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      const rect = element.getBoundingClientRect();
      this.touch.x = t.clientX - rect.left;
      this.touch.y = t.clientY - rect.top;
    }, { passive: false });
  },

  isKeyPressed(code) { return this.keys.has(code); },
  isMouseDown() { return this.mouse.down; },
  getMouse() { return { x: this.mouse.x, y: this.mouse.y }; },
  getTouch() { return { x: this.touch.x, y: this.touch.y, active: this.touch.active }; }
};
