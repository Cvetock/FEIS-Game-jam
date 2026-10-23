# Точка входа и главный игровой цикл
import { Game } from './game.js';
import { Input } from './input.js';
import { Renderer } from './renderer.js';
import { Assets } from './assets.js';
import { Audio } from './audio.js';
import { Utils } from './utils.js';

const canvas = document.getElementById('game');
const fpsEl = document.getElementById('fps');
const waveEl = document.getElementById('wave');
const resEl = document.getElementById('res');

let frames = 0;
let fpsTime = 0;

async function init() {
  await Assets.load();
  Audio.init();
  Game.init('game');
  Input.init(canvas);

  // Тестовая сцена: движущийся прямоугольник + FPS + ввод
  let x = 100, y = 100, vx = 120, vy = 80;
  let wave = 0, res = 0;

  Game.update = (dt) => {
    x += vx * dt;
    y += vy * dt;
    if (x < 0 || x > Game.width - 40) vx = -vx;
    if (y < 0 || y > Game.height - 40) vy = -vy;
    res += dt; // накопление ресурсов со временем
    if (res >= 1) { wave += Math.floor(res); res %= 1; }
  };

  Game.render = () => {
    const { ctx, width, height } = Game;
    ctx.fillStyle = '#0b0c10';
    ctx.fillRect(0, 0, width, height);

    // Сетка
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke(); }
    for (let i = 0; i < height; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke(); }

    // Игровой объект
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(x, y, 40, 40);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 40, 40);

    // HUD
    ctx.fillStyle = '#eee';
    ctx.font = '16px system-ui';
    ctx.fillText(`Волна: ${wave}`, 20, 30);
    ctx.fillText(`Ресурсы: ${Math.floor(res)}`, 20, 55);
    if (Game.state === 'menu') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#eee';
      ctx.font = '28px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('НАЖМИТЕ ЛЮБУЮ КЛАВИШУ ИЛИ КЛИКНИТЕ', width / 2, height / 2);
      ctx.textAlign = 'start';
    }
  };

  function start() {
    if (Game.state === 'menu') Game.setState('playing');
  }

  canvas.addEventListener('mousedown', start);
  window.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'Enter') start(); });

  let last = performance.now();
  function frame(now) {
    const dt = (now - last) / 1000;
    last = now;
    frames++;
    fpsTime += dt;
    if (fpsTime >= 1) {
      fpsEl.textContent = frames;
      frames = 0;
      fpsTime = 0;
    }
    Game.loop(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

init();
