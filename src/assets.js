// Загрузчик ассетов (PNG изображения + звуки)
window.Assets = {
  images: {},
  sounds: {},
  toLoad: 0,
  loaded: 0,
  onComplete: null,

  loadImage(name, src) {
    this.toLoad++;
    const img = new Image();
    img.onload = () => { this.loaded++; this.check(); };
    img.onerror = () => { this.loaded++; this.check(); console.warn('Не загрузился:', src); };
    img.src = src;
    this.images[name] = img;
    return img;
  },

  check() {
    if (this.loaded >= this.toLoad && this.onComplete) this.onComplete();
  },

  get(name) {
    return this.images[name];
  },

  async load(onComplete) {
    this.onComplete = onComplete;

    // === Фоны (640×480) ===
    this.loadImage('bg_agency', 'assets/art/backgrounds/office.png');
    this.loadImage('bg_tender', 'assets/art/backgrounds/tender_room.png'); // TODO: сгенерировать PNG
    this.loadImage('bg_cover', 'assets/art/backgrounds/cover_itchio.png'); // TODO: сгенерировать PNG

    // === Монстры (64×64 / 512×512) ===
    this.loadImage('mon_goblin', 'assets/art/monsters/goblin.png');
    this.loadImage('mon_orc', 'assets/art/monsters/Orc.png');
    this.loadImage('mon_skeleton', 'assets/art/monsters/Skeleton.png');
    this.loadImage('mon_slime', 'assets/art/monsters/Slime.png');
    this.loadImage('mon_imp', 'assets/art/monsters/Imp.png');
    this.loadImage('mon_troll', 'assets/art/monsters/Troll.png');
    this.loadImage('mon_vampire', 'assets/art/monsters/Vampire.png');

    // === Задания (512×680) ===
    this.loadImage('quest_farm', 'assets/art/missions/farm.png');
    this.loadImage('quest_caravan', 'assets/art/missions/caravan.png');
    this.loadImage('quest_caves', 'assets/art/missions/caves.png');
    this.loadImage('quest_ruins', 'assets/art/missions/ruins.png');
    this.loadImage('quest_citadel', 'assets/art/missions/Citadel.png');

    // === Предметы (512×512) ===
    this.loadImage('item_club', 'assets/art/items/Club.png');
    this.loadImage('item_shield', 'assets/art/items/shield.png');
    this.loadImage('item_amulet', 'assets/art/items/amulet.png');
    this.loadImage('item_potion', 'assets/art/items/potion.png');
    this.loadImage('item_shadow_amulet', 'assets/art/items/shadow_amulet.png');

    // === UI иконки (512×512) ===
    this.loadImage('ui_intercepted', 'assets/art/ui/Intercepted.png');
    this.loadImage('ui_recon', 'assets/art/ui/Recon.png');
    this.loadImage('ui_lie_school', 'assets/art/ui/lie_school.png');
    this.loadImage('ui_stables', 'assets/art/ui/stables.png');
    this.loadImage('ui_forge', 'assets/art/ui/forge.png');
    this.loadImage('ui_sewer', 'assets/art/ui/Sewer.png');
    this.loadImage('ui_crypt', 'assets/art/ui/crypt.png'); // TODO: сгенерировать PNG
    this.loadImage('ui_office', 'assets/art/ui/office.png');
  }
};
