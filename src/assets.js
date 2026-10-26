// Загрузчик ассетов. PNG — растровые иконки, SVG — фоны/недостающие иконки
// (браузер рисует SVG в canvas, если у файла заданы width/height).
window.Assets = {
  images: {},
  toLoad: 0,
  loaded: 0,
  _promise: null,
  _resolve: null,

  loadImage(name, src) {
    this.toLoad++;
    const img = new Image();
    img.onload = () => { this.loaded++; this.check(); };
    img.onerror = () => {
      this.loaded++;
      console.warn('Не загрузился ассет:', src);
      this.check();
    };
    img.src = src;
    this.images[name] = img;
    return img;
  },

  check() {
    if (this.loaded >= this.toLoad && this._resolve) this._resolve();
  },

  get(name) {
    return this.images[name];
  },

  // Возвращает промис, который резолвится, когда все картинки загрузились
  // (или по таймауту 8 с, чтобы игра не зависла из-за битого файла).
  load() {
    if (this._promise) return this._promise;

    const manifest = [
      ['bg_main',            'new graphics/задний фон.jpg'],
      ['bg_paper',           'new graphics/лист бумаги по центру.png'],

      // Верхняя панель (отряд)
      ['roster_slot',        'new graphics/рамка монстра отряда.png'],
      ['roster_slot_locked', 'new graphics/ячейка закрытый.png'],
      ['btn_collapse',       'new graphics/свернуть панель.png'],

      // Боковое меню (навигация)
      ['nav_hire',           'new graphics/боковая кнопка Найм.png'],
      ['nav_squad',          'new graphics/боковая панель отряд.png'],
      ['nav_upgrades',       'new graphics/боковая панель улучшения.png'],
      ['nav_research',       'new graphics/боковая панель исследования.png'],
      ['nav_events',         'new graphics/боковая панель события.png'],

      // Карточки внутри пергамента
      ['monster_card',       'new graphics/карточка монстра.png'],
      ['monster_desc',       'new graphics/описание монстра.png'],
      ['monster_fact',       'new graphics/факт монстра(забавный).png'],

      // Нижняя панель
      ['btn_shop',           'new graphics/нижняя кнопка магазин.png'],
      ['btn_market',         'new graphics/нижняякнопка рынок.png'],
      ['btn_end_day',        'new graphics/нижняя кнопка закончить день.png'],
      ['btn_map',            'new graphics/нижняя кнопка карта.png'],
      ['btn_tavern',         'new graphics/кнопка таверна.png'],

      // Фоны (SVG — векторные, масштабируются без потерь при любом размере окна)
      ['bg_agency',   'assets/art/backgrounds/agency_office.svg'],
      ['bg_tender',   'assets/art/backgrounds/tender_room.svg'],
      ['bg_cover',    'assets/art/backgrounds/cover_itchio.svg'],

      // Монстры
      ['mon_goblin',   'assets/art/monsters/гоблин.png'],
      ['mon_orc',      'assets/art/monsters/орк.png'],
      ['mon_skeleton', 'assets/art/monsters/скелет.png'],
      ['mon_slime',    'assets/art/monsters/слизь.png'],
      ['mon_imp',      'assets/art/monsters/импу.png'],
      ['mon_troll',    'assets/art/monsters/троль.png'],
      ['mon_vampire',  'assets/art/monsters/вампир.png'],

      // Задания (только 5 типов нарисованы художником)
      ['quest_farm',      'assets/art/missions/задание. ферма.png'],
      ['quest_caravan',   'assets/art/missions/задание. караван.png'],
      ['quest_cave',      'assets/art/missions/задание. пещера.png'],
      ['quest_ruins',     'assets/art/missions/задание. руины.png'],
      ['quest_citadel',   'assets/art/missions/задание. цитадель.png'],
      ['quest_stables',   'assets/art/missions/задание. конюшни.png'],
      ['quest_lieschool', 'assets/art/missions/задание. школа лжи.png'],

      // Предметы (пригодятся для экипировки)
      ['item_club',          'assets/art/items/Club.png'],
      ['item_shield',        'assets/art/items/shield.png'],
      ['item_amulet',        'assets/art/items/amulet.png'],
      ['item_potion',        'assets/art/items/potion.png'],
      ['item_shadow_amulet', 'assets/art/items/shadow_amulet.png'],

      // UI-иконки
      ['ui_intercepted', 'assets/art/ui/Intercepted.png'],
      ['ui_recon',       'assets/art/ui/Recon.png'],
      ['ui_lie_school',  'assets/art/ui/lie_school.png'],
      ['ui_stables',     'assets/art/ui/stables.png'],
      ['ui_forge',       'assets/art/ui/forge.png'],
      ['ui_sewer',       'assets/art/ui/Sewer.png'],
      ['ui_crypt',       'assets/art/ui/crypt.svg'],
      ['ui_office',      'assets/art/ui/office.png']
    ];

    this.toLoad = 0;
    this.loaded = 0;
    this._promise = new Promise(resolve => {
      this._resolve = resolve;
      manifest.forEach(([name, src]) => this.loadImage(name, src));
      setTimeout(() => {
        if (this.loaded < this.toLoad) {
          console.warn('Ассеты не догрузились:', this.toLoad - this.loaded, 'из', this.toLoad);
          resolve();
        }
      }, 8000);
    });
    return this._promise;
  }
};
