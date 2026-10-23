let selectedMonsterId = null;
let selectedQuestId = null;

async function init() {
  await Assets.load();
  Audio.init();
  Game.init('game');
  Input.init(Game.canvas);
  Renderer.init(Game.ctx);

  Game.update = (dt) => {
    const click = Input.consumeClick();
    if (!click) return;

    if (Game.state === 'agency') {
      handleAgencyClick(click.x, click.y);
    } else if (Game.state === 'report') {
      handleReportClick(click.x, click.y);
    } else if (Game.state === 'endday') {
      handleEndDayClick(click.x, click.y);
    }
  };

  Game.render = () => {
    const T = Renderer.THEME;
    Game.ctx.fillStyle = T.bg;
    Game.ctx.fillRect(0, 0, 640, 480);

    Game.ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    for (let x = 0; x < 640; x += 20) { Game.ctx.beginPath(); Game.ctx.moveTo(x, 0); Game.ctx.lineTo(x, 480); Game.ctx.stroke(); }
    for (let y = 0; y < 480; y += 20) { Game.ctx.beginPath(); Game.ctx.moveTo(0, y); Game.ctx.lineTo(640, y); Game.ctx.stroke(); }

    if (Game.state === 'agency') renderAgency();
    else if (Game.state === 'report') renderReport();
    else if (Game.state === 'endday') renderEndDay();
  };

  function handleAgencyClick(mx, my) {
    const a = Game.agency;

    // Клик по монстрам
    if (mx >= 10 && mx <= 310 && my >= 80 && my < 380) {
      for (let i = 0; i < a.monsters.length; i++) {
        const cy = 85 + i * 50;
        if (my >= cy && my <= cy + 40) {
          selectedMonsterId = a.monsters[i].id;
          Audio.playSfx('click');
          return;
        }
      }
    }

    // Клик по заказам
    if (mx >= 330 && mx <= 630 && my >= 80 && my < 400) {
      for (let i = 0; i < a.quests.length; i++) {
        const cy = 85 + i * 70;
        if (my >= cy && my <= cy + 60) {
          if (!a.quests[i].intercepted) {
            selectedQuestId = a.quests[i].id;
            Audio.playSfx('click');
          }
          return;
        }
      }
    }

    // Кнопка "ОТПРАВИТЬ"
    if (mx >= 330 && mx <= 630 && my >= 415 && my <= 460) {
      if (selectedMonsterId && selectedQuestId) {
        const m = a.monsters.find(x => x.id === selectedMonsterId);
        const q = a.quests.find(x => x.id === selectedQuestId);

        a.lastResult = Models.calculateResult(m, q, a);
        Audio.playSfx('click');
        Game.setState('report');
      }
    }

    // Кнопка "ЗАВЕРШИТЬ ДЕНЬ"
    if (mx >= 10 && mx <= 310 && my >= 430 && my <= 470) {
      Audio.playSfx('click');
      Game.setState('endday');
    }
  }

  function handleReportClick(mx, my) {
    // Кнопка "ПРИНЯТЬ ОТЧЁТ" нарисована на 220, 385, w=200, h=40
    if (mx >= 220 && mx <= 420 && my >= 385 && my <= 425) {
      applyResult();
      Game.setState('agency');
    }
  }

  function handleEndDayClick(mx, my) {
    if (mx >= 220 && mx <= 420 && my >= 380 && my <= 420) {
      Audio.playSfx('click');
      Models.nextDay(Game.agency);

      if (Game.agency.day > Game.agency.maxDays) {
        alert("Вы выжили 14 дней! (Тендер в разработке)");
        Game.agency = Models.createAgency();
      }
      Game.setState('agency');
    }
  }

  function applyResult() {
    const a = Game.agency;
    const r = a.lastResult;

    a.gold += r.gold;
    a.dayStats.goldEarned += r.gold;

    if (r.type === 'overkill') a.threat = Math.min(1.0, a.threat + 0.05);

    const m = a.monsters.find(x => x.id === r.monsterId);

    if (r.type === 'success' || r.type === 'overkill') {
      a.dayStats.questsDone++;
    }

    if (m) {
      if (r.type === 'lost') {
        a.monsters = a.monsters.filter(x => x.id !== m.id);
        a.dayStats.losses++;
      } else if (r.type === 'injury' || r.injury) {
        m.status = 'injured';
      }
    }

    // Запись миссии для итогового экрана дня
    a.dayStats.missions.push({
      monsterName: r.monsterName,
      questTitle: r.questTitle,
      type: r.type,
      gold: r.gold
    });

    a.quests = a.quests.filter(x => x.id !== r.questId);
    a.lastResult = null;
    selectedMonsterId = null;
    selectedQuestId = null;
  }

  function renderAgency() {
    const a = Game.agency;
    const T = Renderer.THEME;

    Renderer.gradientRect(0, 0, 640, 48, '#1f232c', '#15171d');
    Renderer.text(`День ${a.day}/14`, 20, 30, { color: T.accent, font: 'bold 16px system-ui' });
    Renderer.text(`Золото: ${a.gold}`, 150, 30, { color: T.text, size: '15px' });
    Renderer.text(`Угроза: ${(a.threat * 100).toFixed(0)}%`, 280, 30, { color: T.danger, size: '15px' });

    // Панель Монстров (увеличена)
    Renderer.roundRect(10, 60, 300, 350, 8, T.panel);
    Renderer.text('ВАШИ МОНСТРЫ', 25, 85, { color: T.muted, font: 'bold 14px system-ui' });

    a.monsters.forEach((m, i) => {
      const cy = 85 + i * 50;
      if (cy > 350) return;
      const isSel = selectedMonsterId === m.id;
      Renderer.roundRect(20, cy, 280, 40, 6, isSel ? T.panelHi : T.bg);
      Renderer.roundRectStroke(20, cy, 280, 40, 6, isSel ? T.success : T.border, isSel ? 2 : 1);

      Renderer.text(`${m.name} [${m.speciesLabel}]`, 30, cy + 16, { color: T.text, font: 'bold 13px system-ui' });
      Renderer.text(`СИЛ:${m.stats.str} ЛОВ:${m.stats.agi} ИНТ:${m.stats.int}`, 30, cy + 30, { color: T.muted, font: '11px monospace' });
      Renderer.text(m.status === 'idle' ? 'Свободен' : 'Ранен', 280, cy + 16, { color: m.status === 'idle' ? T.success : T.danger, size: '11px', align: 'right' });
    });

    // Журнал
    Renderer.roundRect(10, 390, 300, 30, 6, '#111');
    const lastLog = a.log.length > 0 ? a.log[0] : "Журнал пуст...";
    Renderer.text(lastLog, 20, 410, { color: T.accent, size: '11px', font: 'italic 11px system-ui' });

    // Кнопка Завершить день
    Renderer.gradientRect(10, 430, 300, 35, '#1f232c', '#15171d');
    Renderer.roundRectStroke(10, 430, 300, 35, 6, T.border, 1);
    Renderer.text('ЗАВЕРШИТЬ ДЕНЬ', 160, 452, { color: T.accent, align: 'center', font: 'bold 14px system-ui' });

    // Панель Заказов
    Renderer.roundRect(330, 60, 300, 350, 8, T.panel);
    Renderer.text('ДОСКА ЗАКАЗОВ', 345, 85, { color: T.muted, font: 'bold 14px system-ui' });

    a.quests.forEach((q, i) => {
      const cy = 85 + i * 70;
      const isSel = selectedQuestId === q.id;

      if (q.intercepted) {
        Renderer.roundRect(340, cy, 280, 60, 6, '#1a1c23');
        Renderer.text(q.title, 350, cy + 24, { color: T.muted, font: 'italic 14px system-ui' });
        Renderer.text('ПЕРЕХВАЧЕНО', 350, cy + 44, { color: T.danger, font: 'bold 12px system-ui' });
        return;
      }

      Renderer.roundRect(340, cy, 280, 60, 6, isSel ? T.panelHi : T.bg);
      Renderer.roundRectStroke(340, cy, 280, 60, 6, isSel ? T.select : T.border, isSel ? 2 : 1);

      Renderer.text(q.title, 350, cy + 20, { color: T.text, font: 'bold 14px system-ui' });
      Renderer.text(`Сложность: ${q.difficulty}`, 350, cy + 40, { color: T.accent, size: '12px' });
      Renderer.text(`${q.reward} зол.`, 610, cy + 20, { color: T.accent, align: 'right', font: 'bold 14px system-ui' });
    });

    // Кнопка "ОТПРАВИТЬ"
    const canSend = selectedMonsterId !== null && selectedQuestId !== null;
    Renderer.gradientRect(330, 420, 300, 45, canSend ? '#22c55e' : '#2c313c', canSend ? '#166534' : '#171a21');
    Renderer.roundRectStroke(330, 420, 300, 45, 6, canSend ? T.success : T.border, 1);
    Renderer.text('ОТПРАВИТЬ', 480, 442, { color: canSend ? '#fff' : T.muted, align: 'center', font: 'bold 16px system-ui' });
  }

  function renderReport() {
    const r = Game.agency.lastResult;
    const T = Renderer.THEME;
    const ctx = Game.ctx;

    Renderer.roundRect(50, 50, 540, 380, 12, T.panel);
    Renderer.roundRectStroke(50, 50, 540, 380, 12, T.border, 2);

    Renderer.text(`Докладная от ${r.monsterName}`, 320, 90, { color: T.muted, align: 'center', font: 'bold 16px system-ui' });
    Renderer.text(`Задание: ${r.questTitle}`, 320, 115, { color: T.accent, align: 'center', font: 'italic 14px system-ui' });

    // Текст отчёта с переносом
    const maxWidth = 460;
    const startY = 160;
    const lineHeight = 26;

    ctx.font = 'italic 18px Georgia';
    const words = `"${r.reportText}"`.split(' ');
    let line = '';
    let y = startY;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        Renderer.text(line, 320, y, { color: T.text, align: 'center', font: 'italic 18px Georgia' });
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    Renderer.text(line, 320, y, { color: T.text, align: 'center', font: 'italic 18px Georgia' });

    // Доверие
    const int = Game.agency.monsters.find(m => m.id === r.monsterId)?.stats.int || 10;
    let trust = "Среднее"; let color = T.accent;
    if (int >= 14) { trust = "Высокое"; color = T.success; }
    else if (int <= 7) { trust = "Низкое"; color = T.danger; }

    Renderer.text(`Интеллект монстра: ${int} (Доверие к словам: ${trust})`, 320, 320, { color: color, align: 'center', size: '14px' });

    // Кнопка (координаты изменены)
    Renderer.gradientRect(220, 385, 200, 40, '#3b82f6', '#1d4ed8');
    Renderer.roundRectStroke(220, 385, 200, 40, 6, T.select, 1);
    Renderer.text('ПРИНЯТЬ ОТЧЁТ', 320, 405, { color: '#fff', align: 'center', font: 'bold 16px system-ui' });
  }

  function renderEndDay() {
    const a = Game.agency;
    const T = Renderer.THEME;

    Renderer.roundRect(50, 40, 540, 400, 12, T.panel);
    Renderer.roundRectStroke(50, 40, 540, 400, 12, T.border, 2);

    Renderer.text(`КОНЕЦ ДНЯ ${a.day}`, 320, 80, { color: T.accent, align: 'center', font: 'bold 24px system-ui' });

    // Статистика
    Renderer.text('ИТОГИ ДНЯ:', 70, 120, { color: T.muted, font: 'bold 16px system-ui' });
    Renderer.text(`Заданий: ${a.dayStats.questsDone}`, 70, 145, { color: T.text, size: '14px' });
    Renderer.text(`Золото: +${a.dayStats.goldEarned}`, 200, 145, { color: T.success, size: '14px' });
    Renderer.text(`Перехвачено: ${a.dayStats.interceptedCount}`, 320, 145, { color: T.danger, size: '14px' });
    Renderer.text(`Потери: ${a.dayStats.losses}`, 470, 145, { color: T.danger, size: '14px' });

    // Список миссий
    Renderer.roundRect(70, 170, 500, 180, 8, '#111');
    Renderer.text('ФАКТИЧЕСКИЕ РЕЗУЛЬТАТЫ МИССИЙ:', 80, 190, { color: T.muted, size: '12px', font: 'bold 12px system-ui' });

    a.dayStats.missions.forEach((m, i) => {
      const my = 210 + i * 25;
      if (my > 330) return;

      let resText = "";
      let color = T.text;
      if (m.type === 'success') { resText = `Успех (+${m.gold} зол.)`; color = T.success; }
      if (m.type === 'overkill') { resText = `Оверкилл! (+${m.gold} зол., +Угроза)`; color = T.accent; }
      if (m.type === 'fail') { resText = `Провал`; color = T.danger; }
      if (m.type === 'injury') { resText = `Травма`; color = T.danger; }
      if (m.type === 'lost') { resText = `Исчез`; color = T.danger; }

      Renderer.text(`• ${m.monsterName} — ${m.questTitle}`, 80, my, { color: T.text, size: '12px' });
      Renderer.text(resText, 560, my, { color: color, size: '12px', align: 'right', font: 'bold 12px system-ui' });
    });

    // Кнопка
    Renderer.gradientRect(220, 380, 200, 40, '#3b82f6', '#1d4ed8');
    Renderer.roundRectStroke(220, 380, 200, 40, 6, T.select, 1);
    Renderer.text('СЛЕДУЮЩИЙ ДЕНЬ', 320, 400, { color: '#fff', align: 'center', font: 'bold 16px system-ui' });
  }

  // Debug панель
  const debugBtn = document.getElementById('debugBtn');
  const debugPanel = document.getElementById('debugPanel');
  if (debugBtn && debugPanel) {
    debugBtn.addEventListener('click', () => {
      debugPanel.textContent = JSON.stringify(Game.agency, null, 2);
      debugPanel.classList.toggle('open');
    });
  }

  let last = performance.now();
  function frame(now) {
    Game.loop(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

init();