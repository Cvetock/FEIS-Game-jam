window.Models = (function () {
  const SPECIES = {
    goblin: { label: 'Гоблин', bias: { str: 0, agi: 3, int: 0, luck: 2 }, color: '#8bcf6b' },
    skeleton: { label: 'Скелет', bias: { str: -1, agi: 1, int: 4, luck: 1 }, color: '#a0a0a0' },
    slime: { label: 'Слизь', bias: { str: -2, agi: -1, int: -3, luck: 5 }, color: '#6bb8cf' },
    imp: { label: 'Импу', bias: { str: -1, agi: 2, int: 5, luck: -1 }, color: '#cf6b8b' },
    vampire: { label: 'Вампир', bias: { str: 3, agi: 4, int: 5, luck: 0 }, color: '#e04a4a' } // <-- Добавлен
  };

  const TRAITS = ['яростный', 'трусливый', 'ловкий', 'мудрый', 'прожорливый', 'упрямый'];
  const PREFERENCES = [
    "работать_только_с_нежитью", "не_работать_с_нежитью", "только_подземелья",
    "любит_риск", "только_лёгкие_задания", "требует_импа", "не_работает_с_слизями", "любит_золото"
  ];

  const UPGRADES_CONFIG = {
    forge: { name: 'Кузня', maxLevel: 3, baseCost: 60, desc: '+2 к статам за ур.' },
    intel: { name: 'Отдел разведки', maxLevel: 1, baseCost: 100, desc: 'Снижает перехват' },
    lie_school: { name: 'Школа лжи', maxLevel: 1, baseCost: 80, desc: 'Монстры лгут реже' },
    stables: { name: 'Стойла', maxLevel: 2, baseCost: 50, desc: 'Больше монстров в штате' }
  };

  // Добавлен forceSpecies для принудительного создания (например, нежити)
  function createMonster(forceSpecies = null) {
    const key = forceSpecies || Utils.pick(Object.keys(SPECIES));
    const sp = SPECIES[key];
    const base = Utils.randInt(4, 14);
    return {
      id: Utils.uid(),
      name: Utils.pick(Content.MONSTER_NAMES[key]),
      speciesKey: key,
      speciesLabel: sp.label,
      stats: {
        str: Utils.clamp(base + sp.bias.str + Utils.randInt(-1, 1), 1, 20),
        agi: Utils.clamp(base + sp.bias.agi + Utils.randInt(-1, 1), 1, 20),
        int: Utils.clamp(base + sp.bias.int + Utils.randInt(-1, 1), 1, 20),
        luck: Utils.clamp(base + sp.bias.luck + Utils.randInt(-1, 1), 1, 20)
      },
      traits: [Utils.pick(TRAITS)],
      preference: Utils.pick(PREFERENCES),
      status: 'idle',
    };
  }

  function createQuest() {
    const q = Utils.pick(Content.QUESTS);
    return {
      id: Utils.uid(),
      title: q.title,
      difficulty: q.diff,
      reward: q.reward,
      risk: q.diff > 4 ? 'Высокий' : 'Низкий',
      type: q.type,
      intercepted: false
    };
  }

  function createAgency() {
    const agency = {
      day: 1, maxDays: 14, gold: 100, rep: 0, level: 1, threat: 0.1,
      monsters: [], candidates: [], quests: [], log: [],
      upgrades: { stables: 0, forge: 0, intel: 0, lie_school: 0 },
      lastResult: null,
      dayStats: { goldEarned: 0, questsDone: 0, interceptedCount: 0, losses: 0, missions: [] }
    };

    agency.monsters.push(createMonster(), createMonster());
    agency.candidates.push(createMonster(), createMonster(), createMonster());
    generateQuests(agency);
    return agency;
  }

  function generateQuests(agency) {
    agency.quests = [];
    const count = Utils.randInt(3, 4);
    let interceptedCount = 0;
    const interceptMult = agency.upgrades.intel > 0 ? 0.05 : 0.1;
    const usedTitles = new Set();
    const templates = Utils.shuffle(Content.QUESTS.slice());

    for (let i = 0; i < count && i < templates.length; i++) {
      const q = templates[i];
      if (usedTitles.has(q.title)) continue;
      usedTitles.add(q.title);

      const quest = {
        id: Utils.uid(),
        title: q.title,
        difficulty: q.diff,
        reward: q.reward,
        risk: q.diff > 4 ? 'Высокий' : 'Низкий',
        type: q.type,
        intercepted: false
      };
      if (Utils.chance(agency.threat * interceptMult)) {
        quest.intercepted = true;
        quest.reward = 0;
        interceptedCount++;
      }
      agency.quests.push(quest);
    }
    agency.dayStats.interceptedCount = interceptedCount;
  }

  function nextDay(agency) {
    agency.day++;
    agency.monsters.forEach(m => { if (m.status === 'injured') m.status = 'idle'; });
    const rosterSpecies = agency.monsters.map(m => m.speciesKey);
    agency.candidates = [];
    while (agency.candidates.length < 3) {
      const cand = createMonster();
      if (!rosterSpecies.includes(cand.speciesKey)) agency.candidates.push(cand);
    }
    agency.threat = Math.min(1.0, agency.threat + 0.1);
    agency.dayStats = { goldEarned: 0, questsDone: 0, interceptedCount: 0, losses: 0, missions: [] };
    generateQuests(agency);
  }

  function tryHire(candidate, agency) {
    const maxMonsters = 4 + agency.upgrades.stables;
    if (agency.monsters.length >= maxMonsters) return { success: false, reason: "Нет свободных мест в стойлах!" };

    const rosterSpecies = agency.monsters.map(m => m.speciesKey);
    const tasks = agency.quests;
    const pref = candidate.preference;
    let success = true;
    let reason = "Согласен работать!";

    switch (pref) {
      case "работать_только_с_нежитью": success = rosterSpecies.includes('skeleton') || rosterSpecies.includes('vampire'); if (!success) reason = "Требую нежить в штат!"; break;
      case "не_работать_с_нежитью": success = !rosterSpecies.includes('skeleton') && !rosterSpecies.includes('vampire'); if (!success) reason = "Не хочу с нежитью!"; break;
      case "только_подземелья": success = tasks.some(t => ['cave', 'ruins', 'tower'].includes(t.type) && !t.intercepted); if (!success) reason = "Хочу в пещеры!"; break;
      case "любит_риск": success = tasks.some(t => t.difficulty >= 5 && !t.intercepted); if (!success) reason = "Скучно!"; break;
      case "только_лёгкие_задания": success = tasks.some(t => t.difficulty <= 3 && !t.intercepted); if (!success) reason = "Слишком опасно!"; break;
      case "требует_импа": success = rosterSpecies.includes('imp'); if (!success) reason = "Позовите Импу!"; break;
      case "не_работает_с_слизями": success = !rosterSpecies.includes('slime'); if (!success) reason = "Не хочу со слизью!"; break;
      case "любит_золото": success = tasks.some(t => t.reward >= 50 && !t.intercepted) || agency.gold >= 100; if (!success) reason = "Мало платите."; break;
    }
    return { success, reason };
  }

  function buyUpgrade(agency, key) {
    const conf = UPGRADES_CONFIG[key];
    const currentLvl = agency.upgrades[key];
    if (currentLvl >= conf.maxLevel) return { success: false, reason: "Максимальный уровень!" };

    const cost = conf.baseCost * (currentLvl + 1);
    if (agency.gold < cost) return { success: false, reason: "Недостаточно золота!" };

    agency.gold -= cost;
    agency.upgrades[key]++;
    return { success: true };
  }

  // НОВОЕ: Покупка случайной нежити
  function hireUndead(agency) {
    const maxMonsters = 4 + agency.upgrades.stables;
    if (agency.monsters.length >= maxMonsters) return { success: false, reason: "Стойла переполнены!" };

    const cost = 150;
    if (agency.gold < cost) return { success: false, reason: "Нужно 150 золота!" };

    agency.gold -= cost;
    // Случайно Скелет или Вампир
    const species = Utils.chance(0.7) ? 'skeleton' : 'vampire';
    const monster = createMonster(species);
    agency.monsters.push(monster);

    return { success: true, monster: monster };
  }

  function calculateResult(monster, quest, agency) {
    let stat = monster.stats.str;
    if (['tower', 'cave', 'ruins'].includes(quest.type)) stat = monster.stats.int;
    if (['village', 'forest', 'city', 'caravan'].includes(quest.type)) stat = monster.stats.agi;

    const forgeBonus = agency.upgrades.forge * 2;
    let chance = 0.5 + ((stat + forgeBonus) - quest.difficulty) * 0.05;
    chance = Utils.clamp(chance, 0.05, 0.95);

    const roll = stat + forgeBonus + Utils.randInt(1, 20);
    const overkillThreshold = quest.difficulty * 1.5;

    let type = 'fail'; let gold = 0; let injury = false; let threatAdd = 0;
    let modifier = 'Нет'; let modifierDesc = '';

    if (Math.random() < chance) {
      if (roll >= overkillThreshold) {
        type = 'overkill'; gold = Math.floor(quest.reward * 1.5); threatAdd = 1; injury = Utils.chance(0.3); Audio.playSfx('win');
        modifier = 'ОВЕРКИЛЛ';
        modifierDesc = `Награда x1.5 (+${gold - quest.reward})`;
      } else {
        type = 'success'; gold = quest.reward; Audio.playSfx('success');
        modifier = 'Успех';
        modifierDesc = `Базовая награда (+${gold})`;
      }
    } else {
      const r = Math.random();
      if (r < 0.7) type = 'fail';
      else if (r < 0.9) { type = 'injury'; injury = true; }
      else { type = 'lost'; }
      Audio.playSfx('fail');
    }

    // Выбираем отчёт оверкилла по типу задания
    const overkillKeyMap = {
      farm: 'overkill_farm', caravan: 'overkill_caravan', cave: 'overkill_cave',
      sewer: 'overkill_sewer', bridge: 'overkill_bridge', tower: 'overkill_tower',
      village: 'overkill_village', warehouse: 'overkill_warehouse'
    };
    const overkillKey = overkillKeyMap[quest.type] || 'overkill_farm';

    let honesty = 0.1;
    if (monster.stats.int >= 14) honesty = 1.0;
    else if (monster.stats.int >= 8) honesty = 0.5;
    if (agency.upgrades.lie_school > 0 && monster.stats.int < 14) honesty = Math.min(1.0, honesty * 1.25);

    let reportKey = '';
    if (type === 'overkill') reportKey = overkillKey;
    else if (type === 'injury') reportKey = 'injury';
    else if (type === 'lost') reportKey = 'lost';
    else if (type === 'success') reportKey = Utils.chance(honesty) ? 'success_honest' : 'success_lie';
    else reportKey = Utils.chance(honesty) ? 'fail_honest' : 'fail_lie';

    const reportText = Utils.pick(Content.REPORTS[reportKey]);

    return { type, gold, threatAdd, injury, modifier, modifierDesc, reportText, monsterId: monster.id, questId: quest.id, questTitle: quest.title, monsterName: monster.name };
  }

  return {
    SPECIES, UPGRADES_CONFIG, createMonster, createQuest, createAgency,
    generateQuests, calculateResult, nextDay, tryHire, buyUpgrade, hireUndead
  };
})();