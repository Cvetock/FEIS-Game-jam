// Экраны, ввод и связка «модель ↔ рендер».
// Все кликабельные зоны регистрируются в hitAreas во время отрисовки,
// поэтому геометрия кнопок и хитбоксов не может разъехаться.
(function () {
  'use strict';

  const W = 640;
  const H = 480;
  const T = Renderer.THEME;
  const CONTENT = { x: 160, y: 60, w: 470, h: 406 };
  const SAVE_KEY = 'feis_last_human_v1';

  // Художник нарисовал 5 иконок заданий — остальные типы переиспользуют
  // ближайшую по смыслу, чтобы на доске не было «пустых» карточек.
  const QUEST_ART = {
    farm: 'quest_farm', village: 'quest_farm', forest: 'quest_farm',
    caravan: 'quest_caravan', warehouse: 'quest_caravan', bazar: 'quest_caravan',
    cave: 'quest_cave', sewer: 'quest_cave',
    ruins: 'quest_ruins',
    citadel: 'quest_citadel', tower: 'quest_citadel', city: 'quest_citadel', ritual: 'quest_citadel'
  };

  const STAGE_COLORS = { 1: '#4ade80', 2: '#fbbf24', 3: '#f97316', 4: '#f87171' };

  const MISSION_LABELS = {
    success: { text: 'Успех', color: T.success },
    partial: { text: 'Частично', color: T.accent },
    overkill: { text: 'Оверкилл!', color: T.warn },
    fail: { text: 'Провал', color: T.danger },
    injury: { text: 'Травма', color: T.danger },
    lost: { text: 'Исчез', color: T.danger }
  };

  const STATUS_LABELS = {
    idle: { text: 'СВОБОДЕН', color: T.success },
    busy: { text: 'ОТДЫХАЕТ', color: T.muted },
    injured: { text: 'РАНЕН', color: T.danger }
  };

  const SLOT_LABELS = { weapon: 'ОРУЖИЕ', armor: 'БРОНЯ', amulet: 'АМУЛЕТ' };

  const TRANSITION_MAP = {
    'menu->intro': { type: 'fade', dur: 300 },
    'intro->agency': { type: 'fade', dur: 400 },
    'menu->agency': { type: 'fade', dur: 300 },
    'agency->interview': { type: 'scale', dur: 150 },
    'interview->agency': { type: 'scale', dur: 150 },
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

  // ── Состояние UI ─────────────────────────────────────────────────────────
  let currentTab = 'monsters';
  let selectedCandidateId = null;
  let selectedQuestId = null;
  let selectedMonsterId = null;
  let selectedMonsterViewId = null;
  let selectedItemId = null;
  let interviewCandidate = null;
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

  // ── Утилиты UI ───────────────────────────────────────────────────────────
  function inRect(p, x, y, w, h) {
    return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
  }

  function hoverRect(x, y, w, h) { return inRect(Input.mouse, x, y, w, h); }

  function addArea(x, y, w, h, onClick) {
    hitAreas.push({ x: x, y: y, w: w, h: h, onClick: onClick });
  }

  function showToast(msg) {
    toast.msg = msg;
    toast.t = 3.4;
  }

  function pressed(code) {
    const now = Input.isKeyPressed(code);
    const was = !!keysPrev[code];
    keysPrev[code] = now;
    return now && !was;
  }

  function button(x, y, w, h, label, onClick, opts) {
    opts = opts || {};
    const disabled = !!opts.disabled;
    const variant = opts.variant || 'primary';
    const font = opts.font || 'bold 14px system-ui';
    const hovered = !disabled && hoverRect(x, y, w, h);

    let c1, c2, border, textColor;
    if (disabled) {
      c1 = '#252a33'; c2 = '#171a21'; border = T.border; textColor = '#5b6472';
    } else if (variant === 'success') {
      c1 = hovered ? '#6ee7a0' : '#22c55e'; c2 = '#15803d'; border = T.success; textColor = '#06130a';
    } else if (variant === 'danger') {
      c1 = hovered ? '#f87171' : '#dc2626'; c2 = '#7f1d1d'; border = T.danger; textColor = '#fff';
    } else if (variant === 'hero') {
      c1 = hovered ? '#c084fc' : '#a855f7'; c2 = '#6b21a8'; border = T.hero; textColor = '#fff';
    } else if (variant === 'ghost') {
      c1 = hovered ? '#232833' : '#1a1e26'; c2 = '#14171d';
      border = hovered ? T.accent : T.border; textColor = hovered ? T.accent : T.text;
    } else {
      c1 = hovered ? '#60a5fa' : '#3b82f6'; c2 = '#1d4ed8'; border = T.select; textColor = '#fff';
    }

    Renderer.gradientRect(x, y, w, h, c1, c2);
    Renderer.roundRectStroke(x, y, w, h, 6, border, hovered ? 2 : 1);
    Renderer.text(label, x + w / 2, y + h / 2 + 5, { color: textColor, align: 'center', font: font });

    if (disabled) {
      if (opts.reason) addArea(x, y, w, h, function () { showToast(opts.reason); });
    } else {
      addArea(x, y, w, h, function () { Audio.playSfx('click'); onClick(); });
    }
  }

  function card(x, y, w, h, opts) {
    opts = opts || {};
    const disabled = !!opts.disabled;
    const selected = !!opts.selected;
    const hovered = !disabled && hoverRect(x, y, w, h);
    const accent = opts.accent || T.border;

    let bg;
    if (disabled) bg = '#13161b';
    else if (selected) bg = '#1e2430';
    else if (hovered) bg = '#1b2029';
    else bg = '#181b22';

    Renderer.roundRect(x, y, w, h, 6, bg);
    Renderer.roundRectStroke(x, y, w, h, 6, selected ? T.success : (hovered ? T.accent : accent), selected ? 2 : 1);

    if (opts.onClick && !disabled) {
      addArea(x, y, w, h, function () { Audio.playSfx('select'); opts.onClick(); });
    } else if (opts.onClick && disabled) {
      addArea(x, y, w, h, function () { showToast(opts.reason || 'Недоступно'); });
    }
  }

  // ── Сохранение ───────────────────────────────────────────────────────────
  function refreshSave() {
    try { saveAvailable = !!localStorage.getItem(SAVE_KEY); }
    catch (e) { saveAvailable = false; }
  }

  function saveGame() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, agency: Game.agency }));
      saveAvailable = true;
    } catch (e) { /* приватный режим — играем без сохранения */ }
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || !data.agency || !data.agency.monsters) return false;
      Game.agency = data.agency;
      return true;
    } catch (e) { return false; }
  }

  // ── Переходы ─────────────────────────────────────────────────────────────
  function setState(next) {
    if (Game.state === next) return;
    const conf = TRANSITION_MAP[Game.state + '->' + next] || { type: 'fade', dur: 250 };
    transition = { type: conf.type, dur: conf.dur, t: 0, from: Game.state, to: next, switched: false };
    Audio.playSfx('transition');
  }

  function enterState(to) {
    Game.state = to;

    if (to === 'mission') { missionTimer = 2.0; }
    if (to === 'report') { reportTime = 0; }
    if (to === 'endday') { saveGame(); }
    if (to === 'menu') { refreshSave(); }
    if (to === 'victory' || to === 'defeat') {
      // Завершённый забег не должен предлагаться к продолжению
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
      saveAvailable = false;
    }
    if (to === 'intro') { introTime = 0; }
    if (to === 'tender') { if (!tender) tender = Models.createTender(Game.agency); }
    if (to === 'agency') {
      interviewCandidate = null;
      selectedCandidateId = null;
      if (Game.agency) Game.agency.lastResult = null;
      saveGame();
    }
  }

  function drawTransitionOverlay() {
    if (!transition) return;
    const p = Math.min(1, transition.t / transition.dur);
    const alpha = Math.sin(p * Math.PI) * 0.85;
    Renderer.rect(0, 0, W, H, 'rgba(0,0,0,' + alpha.toFixed(3) + ')');
  }

  function withTransitionTransform(state, drawFn) {
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
      const dx = isOld ? -40 * k : 40 * (1 - k);
      ctx.translate(dx, 0);
    }
    drawFn();
    ctx.restore();
  }

  // ── HUD ──────────────────────────────────────────────────────────────────
  function drawHUD(a) {
    Renderer.gradientRect(0, 0, W, 52, '#1f232c', '#15171d');
    Renderer.text('ДЕНЬ ' + a.day + '/' + a.maxDays, 16, 21, { color: T.accent, font: 'bold 16px system-ui' });
    Renderer.text(a.gold + ' зол.', 16, 41, { color: T.text, font: 'bold 13px system-ui' });

    const stage = Models.threatStage(a.threat);
    const color = STAGE_COLORS[stage];
    Renderer.text('УГРОЗА: ' + Models.threatLabel(a.threat).toUpperCase(), 136, 20, { color: color, font: 'bold 12px system-ui' });
    Renderer.text(Math.round(a.threat * 100) + '% · перехват ' + Math.round(Models.interceptChance(a) * 100) + '%',
      136, 36, { color: T.muted, font: '10px system-ui' });

    const bx = 136, by = 46, bw = 150, bh = 3;
    Renderer.roundRect(bx, by, bw, bh, 2, '#0b0d11');
    const pulse = 0.5 + 0.5 * Math.sin(time * (stage >= 4 ? 4 : 2));
    Renderer.ctx.save();
    Renderer.ctx.shadowColor = color;
    Renderer.ctx.shadowBlur = 4 + 7 * pulse;
    Renderer.roundRect(bx, by, Math.max(3, bw * Math.min(1, a.threat)), bh, 2, color);
    Renderer.ctx.restore();

    Renderer.text('ШТАТ ' + a.monsters.length + '/' + Models.rosterCap(a), 306, 20, { color: T.text, font: 'bold 12px system-ui' });
    Renderer.text('СОБЕСЕДОВАНИЯ ' + a.interviewsLeft + '/3', 306, 37,
      { color: a.interviewsLeft > 0 ? T.muted : T.danger, font: '10px system-ui' });

    Renderer.text('РЕПУТАЦИЯ ' + a.rep, 476, 20, { color: T.muted, font: '10px system-ui' });
    Renderer.text('ЗАКАЗЫ ' + a.quests.length, 476, 37, { color: T.muted, font: '10px system-ui' });
  }

  function drawTabs() {
    const tabs = [
      { id: 'monsters', label: 'ШТАТ', y: 60 },
      { id: 'quests', label: 'ЗАКАЗЫ', y: 104 },
      { id: 'shop', label: 'УЛУЧШЕНИЯ', y: 148 },
      { id: 'items', label: 'АМУНИЦИЯ', y: 192 }
    ];

    tabs.forEach(function (t) {
      const active = currentTab === t.id;
      const hovered = hoverRect(10, t.y, 140, 36);
      Renderer.roundRect(10, t.y, 140, 36, 6, active ? T.panelHi : (hovered ? '#1a1e26' : T.bg));
      Renderer.roundRectStroke(10, t.y, 140, 36, 6, active ? T.accent : (hovered ? T.border : '#22262f'), active ? 2 : 1);
      Renderer.text(t.label, 80, t.y + 24, {
        color: active ? T.accent : (hovered ? T.text : T.muted),
        align: 'center', font: 'bold 12px system-ui'
      });
      addArea(10, t.y, 140, 36, function () {
        Audio.playSfx('select');
        currentTab = t.id;
      });
    });

    button(10, 240, 140, 48, 'ЗАВЕРШИТЬ ДЕНЬ', function () { setState('endday'); }, { font: 'bold 12px system-ui' });
    button(10, 296, 140, 34, 'КАК ИГРАТЬ', function () { helpFrom = 'agency'; setState('help'); }, { variant: 'ghost', font: 'bold 11px system-ui' });
    button(10, 338, 140, 34, 'ПАУЗА', function () { setState('pause'); }, { variant: 'ghost', font: 'bold 11px system-ui' });

    Renderer.text('Подсказка: ' + nextStepHint(Game.agency), 12, 396, { color: '#4a5260', font: '10px system-ui' });
    Renderer.wrapText(nextStepHintExtra(Game.agency), 138, '10px system-ui').forEach(function (line, i) {
      Renderer.text(line, 12, 412 + i * 13, { color: '#414956', font: '10px system-ui' });
    });
  }

  function nextStepHint(a) {
    if (a.interviewsLeft > 0 && a.monsters.length < Models.rosterCap(a) && a.candidates.length) {
      return 'наймите монстра';
    }
    if (a.quests.some(function (q) { return !q.intercepted; })) {
      return 'отправьте на заказ';
    }
    return 'завершите день';
  }

  function nextStepHintExtra(a) {
    if (a.interviewsLeft > 0 && a.monsters.length < Models.rosterCap(a) && a.candidates.length) {
      return 'Собеседование бесплатное, но его всего 3 в день — отказ тоже тратит попытку.';
    }
    if (a.quests.some(function (q) { return !q.intercepted; })) {
      return 'Монстр выполняет одно задание в день. Сравните его статы со сложностью заказа.';
    }
    return 'Все заказы на сегодня отработаны. В конце дня вы получите золото и увидите реальные результаты.';
  }

  // ── Вкладка «ШТАТ» ───────────────────────────────────────────────────────
  function drawRosterTab(a) {
    Renderer.text('ВАШИ МОНСТРЫ · ' + a.monsters.length + '/' + Models.rosterCap(a),
      CONTENT.x + 10, 80, { color: T.muted, font: 'bold 12px system-ui' });

    a.monsters.forEach(function (m, i) {
      const x = CONTENT.x + 10, y = 92 + i * 30, w = 450, h = 28;
      const status = STATUS_LABELS[m.status] || STATUS_LABELS.injured;
      const idle = m.status === 'idle';

      card(x, y, w, h, {
        disabled: false,
        accent: idle ? T.border : '#392a2a',
        onClick: function () {
          selectedMonsterViewId = m.id;
          setState('monster');
        }
      });
      Renderer.drawMonsterIcon('mon_' + m.speciesKey, x + 4, y + 4, 20);
      Renderer.text(m.name, x + 30, y + 18, { color: idle ? T.text : T.muted, font: 'bold 11px system-ui' });
      Renderer.text(m.speciesLabel, x + 96, y + 18, { color: '#5f6875', font: '9px system-ui' });
      Renderer.text('СИЛ ' + m.stats.str + ' ЛОВ ' + m.stats.agi + ' ИНТ ' + m.stats.int + ' УДА ' + m.stats.luck,
        x + 150, y + 18, { color: T.muted, font: '9px monospace' });
      Renderer.text(m.traits[0], x + 316, y + 18, { color: '#5f6875', font: '9px system-ui' });
      Renderer.text(status.text, x + w - 6, y + 18, { color: status.color, align: 'right', font: 'bold 9px system-ui' });
    });

    Renderer.text('КАНДИДАТЫ · собеседований осталось: ' + a.interviewsLeft,
      CONTENT.x + 10, 288, { color: a.interviewsLeft > 0 ? T.muted : T.danger, font: 'bold 12px system-ui' });

    a.candidates.forEach(function (c, i) {
      const x = CONTENT.x + 10, y = 298 + i * 24, w = 450, h = 22;
      const selected = selectedCandidateId === c.id;
      card(x, y, w, h, {
        selected: selected,
        onClick: function () { selectedCandidateId = selected ? null : c.id; }
      });
      Renderer.drawMonsterIcon('mon_' + c.speciesKey, x + 4, y + 3, 16);
      Renderer.text(c.name, x + 26, y + 15, { color: T.text, font: 'bold 11px system-ui' });
      Renderer.text('[' + c.speciesLabel + ']', x + 92, y + 15, { color: '#5f6875', font: '9px system-ui' });
      Renderer.text('СИЛ ' + c.stats.str + ' ЛОВ ' + c.stats.agi + ' ИНТ ' + c.stats.int + ' УДА ' + c.stats.luck,
        x + 168, y + 15, { color: T.muted, font: '9px monospace' });
      Renderer.text('предпочтение скрыто', x + w - 6, y + 15,
        { color: '#414956', align: 'right', font: '8px system-ui' });
    });

    const cand = a.candidates.find(function (c) { return c.id === selectedCandidateId; });
    button(CONTENT.x + 10, 374, 450, 40, cand ? ('СОБЕСЕДОВАНИЕ: ' + cand.name) : 'ВЫБЕРИТЕ КАНДИДАТА',
      function () { interviewCandidate = cand; setState('interview'); },
      {
        variant: 'success',
        disabled: !cand || a.interviewsLeft <= 0,
        reason: !cand ? 'Сначала выберите кандидата' : 'Собеседования на сегодня закончились'
      });

    Renderer.text('Нажмите на монстра, чтобы открыть его досье и выдать экипировку.',
      CONTENT.x + 10, 434, { color: '#4a5260', font: '10px system-ui' });
  }

  // ── Вкладка «ЗАКАЗЫ» ─────────────────────────────────────────────────────
  function drawQuestCard(q, x, y, w, h) {
    if (q.intercepted) {
      Renderer.roundRect(x, y, w, h, 6, '#15171c');
      Renderer.roundRectStroke(x, y, w, h, 6, '#242830', 1);
      Renderer.drawIcon('ui_intercepted', x + 6, y + 6, h - 12, h - 12, { label: 'X', color: '#242830' });
      Renderer.text(q.title, x + 58, y + 20, { color: '#5b6472', font: 'italic 12px system-ui' });
      Renderer.text('ПЕРЕХВАЧЕНО КОНКУРЕНТАМИ', x + 58, y + 37, { color: '#8a3a3a', font: 'bold 10px system-ui' });
      Renderer.text('—', x + w - 12, y + 28, { color: '#5b6472', align: 'right', font: 'bold 13px system-ui' });
      return;
    }

    const selected = selectedQuestId === q.id;
    card(x, y, w, h, {
      selected: selected,
      onClick: function () {
        selectedQuestId = q.id;
        selectedMonsterId = null;
      }
    });

    const art = QUEST_ART[q.type];
    const iconSize = h - 12;
    if (art) {
      Renderer.drawIcon(art, x + 6, y + 6, iconSize, iconSize, { label: q.type, color: '#24303a' });
    } else {
      Renderer.roundRect(x + 6, y + 6, iconSize, iconSize, 5, '#24303a');
      Renderer.text(q.type.substring(0, 2).toUpperCase(), x + 6 + iconSize / 2, y + 6 + iconSize / 2 + 4,
        { color: '#94a3b8', align: 'center', font: 'bold 11px system-ui' });
    }

    Renderer.text(q.title, x + 58, y + 20, { color: T.text, font: 'bold 12px system-ui' });
    const need = q.species.length
      ? ' · нужен: ' + q.species.map(function (s) { return Models.SPECIES[s].label; }).join('/')
      : '';
    Renderer.text('Сложность ' + q.difficulty + ' · риск: ' + q.risk + need, x + 58, y + 37,
      { color: T.muted, font: '9px system-ui' });
    Renderer.text(q.reward + ' зол.', x + w - 12, y + 20, { color: T.accent, align: 'right', font: 'bold 13px system-ui' });
  }

  function drawQuestsTab(a) {
    Renderer.text('ДОСКА ЗАКАЗОВ · ' + a.quests.length + ' шт.', CONTENT.x + 10, 80,
      { color: T.muted, font: 'bold 12px system-ui' });

    a.quests.forEach(function (q, i) {
      drawQuestCard(q, CONTENT.x + 10, 92 + i * 52, 450, 48);
    });

    const px = CONTENT.x + 10, py = 306, pw = 450, ph = 156;
    Renderer.roundRect(px, py, pw, ph, 8, 'rgba(23,26,33,0.9)');
    Renderer.roundRectStroke(px, py, pw, ph, 8, T.border, 1);

    const quest = a.quests.find(function (q) { return q.id === selectedQuestId; });
    if (!quest) {
      Renderer.text('Выберите заказ на доске', px + pw / 2, py + 58,
        { color: T.muted, align: 'center', font: '13px system-ui' });
      Renderer.text('Серые заказы забрали конкуренты — их не вернуть',
        px + pw / 2, py + 82, { color: '#4a5260', align: 'center', font: '10px system-ui' });
      return;
    }

    Renderer.text('Кого отправим?', px + 12, py + 22, { color: T.text, font: 'bold 12px system-ui' });
    Renderer.text(quest.title, px + pw - 12, py + 22,
      { color: T.muted, align: 'right', font: '10px system-ui' });

    const gw = 140, gh = 44, gx0 = px + 12, gy0 = py + 30;
    a.monsters.forEach(function (m, i) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = gx0 + col * (gw + 6);
      const y = gy0 + row * (gh + 4);
      const disabled = m.status !== 'idle';
      const selected = selectedMonsterId === m.id;
      const restReason = m.status === 'injured' ? 'Монстр ранен — нужен день отдыха'
        : 'Монстр отдыхает после задания до завтра';

      card(x, y, gw, gh, {
        selected: selected,
        disabled: disabled,
        reason: restReason,
        onClick: function () { selectedMonsterId = m.id; }
      });

      Renderer.drawMonsterIcon('mon_' + m.speciesKey, x + 4, y + 4, gh - 8);
      Renderer.text(m.name, x + 40, y + 18, { color: disabled ? T.muted : T.text, font: 'bold 12px system-ui' });
      Renderer.text(disabled ? (m.status === 'injured' ? 'ранен' : 'отдыхает') : ('ИНТ ' + m.stats.int + ' · СИЛ ' + m.stats.str),
        x + 40, y + 32, { color: disabled ? T.danger : T.muted, font: '9px monospace' });
    });

    const canSend = !!selectedMonsterId;
    button(px + 12, 432, pw - 24, 24, canSend ? 'ОТПРАВИТЬ НА ЗАДАНИЕ' : 'ВЫБЕРИТЕ МОНСТРА',
      sendMission,
      { disabled: !canSend, reason: 'Выберите свободного монстра', font: 'bold 11px system-ui' });
  }

  function sendMission() {
    const a = Game.agency;
    const quest = a.quests.find(function (q) { return q.id === selectedQuestId; });
    const monster = a.monsters.find(function (m) { return m.id === selectedMonsterId; });

    if (!quest || !monster || quest.intercepted || monster.status !== 'idle') {
      showToast('Нужен свободный монстр и не перехваченный заказ');
      return;
    }

    a.lastResult = Models.calculateResult(monster, quest, a);
    Audio.playSfx('depart');
    setState('mission');
  }

  // ── Вкладка «УЛУЧШЕНИЯ» ──────────────────────────────────────────────────
  function drawShopTab(a) {
    Renderer.text('УЛУЧШЕНИЯ АГЕНТСТВА', CONTENT.x + 10, 80, { color: T.muted, font: 'bold 12px system-ui' });

    Models.UPGRADE_ORDER.forEach(function (key, i) {
      const conf = Models.UPGRADES_CONFIG[key];
      const lvl = a.upgrades[key];
      const maxed = lvl >= conf.maxLevel;
      const cost = conf.baseCost * (lvl + 1);
      const affordable = a.gold >= cost;
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = CONTENT.x + 10 + col * 228;
      const y = 92 + row * 56;

      card(x, y, 216, 50, {
        disabled: maxed,
        accent: maxed ? T.success : (affordable ? T.accent : T.border),
        reason: 'Максимальный уровень',
        onClick: maxed ? null : function () { buyUpgrade(key); }
      });

      Renderer.text(conf.name, x + 10, y + 19, { color: T.text, font: 'bold 12px system-ui' });
      Renderer.text(conf.desc, x + 10, y + 35, { color: T.muted, font: '9px system-ui' });

      for (let j = 0; j < conf.maxLevel; j++) {
        Renderer.roundRect(x + 10 + j * 12, y + 40, 8, 4, 2, j < lvl ? T.success : '#2c313c');
      }

      if (maxed) {
        Renderer.text('MAX', x + 206, y + 28, { color: T.success, align: 'right', font: 'bold 13px system-ui' });
      } else {
        Renderer.text(cost + ' зол.', x + 206, y + 20,
          { color: affordable ? T.accent : T.danger, align: 'right', font: 'bold 12px system-ui' });
        Renderer.text(affordable ? 'КУПИТЬ' : 'НЕТ ЗОЛОТА', x + 206, y + 37,
          { color: affordable ? T.text : '#5b6472', align: 'right', font: '9px system-ui' });
      }
    });

    const y2 = 92 + 4 * 56;
    const full = a.monsters.length >= Models.rosterCap(a);
    const canUndead = a.gold >= 150 && !full;

    card(CONTENT.x + 10, y2, 450, 48, {
      disabled: !canUndead,
      accent: T.hero,
      reason: full ? 'Стойла переполнены' : 'Нужно 150 золота',
      onClick: canUndead ? function () { hireUndead(); } : null
    });
    Renderer.drawIcon('ui_crypt', CONTENT.x + 18, y2 + 6, 34, 34, { label: 'Н', color: '#2a2136' });
    Renderer.text('НАНЯТЬ НЕЖИТЬ', CONTENT.x + 62, y2 + 21, { color: T.hero, font: 'bold 12px system-ui' });
    Renderer.text('Случайный Скелет или Вампир, без собеседования', CONTENT.x + 62, y2 + 36,
      { color: T.muted, font: '9px system-ui' });
    Renderer.text('150 зол.', CONTENT.x + 440, y2 + 27,
      { color: canUndead ? T.accent : T.danger, align: 'right', font: 'bold 12px system-ui' });

    Renderer.text('Улучшения действуют сразу и на задания, и на финальный тендер.',
      CONTENT.x + 10, y2 + 66, { color: '#4a5260', font: '10px system-ui' });
  }

  function buyUpgrade(key) {
    const res = Models.buyUpgrade(Game.agency, key);
    if (res.success) {
      Audio.playSfx('upgrade');
      showToast('Куплено: ' + Models.UPGRADES_CONFIG[key].name);
    } else {
      Audio.playSfx('reject');
      showToast(res.reason);
    }
  }

  function hireUndead() {
    const res = Models.hireUndead(Game.agency);
    if (res.success) {
      Audio.playSfx('hire');
      showToast('Нанят: ' + res.monster.name + ' (' + res.monster.speciesLabel + ')!');
    } else {
      Audio.playSfx('reject');
      showToast(res.reason);
    }
  }

  // ── Вкладка «АМУНИЦИЯ» ───────────────────────────────────────────────────
  function inventoryCount(a, id) {
    return a.inventory.filter(function (x) { return x === id; }).length;
  }

  function drawItemsTab(a) {
    Renderer.text('АМУНИЦИЯ · золото ' + a.gold, CONTENT.x + 10, 80,
      { color: T.muted, font: 'bold 12px system-ui' });

    Models.ITEMS.forEach(function (item, i) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = CONTENT.x + 10 + col * 150;
      const y = 92 + row * 52;
      const owned = inventoryCount(a, item.id);
      const affordable = a.gold >= item.price;

      card(x, y, 144, 46, {
        accent: owned > 0 ? T.success : (affordable ? T.accent : T.border),
        onClick: function () { buyItem(item); }
      });

      Renderer.text(item.name, x + 8, y + 16, { color: T.text, font: 'bold 10px system-ui' });
      Renderer.text(item.desc, x + 8, y + 30, { color: T.muted, font: '8px system-ui' });
      Renderer.text(item.price + ' зол.', x + 8, y + 41,
        { color: affordable ? T.accent : T.danger, font: 'bold 9px system-ui' });
      if (owned > 0) {
        Renderer.text('×' + owned, x + 136, y + 16, { color: T.success, align: 'right', font: 'bold 11px system-ui' });
      }
    });

    const bagText = 'СУМКА: ' + (a.inventory.length ? a.inventory.map(function (id) {
      const it = Models.getItem(id);
      return it ? it.name : id;
    }).join(', ') : 'пусто');
    Renderer.wrapText(bagText, 450, '9px system-ui').slice(0, 2).forEach(function (line, i) {
      Renderer.text(line, CONTENT.x + 10, 328 + i * 12, { color: T.muted, font: '9px system-ui' });
    });

    Renderer.text('Экипировка выдаётся в досье монстра. Расходники применяются там же.',
      CONTENT.x + 10, 358, { color: '#4a5260', font: '9px system-ui' });
    button(CONTENT.x + 10, 374, 450, 36, 'ОТКРЫТЬ ДОСЬЕ ДЛЯ ЭКИПИРОВКИ', function () {
      currentTab = 'monsters';
      showToast('Выберите монстра в разделе «Штат»');
    }, { variant: 'ghost', font: 'bold 11px system-ui' });
  }

  function buyItem(item) {
    const res = Models.buyItem(Game.agency, item.id);
    if (res.success) {
      Audio.playSfx('upgrade');
      showToast('Куплено: ' + item.name);
    } else {
      Audio.playSfx('reject');
      showToast(res.reason);
    }
  }

  // ── Экран агентства ──────────────────────────────────────────────────────
  function drawAgency() {
    const a = Game.agency;
    Renderer.drawImage('bg_agency', 0, 0, W, H);
    Renderer.rect(0, 0, W, H, 'rgba(10,11,15,0.62)');

    drawHUD(a);
    drawTabs();

    Renderer.roundRect(CONTENT.x, CONTENT.y, CONTENT.w, CONTENT.h, 10, 'rgba(19,21,27,0.88)');
    Renderer.roundRectStroke(CONTENT.x, CONTENT.y, CONTENT.w, CONTENT.h, 10, T.border, 1);

    if (currentTab === 'monsters') drawRosterTab(a);
    else if (currentTab === 'quests') drawQuestsTab(a);
    else if (currentTab === 'shop') drawShopTab(a);
    else drawItemsTab(a);
  }

  // ── Досье монстра ────────────────────────────────────────────────────────
  function drawMonsterView() {
    const a = Game.agency;
    const m = a.monsters.find(function (x) { return x.id === selectedMonsterViewId; });
    if (!m) return;

    hitAreas.length = 0;
    Renderer.rect(0, 0, W, H, 'rgba(6,7,10,0.72)');

    const x = 40, y = 40, w = 560, h = 400;
    Renderer.roundRect(x, y, w, h, 12, T.panel);
    Renderer.roundRectStroke(x, y, w, h, 12, T.border, 2);

    Renderer.drawMonsterIcon('mon_' + m.speciesKey, x + 24, y + 24, 96);
    Renderer.text(m.name, x + 136, y + 52, { color: T.text, font: 'bold 22px system-ui' });
    Renderer.text('[' + m.speciesLabel + '] · ' + (STATUS_LABELS[m.status] || STATUS_LABELS.injured).text,
      x + 136, y + 74, { color: STATUS_LABELS[m.status].color, font: '11px system-ui' });
    Renderer.text('Черта: ' + m.traits[0] + ' — ' + (Content.TRAIT_INFO[m.traits[0]] || ''),
      x + 136, y + 94, { color: T.muted, font: '10px system-ui' });
    Renderer.text('Предпочтение: скрыто · выполнено заданий: ' + m.missions + ' · оверкиллов: ' + m.overkillCount,
      x + 136, y + 112, { color: '#5f6875', font: '9px system-ui' });

    const stats = [
      ['СИЛА', m.stats.str, 'str'], ['ЛОВКОСТЬ', m.stats.agi, 'agi'],
      ['ИНТЕЛЛЕКТ', m.stats.int, 'int'], ['УДАЧА', m.stats.luck, 'luck']
    ];
    stats.forEach(function (s, i) {
      const sx = x + 24 + i * 130;
      const bonus = Models.itemBonus(m, s[2]);
      Renderer.text(s[0], sx, y + 146, { color: T.muted, font: '9px system-ui' });
      Renderer.text(String(s[1]) + (bonus ? ' (+' + bonus + ')' : ''), sx, y + 168,
        { color: bonus ? T.success : T.text, font: 'bold 16px system-ui' });
    });

    // Слоты экипировки
    Renderer.text('ЭКИПИРОВКА', x + 24, y + 202, { color: T.muted, font: 'bold 10px system-ui' });
    ['weapon', 'armor', 'amulet'].forEach(function (slot, i) {
      const sx = x + 24 + i * 176, sy = y + 212, sw = 168, sh = 44;
      const itemId = m.equipment ? m.equipment[slot] : null;
      const item = Models.getItem(itemId);

      card(sx, sy, sw, sh, {
        accent: item ? T.success : T.border,
        onClick: item ? function () { unequip(m, slot); } : null
      });
      Renderer.text(SLOT_LABELS[slot], sx + 8, sy + 14, { color: '#5f6875', font: '8px system-ui' });
      Renderer.text(item ? item.name : '— пусто —', sx + 8, sy + 31,
        { color: item ? T.text : '#4a5260', font: 'bold 10px system-ui' });
      if (item) Renderer.text('снять', sx + sw - 8, sy + 31, { color: T.danger, align: 'right', font: '9px system-ui' });
    });

    // Сумка
    Renderer.text('СУМКА', x + 24, y + 278, { color: T.muted, font: 'bold 10px system-ui' });
    const bag = {};
    a.inventory.forEach(function (id) { bag[id] = (bag[id] || 0) + 1; });
    const bagIds = Object.keys(bag);

    if (!bagIds.length) {
      Renderer.text('Пусто. Купите экипировку во вкладке «Амуниция».', x + 24, y + 302,
        { color: '#4a5260', font: '10px system-ui' });
    }

    bagIds.slice(0, 8).forEach(function (id, i) {
      const item = Models.getItem(id);
      if (!item) return;
      const col = i % 4, row = Math.floor(i / 4);
      const bx = x + 24 + col * 128, by = y + 288 + row * 44, bw = 122, bh = 38;

      card(bx, by, bw, bh, {
        onClick: function () {
          if (item.type === 'consumable') useItem(m, id);
          else equipItem(m, id);
        }
      });
      Renderer.text(item.name + (bag[id] > 1 ? ' ×' + bag[id] : ''), bx + 8, by + 15,
        { color: T.text, font: 'bold 9px system-ui' });
      Renderer.text(item.type === 'consumable' ? 'применить' : 'надеть', bx + 8, by + 29,
        { color: item.type === 'consumable' ? T.warn : T.success, font: '8px system-ui' });
    });

    if (bagIds.length > 8) {
      Renderer.text('и ещё ' + (bagIds.length - 8) + ' вид(ов) — прокрутите сумку в «Амуниции»',
        x + 24, y + h - 92, { color: '#4a5260', font: '8px system-ui' });
    }

    button(x + w - 150, y + h - 54, 130, 38, 'НАЗАД', function () { setState('agency'); }, { variant: 'ghost' });
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

  // ── Собеседование ────────────────────────────────────────────────────────
  function drawInterview() {
    const a = Game.agency;
    const c = interviewCandidate;
    if (!c) return;

    hitAreas.length = 0;
    Renderer.rect(0, 0, W, H, 'rgba(6,7,10,0.7)');

    const x = 120, y = 78, w = 400, h = 320;
    Renderer.roundRect(x, y, w, h, 12, T.panel);
    Renderer.roundRectStroke(x, y, w, h, 12, T.accent, 2);

    Renderer.text('СОБЕСЕДОВАНИЕ', x + w / 2, y + 30, { color: T.accent, align: 'center', font: 'bold 14px system-ui' });
    Renderer.text('осталось попыток: ' + a.interviewsLeft + '/3', x + w / 2, y + 48,
      { color: a.interviewsLeft > 0 ? T.muted : T.danger, align: 'center', font: '10px system-ui' });

    Renderer.drawMonsterIcon('mon_' + c.speciesKey, x + 30, y + 68, 96);
    Renderer.text(c.name, x + 140, y + 100, { color: T.text, font: 'bold 22px system-ui' });
    Renderer.text('[' + c.speciesLabel + ']', x + 140, y + 122, { color: T.muted, font: '12px system-ui' });
    Renderer.text('Черта: ' + c.traits[0], x + 140, y + 142, { color: T.warn, font: '10px system-ui' });
    Renderer.text(Content.TRAIT_INFO[c.traits[0]] || '', x + 140, y + 158, { color: '#5f6875', font: '9px system-ui' });

    const stats = [['СИЛА', c.stats.str], ['ЛОВ', c.stats.agi], ['ИНТ', c.stats.int], ['УДА', c.stats.luck]];
    stats.forEach(function (s, i) {
      const sx = x + 30 + i * 90;
      Renderer.roundRect(sx, y + 182, 80, 42, 6, '#12151b');
      Renderer.text(s[0], sx + 40, y + 198, { color: T.muted, align: 'center', font: '9px system-ui' });
      Renderer.text(String(s[1]), sx + 40, y + 218, { color: T.text, align: 'center', font: 'bold 16px system-ui' });
    });

    Renderer.text('Предпочтение скрыто — монстр может отказаться.', x + 30, y + 248,
      { color: '#7d735f', font: '10px system-ui' });
    Renderer.text('Отказ тратит попытку собеседования, но не золото.', x + 30, y + 264,
      { color: '#4a5260', font: '9px system-ui' });

    button(x + 30, y + 276, 160, 34, 'НАНЯТЬ', hireCandidate, {
      variant: 'success',
      disabled: a.interviewsLeft <= 0 || a.monsters.length >= Models.rosterCap(a),
      reason: a.interviewsLeft <= 0 ? 'Собеседования закончились' : 'Стойла переполнены'
    });
    button(x + 210, y + 276, 160, 34, 'ПОЗЖЕ', function () { setState('agency'); }, { variant: 'ghost' });
  }

  function hireCandidate() {
    const a = Game.agency;
    if (!interviewCandidate) { setState('agency'); return; }
    const cand = interviewCandidate;
    const idx = a.candidates.findIndex(function (x) { return x.id === cand.id; });
    if (idx === -1) { setState('agency'); return; }

    const res = Models.tryHire(cand, a);

    if (!res.consumed) {
      showToast(res.reason);
      Audio.playSfx('reject');
      return;
    }

    a.candidates.splice(idx, 1);

    if (res.success) {
      a.monsters.push(cand);
      Audio.playSfx('hire');
      showToast(cand.name + ' принят!');
    } else {
      Audio.playSfx('reject');
      showToast('Отказ: ' + res.reason);
    }
    setState('agency');
  }

  // ── Миссия ───────────────────────────────────────────────────────────────
  function drawMission() {
    const a = Game.agency;
    const r = a.lastResult;
    if (!r) return;
    const m = a.monsters.find(function (x) { return x.id === r.monsterId; });

    Renderer.drawImage('bg_agency', 0, 0, W, H);
    Renderer.rect(0, 0, W, H, 'rgba(8,9,12,0.86)');

    const p = 1 - Math.max(0, missionTimer) / 2.0;
    const x = 180 + p * 250;

    Renderer.text('ЗАДАНИЕ В РАБОТЕ', 320, 120, { color: T.accent, align: 'center', font: 'bold 14px system-ui' });
    Renderer.text(r.questTitle, 320, 148, { color: T.text, align: 'center', font: 'bold 16px system-ui' });
    Renderer.text('Монстр ушёл и не отвечает на письма…', 320, 174,
      { color: T.muted, align: 'center', font: '11px system-ui' });

    if (m) {
      Renderer.drawMonsterIcon('mon_' + m.speciesKey, x, 220, 64);
      Renderer.text(m.name, x + 32, 306, { color: T.text, align: 'center', font: 'bold 12px system-ui' });
    }

    Renderer.roundRect(140, 340, 360, 6, 3, '#22262f');
    Renderer.roundRect(140, 340, Math.max(4, 360 * p), 6, 3, T.accent);

    Renderer.text('Чем закончится — узнаем из докладной.', 320, 380,
      { color: '#5b6472', align: 'center', font: '10px system-ui' });
  }

  // ── Отчёт ────────────────────────────────────────────────────────────────
  function drawReport() {
    const a = Game.agency;
    const r = a.lastResult;

    Renderer.drawImage('bg_agency', 0, 0, W, H);
    Renderer.rect(0, 0, W, H, 'rgba(8,9,12,0.82)');
    if (!r) return;

    const x = 40, y = 32, w = 560, h = 416;
    Renderer.roundRect(x, y, w, h, 10, '#17150f');
    Renderer.roundRectStroke(x, y, w, h, 10, '#3d3524', 2);

    Renderer.roundRect(x + 26, y + 18, 64, 64, 6, '#211d14');
    Renderer.roundRectStroke(x + 26, y + 18, 64, 64, 6, '#3d3524', 1);
    Renderer.drawMonsterIcon('mon_' + r.speciesKey, x + 28, y + 20, 60);

    Renderer.text('ДОКЛАДНАЯ', x + 104, y + 38, { color: T.accent, font: 'bold 13px system-ui' });
    Renderer.text('от ' + r.monsterName + ' · ' + r.speciesLabel, x + 104, y + 58,
      { color: T.muted, font: '12px system-ui' });
    Renderer.text('Задание: ' + r.questTitle, x + 104, y + 78,
      { color: '#c9bfa5', font: 'italic 12px system-ui' });
    Renderer.text('День ' + a.day, x + w - 26, y + 38,
      { color: '#7d735f', align: 'right', font: '11px system-ui' });
    Renderer.rect(x + 26, y + 92, w - 52, 1, '#3d3524');

    // Печать текста
    const font = 'italic 19px Georgia';
    const full = '«' + r.reportText + '»';
    const lines = Renderer.wrapText(full, w - 90, font);
    const visible = Math.min(full.length, Math.floor(reportTime * 45));
    let remaining = visible;
    lines.forEach(function (line, i) {
      const take = Math.max(0, Math.min(line.length, remaining));
      remaining -= take;
      Renderer.text(line.slice(0, take), x + 44, y + 132 + i * 30, { color: '#efe6cf', font: font });
    });

    // Мерцание — только для врущего монстра с низким интеллектом
    if (r.lied && r.int <= 7 && visible >= full.length) {
      const flick = Math.sin(reportTime * 9) > 0.4;
      if (flick) {
        Renderer.rect(x + 30, y + 118, w - 60, lines.length * 30, 'rgba(23,21,15,0.45)');
      }
    }

    if (r.type === 'overkill') {
      const p = Math.min(1, reportTime / 1.2);
      for (let i = 0; i < 24; i++) {
        const ang = (i / 24) * Math.PI * 2;
        const dist = 20 + p * 90 + (i % 5) * 6;
        Renderer.rect(320 + Math.cos(ang) * dist, 230 + Math.sin(ang) * dist * 0.55, 3, 3,
          i % 3 === 0 ? '#f97316' : '#f5c542');
      }
      Renderer.text('МОНСТР ПЕРЕСТАРАЛСЯ', x + 26, y + 260, { color: T.warn, font: 'bold 11px system-ui' });
    }

    const sealX = x + 92, sealY = y + 292;
    Renderer.ctx.save();
    Renderer.ctx.globalAlpha = 0.55;
    Renderer.roundRect(sealX - 24, sealY - 24, 48, 48, 24, '#7f1d1d');
    Renderer.roundRectStroke(sealX - 24, sealY - 24, 48, 48, 24, '#b91c1c', 2);
    Renderer.text('АГ', sealX, sealY + 5, { color: '#fecaca', align: 'center', font: 'bold 14px Georgia' });
    Renderer.ctx.restore();
    Renderer.text('Печать агентства «Последний человек»', x + 130, sealY + 5,
      { color: '#6f6652', font: '10px system-ui' });

    Renderer.rect(x + 26, y + 330, w - 52, 1, '#3d3524');

    const trust = Math.round(r.honesty * 100);
    const trustColor = trust >= 80 ? T.success : (trust >= 40 ? T.accent : T.warn);
    Renderer.text('Интеллект ' + r.int + ' — доверять на ' + trust + '%', x + 26, y + 354,
      { color: trustColor, font: 'bold 12px system-ui' });
    Renderer.text('Отчёт пишет сам монстр. Он может ошибаться — или врать.',
      x + 26, y + 372, { color: '#7d735f', font: '10px system-ui' });

    if (reportTime > 0.9) {
      button(x + w - 196, y + 344, 170, 42, 'ПРИНЯТЬ ОТЧЁТ', acceptReport, { font: 'bold 13px system-ui' });
    }
  }

  function acceptReport() {
    const a = Game.agency;
    const r = a.lastResult;
    if (!r) { setState('agency'); return; }

    Models.applyMissionResult(a, r);
    selectedQuestId = null;
    selectedMonsterId = null;

    if (checkDefeat()) return;

    setState('agency');
    if (a.quests.length === 0) showToast('Заказы закончились — завершайте день');
  }

  // ── Конец дня ────────────────────────────────────────────────────────────
  function drawEndDay() {
    const a = Game.agency;

    Renderer.drawImage('bg_agency', 0, 0, W, H);
    Renderer.rect(0, 0, W, H, 'rgba(8,9,12,0.84)');

    const x = 40, y = 28, w = 560, h = 424;
    Renderer.roundRect(x, y, w, h, 12, T.panel);
    Renderer.roundRectStroke(x, y, w, h, 12, T.border, 2);

    Renderer.text('КОНЕЦ ДНЯ ' + a.day, x + w / 2, y + 40,
      { color: T.accent, align: 'center', font: 'bold 22px system-ui' });
    Renderer.text('Золото начислено только сейчас — отчёты могли врать.', x + w / 2, y + 58,
      { color: T.muted, align: 'center', font: '9px system-ui' });

    const cells = [
      ['ЗАДАНИЙ', a.dayStats.questsDone, T.text],
      ['ЗАРАБОТАНО', '+' + a.dayStats.goldEarned, T.success],
      ['ПЕРЕХВАЧЕНО', a.dayStats.intercepted, T.danger],
      ['ПОТЕРЯНО', a.dayStats.losses, T.danger]
    ];
    cells.forEach(function (c, i) {
      const cx = x + 34 + i * 130;
      Renderer.text(c[0], cx, y + 80, { color: T.muted, font: '9px system-ui' });
      Renderer.text(String(c[1]), cx, y + 104, { color: c[2], font: 'bold 18px system-ui' });
    });

    Renderer.roundRect(x + 24, y + 118, w - 48, 190, 8, '#12141a');
    Renderer.text('РЕЗУЛЬТАТЫ МИССИЙ', x + 36, y + 140, { color: T.muted, font: 'bold 10px system-ui' });

    if (!a.dayStats.missions.length) {
      Renderer.text('Сегодня никто не выходил на задания.', x + 36, y + 166,
        { color: '#4a5260', font: '11px system-ui' });
    }

    a.dayStats.missions.slice(-6).forEach(function (m, i) {
      const my = y + 164 + i * 23;
      const info = MISSION_LABELS[m.type] || { text: m.type, color: T.text };
      Renderer.text('• ' + m.monsterName + ' — ' + m.questTitle, x + 36, my,
        { color: T.text, font: '10px system-ui' });
      Renderer.text(info.text + (m.gold ? ' (+' + m.gold + ')' : ''), x + w - 40, my,
        { color: info.color, align: 'right', font: 'bold 10px system-ui' });
    });

    const stage = Models.threatStage(a.threat);
    Renderer.text('Угроза: ' + Models.threatLabel(a.threat) + ' (' + Math.round(a.threat * 100) + '%)',
      x + 24, y + 330, { color: STAGE_COLORS[stage], font: 'bold 12px system-ui' });
    Renderer.text('Перехват заказов: ' + Math.round(Models.interceptChance(a) * 100) + '% · ' +
      (a.upgrades.intel > 0 ? 'разведка работает' : 'без отдела разведки'),
      x + 24, y + 350, { color: T.muted, font: '10px system-ui' });

    const lastDay = a.day >= a.maxDays;
    button(x + w / 2 - 130, y + 368, 260, 42,
      lastDay ? 'ФИНАЛЬНЫЙ ТЕНДЕР' : 'СЛЕДУЮЩИЙ ДЕНЬ',
      handleEndDayButton, { variant: lastDay ? 'hero' : 'primary' });
  }

  function handleEndDayButton() {
    const a = Game.agency;

    if (a.day >= a.maxDays) { startTender(); return; }

    Models.nextDay(a);
    currentTab = 'quests';
    selectedQuestId = null;
    selectedMonsterId = null;
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

  // ── Тендер ───────────────────────────────────────────────────────────────
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
    const pref = Models.preferenceMatchesTask(m, Content.TENDER_QUEST) ? 5 : -5;
    const score = eff + honesty + pref;
    if (score >= 14) return { text: 'СИЛЬНЫЙ ОТЧЁТ', color: T.success };
    if (score >= 6) return { text: 'НОРМАЛЬНЫЙ ОТЧЁТ', color: T.accent };
    return { text: 'СЛАБЫЙ ОТЧЁТ', color: T.danger };
  }

  function drawTender() {
    const a = Game.agency;
    if (!tender) { startTender(); return; }

    drawTenderBackdrop();

    Renderer.text('ФИНАЛЬНЫЙ ТЕНДЕР', 320, 36, { color: T.hero, align: 'center', font: 'bold 22px system-ui' });
    Renderer.text('«' + Content.TENDER_TEXT.intro + '»', 320, 55,
      { color: T.muted, align: 'center', font: 'italic 10px Georgia' });

    Renderer.roundRect(70, 64, 500, 48, 8, 'rgba(23,26,33,0.94)');
    Renderer.roundRectStroke(70, 64, 500, 48, 8, T.hero, 1);
    Renderer.text(tender.quest.title, 86, 84, { color: T.text, font: 'bold 12px system-ui' });
    Renderer.text('Сложность 8 · победит тот, чей отчёт убедительнее (статы, интеллект, предпочтения)',
      86, 101, { color: T.muted, font: '9px system-ui' });
    Renderer.drawIcon('quest_citadel', 522, 69, 38, 38, { label: 'Ц', color: '#312a3d' });

    Renderer.roundRect(24, 122, 292, 196, 8, 'rgba(23,26,33,0.94)');
    Renderer.roundRectStroke(24, 122, 292, 196, 8, '#3b2e4d', 1);
    Renderer.text('ГЕРОЙ-ДИРЕКТОР', 40, 144, { color: T.hero, font: 'bold 12px system-ui' });
    Renderer.text(tender.aiAgency, 40, 160, { color: T.muted, font: '9px system-ui' });

    const ai = tender.aiChampion;
    Renderer.drawMonsterIcon('mon_' + ai.speciesKey, 40, 172, 48);
    Renderer.text(ai.name, 100, 190, { color: T.text, font: 'bold 14px system-ui' });
    Renderer.text('[' + ai.speciesLabel + '] ИНТ ' + ai.stats.int, 100, 208,
      { color: T.muted, font: '10px monospace' });

    Renderer.text('Он выставит сильнейшего переговорщика.', 40, 246, { color: '#6b5b82', font: '9px system-ui' });
    Renderer.text('Ваш отчёт оценивают по:', 40, 268, { color: '#6b5b82', font: '9px system-ui' });
    Renderer.text('• сила против сложности 8', 48, 284, { color: '#6b5b82', font: '9px system-ui' });
    Renderer.text('• честность (ИНТ 14+ / 8+ / ниже)', 48, 298, { color: '#6b5b82', font: '9px system-ui' });
    Renderer.text('• совпадение с предпочтением', 48, 312, { color: '#6b5b82', font: '9px system-ui' });

    Renderer.roundRect(324, 122, 292, 196, 8, 'rgba(23,26,33,0.94)');
    Renderer.roundRectStroke(324, 122, 292, 196, 8, '#2c3d2f', 1);
    Renderer.text('ВАШ ЧЕМПИОН', 340, 144, { color: T.success, font: 'bold 12px system-ui' });
    Renderer.text('Выберите монстра и его экипировку', 340, 160, { color: T.muted, font: '9px system-ui' });

    const cw = 132, chh = 44;
    a.monsters.forEach(function (m, i) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 336 + col * (cw + 8);
      const y = 168 + row * (chh + 4);
      if (y + chh > 316) return;

      const selected = tender.playerChampionId === m.id;
      card(x, y, cw, chh, {
        selected: selected,
        onClick: function () { if (!tender.resolved) tender.playerChampionId = m.id; }
      });
      Renderer.drawMonsterIcon('mon_' + m.speciesKey, x + 4, y + 4, chh - 8);
      Renderer.text(m.name, x + 44, y + 16, { color: T.text, font: 'bold 11px system-ui' });
      Renderer.text('ИНТ ' + m.stats.int + ' · СИЛ ' + m.stats.str, x + 44, y + 28,
        { color: T.muted, font: '8px monospace' });
      const rate = tenderRating(m, a);
      Renderer.text(rate.text, x + 44, y + 39, { color: rate.color, font: 'bold 7px system-ui' });
    });

    if (!tender.resolved) {
      button(190, 330, 260, 40, 'ОТПРАВИТЬ ЛУЧШЕГО', resolveTender, { variant: 'hero', font: 'bold 13px system-ui' });
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

    const spot = ctx.createRadialGradient(320, 90, 10, 320, 90, 280);
    spot.addColorStop(0, 'rgba(168,85,247,0.30)');
    spot.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(30,22,42,0.92)';
    ctx.beginPath();
    ctx.ellipse(320, 472, 300, 72, 0, 0, Math.PI * 2);
    ctx.fill();
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

    Renderer.roundRect(50, 108, 540, 336, 10, 'rgba(14,16,21,0.98)');
    Renderer.roundRectStroke(50, 108, 540, 336, 10, res.win ? T.success : T.danger, 2);

    Renderer.text(res.win ? 'ВАШ ОТЧЁТ УБЕДИТЕЛЬНЕЕ' : 'ГЕРОЙ-ДИРЕКТОР УБЕДИТЕЛЬНЕЕ', 320, 138,
      { color: res.win ? T.success : T.danger, align: 'center', font: 'bold 16px system-ui' });

    [res.player, res.ai].forEach(function (p, i) {
      const x = 76 + i * 250;
      Renderer.text(i ? 'ГЕРОЙ-ДИРЕКТОР' : 'ВЫ', x, 168, { color: i ? T.hero : T.success, font: 'bold 10px system-ui' });
      Renderer.text(p.name + ' · ИНТ ' + p.int, x, 186, { color: T.text, font: 'bold 11px system-ui' });

      Renderer.wrapText('«' + p.report.text + '»', 214, 'italic 11px Georgia').slice(0, 6).forEach(function (line, j) {
        Renderer.text(line, x, 208 + j * 15, { color: '#cfc7b5', font: 'italic 11px Georgia' });
      });

      Renderer.text('Счёт: ' + (i ? res.aiScore : res.playerScore), x, 306,
        { color: T.accent, font: 'bold 13px system-ui' });
      Renderer.text(p.report.lied ? 'Отчёт подозрительно красивый…' : 'Отчёт выглядит честным', x, 324,
        { color: p.report.lied ? T.warn : T.muted, font: '10px system-ui' });
    });

    button(190, 372, 260, 42, 'ПОДВЕСТИ ИТОГ', function () {
      outcome = { win: res.win, reason: 'tender', result: res };
      setState(res.win ? 'victory' : 'defeat');
    }, { variant: 'hero', font: 'bold 13px system-ui' });
  }

  // ── Победа / поражение ───────────────────────────────────────────────────
  function drawOutcome() {
    const a = Game.agency;
    const win = !!(outcome && outcome.win);

    hitAreas.length = 0;
    if (win) drawTenderBackdrop();
    else {
      Renderer.drawImage('bg_agency', 0, 0, W, H);
      Renderer.rect(0, 0, W, H, 'rgba(8,9,12,0.85)');
    }
    Renderer.rect(0, 0, W, H, 'rgba(5,5,8,0.5)');

    const x = 70, y = 60, w = 500, h = 356;
    Renderer.roundRect(x, y, w, h, 12, T.panel);
    Renderer.roundRectStroke(x, y, w, h, 12, win ? T.success : T.danger, 2);

    Renderer.text(win ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ', 320, y + 52,
      { color: win ? T.success : T.danger, align: 'center', font: 'bold 30px system-ui' });

    let text = win ? Content.TENDER_TEXT.win : Content.TENDER_TEXT.lose;
    if (!win && outcome && outcome.reason === 'threat') {
      text = 'Конкуренты заняли город. Агентство закрыто, монстры разбежались по подвалам.';
    }
    if (!win && outcome && outcome.reason === 'nomons') {
      text = 'В штате не осталось ни одного монстра. Тендер проигран без боя.';
    }

    Renderer.wrapText(text, w - 80, '12px system-ui').forEach(function (line, i) {
      Renderer.text(line, 320, y + 88 + i * 18, { color: T.text, align: 'center', font: '12px system-ui' });
    });

    if (outcome && outcome.result) {
      Renderer.text('Тендер: вы ' + outcome.result.playerScore + ' — герой ' + outcome.result.aiScore,
        320, y + 152, { color: T.muted, align: 'center', font: '10px system-ui' });
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
      const cy = y + 176 + i * 22;
      Renderer.text(r[0], x + 50, cy, { color: T.muted, font: '10px system-ui' });
      Renderer.text(String(r[1]), x + w - 50, cy, { color: T.text, align: 'right', font: 'bold 10px system-ui' });
    });

    button(x + 40, y + h - 56, 180, 38, 'НОВАЯ ИГРА', startNewGame, { variant: 'success', font: 'bold 12px system-ui' });
    button(x + w - 220, y + h - 56, 180, 38, 'В МЕНЮ', function () { outcome = null; setState('menu'); }, { variant: 'ghost', font: 'bold 12px system-ui' });
  }

  function startNewGame() {
    Game.agency = Models.createAgency();
    tender = null;
    outcome = null;
    currentTab = 'monsters';
    setState('agency');
  }

  // ── Меню ─────────────────────────────────────────────────────────────────
  function drawMenu() {
    Renderer.drawImage('bg_agency', 0, 0, W, H);
    Renderer.rect(0, 0, W, H, 'rgba(6,7,10,0.72)');

    Renderer.text('ПОСЛЕДНИЙ', 320, 104, { color: T.accent, align: 'center', font: 'bold 44px Georgia' });
    Renderer.text('ЧЕЛОВЕК', 320, 150, { color: T.accent, align: 'center', font: 'bold 44px Georgia' });
    Renderer.text('агентство по трудоустройству монстров', 320, 178,
      { color: T.muted, align: 'center', font: '12px system-ui' });

    const bx = 220, bw = 200, bh = 44;
    button(bx, 214, bw, bh, 'НОВАЯ ИГРА', function () {
      Game.agency = Models.createAgency();
      setState('intro');
    }, { variant: 'success' });

    const save = readSave();
    button(bx, 268, bw, bh, save ? ('ПРОДОЛЖИТЬ · день ' + save.day) : 'ПРОДОЛЖИТЬ', function () {
      if (loadGame()) { currentTab = 'quests'; setState('agency'); }
      else showToast('Сохранение не найдено');
    }, { disabled: !saveAvailable, reason: 'Пока нет сохранения' });

    button(bx, 322, bw, bh, 'КАК ИГРАТЬ', function () { helpFrom = 'menu'; setState('help'); }, { variant: 'ghost' });

    Renderer.text('Мышь / тап. Esc — пауза, Enter — подтвердить.', 320, 412,
      { color: '#4a5260', align: 'center', font: '10px system-ui' });
    Renderer.text('FEIS Game Jam · 2026', 320, 440, { color: '#3a4250', align: 'center', font: '9px system-ui' });
  }

  function readSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return d && d.agency ? d.agency : null;
    } catch (e) { return null; }
  }

  // ── Пролог ───────────────────────────────────────────────────────────────
  function drawIntro() {
    Renderer.drawImage('bg_agency', 0, 0, W, H);
    Renderer.rect(0, 0, W, H, 'rgba(5,6,9,0.86)');

    const lines = [
      'Герои ушли в другие измерения — качаться до бесконечности.',
      'Города остались. Монстры остались. Работы — ни у кого.',
      'Ты — последний человек, бывший клерк гильдии приёмов.',
      'Ты открыл агентство: горожане платят, монстры пугают. И врут в отчётах.',
      '',
      'Продержись 14 дней. На 14-й день бывший герой откроет своё агентство —',
      'и город достанется тому, чей монстр напишет убедительный отчёт.'
    ];

    Renderer.text('ПОСЛЕДНИЙ ЧЕЛОВЕК', 320, 92, { color: T.accent, align: 'center', font: 'bold 26px Georgia' });
    lines.forEach(function (line, i) {
      const shown = Math.min(line.length, Math.max(0, Math.floor((introTime - 0.2 - i * 0.25) * 60)));
      Renderer.text(line.slice(0, shown), 320, 150 + i * 24,
        { color: i >= 5 ? T.muted : T.text, align: 'center', font: i >= 5 ? '11px system-ui' : '13px system-ui' });
    });

    if (introTime > 2.2) {
      button(220, 360, 200, 44, 'ОТКРЫТЬ АГЕНТСТВО', function () { setState('agency'); }, { variant: 'success' });
      Renderer.text('клик — пропустить', 320, 430, { color: '#3a4250', align: 'center', font: '9px system-ui' });
    } else {
      addArea(0, 0, W, H, function () { introTime = 3; });
    }
  }

  // ── Помощь и пауза ───────────────────────────────────────────────────────
  function drawHelp() {
    hitAreas.length = 0;
    Renderer.rect(0, 0, W, H, 'rgba(4,5,7,0.82)');

    const x = 60, y = 30, w = 520, h = 420;
    Renderer.roundRect(x, y, w, h, 12, T.panel);
    Renderer.roundRectStroke(x, y, w, h, 12, T.accent, 2);

    Renderer.text('КАК ИГРАТЬ', x + w / 2, y + 30, { color: T.accent, align: 'center', font: 'bold 18px system-ui' });

    const rows = [
      ['1. Собеседование', 'У кандидата скрытое предпочтение. Найм тратит 1 из 3 попыток; так же и отказ.'],
      ['2. Заказы', 'Монстр выполняет одно задание в день, потом отдыхает. Сравнивайте статы со сложностью.'],
      ['3. Отчёты', 'Монстр пишет сам и может врать: ИНТ 14+ — честен, 8–13 — 50/50, ниже 8 — врёт.'],
      ['4. Оверкилл', 'Перестарался: +50% золота, но +3% угрозы и риск травмы.'],
      ['5. Угроза', 'Конкуренты перехватывают заказы: 10→20→30→40%. Угроза 100% — поражение.'],
      ['6. Улучшения', 'Кузня, стойла, канализация, крипта, тренировочный зал, разведка, школа лжи.'],
      ['7. Экипировка', 'Предметы из «Амуниции» выдаются в досье монстра — клик по нему в «Штате».'],
      ['8. Финал', '14-й день: тендер с Героем-Директором. Побеждает убедительный отчёт.']
    ];

    rows.forEach(function (r, i) {
      const ry = y + 58 + i * 36;
      Renderer.text(r[0], x + 24, ry, { color: T.text, font: 'bold 11px system-ui' });
      Renderer.text(r[1], x + 24, ry + 15, { color: T.muted, font: '9px system-ui' });
    });

    Renderer.text('Цель: дожить до 14-го дня и выиграть тендер у Героя-Директора.',
      x + w / 2, y + h - 66, { color: T.accent, align: 'center', font: '10px system-ui' });

    button(x + w / 2 - 80, y + h - 50, 160, 34, 'ПОНЯТНО', closeHelp, { variant: 'ghost' });
  }

  function closeHelp() {
    if (helpFrom === 'menu') setState('menu');
    else if (helpFrom === 'pause') setState('pause');
    else setState('agency');
  }

  function drawPause() {
    hitAreas.length = 0;
    Renderer.rect(0, 0, W, H, 'rgba(4,5,7,0.72)');

    const x = 200, y = 120, w = 240, h = 240;
    Renderer.roundRect(x, y, w, h, 12, T.panel);
    Renderer.roundRectStroke(x, y, w, h, 12, T.border, 2);
    Renderer.text('ПАУЗА', 320, y + 44, { color: T.accent, align: 'center', font: 'bold 20px system-ui' });

    button(x + 30, y + 70, 180, 38, 'ПРОДОЛЖИТЬ', function () { setState('agency'); }, { variant: 'success' });
    button(x + 30, y + 118, 180, 38, 'КАК ИГРАТЬ', function () { helpFrom = 'pause'; setState('help'); }, { variant: 'ghost' });
    button(x + 30, y + 166, 180, 38, 'В МЕНЮ', function () { saveGame(); setState('menu'); }, { variant: 'ghost' });
  }

  // ── Тосты ────────────────────────────────────────────────────────────────
  function drawToast() {
    const font = 'bold 11px system-ui';
    Renderer.ctx.font = font;
    const tw = Math.min(470, Renderer.ctx.measureText(toast.msg).width + 28);
    const x = (W - tw) / 2, y = 56;

    Renderer.roundRect(x, y, tw, 28, 6, 'rgba(8,9,12,0.96)');
    Renderer.roundRectStroke(x, y, tw, 28, 6, T.accent, 1);
    Renderer.text(toast.msg, W / 2, y + 19, { color: T.accent, align: 'center', font: font });
  }

  // ── Цикл ─────────────────────────────────────────────────────────────────
  function update(dt) {
    time += dt;
    if (toast.t > 0) toast.t -= dt;
    if (Game.state === 'intro') introTime += dt;

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

    // Клавиатура
    if (pressed('Escape')) {
      if (Game.state === 'report') acceptReport();
      else if (Game.state === 'pause') setState('agency');
      else if (Game.state === 'help') closeHelp();
      else if (Game.state === 'agency') setState('pause');
      else if (Game.state === 'monster' || Game.state === 'interview') setState('agency');
      else if (Game.state === 'tender' && tender && tender.resolved) setState(outcome ? 'victory' : 'tender');
    }
    if (pressed('Enter') || pressed('Space')) {
      if (Game.state === 'menu') { Game.agency = Models.createAgency(); setState('intro'); }
      else if (Game.state === 'intro') setState('agency');
      else if (Game.state === 'report' && reportTime > 0.9) acceptReport();
      else if (Game.state === 'endday') handleEndDayButton();
    }
  }

  function render() {
    hitAreas = [];
    Renderer.rect(0, 0, W, H, T.bg);

    const state = transition && !transition.switched ? transition.from : Game.state;
    withTransitionTransform(state, function () { drawState(state); });

    drawTransitionOverlay();
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
    else if (state === 'interview') { drawAgency(); drawInterview(); }
    else if (state === 'monster') { drawAgency(); drawMonsterView(); }
    else if (state === 'mission') drawMission();
    else if (state === 'report') drawReport();
    else if (state === 'endday') drawEndDay();
    else if (state === 'tender') drawTender();
    else if (state === 'victory' || state === 'defeat') drawOutcome();
    else drawAgency();
  }

  // ── Инициализация ────────────────────────────────────────────────────────
  async function init() {
    if (location.search.indexOf('debug') !== -1) document.body.classList.add('debug');

    await Assets.load();
    Audio.init();
    Game.init('game');
    Input.init(Game.canvas);
    Renderer.init(Game.ctx);

    refreshSave();
    Game.state = 'menu';
    Game.update = update;
    Game.render = render;
    Game.setState = setState;

    const debugBtn = document.getElementById('debugBtn');
    const debugPanel = document.getElementById('debugPanel');
    if (debugBtn && debugPanel) {
      debugBtn.addEventListener('click', function () {
        debugPanel.textContent = JSON.stringify({
          state: Game.state, agency: Game.agency, tender: tender, outcome: outcome
        }, null, 2);
        debugPanel.classList.toggle('open');
      });
    }

    function frame(now) {
      Game.loop(now);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  init();
})();
