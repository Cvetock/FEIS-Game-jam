let currentTab = 'monsters'; // 'monsters' | 'quests' | 'shop'
let selectedMonsterIds = []; // массив выбранных монстров на задание
let selectedQuestId = null;
let selectedCandidateId = null;
let toastMsg = "";
let toastTimer = 0;

async function init() {
  await Assets.load();
  Audio.init();
  Game.init('game');
  Input.init(Game.canvas);
  Renderer.init(Game.ctx);

  Game.update = (dt) => {
    if (toastTimer > 0) toastTimer -= dt;

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

    // Фоновое изображение по состоянию
    if (Game.state === 'agency') {
      Renderer.drawImage('bg_agency', 0, 0, 640, 480);
      // Затемнение фона для читаемости UI
      Game.ctx.fillStyle = 'rgba(14,15,19,0.55)';
      Game.ctx.fillRect(0, 0, 640, 480);
    } else if (Game.state === 'report') {
      Renderer.drawImage('bg_agency', 0, 0, 640, 480);
      Game.ctx.fillStyle = 'rgba(14,15,19,0.7)';
      Game.ctx.fillRect(0, 0, 640, 480);
    } else if (Game.state === 'endday') {
      Renderer.drawImage('bg_agency', 0, 0, 640, 480);
      Game.ctx.fillStyle = 'rgba(14,15,19,0.75)';
      Game.ctx.fillRect(0, 0, 640, 480);
    }

    // Сетка
    Game.ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    for (let x = 0; x < 640; x += 20) { Game.ctx.beginPath(); Game.ctx.moveTo(x, 0); Game.ctx.lineTo(x, 480); Game.ctx.stroke(); }
    for (let y = 0; y < 480; y += 20) { Game.ctx.beginPath(); Game.ctx.moveTo(0, y); Game.ctx.lineTo(640, y); Game.ctx.stroke(); }

    if (Game.state === 'agency') renderAgency();
    else if (Game.state === 'report') renderReport();
    else if (Game.state === 'endday') renderEndDay();

    // Всплывающее сообщение
    if (toastTimer > 0) {
      Game.ctx.fillStyle = 'rgba(0,0,0,0.9)';
      Game.ctx.fillRect(160, 220, 320, 40);
      Renderer.text(toastMsg, 320, 245, { color: T.accent, align: 'center', font: 'bold 14px system-ui' });
    }
  };

  function showToast(msg) {
    toastMsg = msg;
    toastTimer = 3.0;
  }

  function handleAgencyClick(mx, my) {
    const a = Game.agency;

    // === ЛЕВОЕ МЕНЮ ===
    if (mx >= 10 && mx <= 150) {
      if (my >= 60 && my <= 95) { currentTab = 'monsters'; Audio.playSfx('click'); return; }
      if (my >= 105 && my <= 140) { currentTab = 'quests'; Audio.playSfx('click'); return; }
      if (my >= 150 && my <= 185) { currentTab = 'shop'; Audio.playSfx('click'); return; }

      // Кнопка Завершить день
      if (my >= 220 && my <= 265) {
        Audio.playSfx('click');
        Game.setState('endday');
        return;
      }
    }

    // === КОНТЕНТ ===
    if (mx >= 170 && mx <= 630) {
      if (currentTab === 'monsters') {
        if (my >= 90 && my < 260) {
          for (let i = 0; i < a.monsters.length; i++) {
            const cy = 100 + i * 45;
            if (my >= cy && my <= cy + 40) {
              if (a.monsters[i].status === 'idle') {
                if (selectedMonsterIds.includes(a.monsters[i].id)) {
                  selectedMonsterIds = selectedMonsterIds.filter(id => id !== a.monsters[i].id);
                } else if (selectedMonsterIds.length < 3) {
                  selectedMonsterIds.push(a.monsters[i].id);
                }
                Audio.playSfx('click');
              } else showToast("Монстр ранен!");
              return;
            }
          }
        }
        if (my >= 290 && my < 380) {
          for (let i = 0; i < a.candidates.length; i++) {
            const cy = 300 + i * 30;
            if (my >= cy && my <= cy + 25) { selectedCandidateId = a.candidates[i].id; Audio.playSfx('click'); return; }
          }
        }
        if (my >= 420 && my <= 460 && selectedCandidateId) {
          const candIndex = a.candidates.findIndex(c => c.id === selectedCandidateId);
          if (candIndex !== -1) {
            const cand = a.candidates[candIndex];
            const res = Models.tryHire(cand, a);
            if (res.success) {
              a.monsters.push(cand); a.candidates.splice(candIndex, 1); selectedCandidateId = null;
              Audio.playSfx('hire'); showToast(`${cand.name} принят!`);
            } else {
              Audio.playSfx('fail'); showToast(`Отказ: ${res.reason}`);
            }
          }
        }
      }

      if (currentTab === 'quests') {
        if (my >= 90 && my < 400) {
          for (let i = 0; i < a.quests.length; i++) {
            const cy = 100 + i * 70;
            if (my >= cy && my <= cy + 60) {
              if (!a.quests[i].intercepted) { selectedQuestId = a.quests[i].id; Audio.playSfx('click'); }
              return;
            }
          }
        }
        if (selectedQuestId && my >= 380 && my <= 420) {
          for (let i = 0; i < a.monsters.length; i++) {
            const cx = 180 + i * 90;
            if (mx >= cx && mx <= cx + 80) {
              if (a.monsters[i].status === 'idle') {
                if (selectedMonsterIds.includes(a.monsters[i].id)) {
                  selectedMonsterIds = selectedMonsterIds.filter(id => id !== a.monsters[i].id);
                } else if (selectedMonsterIds.length < 3) {
                  selectedMonsterIds.push(a.monsters[i].id);
                }
                Audio.playSfx('click');
              } else showToast("Монстр ранен!");
              return;
            }
          }
        }
        if (my >= 430 && my <= 470 && selectedQuestId && selectedMonsterIds.length > 0) {
          const q = a.quests.find(x => x.id === selectedQuestId);
          if (q) {
            const results = selectedMonsterIds.map(mid => {
              const m = a.monsters.find(x => x.id === mid);
              return m && m.status === 'idle' ? Models.calculateResult(m, q, a) : null;
            }).filter(Boolean);
            if (results.length > 0) {
              a.lastResult = results; Audio.playSfx('depart'); Game.setState('report');
            }
          }
        }
      }

      if (currentTab === 'shop') {
        const keys = ['forge', 'intel', 'lie_school', 'stables'];
        keys.forEach((key, i) => {
          const cy = 90 + i * 70;
          if (my >= cy && my <= cy + 60) {
            const res = Models.buyUpgrade(a, key);
            if (res.success) {
              Audio.playSfx('upgrade'); showToast(`Куплено: ${Models.UPGRADES_CONFIG[key].name}`);
            } else {
              Audio.playSfx('fail'); showToast(res.reason);
            }
          }
        });

        // Кнопка найма нежити (под апгрейдами)
        if (my >= 380 && my <= 430) {
          const res = Models.hireUndead(a);
          if (res.success) {
            Audio.playSfx('hire'); showToast(`Нанят: ${res.monster.name} (${res.monster.speciesLabel})!`);
          } else {
            Audio.playSfx('fail'); showToast(res.reason);
          }
        }
      }
    }
  }

  function handleReportClick(mx, my) {
    if (mx >= 220 && mx <= 420 && my >= 385 && my <= 425) {
      applyResult();
      Game.setState('agency');
      currentTab = 'quests';
    }
  }

  function handleEndDayClick(mx, my) {
    // Кнопка Следующий день
    if (mx >= 220 && mx <= 420 && my >= 390 && my <= 430) {
      Audio.playSfx('click');
      Models.nextDay(Game.agency);

      if (Game.agency.day > Game.agency.maxDays) {
        alert("Вы выжили 14 дней!");
        Game.agency = Models.createAgency();
      }
      currentTab = 'monsters'; selectedQuestId = null; selectedMonsterIds = [];
      Game.setState('agency');
    }
  }

  function applyResult() {
    const a = Game.agency;
    const results = Array.isArray(a.lastResult) ? a.lastResult : [a.lastResult];

    results.forEach(r => {
      a.gold += r.gold;
      a.dayStats.goldEarned += r.gold;
      if (r.type === 'overkill') a.threat = Math.min(1.0, a.threat + 0.05);

      const m = a.monsters.find(x => x.id === r.monsterId);
      if (r.type === 'success' || r.type === 'overkill') a.dayStats.questsDone++;

      if (m) {
        if (r.type === 'lost') { a.monsters = a.monsters.filter(x => x.id !== m.id); a.dayStats.losses++; }
        else if (r.type === 'injury' || r.injury) m.status = 'injured';
      }

      a.dayStats.missions.push({ monsterName: r.monsterName, questTitle: r.questTitle, type: r.type, gold: r.gold });
      a.quests = a.quests.filter(x => x.id !== r.questId);
    });

    a.lastResult = null; selectedMonsterIds = []; selectedQuestId = null;
  }

  function renderAgency() {
    const a = Game.agency;
    const T = Renderer.THEME;

    Renderer.gradientRect(0, 0, 640, 48, '#1f232c', '#15171d');
    Renderer.text(`День ${a.day}/14`, 20, 30, { color: T.accent, font: 'bold 16px system-ui' });
    Renderer.text(`Золото: ${a.gold}`, 150, 30, { color: T.text, size: '15px' });
    Renderer.text(`Угроза: ${(a.threat * 100).toFixed(0)}%`, 280, 30, { color: T.danger, size: '15px' });

    // Левое меню (3 вкладки + кнопка)
    const tabs = [
      { id: 'monsters', label: 'ШТАТ', y: 60 },
      { id: 'quests', label: 'ЗАКАЗЫ', y: 105 },
      { id: 'shop', label: 'МАГАЗИН', y: 150 }
    ];

    tabs.forEach(t => {
      const isActive = currentTab === t.id;
      Renderer.roundRect(10, t.y, 140, 35, 6, isActive ? T.panelHi : T.bg);
      Renderer.roundRectStroke(10, t.y, 140, 35, 6, isActive ? T.accent : T.border, isActive ? 2 : 1);
      Renderer.text(t.label, 80, t.y + 23, { color: isActive ? T.accent : T.muted, align: 'center', font: 'bold 13px system-ui' });
    });

    // Кнопка "Завершить день"
    Renderer.gradientRect(10, 220, 140, 45, '#3b82f6', '#1d4ed8');
    Renderer.roundRectStroke(10, 220, 140, 45, 6, T.select, 1);
    Renderer.text('ЗАВЕРШИТЬ', 80, 238, { color: '#fff', align: 'center', font: 'bold 13px system-ui' });
    Renderer.text('ДЕНЬ', 80, 255, { color: '#fff', align: 'center', font: 'bold 13px system-ui' });

    Renderer.roundRect(160, 60, 470, 410, 8, T.panel);
    Renderer.roundRectStroke(160, 60, 470, 410, 8, T.border, 1);

    if (currentTab === 'monsters') {
      Renderer.text('ВАШИ МОНСТРЫ', 180, 85, { color: T.muted, font: 'bold 14px system-ui' });
      a.monsters.forEach((m, i) => {
        const cy = 100 + i * 45;
        const isSel = selectedMonsterIds.includes(m.id);
        const monImgKey = 'mon_' + m.speciesKey.toLowerCase();
      Renderer.roundRect(180, cy, 430, 40, 6, isSel ? T.panelHi : T.bg);
        Renderer.roundRectStroke(180, cy, 430, 40, 6, isSel ? T.success : T.border, isSel ? 2 : 1);
        Renderer.drawMonsterIcon(monImgKey, 188, cy + 3, 34);
        Renderer.text(`${m.name} [${m.speciesLabel}]`, 235, cy + 18, { color: T.text, font: 'bold 14px system-ui' });
        Renderer.text(`СИЛ:${m.stats.str} ЛОВ:${m.stats.agi} ИНТ:${m.stats.int}`, 235, cy + 32, { color: T.muted, font: '11px monospace' });
        Renderer.text(m.status === 'idle' ? 'Свободен' : 'Ранен', 595, cy + 18, { color: m.status === 'idle' ? T.success : T.danger, size: '12px', align: 'right' });
      });

      Renderer.text('КАНДИДАТЫ', 180, 285, { color: T.muted, font: 'bold 14px system-ui' });
      a.candidates.forEach((c, i) => {
        const cy = 300 + i * 30;
        const isSel = selectedCandidateId === c.id;
        Renderer.roundRect(180, cy, 430, 25, 4, isSel ? T.panelHi : T.bg);
        Renderer.roundRectStroke(180, cy, 430, 25, 4, isSel ? T.accent : T.border, 1);
        Renderer.text(`${c.name} [${c.speciesLabel}]`, 190, cy + 17, { color: T.text, size: '12px' });
      });

      const canHire = selectedCandidateId !== null;
      Renderer.gradientRect(180, 420, 430, 35, canHire ? '#22c55e' : '#2c313c', canHire ? '#166534' : '#171a21');
      Renderer.roundRectStroke(180, 420, 430, 35, 6, canHire ? T.success : T.border, 1);
      Renderer.text('НАНЯТЬ ВЫБРАННОГО', 395, 442, { color: canHire ? '#fff' : T.muted, align: 'center', font: 'bold 14px system-ui' });
    }

    if (currentTab === 'quests') {
      Renderer.text('ДОСКА ЗАКАЗОВ', 180, 85, { color: T.muted, font: 'bold 14px system-ui' });
      a.quests.forEach((q, i) => {
        const cy = 100 + i * 70;
        const isSel = selectedQuestId === q.id;
        if (q.intercepted) {
          Renderer.roundRect(180, cy, 430, 60, 6, '#1a1c23');
          Renderer.text(q.title, 195, cy + 24, { color: T.muted, font: 'italic 14px system-ui' });
          Renderer.text('ПЕРЕХВАЧЕНО КОНКУРЕНТАМИ', 195, cy + 44, { color: T.danger, font: 'bold 12px system-ui' });
          return;
        }
        const questImgKey = 'quest_' + q.type.toLowerCase();
        Renderer.roundRect(180, cy, 430, 60, 6, isSel ? T.panelHi : T.bg);
        Renderer.roundRectStroke(180, cy, 430, 60, 6, isSel ? T.select : T.border, isSel ? 2 : 1);
        Renderer.drawImage(questImgKey, 188, cy + 6, 48, 48);
        Renderer.text(q.title, 248, cy + 22, { color: T.text, font: 'bold 14px system-ui' });
        Renderer.text(`Сложность: ${q.difficulty} | Риск: ${q.risk}`, 248, cy + 42, { color: T.muted, size: '12px' });
        Renderer.text(`${q.reward} зол.`, 590, cy + 22, { color: T.accent, align: 'right', font: 'bold 14px system-ui' });
      });

      if (selectedQuestId) {
        Renderer.roundRect(180, 370, 430, 75, 6, T.panelHi);
        Renderer.roundRectStroke(180, 370, 430, 75, 6, T.border, 1);
        Renderer.text('Кого отправим? (до 3 монстров)', 195, 390, { color: T.muted, size: '12px' });
        a.monsters.forEach((m, i) => {
          const cx = 180 + i * 95;
          const isSelM = selectedMonsterIds.includes(m.id);
          const monImgKey = 'mon_' + m.speciesKey.toLowerCase();
          Renderer.roundRect(cx, 400, 80, 35, 4, isSelM ? T.bg : '#111');
          Renderer.roundRectStroke(cx, 400, 80, 35, 4, isSelM ? T.success : T.border, 1);
          Renderer.drawMonsterIcon(monImgKey, cx + 6, 403, 24);
          Renderer.text(m.name, cx + 38, 413, { color: isSelM ? T.success : T.text, align: 'center', size: '10px', font: 'bold system-ui' });
          Renderer.text(m.status === 'idle' ? 'Готов' : 'Ранен', cx + 40, 426, { color: m.status === 'idle' ? T.success : T.danger, align: 'center', size: '8px' });
        });
        const canSend = selectedMonsterIds.length > 0;
        Renderer.gradientRect(180, 440, 430, 25, canSend ? '#3b82f6' : '#2c313c', canSend ? '#1d4ed8' : '#171a21');
        Renderer.roundRectStroke(180, 440, 430, 25, 4, canSend ? T.select : T.border, 1);
        Renderer.text(`ОТПРАВИТЬ (${selectedMonsterIds.length}/3)`, 395, 457, { color: canSend ? '#fff' : T.muted, align: 'center', font: 'bold 12px system-ui' });
      }
    }

    if (currentTab === 'shop') {
      Renderer.text('УЛУЧШЕНИЯ АГЕНТСТВА', 180, 85, { color: T.muted, font: 'bold 14px system-ui' });
      const keys = ['forge', 'intel', 'lie_school', 'stables'];

      keys.forEach((key, i) => {
        const conf = Models.UPGRADES_CONFIG[key];
        const lvl = a.upgrades[key];
        const cost = conf.baseCost * (lvl + 1);
        const maxed = lvl >= conf.maxLevel;
        const canAfford = a.gold >= cost && !maxed;

        const cy = 90 + i * 65; // Уменьшили высоту, чтобы влезла кнопка нежити
        Renderer.roundRect(180, cy, 430, 55, 6, T.bg);
        Renderer.roundRectStroke(180, cy, 430, 55, 6, maxed ? T.success : (canAfford ? T.accent : T.border), 1);

        Renderer.text(conf.name, 195, cy + 20, { color: T.text, font: 'bold 15px system-ui' });
        Renderer.text(conf.desc, 195, cy + 38, { color: T.muted, size: '11px' });

        let pips = "";
        for(let j=0; j<conf.maxLevel; j++) pips += (j < lvl) ? "■ " : "□ ";
        Renderer.text(pips, 195, cy + 50, { color: T.success, size: '10px' });

        if (maxed) {
          Renderer.text('MAX', 590, cy + 30, { color: T.success, align: 'right', font: 'bold 16px system-ui' });
        } else {
          Renderer.text(`${cost} зол.`, 590, cy + 22, { color: canAfford ? T.accent : T.danger, align: 'right', font: 'bold 14px system-ui' });
          Renderer.text(canAfford ? 'КУПИТЬ' : 'НЕТ ЗОЛОТА', 590, cy + 40, { color: canAfford ? T.text : T.muted, align: 'right', size: '11px' });
        }
      });

      // Кнопка найма нежити
      const canAffordUndead = a.gold >= 150;
      Renderer.roundRect(180, 360, 430, 60, 6, T.bg);
      Renderer.roundRectStroke(180, 360, 430, 60, 6, canAffordUndead ? T.select : T.border, 2);
      Renderer.text('НАНЯТЬ НЕЖИТЬ', 195, 385, { color: T.select, font: 'bold 15px system-ui' });
      Renderer.text('Случайный Скелет или Вампир', 195, 405, { color: T.muted, size: '12px' });
      Renderer.text('150 зол.', 590, 390, { color: canAffordUndead ? T.accent : T.danger, align: 'right', font: 'bold 14px system-ui' });
    }
  }

  function renderReport() {
    const results = Array.isArray(Game.agency.lastResult) ? Game.agency.lastResult : [Game.agency.lastResult];
    const T = Renderer.THEME;
    const ctx = Game.ctx;

    Renderer.roundRect(50, 50, 540, 380, 12, T.panel);
    Renderer.roundRectStroke(50, 50, 540, 380, 12, T.border, 2);

    if (results.length === 1) {
      renderSingleReport(results[0]);
    } else {
      renderMultiReport(results);
    }
  }

  function renderSingleReport(r) {
    const T = Renderer.THEME;
    const ctx = Game.ctx;

    Renderer.text(`Докладная от ${r.monsterName}`, 320, 90, { color: T.muted, align: 'center', font: 'bold 16px system-ui' });
    Renderer.text(`Задание: ${r.questTitle}`, 320, 115, { color: T.accent, align: 'center', font: 'italic 14px system-ui' });

    Renderer.text(`Результат: ${r.modifier}`, 320, 145, { color: r.modifier === 'ОВЕРКИЛЛ' ? T.danger : T.success, align: 'center', font: 'bold 16px system-ui' });
    if (r.modifierDesc) Renderer.text(r.modifierDesc, 320, 165, { color: T.muted, align: 'center', size: '12px' });

    const maxWidth = 460;
    const startY = 180;
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

    const int = Game.agency.monsters.find(m => m.id === r.monsterId)?.stats.int || 10;
    let trust = "Среднее"; let color = T.accent;
    if (int >= 14) { trust = "Высокое"; color = T.success; }
    else if (int <= 7) { trust = "Низкое"; color = T.danger; }

    Renderer.text(`Интеллект: ${int} (Доверие: ${trust})`, 320, 330, { color: color, align: 'center', size: '14px' });

    Renderer.gradientRect(220, 385, 200, 40, '#3b82f6', '#1d4ed8');
    Renderer.roundRectStroke(220, 385, 200, 40, 6, T.select, 1);
    Renderer.text('ПРИНЯТЬ ОТЧЁТ', 320, 405, { color: '#fff', align: 'center', font: 'bold 16px system-ui' });
  }

  function renderMultiReport(results) {
    const T = Renderer.THEME;
    Renderer.text(`МНОГОКРАТНЫЙ ОТЧЁТ (${results.length} монстров)`, 320, 85, { color: T.muted, align: 'center', font: 'bold 14px system-ui' });
    Renderer.text(`Задание: ${results[0].questTitle}`, 320, 110, { color: T.accent, align: 'center', font: 'italic 14px system-ui' });

    results.forEach((r, i) => {
      const y = 140 + i * 70;
      Renderer.roundRect(80, y, 480, 60, 6, T.bg);
      Renderer.roundRectStroke(80, y, 480, 60, 6, r.modifier === 'ОВЕРКИЛЛ' ? T.danger : T.border, 1);
      Renderer.text(`${r.monsterName}`, 100, y + 20, { color: T.text, font: 'bold 13px system-ui' });
      Renderer.text(`${r.modifier} — ${r.modifierDesc || ''}`, 100, y + 40, { color: r.modifier === 'ОВЕРКИЛЛ' ? T.danger : T.success, size: '11px' });
      Renderer.text(`"${r.reportText}"`, 100, y + 55, { color: T.muted, size: '10px' });
    });

    Renderer.gradientRect(220, 385, 200, 40, '#3b82f6', '#1d4ed8');
    Renderer.roundRectStroke(220, 385, 200, 40, 6, T.select, 1);
    Renderer.text('ПРИНЯТЬ ОТЧЁТЫ', 320, 405, { color: '#fff', align: 'center', font: 'bold 16px system-ui' });
  }

  function renderEndDay() {
    const a = Game.agency;
    const T = Renderer.THEME;

    Renderer.roundRect(50, 40, 540, 400, 12, T.panel);
    Renderer.roundRectStroke(50, 40, 540, 400, 12, T.border, 2);

    Renderer.text(`КОНЕЦ ДНЯ ${a.day}`, 320, 80, { color: T.accent, align: 'center', font: 'bold 24px system-ui' });

    Renderer.text('ИТОГИ:', 70, 120, { color: T.muted, font: 'bold 16px system-ui' });
    Renderer.text(`Заданий: ${a.dayStats.questsDone}`, 70, 145, { color: T.text, size: '14px' });
    Renderer.text(`Золото: +${a.dayStats.goldEarned}`, 200, 145, { color: T.success, size: '14px' });
    Renderer.text(`Перехвачено: ${a.dayStats.interceptedCount}`, 320, 145, { color: T.danger, size: '14px' });
    Renderer.text(`Потери: ${a.dayStats.losses}`, 470, 145, { color: T.danger, size: '14px' });

    Renderer.roundRect(70, 170, 500, 180, 8, '#111');
    Renderer.text('РЕЗУЛЬТАТЫ МИССИЙ:', 80, 190, { color: T.muted, size: '12px', font: 'bold 12px system-ui' });

    a.dayStats.missions.forEach((m, i) => {
      const my = 210 + i * 25;
      if (my > 330) return;

      let resText = ""; let color = T.text;
      if (m.type === 'success') { resText = `Успех (+${m.gold})`; color = T.success; }
      if (m.type === 'overkill') { resText = `Оверкилл! (+${m.gold})`; color = T.accent; }
      if (m.type === 'fail') { resText = `Провал`; color = T.danger; }
      if (m.type === 'injury') { resText = `Травма`; color = T.danger; }
      if (m.type === 'lost') { resText = `Исчез`; color = T.danger; }

      Renderer.text(`• ${m.monsterName} — ${m.questTitle}`, 80, my, { color: T.text, size: '12px' });
      Renderer.text(resText, 560, my, { color: color, size: '12px', align: 'right', font: 'bold 12px system-ui' });
    });

    Renderer.gradientRect(220, 390, 200, 40, '#3b82f6', '#1d4ed8');
    Renderer.roundRectStroke(220, 390, 200, 40, 6, T.select, 1);
    Renderer.text('СЛЕДУЮЩИЙ ДЕНЬ', 320, 410, { color: '#fff', align: 'center', font: 'bold 16px system-ui' });
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