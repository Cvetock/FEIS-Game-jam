# Аудиоплан

## SFX (типовые события)
- клик / выбор (click)
- подбор ресурса (pick)
- удар / урон (hit)
- победа (win)
- поражение (lose)
- UI-звук (ui)

## Музыка
- Меню: спокойная петля
- Геймплей: ритмичная, нарастающая с волнами

## Источники
- Бесплатные библиотеки: Open Game Art, Kenney.nl, Freesound, NASA Sound Library, BBC Sound Effects, Incompetech, Free Music Archive, Musopen, Sonniss (CC0 / CC-BY).
- Синтез через Web Audio API (короткие SFX без файлов — см. сниппет ниже).

## Структура
assets/audio/sfx/ — короткие звуки
assets/audio/music/ — петли
assets/audio/ambient/ — фоновый шум

## Сниппет Web Audio API (для программиста)
function playSfx(type) { ... } — см. docs/audio.md, функция уже реализована в src/audio.js (Audio.playSfx).

## Кандидаты на музыку (заполняется после темы)
| Треки | Автор | Источник | Лицензия |
|---|---|---|---|
| (заполнить) | | | |
