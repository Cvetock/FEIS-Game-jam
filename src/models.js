window.Models = (function () {
  const SPECIES = {
    goblin: { label: 'Гоблин', bias: { str: 0, agi: 3, int: 0, luck: 2 }, color: '#8bcf6b' },
    skeleton: { label: 'Скелет', bias: { str: -1, agi: 1, int: 4, luck: 1 }, color: '#a0a0a0' },
    slime: { label: 'Слизь', bias: { str: -2, agi: -1, int: -3, luck: 5 }, color: '#6bb8cf' },
    imp: { label: 'Импу', bias: { str: -1, agi: 2, int: 5, luck: -1 }, color: '#cf6b8b' }
  };

  const TRAITS = ['яростный', 'трусливый', 'ловкий', 'мудрый', 'прожорливый', 'упрямый'];
  const PREFERENCES = ["любит_риск", "только_лёгкие", "любит_золото", "требует_импа", "трусливый"];

  function createMonster() {
    const key = Utils.pick(Object.keys(SPECIES));
    const sp = SPECIES[key];
    const base = Utils.randInt(4, 14);
    return {
      id: Utils.uid(),
      name: Utils.pick(Content.MONSTER_NAMES[key]),
      speciesKey: key,
      speciesLabel: sp.label,
      color: sp.color,
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
      type: q.type,
      requiredSpecies: q.species,
      intercepted: false
    };
  }

  function createAgency() {
    const agency = {
      day: 1,
      maxDays: 14,
      gold: 100,
      rep: 0,
      level: 1,
      threat: 0.1,
      monsters: [],
      quests: [],
      log: [],
      lastResult: null,
      dayStats: { goldEarned: 0, questsDone: 0, interceptedCount: 0, losses: 0, missions: [] }
    };

    agency.monsters.push(createMonster(), createMonster(), createMonster());
    generateQuests(agency);
    return agency;
  }

  function generateQuests(agency) {
    agency.quests = [];
    const count = Utils.randInt(3, 4);
    let interceptedCount = 0;

    for (let i = 0; i < count; i++) {
      const q = createQuest();
      if (Utils.chance(agency.threat * 0.1)) {
        q.intercepted = true;
        q.reward = 0;
        interceptedCount++;
      }
      agency.quests.push(q);
    }
    agency.dayStats.interceptedCount = interceptedCount;
  }

  function nextDay(agency) {
    agency.day++;

    // Восстановление раненых
    agency.monsters.forEach(m => {
      if (m.status === 'injured') m.status = 'idle';
    });

    // Автоматическое пополнение штата (1 монстр в день, если меньше 6)
    if (agency.monsters.length < 6) {
      agency.monsters.push(createMonster());
    }

    // Рост угрозы на 10% каждый день
    agency.threat = Math.min(1.0, agency.threat + 0.1);

    // Сброс статистики дня
    agency.dayStats = { goldEarned: 0, questsDone: 0, interceptedCount: 0, losses: 0, missions: [] };

    generateQuests(agency);
  }

  function calculateResult(monster, quest, agency) {
    let stat = monster.stats.str;
    if (['tower', 'cave', 'ruins'].includes(quest.type)) stat = monster.stats.int;
    if (['village', 'forest', 'city', 'caravan'].includes(quest.type)) stat = monster.stats.agi;

    let chance = 0.5 + (stat - quest.difficulty) * 0.05;
    chance = Utils.clamp(chance, 0.05, 0.95);

    const roll = stat + Utils.randInt(1, 20);
    const overkillThreshold = quest.difficulty * 1.5;

    let type = 'fail';
    let gold = 0;
    let injury = false;
    let threatAdd = 0;

    if (Math.random() < chance) {
      if (roll >= overkillThreshold) {
        type = 'overkill';
        gold = Math.floor(quest.reward * 1.5);
        threatAdd = 1;
        injury = Utils.chance(0.3);
        Audio.playSfx('win');
      } else {
        type = 'success';
        gold = quest.reward;
        Audio.playSfx('success');
      }
    } else {
      const r = Math.random();
      if (r < 0.7) type = 'fail';
      else if (r < 0.9) { type = 'injury'; injury = true; }
      else { type = 'lost'; }
      Audio.playSfx('fail');
    }

    let honesty = 0.1;
    if (monster.stats.int >= 14) honesty = 1.0;
    else if (monster.stats.int >= 8) honesty = 0.5;

    let reportKey = '';
    if (type === 'overkill') reportKey = 'overkill';
    else if (type === 'injury') reportKey = 'injury';
    else if (type === 'lost') reportKey = 'lost';
    else if (type === 'success') reportKey = Utils.chance(honesty) ? 'success_honest' : 'success_lie';
    else reportKey = Utils.chance(honesty) ? 'fail_honest' : 'fail_lie';

    const reportText = Utils.pick(Content.REPORTS[reportKey]);

    return {
      type, gold, threatAdd, injury,
      reportText,
      monsterId: monster.id,
      questId: quest.id,
      questTitle: quest.title,
      monsterName: monster.name
    };
  }

  return {
    SPECIES, createMonster, createQuest, createAgency, generateQuests, calculateResult, nextDay
  };
})();