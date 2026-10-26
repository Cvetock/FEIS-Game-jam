(function () {
  'use strict';

  const W = 1280;
  const H = 720;
  const T = Renderer.THEME;
  const SAVE_KEY = 'feis_last_human_v1';

  const TOP_FULL = 260; // Увеличен сдвиг, чтобы полностью спрятать увеличенные рамки
  const TOP_MINI = 0;
  const SLOTS = 6;

  function cx(pct) { return Math.round(W * pct / 100); }
  function cy(pct) { return Math.round(H * pct / 100); }
  function pw(pct) { return Math.round(W * pct / 100); }
  function ph(pct) { return Math.round(H * pct / 100); }
  function centreX(w) { return Math.round((W - w) / 2); }
  function centreY(h) { return Math.round((H - h) / 2); }

  const QUEST_ART = {
    farm: 'quest_farm', village: 'quest_farm', forest: 'quest_farm',
    caravan: 'quest_caravan', warehouse: 'quest_caravan', bazar: 'quest_caravan',
    cave: 'quest_cave', sewer: 'quest_cave',
    ruins: 'quest_ruins',
    citadel: 'quest_citadel', tower: 'quest_citadel', city: 'quest_citadel', ritual: 'quest_citadel'
  };

  const STAGE_INK = { 1: '#3f6b2a', 2: '#8a6d1a', 3: '#8a4a12', 4: '#7a1f1f' };
  const STAGE_LIGHT = { 1: '#4ade80', 2: '#e0c46a', 3: '#e0904a', 4: '#e06060' };

  const MISSION_LABELS = {
    success: { text: 'Успех', color: '#3f6b2a' },
    partial: { text: 'Частично', color: '#8a6d1a' },
    overkill: { text: 'Оверкилл!', color: '#8a4a12' },
    fail: { text: 'Провал', color: '#7a1f1f' },
    injury: { text: 'Травма', color: '#7a1f1f' },
    lost: { text: 'Исчез', color: '#7a1f1f' }
  };

  const STATUS_LABELS = {
    idle: { text: 'СВОБОДЕН', color: '#3f6b2a' },
    busy: { text: 'ОТДЫХАЕТ', color: '#6b5a45' },
    injured: { text: 'РАНЕН', color: '#7a1f1f' }
  };

  const SLOT_LABELS = { weapon: 'ОРУЖИЕ', armor: 'БРОНЯ', amulet: 'АМУЛЕТ' };

  const TRANSITION_MAP = {
    'menu->intro': { type: 'fade', dur: 300 },
    'intro->agency': { type: 'fade', dur: 400 },
    'menu->agency': { type: 'fade', dur: 300 },
    'agency->monster': { type: 'scale', dur: 150 },
    'monster->agency': { type: 'scale', dur: 150 },
    'agency->mission': { type: 'slide', dur: 300 },
    'mission->report': { type: 'fade', dur: 250 },
    'report->agency': { type: 'fade', dur: 250 },
    'agency->endday': { type: 'fade', dur: 250 },
    'endday->agency': { type: 'fade', dur: 250 },
    'endday->tender': { type: 'fade', dur: 400 },
    'tender->victory': { type: 'fade', dur: 500 },
    'tender->defeat': { type: 'fade', dur: 500 },
    'agency->help': { type: 'fade', dur: 150 },
    'help->agency': { type: 'fade', dur: 150 },
    'menu->help': { type: 'fade', dur: 150 },
    'help->menu': { type: 'fade', dur: 150 },
    'agency->pause': { type: 'fade', dur: 150 },
    'pause->agency': { type: 'fade', dur: 150 },
    'pause->menu': { type: 'fade', dur: 300 },
    'victory->menu': { type: 'fade', dur: 300 },
    'defeat->menu': { type: 'fade', dur: 300 }
  };

  let currentTab = 'hire';
  let selectedQuestId = null;
  let selectedMonsterIds = [];
  let selectedMonsterViewId = null;
  let popupSlot = null;
  let toast = { msg: '', t: 0 };
  let tender = null;
  let outcome = null;
  let time = 0;
  let hitAreas = [];
  let transition = null;
  let helpFrom = 'menu';
  let missionTimer = 0;
  let reportTime = 0;
  let keysPrev = {};
  let saveAvailable = false;
  let introTime = 0;
  let panelAnim = 0;
  let panelTarget = 0;
  let gameDifficulty = 'normal';

  let showStatsHelp = false;
  let showEndDayConfirm = false;
  let activeTutorial = null;
  let lieSoundPlayed = false;

  function inRect(p, x, y, w, h) { return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h; }
  function hoverRect(x, y, w, h) { return inRect(Input.mouse, x, y, w, h); }
  function addArea(x, y, w, h, onClick) { hitAreas.push({ x, y, w, h, onClick }); }
  function showToast(msg) { toast.msg = msg; toast.t = 3.6; }
  function pressed(code) { const now = Input.isKeyPressed(code); const was = !!keysPrev[code]; keysPrev[code] = now; return now && !was; }
  function easeInOut(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
  function panelOffset() { return easeInOut(panelAnim) * TOP_FULL; }

  function button(x, y, w, h, label, onClick, opts) {
    opts = opts || {};
    const disabled = !!opts.disabled;
    const variant = opts.variant || 'primary';
    const font = opts.font || 'bold 12px Georgia';
    const hovered = !disabled && hoverRect(x, y, w, h);
    const r = 6;

    Renderer.ctx.save();
    Renderer.pathRoundRect(x, y, w, h, r);
    Renderer.ctx.clip();

    if (disabled) {
      Renderer.gradientRect(x, y, w, h, '#2c241e', '#1c1510');
      Renderer.ctx.restore();
      Renderer.roundRectStroke(x, y, w, h, r, '#4a3b2c', 1.5);
      Renderer.text(label, x + w / 2, y + h / 2 + 4, { color: '#6b5a45', align: 'center', font });
    } else {
      if (hovered) Renderer.gradientRect(x, y, w, h, '#5a3a1f', '#2f1c0d');
      else Renderer.gradientRect(x, y, w, h, '#3a2211', '#1a0d05');
      Renderer.ctx.restore();

      Renderer.roundRectStroke(x, y, w, h, r, hovered ? '#f5c542' : '#c9a227', hovered ? 2 : 1.5);

      let color = '#d8b96a';
      if (variant === 'danger') color = '#ef4444';
      else if (variant === 'success') color = '#4ade80';
      else if (variant === 'hero') color = '#a855f7';
      if (hovered) color = '#fff5d1';

      Renderer.text(label, x + w / 2, y + h / 2 + 4, { color, align: 'center', font });
    }

    if (disabled) {
      if (opts.reason) addArea(x, y, w, h, function () { showToast(opts.reason); });
    } else {
      addArea(x, y, w, h, function () { Audio.playSfx('click'); onClick(); });
    }
  }

  function noteCard(x, y, w, h, opts) {
    opts = opts || {};
    const disabled = !!opts.disabled;
    const selected = !!opts.selected;
    const hovered = !disabled && hoverRect(x, y, w, h);
    const r = 6;

    if (opts.shadow) Renderer.rect(x + 4, y + 4, w, h, 'rgba(0,0,0,0.15)');
    Renderer.roundRect(x, y, w, h, r, 'rgba(255, 248, 230, 0.4)');

    if (selected) Renderer.roundRectStroke(x, y, w, h, r, '#a8862a', 2.5);
    else if (hovered) Renderer.roundRectStroke(x, y, w, h, r, 'rgba(168,134,42,0.85)', 1.8);
    else Renderer.roundRectStroke(x, y, w, h, r, 'rgba(140, 100, 50, 0.3)', 1);

    if (disabled) Renderer.roundRect(x, y, w, h, r, 'rgba(30,20,10,0.15)');

    if (opts.onClick && !disabled) addArea(x, y, w, h, function () { Audio.playSfx('select'); opts.onClick(); });
    else if (opts.onClick && disabled) addArea(x, y, w, h, function () { showToast(opts.reason || 'Недоступно'); });
  }

  function drawTutorial() {
    Renderer.rect(0, 0, W, H, 'rgba(0,0,0,0.6)');
    const tw = 600, th = 220;
    const tx = centreX(tw), ty = centreY(th);

    Renderer.paper(tx, ty, tw, th, { r: 8, burn: 15 });
    Renderer.ink('ОБУЧЕНИЕ', tx + tw/2, ty + 40, { align: 'center', font: 'bold 22px Georgia' });
    Renderer.rect(tx + 40, ty + 60, tw - 80, 1, 'rgba(90,60,25,0.4)');

    Renderer.wrapText(activeTutorial, tw - 80, '16px Georgia').forEach((line, i) => {
      Renderer.text(line, tx + tw/2, ty + 100 + i * 25, { color: T.inkSoft, align: 'center', font: '16px Georgia' });
    });

    button(tx + tw/2 - 70, ty + th - 60, 140, 45, 'ПОНЯТНО', () => { activeTutorial = null; Audio.playSfx('click'); });
  }

  function checkTutorials() {
    const a = Game.agency;
    if (!a || !a.tutorials) return;
    if (activeTutorial) return;

    if (!a.tutorials.hire && currentTab === 'hire' && Game.state === 'agency') {
      a.tutorials.hire = true;
      activeTutorial = "СОВЕТ: В Таверне вы нанимаете монстров.\nОбращайте внимание на их черты и характеристики.\nНайм тратит золото и попытки собеседования!";
    } else if (!a.tutorials.quests && currentTab === 'quests' && Game.state === 'agency') {
      a.tutorials.quests = true;
      activeTutorial = "СОВЕТ: Выберите заказ, затем монстра и нажмите 'ОТПРАВИТЬ'.\nУчитывайте 'Рекомендуемый вид' и эффективные статы.\nНе забудьте про капризы монстров!";
    } else if (!a.tutorials.monster && Game.state === 'monster') {
      a.tutorials.monster = true;
      activeTutorial = "СОВЕТ: Это досье монстра.\nКликните на пустой слот (Оружие, Броня, Амулет), чтобы надеть предмет.\nРасходники применяются кликом по сумке внизу.";
    } else if (!a.tutorials.endday && Game.state === 'endday') {
       a.tutorials.endday = true;
       activeTutorial = "СОВЕТ: Задания завершены!\nЗдесь вы видите результаты и получаете золото.\nСледите за ростом УГРОЗЫ — если она достигнет 100%, игра закончится.";
    }
  }

  function drawAgency() {
    const a = Game.agency;
    Renderer.drawImage('bg_main', 0, 0, W, H);
    Renderer.rect(0, 0, W, H, 'rgba(8,6,4,0.4)');

    drawBottomBar(a);
    drawCentral(a);
    drawTopPanel(a);

    if (showStatsHelp) {
      Renderer.rect(0, 0, W, H, 'rgba(0,0,0,0.6)');
      const popW = 500, popH = 340;
      const popX = centreX(popW), popY = centreY(popH);

      Renderer.paper(popX, popY, popW, popH, { r: 8, burn: 15 });
      Renderer.ink('ХАРАКТЕРИСТИКИ', popX + popW/2, popY + 45, { align: 'center', font: 'bold 22px Georgia' });
      Renderer.rect(popX + 40, popY + 65, popW - 80, 1, 'rgba(90,60,25,0.4)');

      const statsHelp = [
        "СИЛА — отвечает за фермы, караваны, склады, базары.",
        "ИНТЕЛЛЕКТ — подземелья, руины, башни, ритуалы.",
        "   * Чем выше ИНТ, тем чаще монстр пишет честные отчёты!",
        "ЛОВКОСТЬ — деревни, леса, города.",
        "УДАЧА — увеличивает шанс критического успеха (оверкилл)."
      ];

      statsHelp.forEach((line, i) => {
        Renderer.text(line, popX + 40, popY + 110 + i * 35, { color: T.inkSoft, font: 'bold 13px Georgia' });
      });

      button(popX + popW/2 - 75, popY + popH - 70, 150, 45, 'ПОНЯТНО', () => { showStatsHelp = false; });
    }

    if (showEndDayConfirm) {
      Renderer.rect(0, 0, W, H, 'rgba(0,0,0,0.6)');
      const cW = 440, cH = 220;
      const cX = centreX(cW), cY = centreY(cH);
      Renderer.paper(cX, cY, cW, cH, { r: 8, burn: 15 });
      Renderer.ink('ЗАВЕРШИТЬ ДЕНЬ?', cX + cW/2, cY + 70, { align: 'center', font: 'bold 24px Georgia' });
      Renderer.text('Все свободные монстры будут отдыхать.', cX + cW/2, cY + 110, { color: T.inkSoft, align: 'center', font: '14px Georgia' });

      button(cX + 50, cY + 140, 150, 50, 'ДА', () => {
        showEndDayConfirm = false;
        setState('endday');
      }, { font: 'bold 16px Georgia' });

      button(cX + 240, cY + 140, 150, 50, 'ОТМЕНА', () => {
        showEndDayConfirm = false;
      }, { variant: 'ghost', font: 'bold 16px Georgia' });
    }
  }

  function drawTopPanel(a) {
    const offset = panelOffset();

    Renderer.ctx.save();

    // ── Статичные элементы (не зависят от сдвига offset) ──
    Renderer.text('ДЕНЬ ' + a.day + '/' + a.maxDays + ' · КАЗНА: ' + a.gold + ' зол.', 20, 30, { color: '#e7d7ae', font: 'bold 16px Georgia' });
    Renderer.text('УГРОЗА: ' + Math.round(a.threat * 100) + '%', 20, 55, { color: STAGE_LIGHT[Models.threatStage(a.threat)], font: 'bold 16px Georgia' });
    button(20, 70, 180, 25, 'СПРАВКА ПО СТАТАМ', () => { showStatsHelp = true; }, { variant: 'ghost', font: 'bold 11px Georgia' });

    // Статичная кнопка сворачивания
    const btnW = 55, btnH = 130;
    Renderer.drawImage('btn_collapse', W - btnW - 30, 10, btnW, btnH);
    addArea(W - btnW - 30, 10, btnW, btnH, () => {
      panelTarget = panelTarget === 1 ? 0 : 1;
      Audio.playSfx('pick');
    });

    // ── Элементы, которые уезжают наверх ──
    Renderer.ctx.translate(0, -offset);

    // Увеличенные размеры рамок
    const slotW = 160;
    const slotH = 220;
    const gap = 15;
    const startX = centreX((slotW + gap) * SLOTS - gap);
    const yOffset = 20;

    for (let i = 0; i < SLOTS; i++) {
      const x = startX + i * (slotW + gap);
      const m = a.monsters[i];
      const capped = i < Models.rosterCap(a);
      const hovered = hoverRect(x, yOffset - offset, slotW, slotH);

      if (!capped) {
        Renderer.drawImage('roster_slot_locked', x, yOffset, slotW, slotH);
      } else {
        const yHoverOff = hovered ? -5 : 0;
        Renderer.drawImage('roster_slot', x, yOffset + yHoverOff, slotW, slotH);

        if (m) {
           if (m.injuryDays > 0) {
             Renderer.roundRect(x + 18, yOffset + 24 + yHoverOff, slotW - 36, slotW - 36, 4, 'rgba(239, 68, 68, 0.4)');
           }

           // Центрирование портрета внутри рамки
           const portraitX = x + 25;
           const portraitY = yOffset + 55 + yHoverOff;
           const portraitSize = 105;

           Renderer.drawImage('mon_' + m.speciesKey, portraitX, portraitY, portraitSize, portraitSize);

           addArea(x, yOffset - offset, slotW, slotH, () => {
             selectedMonsterViewId = m.id;
             setState('monster');
           });
        }
      }
    }
    Renderer.ctx.restore();
  }

  function drawBottomBar(a) {
    const barY = H - 110;
    Renderer.gradientRect(0, barY, W, 110, 'rgba(15, 10, 6, 0)', 'rgba(15, 10, 6, 0.95)');

    const btns = [
      { id: 'shop', img: 'btn_shop', w: 230, h: 80, tab: 'shop' },
      { id: 'market', img: 'btn_market', w: 230, h: 80, tab: 'items' },
      { id: 'endday', img: 'btn_end_day', w: 420, h: 95, action: () => { showEndDayConfirm = true; } },
      { id: 'map', img: 'btn_map', w: 230, h: 80, tab: 'quests' },
      { id: 'tavern', img: 'btn_tavern', w: 230, h: 80, tab: 'hire' }
    ];

    const btnGap = -5;
    const totalW = 230 * 4 + 420 + btnGap * 4;
    let currentX = centreX(totalW);

    btns.forEach(b => {
      const y = barY + (110 - b.h) / 2;
      const hovered = hoverRect(currentX, y, b.w, b.h);
      const active = b.tab && currentTab === b.tab;

      if (hovered || active) {
        Renderer.drawImage(b.img, currentX - b.w*0.025, y - b.h*0.025, b.w * 1.05, b.h * 1.05);
      } else {
        Renderer.drawImage(b.img, currentX, y, b.w, b.h);
      }

      addArea(currentX, y, b.w, b.h, () => {
        Audio.playSfx('click');
        if (b.tab) currentTab = b.tab;
        if (b.action) b.action();
      });
      currentX += b.w + btnGap;
    });
  }

  function drawCentral(a) {
    const cW = 1200;
    const cH = 520;
    const cX = centreX(cW);
    const cY = 90;

    if (!Renderer.drawImage('bg_paper', cX, cY, cW, cH)) {
        Renderer.paper(cX, cY, cW, cH, { r: 5, burn: 14 });
    }

    const r = { x: cX + 80, y: cY + 80, w: cW - 160, h: cH - 110 };

    if (currentTab === 'hire') drawNewHireTab(a, r);
    else if (currentTab === 'quests') drawQuestsTab(a, r);
    else if (currentTab === 'shop') drawShopTab(a, r);
    else if (currentTab === 'items') drawItemsTab(a, r);
  }

  function drawNewHireTab(a, r) {
    Renderer.ink('Таверна (Найм монстров)', r.x, r.y, { font: 'bold 26px Georgia' });
    Renderer.text('Пополняй ряды гильдии сильнейшими.\nКаждый монстр - это новые возможности и добыча.',
      r.x, r.y + 30, { color: '#4a3520', font: '15px Georgia' });

    Renderer.text('собеседований ' + a.interviewsLeft + '/3 · штат ' + a.monsters.length + '/' + Models.rosterCap(a),
      r.x + r.w, r.y, { color: T.inkSoft, align: 'right', font: 'bold 14px Georgia' });

    if (!a.candidates.length) {
      Renderer.ink('Кандидаты на сегодня закончились.', r.x + r.w / 2, r.y + r.h / 2, { align: 'center', font: '16px Georgia' });
      return;
    }

    const cardW = 190, cardH = 270, gap = 15;
    const startX = r.x + (r.w - (cardW * a.candidates.length + gap * (a.candidates.length - 1))) / 2;

    a.candidates.forEach((cand, i) => {
       const x = startX + i*(cardW+gap);
       const y = r.y + 70;
       const full = a.monsters.length >= Models.rosterCap(a);
       const canHire = a.interviewsLeft > 0 && !full;

       noteCard(x, y, cardW, cardH, { shadow: true });

       const iconSize = 90;
       Renderer.note(x + cardW / 2 - iconSize / 2, y + 15, iconSize, iconSize, { pin: false });
       Renderer.drawMonsterIcon('mon_' + cand.speciesKey, x + cardW / 2 - iconSize / 2 + 4, y + 19, iconSize - 8);

       Renderer.ink(cand.name + ' [Ур.' + cand.level + ']', x + cardW / 2, y + 130, { align: 'center', font: 'bold 18px Georgia' });
       Renderer.text('[' + cand.speciesLabel + ']', x + cardW / 2, y + 148, { color: T.inkSoft, align: 'center', font: '12px Georgia' });
       Renderer.text('Черта: ' + cand.traits[0], x + cardW / 2, y + 165, { color: '#6b4a18', align: 'center', font: 'italic 12px Georgia' });

       const stats = [['СИЛА', cand.stats.str], ['ЛОВ', cand.stats.agi], ['ИНТ', cand.stats.int], ['УДА', cand.stats.luck]];
       stats.forEach(function (s, j) {
         const sx = x + 15 + (j % 2) * (cardW / 2 - 15);
         const sy = y + 205 + Math.floor(j / 2) * 20;
         Renderer.text(s[0], sx, sy, { color: T.inkSoft, font: '11px system-ui' });
         Renderer.ink(String(s[1]), sx + cardW / 2 - 25, sy, { align: 'right', font: 'bold 16px Georgia' });
       });

       button(x + 15, y + cardH - 40, cardW - 30, 30, full ? 'СТОЙЛА ПОЛНЫ' : ('НАНЯТЬ (' + cand.cost + ' зол)'), function () {
         hireCandidate(cand);
       }, {
         font: 'bold 13px Georgia', disabled: !canHire,
         reason: full ? 'Стойла переполнены' : 'Собеседования закончились'
       });
    });
  }

  function hireCandidate(cand) {
    const a = Game.agency;
    const idx = a.candidates.findIndex(function (c) { return c.id === cand.id; });
    if (idx === -1) return;

    const res = Models.tryHire(cand, a);
    if (!res.consumed) { showToast(res.reason); Audio.playSfx('reject'); return; }

    a.candidates.splice(idx, 1);
    if (res.success) {
      a.monsters.push(cand);
      Audio.playSfx('hire');
      showToast(cand.name + ' принят в отряд за ' + cand.cost + ' зол.');
    } else {
      Audio.playSfx('reject');
      showToast(res.reason);
    }
  }

  function drawQuestsTab(a, r) {
    Renderer.ink('Карта заданий', r.x, r.y, { font: 'bold 26px Georgia' });
    Renderer.text('перехват ' + Math.round(Models.interceptChance(a) * 100) + '%', r.x + r.w, r.y, { color: T.inkSoft, align: 'right', font: 'bold 14px Georgia' });

    const qW = (r.w - 30) / 2;
    const qH = 110;

    a.quests.forEach((q, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = r.x + col * (qW + 30);
      const y = r.y + 30 + row * (qH + 15);
      drawQuestNote(a, q, x, y, qW, qH);
    });

    const quest = a.quests.find(q => q.id === selectedQuestId);
    const panelY = r.y + 30 + 2 * (qH + 15);

    Renderer.rect(r.x, panelY, r.w, 1, 'rgba(90,60,25,0.3)');

    const monsters = selectedMonsterIds.map(id => a.monsters.find(m => m.id === id)).filter(Boolean);
    if (quest && monsters.length > 0) {
      const chance = Math.round(Models.groupSuccessChance(monsters, quest, a) * 100);
      Renderer.ink(`Отправляем на: ${quest.title} (Успех: ${chance}%)`, r.x, panelY + 25, { font: 'bold 16px Georgia', color: '#3f6b2a' });
    } else {
      Renderer.ink('Выберите заказ и монстра для отправки', r.x, panelY + 25, { font: 'bold 16px Georgia' });
    }

    const chipW = 140, chipH = 75, chipGap = 15;
    let currentX = r.x;

    a.monsters.forEach((m) => {
      const x = currentX;
      const y = panelY + 45;
      currentX += chipW + chipGap;

      const disabled = m.status !== 'idle' && m.injuryDays <= 0;
      const injured = m.injuryDays > 0;
      const selected = selectedMonsterIds.includes(m.id);

      noteCard(x, y, chipW, chipH, {
        disabled: disabled || injured, selected: selected, pin: false,
        onClick: () => {
          if (selected) {
             selectedMonsterIds = selectedMonsterIds.filter(id => id !== m.id);
          } else if (selectedMonsterIds.length < 3) {
             if (!quest) { showToast('Сначала выберите заказ!'); return; }
             const refusal = Models.getRefusalReason(m, quest, a);
             if (refusal) {
                 Audio.playSfx('reject');
                 showToast(m.name + ': ' + refusal);
             } else {
                 selectedMonsterIds.push(m.id);
             }
          }
        },
        reason: injured ? 'Монстр ранен' : 'Монстр отдыхает'
      });

      Renderer.drawMonsterIcon('mon_' + m.speciesKey, x + 5, y + 15, 45);
      Renderer.ink(m.name, x + 55, y + 25, { font: 'bold 13px Georgia' });

      const statMap = { str: 'СИЛА', agi: 'ЛОВКОСТЬ', int: 'ИНТЕЛЛЕКТ', luck: 'УДАЧА' };
      let statText = '';
      let statColor = T.inkSoft;

      if (quest) {
          const reqStat = Models.QUEST_STATS[quest.type] || 'str';
          const eff = Models.effectiveStat(m, quest, a);
          statText = `ЭФФ. ${statMap[reqStat]}: ${eff}`;
          statColor = '#3f6b2a';
      } else {
          const totalStr = m.stats.str + Models.itemBonus(m, 'str');
          const totalInt = m.stats.int + Models.itemBonus(m, 'int');
          const totalAgi = m.stats.agi + Models.itemBonus(m, 'agi');
          statText = `С:${totalStr} Л:${totalAgi} И:${totalInt}`;
      }

      Renderer.text(injured ? `ранен (${m.injuryDays}д)` : (disabled ? 'отдыхает' : statText), x + 55, y + 45, { color: (disabled||injured) ? '#7a1f1f' : statColor, font: '10px system-ui' });
    });

    const btnW = 200;
    button(r.x + r.w - btnW, panelY + 50, btnW, 55, 'ОТПРАВИТЬ', sendMission, {
      font: 'bold 16px Georgia',
      disabled: !quest || selectedMonsterIds.length === 0,
      reason: !quest ? 'Выберите заказ' : 'Выберите монстра'
    });
  }

  function drawQuestNote(a, q, x, y, w, h) {
    if (q.intercepted) {
      Renderer.note(x, y, w, h, { pin: true });
      Renderer.rect(x, y, w, h, 'rgba(30,22,14,0.45)');
      Renderer.drawIcon('ui_intercepted', x + 10, y + h / 2 - 25, 50, 50, { label: 'X', color: '#3a2a1a' });
      Renderer.text(q.title, x + 70, y + 35, { color: '#5d4a33', font: 'italic 12px Georgia' });
      Renderer.text('ПЕРЕХВАЧЕНО КОНКУРЕНТАМИ', x + 70, y + 60, { color: '#7a1f1f', font: 'bold 10px Georgia' });
      return;
    }

    noteCard(x, y, w, h, {
      selected: selectedQuestId === q.id,
      shadow: true,
      onClick: function () { selectedQuestId = q.id; selectedMonsterIds = []; }
    });

    const art = QUEST_ART[q.type];
    if (art) Renderer.drawIcon(art, x + 10, y + 15, 65, 65, { label: q.type, color: '#3a2a1a' });
    else {
      Renderer.roundRect(x + 10, y + 15, 65, 65, 5, 'rgba(90,60,25,0.2)');
      Renderer.ink(q.type.substring(0, 2).toUpperCase(), x + 42, y + 50, { align: 'center', font: 'bold 14px Georgia' });
    }

    Renderer.ink(q.title, x + 85, y + 30, { font: 'bold 14px Georgia' });
    Renderer.text('Сложность ' + q.difficulty + ' · ' + q.risk, x + 85, y + 50, { color: T.inkSoft, font: '11px system-ui' });
    Renderer.ink(q.reward + ' зол.', x + w - 15, y + 30, { align: 'right', font: 'bold 16px Georgia' });

    if (q.species && q.species.length) {
      Renderer.text('Рекомендуется: ' + q.species.map(s => Models.SPECIES[s].label).join('/') + ' (+2 к статам)', x + 85, y + 75, { color: '#6b4a18', font: 'italic 11px Georgia' });
    }
  }

  function sendMission() {
    const a = Game.agency;
    const quest = a.quests.find(function (q) { return q.id === selectedQuestId; });
    const monsters = selectedMonsterIds.map(function (id) { return a.monsters.find(function (m) { return m.id === id; }); }).filter(Boolean);

    if (!quest || monsters.length === 0 || quest.intercepted || monsters.some(function (m) { return m.status !== 'idle'; })) {
      showToast('Нужен свободный монстр и не перехваченный заказ');
      return;
    }
    a.lastResult = Models.calculateGroupResult(monsters, quest, a);
    Audio.playSfx('depart');
    setState('mission');
  }

  function drawShopTab(a, r) {
    Renderer.ink('Магазин улучшений', r.x, r.y, { font: 'bold 26px Georgia' });
    Renderer.text('В казне: ' + a.gold + ' зол.', r.x + r.w, r.y, { color: '#8a6d1a', align: 'right', font: 'bold 16px Georgia' });

    const keys = Models.UPGRADE_ORDER;
    const cardW = (r.w - 45) / 4;
    const cardH = 125;

    keys.forEach((key, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = r.x + col * (cardW + 15);
      const y = r.y + 40 + row * (cardH + 15);
      const conf = Models.UPGRADES_CONFIG[key];
      const lvl = a.upgrades[key];
      const maxed = lvl >= conf.maxLevel;
      const cost = conf.baseCost * (lvl + 1);
      const affordable = a.gold >= cost;

      noteCard(x, y, cardW, cardH, {});

      Renderer.ink(conf.name, x + 10, y + 25, { font: 'bold 14px Georgia' });
      Renderer.wrapText(conf.desc, cardW - 20, '11px system-ui').forEach((line, j) => {
        Renderer.text(line, x + 10, y + 45 + j * 14, { color: T.inkSoft, font: '11px system-ui' });
      });

      for (let j = 0; j < conf.maxLevel; j++) {
        Renderer.roundRect(x + 10 + j * 12, y + 95, 8, 8, 2, j < lvl ? '#8a6d1a' : 'rgba(90,60,25,0.25)');
      }

      if (maxed) {
        Renderer.text('МАКС', x + cardW - 10, y + 105, { color: '#3f6b2a', align: 'right', font: 'bold 12px Georgia' });
      } else {
        button(x + cardW - 90, y + 85, 80, 30, cost + ' зол.', () => buyUpgrade(key), {
          font: 'bold 13px Georgia', disabled: !affordable, reason: 'Нет золота'
        });
      }
    });

    const uY = r.y + 40 + 2 * (cardH + 15);
    const canUndead = a.gold >= 150 && a.monsters.length < Models.rosterCap(a);
    noteCard(r.x, uY, r.w, 75, {});
    Renderer.drawIcon('ui_crypt', r.x + 15, uY + 12, 50, 50, { label: 'Н', color: '#3a2a1a' });
    Renderer.ink('НАНЯТЬ НЕЖИТЬ', r.x + 80, uY + 32, { font: 'bold 16px Georgia' });
    Renderer.text('Случайный Скелет или Вампир, без собеседования', r.x + 80, uY + 52, { color: T.inkSoft, font: '12px system-ui' });

    button(r.x + r.w - 110, uY + 22, 100, 30, '150 зол.', () => hireUndead(), {
      font: 'bold 14px Georgia', disabled: !canUndead,
      reason: a.monsters.length >= Models.rosterCap(a) ? 'Стойла переполнены' : 'Нужно 150 золота'
    });
  }

  function buyUpgrade(key) {
    const res = Models.buyUpgrade(Game.agency, key);
    if (res.success) { Audio.playSfx('upgrade'); showToast('Куплено: ' + Models.UPGRADES_CONFIG[key].name); }
    else { Audio.playSfx('reject'); showToast(res.reason); }
  }

  function hireUndead() {
    const res = Models.hireUndead(Game.agency);
    if (res.success) { Audio.playSfx('hire'); showToast('Нанят: ' + res.monster.name + ' (' + res.monster.speciesLabel + ')'); }
    else { Audio.playSfx('reject'); showToast(res.reason); }
  }

  function inventoryCount(a, id) { return a.inventory.filter(function (x) { return x === id; }).length; }

  function drawItemsTab(a, r) {
    Renderer.ink('Рынок экипировки', r.x, r.y, { font: 'bold 26px Georgia' });
    Renderer.text('Сумка: ' + a.inventory.length + ' предм. · Казна: ' + a.gold + ' зол.', r.x + r.w, r.y, { color: '#8a6d1a', align: 'right', font: 'bold 14px Georgia' });

    const cardW = (r.w - 45) / 4;
    const cardH = 95;

    Models.ITEMS.forEach((item, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = r.x + col * (cardW + 15);
      const y = r.y + 40 + row * (cardH + 15);
      const owned = inventoryCount(a, item.id);
      const affordable = a.gold >= item.price;

      noteCard(x, y, cardW, cardH, {});

      Renderer.ink(item.name, x + 10, y + 25, { font: 'bold 14px Georgia' });
      Renderer.text(item.desc, x + 10, y + 45, { color: T.inkSoft, font: '11px system-ui' });

      if (owned > 0) {
        Renderer.text('В сумке: ' + owned, x + 10, y + 80, { color: '#3f6b2a', font: 'bold 12px Georgia' });
      }

      button(x + cardW - 80, y + 60, 70, 25, item.price + ' зол.', () => buyItem(item), {
        font: 'bold 12px Georgia', disabled: !affordable, reason: 'Нет золота'
      });
    });
  }

  function buyItem(item) {
    const res = Models.buyItem(Game.agency, item.id);
    if (res.success) { Audio.playSfx('upgrade'); showToast('Куплено: ' + item.name); }
    else { Audio.playSfx('reject'); showToast(res.reason); }
  }

  function drawMonsterView() {
    const a = Game.agency;
    const m = a.monsters.find(function (x) { return x.id === selectedMonsterViewId; });
    if (!m) return;

    hitAreas.length = 0;
    Renderer.rect(0, 0, W, H, 'rgba(6,4,2,0.8)');

    const cW = 1200;
    const cH = 520;
    const cX = centreX(cW);
    const cY = 90;

    if (!Renderer.drawImage('bg_paper', cX, cY, cW, cH)) {
      Renderer.paper(cX, cY, cW, cH, { r: 8, burn: 18 });
    }

    button(cX + cW - 190, cY + 40, 140, 45, 'НАЗАД', function () { popupSlot = null; setState('agency'); });

    const mX = cX + 80;
    const mY = cY + 50;

    Renderer.drawMonsterIcon('mon_' + m.speciesKey, mX, mY, 140);
    Renderer.ink(m.name + ' [Ур. ' + m.level + ']', mX + 170, mY + 30, { font: 'bold 36px Georgia' });

    let statusText = STATUS_LABELS[m.status]?.text || 'РАНЕН';
    if (m.injuryDays > 0) statusText = `РАНЕН (${m.injuryDays} дн.)`;
    const statusColor = m.injuryDays > 0 ? '#7a1f1f' : (STATUS_LABELS[m.status]?.color || '#7a1f1f');

    Renderer.text('[' + m.speciesLabel + '] · Опыт: ' + m.xp + '/' + (m.level * 2) + ' · ' + statusText, mX + 170, mY + 60, { color: statusColor, font: 'bold 16px Georgia' });
    Renderer.text('Черта: ' + m.traits[0] + ' — ' + (Content.TRAIT_INFO[m.traits[0]] || ''), mX + 170, mY + 90, { color: T.inkSoft, font: 'italic 15px Georgia' });

    const prefText = m.preference.replace(/_/g, ' ');
    Renderer.text('Каприз: ' + prefText + ' · заданий: ' + m.missions + ' · оверкиллов: ' + m.overkillCount, mX + 170, mY + 120, { color: '#7a6244', font: '14px system-ui' });

    const stats = [['СИЛА', m.stats.str, 'str'], ['ЛОВКОСТЬ', m.stats.agi, 'agi'], ['ИНТЕЛЛЕКТ', m.stats.int, 'int'], ['УДАЧА', m.stats.luck, 'luck']];
    stats.forEach(function (s, i) {
      const sx = mX + i * 220;
      const sy = mY + 180;
      const bonus = Models.itemBonus(m, s[2]);
      Renderer.text(s[0], sx, sy, { color: T.inkSoft, font: '13px system-ui' });
      Renderer.ink(String(s[1]) + (bonus ? ' (+' + bonus + ')' : ''), sx, sy + 30, { font: 'bold 26px Georgia', color: bonus ? '#3f6b2a' : undefined });
    });

    Renderer.ink('ЭКИПИРОВКА', mX, mY + 240, { font: 'bold 18px Georgia' });
    ['weapon', 'armor', 'amulet'].forEach(function (slot, i) {
      const sx = mX + i * 310;
      const sy = mY + 260;
      const sw = 290;
      const sh = 80;

      const itemId = m.equipment ? m.equipment[slot] : null;
      const item = Models.getItem(itemId);

      noteCard(sx, sy, sw, sh, {
        pin: false,
        selected: popupSlot === slot,
        onClick: () => { popupSlot = popupSlot === slot ? null : slot; Audio.playSfx('click'); }
      });

      Renderer.text(SLOT_LABELS[slot], sx + 15, sy + 25, { color: '#7a6244', font: '12px system-ui' });

      if (item) {
         Renderer.ink(item.name, sx + 15, sy + 45, { font: 'bold 16px Georgia' });
         const bonusText = Object.entries(item.bonus || {}).map(e => '+' + e[1] + ' ' + ({ str: 'СИЛ', agi: 'ЛОВ', int: 'ИНТ', luck: 'УДА' }[e[0]] || e[0])).join(' · ');
         let desc = bonusText;
         if (item.injuryMod < 0) desc += (desc ? ' · ' : '') + Math.round(item.injuryMod * -100) + '% к травме';
         Renderer.text(desc, sx + 15, sy + 65, { color: '#3f6b2a', font: 'bold 11px system-ui' });
      } else {
         Renderer.text('— пусто —', sx + 15, sy + 50, { color: '#8a7355', font: 'bold 16px Georgia' });
         Renderer.text('Нажмите, чтобы выбрать', sx + 15, sy + 65, { color: '#bfa878', font: '11px system-ui' });
      }
    });

    Renderer.ink('РАСХОДНИКИ (СУМКА)', mX, mY + 360, { font: 'bold 18px Georgia' });

    const sumkaWidth = cW - 380;
    Renderer.roundRectStroke(mX, mY + 375, sumkaWidth, 65, 6, 'rgba(140, 100, 50, 0.4)', 2);
    Renderer.roundRect(mX, mY + 375, sumkaWidth, 65, 6, 'rgba(30,20,10,0.1)');

    const bag = {};
    a.inventory.forEach(id => { bag[id] = (bag[id] || 0) + 1; });
    const consumables = Object.keys(bag).map(id => Models.getItem(id)).filter(item => item && item.type === 'consumable');

    if (!consumables.length) {
      Renderer.text('Нет доступных зелий или эликсиров.', mX + 15, mY + 415, { color: T.inkSoft, font: '14px Georgia' });
    } else {
      consumables.slice(0, 4).forEach(function (item, i) {
        const bx = mX + 10 + i * 210;
        const by = mY + 382;
        const bw = 200, bh = 50;

        noteCard(bx, by, bw, bh, {
          pin: false,
          onClick: () => useItem(m, item.id)
        });
        Renderer.ink(item.name + (bag[item.id] > 1 ? ' ×' + bag[item.id] : ''), bx + 10, by + 20, { font: 'bold 12px Georgia' });
        Renderer.text(item.desc || 'применить', bx + 10, by + 40, { color: '#8a4a12', font: '11px system-ui' });
      });
    }

    button(cX + cW - 190, cY + cH - 85, 140, 45, 'УВОЛЬНИТЬ', function () {
      const res = Models.fireMonster(Game.agency, m.id);
      if (res.success) { Audio.playSfx('reject'); showToast(res.name + ' уволен.'); popupSlot = null; setState('agency'); }
      else { Audio.playSfx('reject'); showToast(res.reason); }
    }, { variant: 'danger', disabled: m.injuryDays > 0, reason: 'Нельзя увольнять раненых' });

    if (popupSlot) {
      Renderer.rect(0, 0, W, H, 'rgba(0,0,0,0.6)');

      const popW = 400, popH = 340;
      const popX = centreX(popW), popY = centreY(popH);

      Renderer.paper(popX, popY, popW, popH, { r: 8, burn: 15 });
      Renderer.ink('ВЫБЕРИТЕ ' + SLOT_LABELS[popupSlot], popX + popW/2, popY + 45, { align: 'center', font: 'bold 22px Georgia' });
      Renderer.rect(popX + 40, popY + 65, popW - 80, 1, 'rgba(90,60,25,0.4)');

      const availableItems = a.inventory.map(id => Models.getItem(id)).filter(item => item && item.type === popupSlot);
      const uniqueIds = [...new Set(availableItems.map(i => i.id))];

      let listY = popY + 85;

      if (uniqueIds.length === 0) {
         Renderer.text('В сумке нет подходящих предметов.', popX + popW/2, listY + 20, { align: 'center', color: T.inkSoft, font: '14px Georgia' });
      } else {
         uniqueIds.slice(0, 3).forEach((id, i) => {
            const item = Models.getItem(id);
            const count = availableItems.filter(x => x.id === id).length;
            const rowY = listY + i * 55;

            const hoveredRow = hoverRect(popX + 20, rowY, popW - 40, 50);
            if (hoveredRow) Renderer.roundRect(popX + 20, rowY, popW - 40, 50, 4, 'rgba(0,0,0,0.1)');

            Renderer.ink(item.name + (count > 1 ? ' (x' + count + ')' : ''), popX + 40, rowY + 24, { font: 'bold 16px Georgia' });

            const bonusText = Object.entries(item.bonus || {}).map(e => '+' + e[1] + ' ' + ({ str: 'СИЛ', agi: 'ЛОВ', int: 'ИНТ', luck: 'УДА' }[e[0]] || e[0])).join(' · ');
            let desc = bonusText;
            if (item.injuryMod < 0) desc += (desc ? ' · ' : '') + Math.round(item.injuryMod * -100) + '% к травме';
            Renderer.text(desc || item.desc, popX + 40, rowY + 42, { color: '#3f6b2a', font: 'bold 11px system-ui' });

            addArea(popX + 20, rowY, popW - 40, 50, () => {
               equipItem(m, item.id);
               popupSlot = null;
            });
         });
      }

      const currentEq = m.equipment[popupSlot];
      if (currentEq) {
         button(popX + 40, popY + popH - 65, 140, 45, 'СНЯТЬ ПРЕДМЕТ', () => {
            unequip(m, popupSlot);
            popupSlot = null;
         }, { variant: 'danger' });
      }

      button(popX + popW - 160, popY + popH - 65, 120, 45, 'ЗАКРЫТЬ', () => { popupSlot = null; });
    }
  }

  function equipItem(m, id) {
    const res = Models.equipItem(Game.agency, m, id);
    if (res.success) { Audio.playSfx('pick'); showToast('Надето: ' + Models.getItem(id).name); }
    else { Audio.playSfx('reject'); showToast(res.reason); }
  }

  function unequip(m, slot) {
    const res = Models.unequipItem(Game.agency, m, slot);
    if (res.success) { Audio.playSfx('pick'); showToast('Снято'); }
    else { Audio.playSfx('reject'); showToast(res.reason); }
  }

  function useItem(m, id) {
    const res = Models.useItem(Game.agency, m, id);
    if (res.success) { Audio.playSfx('hire'); showToast('Использовано: ' + res.item.name); }
    else { Audio.playSfx('reject'); showToast(res.reason); }
  }

  function drawMission() {
    const a = Game.agency;
    const r = a.lastResult;
    if (!r) return;
    const m = a.monsters.find(function (x) { return x.id === r.monsterId; });

    Renderer.drawImage('bg_main', 0, 0, W, H);
    Renderer.rect(0, 0, W, H, 'rgba(6,4,2,0.88)');
    Renderer.grime(W, H, 0.6);

    const p = 1 - Math.max(0, missionTimer) / 2.0;
    const x = W/2 + (p - 1) * 300;

    Renderer.text('ЗАДАНИЕ В РАБОТЕ', W/2, 200, { color: '#d8b96a', align: 'center', font: 'bold 24px Georgia' });
    Renderer.text(r.questTitle, W/2, 250, { color: '#efe2c0', align: 'center', font: 'bold 28px Georgia' });
    Renderer.text('Монстр ушёл и не отвечает на письма…', W/2, 300, { color: '#a08a63', align: 'center', font: '18px Georgia' });

    if (m) {
      Renderer.drawMonsterIcon('mon_' + m.speciesKey, x, 350, 100);
      Renderer.text(m.name, x + 50, 480, { color: '#efe2c0', align: 'center', font: 'bold 20px Georgia' });
    }

    const barW = 800;
    const barX = W/2 - barW/2;
    const barY = H - 150;
    Renderer.roundRect(barX, barY, barW, 10, 5, '#2a1c10');
    Renderer.roundRect(barX, barY, Math.max(10, barW * p), 10, 5, '#c9a227');

    Renderer.text('Чем закончится — узнаем из докладной.', W/2, barY + 40, { color: '#7a6244', align: 'center', font: '14px Georgia' });
  }

  function drawReport() {
    const a = Game.agency;
    const r = a.lastResult;

    Renderer.drawImage('bg_main', 0, 0, W, H);
    Renderer.rect(0, 0, W, H, 'rgba(6,4,2,0.86)');
    if (!r) return;

    const cW = 1000;
    const cH = 600;
    const cX = centreX(cW);
    const cY = centreY(cH);

    if (!Renderer.drawImage('bg_paper', cX, cY, cW, cH)) {
      Renderer.paper(cX, cY, cW, cH, { r: 8, burn: 20 });
    }

    Renderer.note(cX + 80, cY + 50, 70, 70, { pin: false });
    Renderer.drawMonsterIcon('mon_' + r.speciesKey, cX + 85, cY + 55, 60);

    Renderer.ink('ДОКЛАДНАЯ', cX + 170, cY + 75, { font: 'bold 22px Georgia' });
    const multi = r.participants && r.participants.length > 1;
    Renderer.text(multi ? r.monsterName + ' и ещё ' + (r.participants.length - 1) : ('от ' + r.monsterName + ' · ' + r.speciesLabel),
      cX + 170, cY + 100, { color: T.inkSoft, font: '16px Georgia' });
    Renderer.text('Задание: ' + r.questTitle, cX + 170, cY + 120, { color: '#6b4a18', font: 'italic 15px Georgia' });
    Renderer.text('День ' + a.day, cX + cW - 80, cY + 75, { color: '#7a6244', align: 'right', font: '14px Georgia' });

    Renderer.rect(cX + 80, cY + 140, cW - 160, 1, 'rgba(90,60,25,0.4)');

    if (r.lied && reportTime > 0.1 && !lieSoundPlayed) {
        Audio.playSfx('lie');
        lieSoundPlayed = true;
    }

    const font = 'italic 26px Georgia';
    const full = '«' + r.reportText + '»';
    const lines = Renderer.wrapText(full, cW - 240, font);
    const visible = Math.min(full.length, Math.floor(reportTime * 45));
    let remaining = visible;

    lines.forEach(function (line, i) {
      const take = Math.max(0, Math.min(line.length, remaining));
      remaining -= take;
      Renderer.ink(line.slice(0, take), cX + cW / 2, cY + 220 + i * 35, { font: font, align: 'center' });
    });

    if (r.participants && r.participants.length > 1) {
      Renderer.text('Участники группы:', cX + cW / 2, cY + 360, { color: '#d8b96a', font: 'bold 14px Georgia', align: 'center' });
      const names = r.participants.map(function (pid) {
        var m = Game.agency.monsters.find(function (x) { return x.id === pid; });
        return m ? m.name : '—';
      }).join(' · ');
      Renderer.text(names, cX + cW / 2, cY + 380, { color: T.inkSoft, font: '13px Georgia', align: 'center' });
    }

    if (r.type === 'overkill') {
      const p = Math.min(1, reportTime / 1.2);
      for (let i = 0; i < 24; i++) {
        const ang = (i / 24) * Math.PI * 2;
        const dist = 30 + p * 120 + (i % 5) * 10;
        Renderer.rect(cX + cW/2 + Math.cos(ang) * dist, cY + 290 + Math.sin(ang) * dist * 0.55, 4, 4,
          i % 3 === 0 ? '#8a4a12' : '#8a6d1a');
      }
      Renderer.text('МОНСТР ПЕРЕСТАРАЛСЯ', cX + cW / 2, cY + 410, { color: '#8a4a12', font: 'bold 15px Georgia', align: 'center' });
    }

    const sealX = cX + 110, sealY = cY + 415;
    Renderer.ctx.save();
    Renderer.ctx.globalAlpha = 0.8;
    Renderer.roundRect(sealX - 25, sealY - 25, 50, 50, 25, '#6e1a1a');
    Renderer.roundRectStroke(sealX - 25, sealY - 25, 50, 50, 25, '#3f0f0f', 3);
    Renderer.text('АГ', sealX, sealY + 7, { color: '#e8b4a0', align: 'center', font: 'bold 20px Georgia' });
    Renderer.ctx.restore();
    Renderer.text('Печать агентства', sealX + 40, sealY + 5, { color: '#6b4a18', font: 'italic 14px Georgia' });

    Renderer.rect(cX + 80, cY + 460, cW - 160, 1, 'rgba(90,60,25,0.4)');

    const trust = Math.round(r.honesty * 100);
    const trustColor = trust >= 80 ? '#3f6b2a' : (trust >= 40 ? '#8a6d1a' : '#7a1f1f');
    Renderer.text('Интеллект ' + r.int + ' — честность отчёта ' + trust + '%', cX + 80, cY + 490, { color: trustColor, font: 'bold 14px Georgia' });

    if (reportTime > 0.9) {
      button(cX + cW - 260, cY + 470, 180, 50, 'ПРИНЯТЬ ОТЧЁТ', acceptReport);
    }
  }

  function acceptReport() {
    const a = Game.agency;
    const r = a.lastResult;
    if (!r) { setState('agency'); return; }

    Models.applyMissionResult(a, r);
    selectedQuestId = null;
    selectedMonsterIds = [];

    if (checkDefeat()) return;

    setState('agency');
    if (a.quests.length === 0) showToast('Заказы закончились — завершайте день');
  }

  function drawEndDay() {
    const a = Game.agency;

    Renderer.drawImage('bg_main', 0, 0, W, H);
    Renderer.rect(0, 0, W, H, 'rgba(6,4,2,0.88)');

    const cW = 1000;
    const cH = 600;
    const cX = centreX(cW);
    const cY = centreY(cH);

    const padX = 140;
    const innerW = cW - padX * 2;

    if (!Renderer.drawImage('bg_paper', cX, cY, cW, cH)) {
      Renderer.paper(cX, cY, cW, cH, { r: 8, burn: 18 });
    }

    Renderer.ink('КОНЕЦ ДНЯ ' + a.day, W / 2, cY + 90, { align: 'center', font: 'bold 32px Georgia' });
    Renderer.text('Золото начислено только сейчас — докладные могли врать.', W / 2, cY + 120, { color: T.inkSoft, align: 'center', font: '15px Georgia' });

    const cells = [
      ['ЗАДАНИЙ', a.dayStats.questsDone],
      ['ЗАРАБОТАНО', '+' + a.dayStats.goldEarned],
      ['ПЕРЕХВАЧЕНО', a.dayStats.intercepted],
      ['ПОТЕРЯНО', a.dayStats.losses]
    ];

    const cellW = innerW / 4;
    cells.forEach(function (c, i) {
      const cellX = cX + padX + i * cellW;
      Renderer.text(c[0], cellX, cY + 170, { color: T.inkSoft, font: '11px system-ui' });
      Renderer.ink(String(c[1]), cellX, cY + 210, { font: 'bold 32px Georgia' });
    });

    Renderer.rect(cX + padX, cY + 250, innerW, 1, 'rgba(90,60,25,0.35)');
    Renderer.ink('РЕЗУЛЬТАТЫ МИССИЙ', cX + padX, cY + 290, { font: 'bold 15px Georgia' });

    if (!a.dayStats.missions.length) {
      Renderer.text('Сегодня никто не выходил на задания.', cX + padX, cY + 330, { color: '#7a6244', font: '15px Georgia' });
    }

    let currentY = cY + 320;
    a.dayStats.missions.slice(-7).forEach(function (m) {
      const info = MISSION_LABELS[m.type] || { text: m.type, color: T.ink };
      Renderer.text('• ' + m.monsterName + ' — ' + m.questTitle, cX + padX, currentY, { color: T.ink, font: '14px Georgia' });
      Renderer.text(info.text + (m.gold ? ' (+' + m.gold + ')' : ''), cX + padX + innerW, currentY, { color: info.color, align: 'right', font: 'bold 14px Georgia' });
      currentY += 20;

      if (m.levelUps) {
          Renderer.text('   ' + m.levelUps.join(', '), cX + padX, currentY, { color: '#a855f7', font: 'italic 12px Georgia' });
          currentY += 15;
      }
      currentY += 5;
    });

    const stage = Models.threatStage(a.threat);
    Renderer.text('Угроза: ' + Models.threatLabel(a.threat) + ' (' + Math.round(a.threat * 100) + '%)' +
      ' · перехват ' + Math.round(Models.interceptChance(a) * 100) + '%',
      cX + padX, cY + cH - 130, { color: STAGE_INK[stage], font: 'bold 16px Georgia' });
    Renderer.text(a.upgrades.intel > 0 ? 'Отдел разведки работает.' : 'Без отдела разведки конкуренты смелее.',
      cX + padX, cY + cH - 100, { color: T.inkSoft, font: '14px Georgia' });

    const lastDay = a.day >= a.maxDays;
    button(cX + cW/2 - 150, cY + cH - 75, 300, 50, lastDay ? 'ФИНАЛЬНЫЙ ТЕНДЕР' : 'СЛЕДУЮЩИЙ ДЕНЬ', handleEndDayButton, { font: 'bold 16px Georgia' });
  }

  function handleEndDayButton() {
    const a = Game.agency;
    if (a.day >= a.maxDays) { startTender(); return; }

    Models.nextDay(a);
    currentTab = 'quests';
    selectedQuestId = null;
    selectedMonsterIds = [];
    if (checkDefeat()) return;

    Audio.playSfx('new_day');
    saveGame();
    setState('agency');
  }

  function checkDefeat() {
    if (Models.isThreatDefeat(Game.agency)) {
      outcome = { win: false, reason: 'threat' };
      setState('defeat');
      Audio.playSfx('lose');
      return true;
    }
    return false;
  }

  function startTender() {
    const a = Game.agency;
    if (!a.monsters.length) {
      outcome = { win: false, reason: 'nomons' };
      setState('defeat');
      return;
    }
    tender = Models.createTender(a);
    Audio.playSfx('tender');
    setState('tender');
  }

  function tenderRating(m, a) {
    const q = { difficulty: Content.TENDER_QUEST.diff, type: Content.TENDER_QUEST.type, species: [] };
    const eff = Models.effectiveStat(m, q, a) - q.difficulty;
    const int = Models.effectiveIntel(m);
    const honesty = int >= 14 ? 10 : int >= 8 ? 5 : -5;
    const pref = !Models.getRefusalReason(m, q, a) ? 5 : -5;
    const score = eff + honesty + pref;
    if (score >= 14) return { text: 'СИЛЬНЫЙ ОТЧЁТ', color: '#3f6b2a' };
    if (score >= 6) return { text: 'НОРМАЛЬНЫЙ ОТЧЁТ', color: '#8a6d1a' };
    return { text: 'СЛАБЫЙ ОТЧЁТ', color: '#7a1f1f' };
  }

  function drawTender() {
    const a = Game.agency;
    if (!tender) { startTender(); return; }

    drawTenderBackdrop();

    Renderer.text('ФИНАЛЬНЫЙ ТЕНДЕР', W/2, 60, { align: 'center', font: 'bold 36px Georgia', color: '#d8b96a' });
    Renderer.text('«' + Content.TENDER_TEXT.intro + '»', W/2, 100, { color: '#a08a63', align: 'center', font: 'italic 16px Georgia' });

    Renderer.paper(centreX(1000), 130, 1000, 80, { r: 6, burn: 10 });
    Renderer.ink(tender.quest.title, W/2, 165, { align: 'center', font: 'bold 20px Georgia' });
    Renderer.text('Сложность 8 · победит тот, чей отчёт убедительнее', W/2, 190, { color: T.inkSoft, align: 'center', font: '14px Georgia' });
    Renderer.drawIcon('quest_citadel', W/2 + 400, 145, 50, 50, { label: 'Ц', color: '#3a2a1a' });

    const leftX = centreX(1000);
    Renderer.paper(leftX, 240, 480, 380, { r: 6, burn: 12 });
    Renderer.ink('ГЕРОЙ-ДИРЕКТОР', leftX + 20, 280, { font: 'bold 18px Georgia' });
    Renderer.text(tender.aiAgency, leftX + 20, 310, { color: T.inkSoft, font: '14px Georgia' });

    const ai = tender.aiChampion;
    Renderer.drawMonsterIcon('mon_' + ai.speciesKey, leftX + 20, 340, 80);
    Renderer.ink(ai.name, leftX + 110, 380, { font: 'bold 22px Georgia' });
    Renderer.text('[' + ai.speciesLabel + '] ИНТ ' + ai.stats.int, leftX + 110, 410, { color: T.inkSoft, font: '14px monospace' });

    Renderer.text('Он выставит сильнейшего переговорщика.', leftX + 20, 460, { color: '#6b4a18', font: '14px Georgia' });
    Renderer.text('Ваш отчёт оценивают по:', leftX + 20, 500, { color: '#6b4a18', font: '14px Georgia' });
    Renderer.text('• сила против сложности 8', leftX + 40, 530, { color: '#6b4a18', font: '14px Georgia' });
    Renderer.text('• честность (ИНТ 14+ / 8+ / ниже)', leftX + 40, 560, { color: '#6b4a18', font: '14px Georgia' });
    Renderer.text('• совпадение с предпочтением', leftX + 40, 590, { color: '#6b4a18', font: '14px Georgia' });

    const rightX = leftX + 520;
    Renderer.paper(rightX, 240, 480, 380, { r: 6, burn: 12 });
    Renderer.ink('ВАШ ЧЕМПИОН', rightX + 20, 280, { font: 'bold 18px Georgia' });
    Renderer.text('Выберите монстра и его экипировку', rightX + 20, 310, { color: T.inkSoft, font: '14px Georgia' });

    const cw = 210, chh = 70;
    a.monsters.forEach(function (m, i) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = rightX + 20 + col * (cw + 15);
      const y = 340 + row * (chh + 15);
      if (y + chh > 600) return;

      noteCard(x, y, cw, chh, {
        pin: false, selected: tender.playerChampionId === m.id,
        onClick: function () { if (!tender.resolved) tender.playerChampionId = m.id; }
      });
      Renderer.drawMonsterIcon('mon_' + m.speciesKey, x + 5, y + 10, 50);
      Renderer.ink(m.name, x + 65, y + 25, { font: 'bold 14px Georgia' });
      Renderer.text('ИНТ ' + m.stats.int + ' · СИЛ ' + m.stats.str, x + 65, y + 45, { color: T.inkSoft, font: '12px monospace' });
      const rate = tenderRating(m, a);
      Renderer.text(rate.text, x + 65, y + 60, { color: rate.color, font: 'bold 11px Georgia' });
    });

    if (!tender.resolved) {
      button(centreX(360), H - 80, 360, 60, 'ОТПРАВИТЬ ЛУЧШЕГО', resolveTender, { variant: 'hero', font: 'bold 18px Georgia' });
    } else {
      drawTenderResult();
    }
  }

  function drawTenderBackdrop() {
    const ctx = Renderer.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1a1328');
    g.addColorStop(0.55, '#0d0a14');
    g.addColorStop(1, '#07060b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const spot = ctx.createRadialGradient(W/2, cy(12.5), pw(0.8), W/2, cy(12.5), pw(21.9));
    spot.addColorStop(0, 'rgba(168,85,247,0.28)');
    spot.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(30,22,42,0.92)';
    ctx.beginPath();
    ctx.ellipse(W/2, H * 0.66, W * 0.47, ph(10.0), 0, 0, Math.PI * 2);
    ctx.fill();
    Renderer.grime(W, H, 0.4);
  }

  function resolveTender() {
    if (!tender || tender.resolved) return;
    const a = Game.agency;
    if (!a.monsters.some(function (m) { return m.id === tender.playerChampionId; })) {
      tender.playerChampionId = a.monsters[0].id;
    }
    tender.result = Models.resolveTender(a, tender);
    tender.resolved = true;
    Audio.playSfx(tender.result.win ? 'win' : 'lose');
  }

  function drawTenderResult() {
    const res = tender.result;

    Renderer.rect(0, 0, W, H, 'rgba(6,4,10,0.55)');

    const cW = 1000, cH = 600;
    const cX = centreX(cW), cY = centreY(cH);

    Renderer.paper(cX, cY, cW, cH, { r: 8, burn: 18 });
    Renderer.corners(cX + 5, cY + 5, cW - 10, cH - 10, res.win ? 'rgba(63,107,42,0.7)' : 'rgba(122,31,31,0.7)');

    Renderer.ink(res.win ? 'ВАШ ОТЧЁТ УБЕДИТЕЛЬНЕЕ' : 'ГЕРОЙ-ДИРЕКТОР УБЕДИТЕЛЬНЕЕ', W/2, cY + 60,
      { align: 'center', font: 'bold 28px Georgia', color: res.win ? '#3f6b2a' : '#7a1f1f' });

    [res.player, res.ai].forEach(function (p, i) {
      const x = cX + 80 + i * 450;
      Renderer.text(i ? 'ГЕРОЙ-ДИРЕКТОР' : 'ВЫ', x, cY + 120, { color: i ? '#6b4a18' : '#3f6b2a', font: 'bold 16px Georgia' });
      Renderer.ink(p.name + ' · ИНТ ' + p.int, x, cY + 160, { font: 'bold 20px Georgia' });

      Renderer.wrapText('«' + p.report.text + '»', 380, 'italic 16px Georgia').slice(0, 8).forEach(function (line, j) {
        Renderer.text(line, x, cY + 220 + j * 24, { color: '#4a3520', font: 'italic 16px Georgia' });
      });

      Renderer.ink('Счёт: ' + (i ? res.aiScore : res.playerScore), x, cY + 450, { font: 'bold 24px Georgia' });
      Renderer.text(p.report.lied ? 'Отчёт подозрительно красивый…' : 'Отчёт выглядит честным', x, cY + 490,
        { color: p.report.lied ? '#8a4a12' : T.inkSoft, font: '10px Georgia' });
    });

    button(centreX(320), cY + cH - 90, 320, 65, 'ПОДВЕСТИ ИТОГ', function () {
      outcome = { win: res.win, reason: 'tender', result: res };
      setState(res.win ? 'victory' : 'defeat');
    }, { font: 'bold 16px Georgia' });
  }

  function drawOutcome() {
    const a = Game.agency;
    const win = !!(outcome && outcome.win);

    hitAreas.length = 0;
    if (win) drawTenderBackdrop();
    else {
      Renderer.drawImage('bg_main', 0, 0, W, H);
      Renderer.rect(0, 0, W, H, 'rgba(6,4,2,0.86)');
    }
    Renderer.rect(0, 0, W, H, 'rgba(5,5,8,0.35)');

    const cW = 900;
    const cH = 600;
    const cX = centreX(cW);
    const cY = centreY(cH);

    if (!Renderer.drawImage('bg_paper', cX, cY, cW, cH)) {
      Renderer.paper(cX, cY, cW, cH, { r: 8, burn: 20 });
    }

    Renderer.ink(win ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ', W/2, cY + 90,
      { align: 'center', font: 'bold 48px Georgia', color: win ? '#3f6b2a' : '#7a1f1f' });

    let text = win ? Content.TENDER_TEXT.win : Content.TENDER_TEXT.lose;
    if (!win && outcome && outcome.reason === 'threat') text = 'Конкуренты заняли город. Агентство закрыто, монстры разбежались по подвалам.';
    if (!win && outcome && outcome.reason === 'nomons') text = 'В штате не осталось ни одного монстра. Тендер проигран без боя.';

    Renderer.wrapText(text, cW - 120, '18px Georgia').forEach(function (line, i) {
      Renderer.ink(line, W/2, cY + 160 + i * 35, { align: 'center', font: '18px Georgia' });
    });

    if (outcome && outcome.result) {
      Renderer.text('Тендер: вы ' + outcome.result.playerScore + ' — герой ' + outcome.result.aiScore,
        W/2, cY + 280, { color: T.inkSoft, align: 'center', font: 'bold 16px Georgia' });
    }

    const rows = [
      ['Дней выжито', Math.min(a.day, a.maxDays)],
      ['Заданий выполнено', a.stats.questsDone],
      ['Золота заработано', a.stats.goldEarned],
      ['Монстров потеряно', a.stats.losses],
      ['Оверкиллов', a.stats.overkills],
      ['Заказов перехвачено', a.stats.interceptedTotal]
    ];

    rows.forEach(function (r, i) {
      const ry = cY + 340 + i * 28;
      Renderer.text(r[0], cX + 150, ry, { color: T.inkSoft, font: '15px Georgia' });
      Renderer.ink(String(r[1]), cX + cW - 150, ry, { align: 'right', font: 'bold 16px Georgia' });
    });

    button(cX + 120, cY + cH - 90, 280, 65, 'НОВАЯ ИГРА', function() { gameDifficulty = 'normal'; startNewGame(); });
    button(cX + cW - 400, cY + cH - 90, 280, 65, 'В МЕНЮ', function () { outcome = null; setState('menu'); }, { variant: 'ghost' });
  }

  function startNewGame() {
    Game.agency = Models.createAgency(gameDifficulty);
    tender = null;
    outcome = null;
    currentTab = 'hire';
    setState('agency');
  }

  function drawMenu() {
    Renderer.drawImage('bg_main', 0, 0, W, H);
    Renderer.rect(0, 0, W, H, 'rgba(6,4,2,0.74)');

    const cW = 800;
    const cH = 640;
    const cX = centreX(cW);
    const cY = centreY(cH);

    if (!Renderer.drawImage('bg_paper', cX, cY, cW, cH)) {
      Renderer.paper(cX, cY, cW, cH, { r: 8, burn: 22 });
    }

    Renderer.ink('ПОСЛЕДНИЙ ЧЕЛОВЕК', W/2, cY + 90, { align: 'center', font: 'bold 48px Georgia' });
    Renderer.text('агентство по трудоустройству монстров', W/2, cY + 130, { color: T.inkSoft, align: 'center', font: 'italic 16px Georgia' });
    Renderer.rect(cX + 100, cY + 150, cW - 200, 1, 'rgba(90,60,25,0.4)');

    const save = readSave();
    const btnW = 320;
    const btnH = 60;

    button(centreX(btnW), cY + 180, btnW, btnH, 'НОВАЯ ИГРА', function () {
      Game.agency = Models.createAgency(gameDifficulty);
      setState('intro');
    }, { font: 'bold 16px Georgia' });

    button(centreX(btnW), cY + 250, btnW, btnH, 'СЛОЖНОСТЬ: ' + (gameDifficulty === 'hard' ? 'ВЫСОКАЯ' : (gameDifficulty === 'easy' ? 'ЛЁГКАЯ' : 'ОБЫЧНАЯ')), function () {
      if (gameDifficulty === 'normal') gameDifficulty = 'hard';
      else if (gameDifficulty === 'hard') gameDifficulty = 'easy';
      else gameDifficulty = 'normal';
    }, { font: 'bold 14px Georgia', variant: gameDifficulty === 'hard' ? 'danger' : (gameDifficulty === 'easy' ? 'success' : 'primary') });

    button(centreX(btnW), cY + 320, btnW, btnH, save ? ('ПРОДОЛЖИТЬ · день ' + save.day) : 'ПРОДОЛЖИТЬ', function () {
      if (loadGame()) { currentTab = 'hire'; setState('agency'); }
      else showToast('Сохранение не найдено');
    }, {
      variant: 'ghost', font: 'bold 15px Georgia', disabled: !saveAvailable, reason: 'Пока нет сохранения'
    });

    button(centreX(btnW), cY + 390, btnW, btnH, 'КАК ИГРАТЬ', function () { helpFrom = 'menu'; setState('help'); },
      { variant: 'ghost', font: 'bold 15px Georgia' });

    button(centreX(btnW), cY + 460, btnW, btnH, 'ЗВУК: ' + Math.round(Audio.masterVolume * 100) + '%', function () { Audio.toggleVolume(); },
      { variant: 'ghost', font: 'bold 15px Georgia' });

    Renderer.text('Мышь / тап. Esc — пауза, Enter — подтвердить.', W/2, cY + cH - 30, { color: '#7a6244', align: 'center', font: '12px Georgia' });
  }

  function readSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return d && d.agency ? d.agency : null;
    } catch (e) { return null; }
  }

  function drawIntro() {
    Renderer.drawImage('bg_main', 0, 0, W, H);
    Renderer.rect(0, 0, W, H, 'rgba(5,3,1,0.88)');

    const cW = 900;
    const cH = 550;
    const cX = centreX(cW);
    const cY = centreY(cH);

    if (!Renderer.drawImage('bg_paper', cX, cY, cW, cH)) {
      Renderer.paper(cX, cY, cW, cH, { r: 8, burn: 22 });
    }

    const lines = [
      'Герои ушли в другие измерения — качаться до бесконечности.',
      'Города остались. Монстры остались. Работы — ни у кого.',
      'Ты — последний человек, бывший клерк гильдии приёмов.',
      'Открыл агентство: горожане платят, монстры пугают. И врут в отчётах.',
      '',
      'Продержись 14 дней. На 14-й день бывший герой откроет своё агентство —',
      'и город достанется тому, чей монстр напишет убедительный отчёт.'
    ];

    Renderer.ink('ПОСЛЕДНИЙ ЧЕЛОВЕК', W/2, cY + 90, { align: 'center', font: 'bold 36px Georgia' });
    Renderer.rect(cX + 100, cY + 110, cW - 200, 1, 'rgba(90,60,25,0.4)');

    lines.forEach(function (line, i) {
      const shown = Math.min(line.length, Math.max(0, Math.floor((introTime - 0.2 - i * 0.25) * 60)));
      Renderer.ink(line.slice(0, shown), W/2, cY + 160 + i * 35,
        { align: 'center', font: i >= 5 ? '15px Georgia' : '18px Georgia' });
    });

    if (introTime > 2.2) {
      button(centreX(340), cY + cH - 100, 340, 65, 'ОТКРЫТЬ АГЕНТСТВО', function () { setState('agency'); },
        { font: 'bold 14px Georgia' });
    } else {
      Renderer.text('клик — пропустить', W/2, cY + cH - 50, { color: '#7a6244', align: 'center', font: '12px Georgia' });
      addArea(0, 0, W, H, function () { introTime = 3; });
    }
  }

  function drawHelp() {
    hitAreas.length = 0;
    Renderer.rect(0, 0, W, H, 'rgba(4,3,1,0.86)');

    const cW = 1000;
    const cH = 600;
    const cX = centreX(cW);
    const cY = centreY(cH);

    if (!Renderer.drawImage('bg_paper', cX, cY, cW, cH)) {
      Renderer.paper(cX, cY, cW, cH, { r: 8, burn: 20 });
    }

    Renderer.ink('КАК ИГРАТЬ', W/2, cY + 70, { align: 'center', font: 'bold 28px Georgia' });
    Renderer.rect(cX + 100, cY + 90, cW - 200, 1, 'rgba(90,60,25,0.4)');

    const rows = [
      ['1. Найм', 'Скрытое предпочтение и черта. Найм тратит 1 из 3 попыток и золото; отказ — тоже.'],
      ['2. Заказы', '"Рекомендуется" — подходящий вид даёт бонус к статам. Монстр выполняет 1 заказ в день.'],
      ['3. Статы', 'СИЛА — физическая сила. ЛОВКОСТЬ — скорость. ИНТЕЛЛЕКТ — честность отчётов. УДАЧА — криты.'],
      ['4. Отчёты', 'Монстр пишет сам и может врать: ИНТ 14+ — честен, 8–13 — 50/50, ниже 8 — часто врёт.'],
      ['5. Оверкилл', 'Перестарался: +50% золота, но +3% угрозы и риск травмы.'],
      ['6. Угроза', 'Конкуренты перехватывают заказы: чем выше угроза, тем чаще. Угроза 100% — поражение.'],
      ['7. Экипировка', 'Предметы из магазина надеваются в досье монстра (клик по портрету сверху).'],
      ['8. Финал', '14-й день: тендер с Героем. Побеждает агент с более убедительным отчётом.']
    ];

    rows.forEach(function (r, i) {
      const ry = cY + 130 + i * 45;
      Renderer.ink(r[0], cX + 60, ry, { font: 'bold 15px Georgia' });
      Renderer.text(r[1], cX + 180, ry, { color: T.inkSoft, font: '14px Georgia' });
    });

    Renderer.ink('Цель: дожить до 14-го дня и выиграть тендер у Героя-Директора.',
      W/2, cY + cH - 110, { align: 'center', font: 'bold 14px Georgia', color: '#6b4a18' });

    button(centreX(260), cY + cH - 80, 260, 55, 'ПОНЯТНО', closeHelp, { variant: 'ghost', font: 'bold 14px Georgia' });
  }

  function closeHelp() {
    if (helpFrom === 'menu') setState('menu');
    else if (helpFrom === 'pause') setState('pause');
    else setState('agency');
  }

  function drawPause() {
    hitAreas.length = 0;
    Renderer.rect(0, 0, W, H, 'rgba(4,3,1,0.74)');

    const cW = 500;
    const cH = 530;
    const cX = centreX(cW);
    const cY = centreY(cH);

    if (!Renderer.drawImage('bg_paper', cX, cY, cW, cH)) {
      Renderer.paper(cX, cY, cW, cH, { r: 8, burn: 18 });
    }

    Renderer.ink('ПАУЗА', W/2, cY + 80, { align: 'center', font: 'bold 36px Georgia' });

    button(centreX(320), cY + 140, 320, 65, 'ПРОДОЛЖИТЬ', function () { setState('agency'); },
      { font: 'bold 15px Georgia' });
    button(centreX(320), cY + 220, 320, 65, 'КАК ИГРАТЬ', function () { helpFrom = 'pause'; setState('help'); },
      { variant: 'ghost', font: 'bold 14px Georgia' });
    button(centreX(320), cY + 300, 320, 65, 'В МЕНЮ', function () { saveGame(); setState('menu'); },
      { variant: 'ghost', font: 'bold 14px Georgia' });

    button(centreX(320), cY + 380, 320, 65, 'ЗВУК: ' + Math.round(Audio.masterVolume * 100) + '%', function () { Audio.toggleVolume(); },
      { variant: 'ghost', font: 'bold 14px Georgia' });
  }

  function drawToast() {
    const font = 'bold 10px Georgia';
    Renderer.ctx.font = font;
    const tw = Math.min(480, Renderer.ctx.measureText(toast.msg).width + 30);
    const x = (W - tw) / 2, y = 40;

    Renderer.note(x, y, tw, 28, { pin: false });
    Renderer.roundRectStroke(x, y, tw, 28, 3, 'rgba(168,134,42,0.9)', 1.5);
    Renderer.ink(toast.msg, W / 2, y + 18, { align: 'center', font: font });
  }

  function setState(next) {
    if (Game.state === next) return;
    const conf = TRANSITION_MAP[Game.state + '->' + next] || { type: 'fade', dur: 250 };
    transition = { type: conf.type, dur: conf.dur, t: 0, from: Game.state, to: next, switched: false };

    lieSoundPlayed = false;

    if (next === 'menu') Audio.playMusic('main');
    else if (next === 'report') Audio.playMusic('report');
    else if (next === 'tender') Audio.playMusic('tender');
    else if (next === 'victory') Audio.playMusic('victory');
    else if (next === 'defeat') Audio.playMusic('defeat');
    else if (next === 'agency' && Game.state !== 'pause' && Game.state !== 'help' && Game.state !== 'monster') Audio.playMusic('main');
  }

  function enterState(to) {
    Game.state = to;
    if (to === 'mission') missionTimer = 2.0;
    if (to === 'report') reportTime = 0;
    if (to === 'endday') saveGame();
    if (to === 'menu') refreshSave();
    if (to === 'intro') introTime = 0;
    if (to === 'tender' && !tender) tender = Models.createTender(Game.agency);
    if (to === 'victory' || to === 'defeat') {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
      saveAvailable = false;
    }
    if (to === 'agency') {
      if (Game.agency) Game.agency.lastResult = null;
      saveGame();
    }
  }

  function drawTransitionOverlay() {
    if (!transition) return;
    const p = Math.min(1, transition.t / transition.dur);
    Renderer.rect(0, 0, W, H, 'rgba(0,0,0,' + (Math.sin(p * Math.PI) * 0.85).toFixed(3) + ')');
  }

  function withTransitionTransform(drawFn) {
    const ctx = Renderer.ctx;
    if (!transition) { drawFn(); return; }

    const p = Math.min(1, transition.t / transition.dur);
    const isOld = !transition.switched;
    const k = isOld ? p : (p - 0.5) * 2;

    ctx.save();
    if (transition.type === 'scale') {
      const s = isOld ? 1 - 0.05 * k : 0.95 + 0.05 * k;
      ctx.translate(W / 2, H / 2);
      ctx.scale(s, s);
      ctx.translate(-W / 2, -H / 2);
    } else if (transition.type === 'slide') {
      ctx.translate(isOld ? -40 * k : 40 * (1 - k), 0);
    }
    drawFn();
    ctx.restore();
  }

  function refreshSave() {
    try { saveAvailable = !!localStorage.getItem(SAVE_KEY); }
    catch (e) { saveAvailable = false; }
  }

  function saveGame() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, agency: Game.agency })); saveAvailable = true; }
    catch (e) { }
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || !data.agency || !data.agency.monsters) return false;
      Game.agency = data.agency;
      if (!Game.agency.inventory) Game.agency.inventory = [];
      if (!Game.agency.tutorials) Game.agency.tutorials = {};

      if (!Game.agency.difficulty) Game.agency.difficulty = 'normal';
      gameDifficulty = Game.agency.difficulty;

      return true;
    } catch (e) { return false; }
  }

  function update(dt) {
    time += dt;
    if (toast.t > 0) toast.t -= dt;
    if (Game.state === 'intro') introTime += dt;

    if (panelAnim !== panelTarget) {
      const step = dt / 0.28;
      panelAnim = panelTarget > panelAnim ? Math.min(panelTarget, panelAnim + step)
        : Math.max(panelTarget, panelAnim - step);
    }

    if (transition) {
      transition.t += dt * 1000;
      if (!transition.switched && transition.t >= transition.dur / 2) {
        transition.switched = true;
        enterState(transition.to);
      }
      if (transition.t >= transition.dur) transition = null;
      return;
    }

    if (Game.state === 'mission') {
      missionTimer -= dt;
      if (missionTimer <= 0) setState('report');
    }
    if (Game.state === 'report') reportTime += dt;

    const click = Input.consumeClick();
    if (click) {
      for (let i = hitAreas.length - 1; i >= 0; i--) {
        const area = hitAreas[i];
        if (inRect(click, area.x, area.y, area.w, area.h)) {
          area.onClick();
          break;
        }
      }
    }

    if (pressed('Escape')) {
      if (showEndDayConfirm) {
        showEndDayConfirm = false;
      } else if (Game.state === 'report') {
        acceptReport();
      } else if (Game.state === 'pause') {
        setState('agency');
      } else if (Game.state === 'help') {
        closeHelp();
      } else if (Game.state === 'agency') {
        setState('pause');
      } else if (Game.state === 'monster') {
        if (popupSlot) popupSlot = null;
        else setState('agency');
      }
    }
    if (pressed('Enter') || pressed('Space')) {
      if (Game.state === 'menu') { Game.agency = Models.createAgency(gameDifficulty); setState('intro'); }
      else if (Game.state === 'intro') setState('agency');
      else if (Game.state === 'report' && reportTime > 0.9) acceptReport();
      else if (Game.state === 'endday') handleEndDayButton();
    }
  }

  function render() {
    hitAreas = [];
    Renderer.rect(0, 0, W, H, T.bg);

    const state = transition && !transition.switched ? transition.from : Game.state;
    withTransitionTransform(function () { drawState(state); });

    drawTransitionOverlay();

    checkTutorials();
    if (activeTutorial) drawTutorial();

    if (toast.t > 0) drawToast();

    Game.hitAreas = hitAreas;
    const overArea = hitAreas.some(function (a) { return inRect(Input.mouse, a.x, a.y, a.w, a.h); });
    Game.canvas.style.cursor = overArea ? 'pointer' : 'default';
  }

  function drawState(state) {
    if (state === 'menu') drawMenu();
    else if (state === 'intro') drawIntro();
    else if (state === 'help') { if (helpFrom === 'menu') drawMenu(); else drawAgency(); drawHelp(); }
    else if (state === 'pause') { drawAgency(); drawPause(); }
    else if (state === 'monster') { drawAgency(); drawMonsterView(); }
    else if (state === 'mission') drawMission();
    else if (state === 'report') drawReport();
    else if (state === 'endday') drawEndDay();
    else if (state === 'tender') drawTender();
    else if (state === 'victory' || state === 'defeat') drawOutcome();
    else drawAgency();
  }

  async function init() {
    if (location.search.indexOf('debug') !== -1) document.body.classList.add('debug');
    await Assets.load();
    Audio.init();

    document.addEventListener('click', () => { Audio.playMusic('main'); }, { once: true });

    Game.init('game');
    Input.init(Game.canvas);
    Renderer.init(Game.ctx);

    refreshSave();
    Game.state = 'menu';
    Game.update = update;
    Game.render = render;
    Game.setState = setState;

    function frame(now) {
      Game.loop(now);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  init();
})();