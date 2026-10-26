window.Models = (function () {
  'use strict';

  const SPECIES = {
    goblin:   { label: 'Гоблин', bias: { str: 0, agi: 3, int: 0, luck: 2 }, color: '#8bcf6b' },
    skeleton: { label: 'Скелет', bias: { str: -1, agi: 1, int: 4, luck: 1 }, color: '#a0a0a0' },
    slime:    { label: 'Слизь',  bias: { str: -2, agi: -1, int: -3, luck: 5 }, color: '#6bb8cf' },
    imp:      { label: 'Импу',   bias: { str: -1, agi: 2, int: 5, luck: -1 }, color: '#cf6b8b' },
    vampire:  { label: 'Вампир', bias: { str: 3, agi: 4, int: 5, luck: 0 }, color: '#e04a4a' }
  };

  const TRAITS = ['устрашающий', 'трусливый', 'удачливый', 'неуклюжий', 'храбрый', 'проворный', 'мудрый', 'глупый', 'тяжеловес', 'неуловимый'];

  const PREFERENCES = [
    'работать_только_с_нежитью', 'не_работать_с_нежитью', 'работать_только_с_гоблинами',
    'не_лезть_в_пещеры', 'только_подземелья', 'требует_вампира_в_команде',
    'любит_риск', 'только_лёгкие_задания', 'работает_только_один',
    'требует_импа', 'не_работает_с_слизями', 'любит_золото', 'трусливый'
  ];

  const QUEST_STATS = {
    farm: 'str', caravan: 'str', stables: 'agi',
    cave: 'int', ruins: 'int', citadel: 'int', lieschool: 'int'
  };

  const UNDERGROUND = ['cave', 'ruins', 'citadel', 'lieschool'];

  const UPGRADES_CONFIG = {
    stables:    { name: 'Стойла',            maxLevel: 2, baseCost: 50,  desc: '+1 место в штате' },
    forge:      { name: 'Кузня',             maxLevel: 3, baseCost: 60,  desc: 'Доп. статы при левелапе' },
    sewer:      { name: 'Канализация',       maxLevel: 2, baseCost: 40,  desc: 'Слизи: +1/+2 к статам' },
    crypta:     { name: 'Крипта',            maxLevel: 2, baseCost: 50,  desc: 'Скелеты: +1/+2 к статам' },
    training:   { name: 'Тренировочный зал', maxLevel: 2, baseCost: 40,  desc: 'Новые рекруты: +1/+2 стат' },
    intel:      { name: 'Отдел разведки',    maxLevel: 1, baseCost: 100, desc: 'Перехват −50%, угроза растет медленнее' },
    lie_school: { name: 'Школа лжи',         maxLevel: 1, baseCost: 80,  desc: 'Шанс лжи −25%' }
  };

  const UPGRADE_ORDER = ['stables', 'forge', 'sewer', 'crypta', 'training', 'intel', 'lie_school'];

  const ITEMS = [
    { id: 'club',          name: 'Ржавая дубина',     type: 'weapon',     price: 20,  bonus: { str: 2 },           injuryMod: 0,     desc: '+2 СИЛА' },
    { id: 'sword',         name: 'Железный меч',      type: 'weapon',     price: 60,  bonus: { str: 5 },           injuryMod: 0,     desc: '+5 СИЛА' },
    { id: 'dagger',        name: 'Кинжал теней',      type: 'weapon',     price: 80,  bonus: { agi: 3, luck: 2 },  injuryMod: 0,     desc: '+3 ЛОВ, +2 УДА' },
    { id: 'staff',         name: 'Посох некроманта',  type: 'weapon',     price: 100, bonus: { int: 5 },           injuryMod: 0,     desc: '+5 ИНТ' },
    { id: 'leather',       name: 'Кожаная броня',     type: 'armor',      price: 30,  bonus: {},                   injuryMod: -0.05, desc: '−5% к шансу травмы' },
    { id: 'chain',         name: 'Кольчуга',          type: 'armor',      price: 70,  bonus: { agi: -1 },          injuryMod: -0.10, desc: '−10% к травме, −1 ЛОВ' },
    { id: 'cloak',         name: 'Плащ теней',        type: 'armor',      price: 90,  bonus: { agi: 3 },           injuryMod: -0.08, desc: '−8% к травме, +3 ЛОВ' },
    { id: 'luck_amulet',   name: 'Амулет удачи',      type: 'amulet',     price: 40,  bonus: { luck: 5 },          injuryMod: 0,     desc: '+5 УДА' },
    { id: 'int_amulet',    name: 'Амулет интеллекта', type: 'amulet',     price: 60,  bonus: { int: 3 },           injuryMod: 0,     desc: '+3 ИНТ' },
    { id: 'shadow_amulet', name: 'Амулет тени',       type: 'amulet',     price: 80,  bonus: { agi: 3, int: 2 },   injuryMod: 0,     desc: '+3 ЛОВ, +2 ИНТ' },
    { id: 'potion',        name: 'Зелье лечения',     type: 'consumable', price: 30,  effect: 'heal',              desc: 'Лечит травмы' },
    { id: 'elixir',        name: 'Эликсир силы',      type: 'consumable', price: 50,  effect: 'elixir',            desc: '+5 СИЛА на 1 квест' }
  ];

  function threatStage(threat) { return Utils.clamp(Math.round(threat / 0.1) || 1, 1, 4); }
  function threatLabel(threat) { return ['', 'Низкая', 'Средняя', 'Высокая', 'Критичная'][threatStage(threat)]; }
  function interceptChance(agency) {
    const mul = agency.upgrades.intel > 0 ? 0.5 : 1;
    return threatStage(agency.threat) * 0.1 * mul;
  }

  function advanceThreat(agency) {
    let step = 0.035;
    if (agency.difficulty === 'hard') step = 0.05;
    if (agency.difficulty === 'easy') step = 0.02;
    const intelCut = agency.upgrades.intel > 0 ? 0.02 : 0;
    agency.threat = Utils.clamp(agency.threat + step - intelCut, 0, 1);
  }

  function uid() { return Utils.uid(); }
  function rosterCap(agency) { return 4 + agency.upgrades.stables; }
  function riskLabel(difficulty) {
    if (difficulty <= 3) return 'Низкий';
    if (difficulty === 4) return 'Средний';
    if (difficulty === 5) return 'Высокий';
    return 'Критический';
  }

  function createMonster(forceSpecies, trainingLevel, difficulty = 'normal', isStarter = false) {
    const key = forceSpecies || Utils.pick(Object.keys(SPECIES));
    const sp = SPECIES[key];

    let minBase = 4, maxBase = 14;
    if (difficulty === 'hard') { minBase = 2; maxBase = 10; }
    if (difficulty === 'easy') { minBase = 6; maxBase = 16; }
    if (isStarter) { minBase = 1; maxBase = 3; }

    const base = Utils.randInt(minBase, maxBase);

    const stats = {
      str:  Utils.clamp(base + sp.bias.str  + Utils.randInt(-1, 1), 1, 20),
      agi:  Utils.clamp(base + sp.bias.agi  + Utils.randInt(-1, 1), 1, 20),
      int:  Utils.clamp(base + sp.bias.int  + Utils.randInt(-1, 1), 1, 20),
      luck: Utils.clamp(base + sp.bias.luck + Utils.randInt(-1, 1), 1, 20)
    };
    for (let i = 0; i < (trainingLevel || 0); i++) {
      stats[Utils.pick(['str', 'agi', 'int', 'luck'])] = Utils.clamp(stats[Utils.pick(['str', 'agi', 'int', 'luck'])] + 1, 1, 20);
    }
    return {
      id: uid(), name: Utils.pick(Content.MONSTER_NAMES[key]), speciesKey: key, speciesLabel: sp.label, color: sp.color,
      stats: stats, traits: [Utils.pick(TRAITS)], preference: Utils.pick(PREFERENCES), status: 'idle', overkillCount: 0,
      missions: 0, equipment: { weapon: null, armor: null, amulet: null }, temp: null,
      level: 1, xp: 0, injuryDays: 0
    };
  }

  function makeQuest(template) {
    return {
      id: uid(), title: template.title, difficulty: template.diff, reward: template.reward, baseReward: template.reward,
      risk: riskLabel(template.diff), type: template.type, species: (template.species || []).slice(), intercepted: false,
      groupOnly: false, soloOnly: false
    };
  }

  function generateQuests(agency) {
    agency.quests = [];
    const board = Utils.shuffle(Content.QUESTS.slice()).slice(0, 4);

    board.forEach(function (template) {
      const q = makeQuest(template);
      agency.quests.push(q);
    });

    if (Utils.chance(0.3)) {
       const isGroup = Utils.chance(0.5);
       const extraTemp = Utils.pick(Content.QUESTS);
       const spQ = makeQuest(extraTemp);
       spQ.difficulty += 2;
       spQ.reward = Math.floor(spQ.reward * 2.5);
       if (isGroup) {
         spQ.title = '[ГРУППА] ' + spQ.title;
         spQ.groupOnly = true;
       } else {
         spQ.title = '[СОЛО-ЭПИК] ' + spQ.title;
         spQ.soloOnly = true;
       }
       agency.quests.push(spQ);
    }

    const chance = interceptChance(agency);
    let intercepted = 0;
    agency.quests.forEach(q => {
      if (Utils.chance(chance)) { q.intercepted = true; q.reward = 0; intercepted++; }
    });

    agency.dayStats.intercepted = intercepted;
    agency.stats.interceptedTotal += intercepted;
  }

  function generateCandidates(agency) {
    const rosterSpecies = agency.monsters.map(m => m.speciesKey);
    const result = [];
    for (let attempt = 0; attempt < 60 && result.length < 3; attempt++) {
      const c = createMonster(null, agency.upgrades.training, agency.difficulty);
      if (rosterSpecies.includes(c.speciesKey)) continue;
      if (result.some(x => x.name === c.name && x.speciesKey === c.speciesKey)) continue;
      c.cost = 20 + Math.round(((c.stats.str + c.stats.agi + c.stats.int + c.stats.luck) / 4) * 2.5);
      result.push(c);
    }
    while (result.length < 3) {
      const c = createMonster(null, agency.upgrades.training, agency.difficulty);
      c.cost = 20 + Math.round(((c.stats.str + c.stats.agi + c.stats.int + c.stats.luck) / 4) * 2.5);
      result.push(c);
    }
    return result;
  }

  function freshDayStats() { return { questsDone: 0, goldEarned: 0, losses: 0, intercepted: 0, missions: [] }; }

  function createAgency(difficulty = 'normal') {
    const upgrades = {};
    UPGRADE_ORDER.forEach(k => upgrades[k] = 0);

    let startGold = 100, startThreat = 0.1;
    if (difficulty === 'hard') { startGold = 60; startThreat = 0.2; }
    if (difficulty === 'easy') { startGold = 150; startThreat = 0.05; }

    const agency = {
      day: 1, maxDays: 14, difficulty: difficulty,
      gold: startGold, rep: 0, level: 1, threat: startThreat,
      monsters: [], candidates: [], quests: [], log: [], upgrades: upgrades,
      inventory: ['club'], interviewsLeft: 3, lastResult: null, dayStats: freshDayStats(),
      stats: { questsDone: 0, goldEarned: 0, losses: 0, overkills: 0, interceptedTotal: 0, missions: [] },
      tutorials: {}
    };

    agency.monsters.push(createMonster(null, upgrades.training, difficulty, true));
    generateQuests(agency);
    agency.candidates = generateCandidates(agency);
    return agency;
  }

  function checkHirePreference(pref, agency) {
    const roster = agency.monsters.map(m => m.speciesKey);
    const has = (...types) => types.some(t => roster.includes(t));
    switch (pref) {
      case 'работать_только_с_нежитью': if (!has('skeleton', 'vampire')) return 'Отказ: Требует нежить в штате!'; break;
      case 'не_работать_с_нежитью': if (has('skeleton', 'vampire')) return 'Отказ: Не работает с нежитью!'; break;
      case 'работать_только_с_гоблинами': if (!has('goblin')) return 'Отказ: Хочет работать только с гоблинами!'; break;
      case 'требует_вампира_в_команде': if (!has('vampire')) return 'Отказ: Требует вампира в штате!'; break;
      case 'работает_только_один': if (agency.monsters.length > 0) return 'Отказ: Работает только в одиночку!'; break;
      case 'требует_импа': if (!has('imp')) return 'Отказ: Требует Импу в штате!'; break;
      case 'не_работает_с_слизями': if (has('slime')) return 'Отказ: Не переносит слизь в штате!'; break;
    }
    return null;
  }

  function tryHire(candidate, agency) {
    if (agency.interviewsLeft <= 0) return { success: false, consumed: false, reason: 'Все собеседования на сегодня использованы' };
    if (agency.monsters.length >= rosterCap(agency)) return { success: false, consumed: false, reason: 'Нет свободных мест в стойлах' };
    if (agency.gold < candidate.cost) return { success: false, consumed: false, reason: 'Недостаточно золота на найм!' };

    agency.interviewsLeft--;
    const refusal = checkHirePreference(candidate.preference, agency);
    if (refusal) return { success: false, consumed: true, reason: refusal };

    agency.gold -= candidate.cost;
    return { success: true, consumed: true, reason: '', cost: candidate.cost };
  }

  function getRefusalReason(monster, quest, agency) {
    switch (monster.preference) {
      case 'не_лезть_в_пещеры': if (quest && UNDERGROUND.includes(quest.type)) return 'Отказывается лезть в подземелья!'; break;
      case 'только_подземелья': if (quest && !UNDERGROUND.includes(quest.type)) return 'Согласен только на подземелья!'; break;
      case 'любит_риск': if (quest && quest.difficulty < 6) return 'Слишком скучное задание (нужна сложность 6+)!'; break;
      case 'только_лёгкие_задания': if (quest && quest.difficulty > 4) return 'Слишком опасно (нужна сложность 1-4)!'; break;
      case 'любит_золото': if (quest && quest.reward < 50) return 'Слишком дешево (нужно от 50 зол.)!'; break;
      case 'трусливый': if (agency.threat > 0.3) return 'Слишком страшно (угроза выше 30%)!'; break;
    }
    return null;
  }

  function fireMonster(agency, monsterId) {
    const idx = agency.monsters.findIndex(m => m.id === monsterId);
    if (idx === -1) return { success: false, reason: 'Монстр не найден в штате' };
    const m = agency.monsters[idx];
    if (m.status === 'busy') return { success: false, reason: 'Монстр занят на задании' };
    if (m.injuryDays > 0) return { success: false, reason: 'Нельзя увольнять раненых! Вылечите его.' };

    ['weapon', 'armor', 'amulet'].forEach(slot => {
        if (m.equipment[slot]) agency.inventory.push(m.equipment[slot]);
    });

    agency.monsters.splice(idx, 1);
    return { success: true, name: m.name };
  }

  function buyUpgrade(agency, key) {
    const conf = UPGRADES_CONFIG[key];
    if (!conf) return { success: false, reason: 'Неизвестное улучшение' };
    const lvl = agency.upgrades[key];
    if (lvl >= conf.maxLevel) return { success: false, reason: 'Максимальный уровень!' };

    const cost = Math.floor(conf.baseCost * Math.pow(1.5, lvl));

    if (agency.gold < cost) return { success: false, reason: 'Недостаточно золота!' };

    agency.gold -= cost;
    agency.upgrades[key]++;
    return { success: true, cost: cost };
  }

  function hireUndead(agency) {
    if (agency.monsters.length >= rosterCap(agency)) return { success: false, reason: 'Стойла переполнены!' };
    if (agency.gold < 150) return { success: false, reason: 'Нужно 150 золота!' };

    agency.gold -= 150;
    const species = Utils.chance(0.7) ? 'skeleton' : 'vampire';
    const monster = createMonster(species, agency.upgrades.training, agency.difficulty);
    if (agency.upgrades.crypta > 0) { monster.level = agency.upgrades.crypta + 1; monster.stats.str++; monster.stats.int++; }
    monster.status = 'idle';
    agency.monsters.push(monster);
    return { success: true, monster: monster };
  }

  function getItem(id) { return ITEMS.find(i => i.id === id) || null; }

  function itemBonus(monster, statKey) {
    let sum = 0;
    if (!monster || !monster.equipment) return 0;
    ['weapon', 'armor', 'amulet'].forEach(slot => {
      const it = getItem(monster.equipment[slot]);
      if (it && it.bonus && it.bonus[statKey]) sum += it.bonus[statKey];
    });
    if (statKey === 'str' && monster.temp && monster.temp.str) sum += monster.temp.str;
    return sum;
  }

  function equipmentInjuryMod(monster) {
    let mod = 0;
    if (!monster || !monster.equipment) return 0;
    ['weapon', 'armor', 'amulet'].forEach(slot => {
      const it = getItem(monster.equipment[slot]);
      if (it && it.injuryMod) mod += it.injuryMod;
    });
    return mod;
  }

  function equipItem(agency, monster, itemId) {
    const item = getItem(itemId);
    if (!item) return { success: false, reason: 'Предмет не найден' };
    if (item.type === 'consumable') return { success: false, reason: 'Это расходник' };

    const idx = agency.inventory.indexOf(itemId);
    if (idx === -1) return { success: false, reason: 'Предмета нет в сумке' };

    const slot = item.type;
    if (monster.equipment[slot]) agency.inventory.push(monster.equipment[slot]);
    agency.inventory.splice(idx, 1);
    monster.equipment[slot] = itemId;
    return { success: true };
  }

  function unequipItem(agency, monster, slot) {
    if (!monster.equipment || !monster.equipment[slot]) return { success: false, reason: 'Слот пуст' };
    agency.inventory.push(monster.equipment[slot]);
    monster.equipment[slot] = null;
    return { success: true };
  }

  function useItem(agency, monster, itemId) {
    const item = getItem(itemId);
    if (!item || item.type !== 'consumable') return { success: false, reason: 'Это не расходник' };
    const idx = agency.inventory.indexOf(itemId);
    if (idx === -1) return { success: false, reason: 'Предмета нет в сумке' };

    if (item.effect === 'heal') {
      if (monster.injuryDays <= 0) return { success: false, reason: 'Монстр не ранен' };
      monster.injuryDays = 0;
      monster.status = 'idle';
    } else if (item.effect === 'elixir') {
      monster.temp = { str: 5, missions: 1 };
    }
    agency.inventory.splice(idx, 1);
    return { success: true, item: item };
  }

  function buyItem(agency, itemId) {
    const item = getItem(itemId);
    if (!item) return { success: false, reason: 'Предмет не найден' };
    if (agency.gold < item.price) return { success: false, reason: 'Недостаточно золота!' };
    agency.gold -= item.price;
    agency.inventory.push(itemId);
    return { success: true, item: item };
  }

  function effectiveStat(monster, quest, agency) {
    const statKey = QUEST_STATS[quest.type] || 'str';
    let v = monster.stats[statKey] + itemBonus(monster, statKey);

    if (monster.speciesKey === 'slime') v += (agency.upgrades.sewer || 0);
    if (monster.speciesKey === 'skeleton') v += (agency.upgrades.crypta || 0);
    if (quest.species.length && quest.species.indexOf(monster.speciesKey) === -1) v -= 2;

    const t = monster.traits[0];
    if (t === 'устрашающий' && ['farm', 'village', 'bridge', 'bazar', 'caravan'].indexOf(quest.type) !== -1) v += 2;
    if (t === 'трусливый') v -= 2;
    if (t === 'тяжеловес' && statKey === 'str') v += 3;
    if (t === 'мудрый' && statKey === 'int') v += 2;
    if (t === 'глупый' && statKey === 'int') v -= 2;
    if (t === 'проворный' && ['caravan', 'city', 'stables'].indexOf(quest.type) !== -1) v += 2;
    if (t === 'храбрый' && agency.threat >= 0.4) v += 2;
    return v;
  }

  function successChance(monster, quest, agency) {
    const eff = effectiveStat(monster, quest, agency);
    let chance = 0.4 + (eff - quest.difficulty * 1.5) * 0.05;
    if (agency && agency.difficulty === 'hard') chance -= 0.10;
    if (agency && agency.difficulty === 'easy') chance += 0.10;
    return Utils.clamp(chance, 0.05, 0.95);
  }

  function effectiveIntel(monster) {
    let int = monster.stats.int + itemBonus(monster, 'int');
    const t = monster.traits[0];
    if (t === 'мудрый') int += 2;
    if (t === 'глупый') int -= 2;
    return Utils.clamp(int, 1, 20);
  }

  function honestyChance(monster, agency) {
    const int = effectiveIntel(monster);
    let honest = int >= 14 ? 1.0 : (int >= 8 ? 0.5 : 0.1);
    if (agency.upgrades.lie_school > 0) honest = 1 - (1 - honest) * 0.75;
    return honest;
  }

  function groupSuccessChance(monsters, quest, agency) {
    let totalStat = 0;
    monsters.forEach(m => { totalStat += effectiveStat(m, quest, agency); });
    let chance = 0.4 + (totalStat - quest.difficulty * 1.5) * 0.05;

    if (agency.difficulty === 'hard') chance -= 0.10;
    if (agency.difficulty === 'easy') chance += 0.10;
    return Utils.clamp(chance, 0.05, 0.95);
  }

  function overkillChance(monster, quest, agency) {
    const margin = effectiveStat(monster, quest, agency) - quest.difficulty * 1.5;
    let p = 0.08 + Math.max(0, margin) * 0.015;
    if (monster.traits[0] === 'удачливый') p += 0.10;
    return Utils.clamp(p, 0.05, 0.30);
  }

  function calculateGroupResult(monsters, quest, agency) {
    let totalStat = 0, totalInjuryMod = 0, hasClumsy = false;
    monsters.forEach(m => {
      totalStat += effectiveStat(m, quest, agency);
      totalInjuryMod += equipmentInjuryMod(m);
      if (m.traits[0] === 'неуклюжий') hasClumsy = true;
    });

    let chance = 0.4 + (totalStat - quest.difficulty * 1.5) * 0.05;
    if (agency.difficulty === 'hard') chance -= 0.10;
    if (agency.difficulty === 'easy') chance += 0.10;
    chance = Utils.clamp(chance, 0.05, 0.95);

    const armor = totalInjuryMod + (hasClumsy ? 0.2 : 0);
    let type, gold = 0, injury = false;

    if (Math.random() < chance) {
      const avgMargin = totalStat / monsters.length - quest.difficulty;
      let p = 0.08 + Math.max(0, avgMargin) * 0.015;
      monsters.forEach(m => { if (m.traits[0] === 'удачливый') p += 0.05; });
      p = Utils.clamp(p, 0.05, 0.30);

      if (Utils.chance(p)) {
        type = 'overkill';
        gold = Math.floor(quest.reward * 1.5);
        injury = Utils.chance(Utils.clamp(0.3 + armor, 0.02, 0.8));
      } else if (Utils.chance(0.18)) {
        type = 'partial'; gold = Math.round(quest.reward * 0.5);
      } else {
        type = 'success'; gold = quest.reward;
      }
    } else {
      const r = Math.random();
      const injuryP = Utils.clamp(0.2 + armor, 0.02, 0.5);
      if (r < 0.7) type = 'fail';
      else if (r < 0.7 + injuryP) { type = 'injury'; injury = true; }
      else if (r < 0.7 + injuryP + 0.1) {
        if (monsters.some(m => m.traits[0] === 'неуловимый')) { type = 'injury'; injury = true; }
        else type = 'lost';
      } else type = 'fail';
    }

    const bestIntMonster = monsters.reduce((best, m) => effectiveIntel(m) > effectiveIntel(best) ? m : best, monsters[0]);
    const honest = honestyChance(bestIntMonster, agency);
    const truthful = Utils.chance(honest);

    let reportKey;
    if (type === 'overkill') reportKey = 'overkill_' + quest.type;
    else if (type === 'injury') reportKey = 'injury';
    else if (type === 'lost') reportKey = 'lost';
    else {
      const suffix = truthful ? '_honest' : '_lie';
      reportKey = type + '_' + quest.type + suffix;
    }

    if (!Content.REPORTS[reportKey]) {
      if (type === 'overkill') reportKey = 'overkill_fallback';
      else reportKey = type + (truthful ? '_honest' : '_lie');
    }

    return {
      type: type, gold: gold, injury: injury,
      reportText: Utils.pick(Content.REPORTS[reportKey]), reportKey: reportKey,
      lied: !truthful, honesty: honest, int: effectiveIntel(bestIntMonster),
      monsterId: bestIntMonster.id, monsterName: bestIntMonster.name,
      speciesKey: bestIntMonster.speciesKey, speciesLabel: bestIntMonster.speciesLabel,
      questId: quest.id, questTitle: quest.title, participantNames: monsters.map(m => m.name).join(', '),
      participants: monsters.map(m => m.id)
    };
  }

  function calculateResult(monster, quest, agency) { return calculateGroupResult([monster], quest, agency); }

  function applyMissionResult(agency, r) {
    agency.dayStats.goldEarned += r.gold;
    agency.quests = agency.quests.filter(q => q.id !== r.questId);

    if (r.type === 'success' || r.type === 'overkill' || r.type === 'partial') {
      agency.stats.questsDone++;
      agency.dayStats.questsDone++;
    }

    if (r.type === 'overkill') {
      agency.stats.overkills++;
      const penalty = agency.difficulty === 'hard' ? 0.06 : (agency.difficulty === 'easy' ? 0.02 : 0.03);
      agency.threat = Utils.clamp(agency.threat + penalty, 0, 1);
    }

    let levelUpMsgs = [];

    (r.participants || [r.monsterId]).forEach(pid => {
      const m = agency.monsters.find(x => x.id === pid);
      if (!m) return;
      if (r.type === 'lost') {
        agency.monsters = agency.monsters.filter(x => x.id !== m.id);
        agency.stats.losses++;
        agency.dayStats.losses++;
      } else {
        m.missions++;

        if (r.type === 'success' || r.type === 'overkill') {
            m.xp = (m.xp || 0) + 1;
            if (m.xp >= m.level * 2) {
                m.level++;
                m.xp = 0;

                let points = 1 + (agency.upgrades.forge || 0);
                let givenStats = [];
                const statLabels = { str: 'СИЛ', agi: 'ЛОВ', int: 'ИНТ', luck: 'УДА' };

                for(let i=0; i<points; i++) {
                   const k = Utils.pick(['str', 'agi', 'int', 'luck']);
                   m.stats[k]++;
                   givenStats.push(statLabels[k]);
                }
                levelUpMsgs.push(`${m.name} -> Ур. ${m.level} (+${points} ст: ${givenStats.join(', ')})`);
            }
        }

        if (r.type === 'overkill') m.overkillCount++;
        if (r.injury) {
            m.injuryDays = agency.difficulty === 'hard' ? 3 : (agency.difficulty === 'easy' ? 1 : 2);
            m.status = 'injured';
        } else {
            m.status = 'busy';
        }
      }
      if (m.temp) { m.temp.missions--; if (m.temp.missions <= 0) m.temp = null; }
    });

    agency.dayStats.missions.push({
        monsterName: r.participantNames,
        questTitle: r.questTitle,
        type: r.type,
        gold: r.gold,
        levelUps: levelUpMsgs.length ? levelUpMsgs : null
    });
  }

  function nextDay(agency) {
    agency.gold += agency.dayStats.goldEarned;
    agency.stats.goldEarned += agency.dayStats.goldEarned;
    agency.day++;

    agency.monsters.forEach(m => {
      if (m.injuryDays > 0) {
          m.injuryDays--;
          if (m.injuryDays <= 0) m.status = 'idle';
      } else if (m.status === 'busy') {
          m.status = 'idle';
      }
    });

    advanceThreat(agency);
    agency.interviewsLeft = 3;
    agency.dayStats = freshDayStats();
    generateQuests(agency);
    agency.candidates = generateCandidates(agency);
  }

  function isThreatDefeat(agency) { return agency.threat >= 1; }

  function evaluateScore(monster, quest, agency) {
    const base = effectiveStat(monster, quest, agency) - quest.difficulty;
    const int = effectiveIntel(monster);
    const honesty = int >= 14 ? 10 : (int >= 8 ? 5 : -5);
    const pref = !getRefusalReason(monster, quest, agency) ? 5 : -5;
    return base + honesty + pref + Utils.randInt(-5, 5);
  }

  function createTender(agency) {
    const aiRoster = [];
    for (let i = 0; i < 3; i++) {
      const m = createMonster();
      m.stats.int = Utils.clamp(12 + Utils.randInt(0, 6), 1, 20);
      m.stats.str = Utils.clamp(8 + Utils.randInt(0, 8), 1, 20);
      m.name = Utils.pick(Content.MONSTER_NAMES[m.speciesKey]);
      aiRoster.push(m);
    }
    const quest = makeQuest(Content.TENDER_QUEST);
    const aiChampion = aiRoster.slice().sort((a, b) => {
      const aiAgency = { monsters: aiRoster, upgrades: { forge: 3, intel: 1, lie_school: 0, stables: 0 } };
      return evaluateScore(b, quest, aiAgency) - evaluateScore(a, quest, aiAgency);
    })[0];

    return {
      quest: quest, aiName: 'Герой-Директор', aiAgency: 'Гильдия Света',
      aiRoster: aiRoster, aiChampion: aiChampion,
      playerChampionId: agency.monsters.length ? agency.monsters[0].id : null,
      resolved: false, result: null
    };
  }

  function resolveTender(agency, tender) {
    const player = agency.monsters.find(m => m.id === tender.playerChampionId) || agency.monsters[0];
    const quest = tender.quest;
    const playerScore = evaluateScore(player, quest, agency);
    const aiAgency = { monsters: tender.aiRoster, upgrades: { forge: 3, intel: 1, lie_school: 0, stables: 0 } };
    const aiScore = evaluateScore(tender.aiChampion, quest, aiAgency) + 3;

    function reportFor(monster, score) {
      const honest = honestyChance(monster, agency);
      const truthful = Utils.chance(honest);
      let key = score > 0 ? (truthful ? 'success_honest' : 'success_lie') : (truthful ? 'fail_honest' : 'fail_lie');
      return { text: Utils.pick(Content.REPORTS[key]), lied: !truthful };
    }

    return {
      win: playerScore > aiScore, playerScore: playerScore, aiScore: aiScore,
      player: { name: player.name, species: player.speciesLabel, int: player.stats.int, report: reportFor(player, playerScore) },
      ai: { name: tender.aiChampion.name, species: tender.aiChampion.speciesLabel, int: tender.aiChampion.stats.int, report: reportFor(tender.aiChampion, aiScore) }
    };
  }

  return {
    SPECIES, UPGRADES_CONFIG, UPGRADE_ORDER, ITEMS, QUEST_STATS, rosterCap,
    riskLabel, threatStage, threatLabel, interceptChance, advanceThreat,
    isThreatDefeat, createMonster, createAgency, generateQuests,
    generateCandidates, tryHire, buyUpgrade, hireUndead, fireMonster,
    getItem, itemBonus, equipmentInjuryMod, equipItem, unequipItem,
    useItem, buyItem, effectiveStat, effectiveIntel, successChance, honestyChance, overkillChance, calculateResult,
    calculateGroupResult, groupSuccessChance, getRefusalReason, applyMissionResult, nextDay, evaluateScore,
    createTender, resolveTender
  };
})();