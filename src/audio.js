window.Audio = {
  sfx: {},
  music: {},
  currentMusic: null,
  enabled: true,
  masterVolume: 1.0,

  init() {
    const sfxFiles = {
      click: 'assets/audio/sfx/click.mp3',
      select: 'assets/audio/sfx/click.mp3',
      hire: 'assets/audio/sfx/hire.mp3',
      reject: 'assets/audio/sfx/reject.mp3',
      depart: 'assets/audio/sfx/depart.mp3',
      success: 'assets/audio/sfx/success.mp3',
      fail: 'assets/audio/sfx/fail.mp3',
      overkill: 'assets/audio/sfx/overkill.mp3',
      injury: 'assets/audio/sfx/fail.mp3',
      lost: 'assets/audio/sfx/lost.mp3',
      lie: 'assets/audio/sfx/lie_detected.wav',
      rival: 'assets/audio/sfx/reval_take.mp3',
      upgrade: 'assets/audio/sfx/upgrade.mp3',
      new_day: 'assets/audio/sfx/new_day.mp3',
      tender: 'assets/audio/sfx/click.mp3',
      pick: 'assets/audio/sfx/click.mp3'
    };

    const musicFiles = {
      main: 'assets/audio/music/меню кабинет агенства.mp3',
      report: 'assets/audio/music/экран отчета.mp3',
      tender: 'assets/audio/music/финальный тендер.mp3',
      victory: 'assets/audio/music/победа.mp3',
      defeat: 'assets/audio/music/поражение.mp3'
    };

    for (let key in sfxFiles) {
      const a = document.createElement('audio');
      a.src = sfxFiles[key];
      this.sfx[key] = a;
    }

    for (let key in musicFiles) {
      const a = document.createElement('audio');
      a.src = musicFiles[key];
      a.loop = true;
      this.music[key] = a;
    }
  },

  toggleVolume() {
    if (this.masterVolume === 1.0) this.masterVolume = 0.5;
    else if (this.masterVolume === 0.5) this.masterVolume = 0.0;
    else this.masterVolume = 1.0;

    if (this.currentMusic) {
      this.currentMusic.volume = 0.4 * this.masterVolume;
    }
  },

  playSfx(type) {
    if (!this.enabled || this.masterVolume === 0 || !this.sfx[type]) return;
    const sound = this.sfx[type].cloneNode();
    sound.volume = 0.7 * this.masterVolume;
    sound.play().catch(e => {});
  },

  playMusic(type) {
    if (!this.enabled || !this.music[type]) return;
    if (this.currentMusic === this.music[type]) {
       this.currentMusic.volume = 0.4 * this.masterVolume;
       return;
    }

    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.currentTime = 0;
    }

    this.currentMusic = this.music[type];
    this.currentMusic.volume = 0.4 * this.masterVolume;

    if (this.masterVolume > 0) {
      this.currentMusic.play().catch(e => {});
    }
  }
};