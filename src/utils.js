# Утилиты
export const Utils = {
  rand(min, max) { return Math.random() * (max - min) + min; },
  randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },

  vec2(x, y) { return { x, y }; },
  dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); },

  // AABB-коллизия
  aabb(r1, r2) {
    return r1.x < r2.x + r2.w &&
           r1.x + r1.w > r2.x &&
           r1.y < r2.y + r2.h &&
           r1.y + r1.h > r2.y;
  },

  // Точка внутри прямоугольника
  pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  },

  clamp(v, min, max) { return Math.min(Math.max(v, min), max); },

  lerp(a, b, t) { return a + (b - a) * t; }
};
