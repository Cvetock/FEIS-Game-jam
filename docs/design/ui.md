# UI/UX: трёхзонная сетка «гильдии монстров»

> **Важно про реализацию.** Игра «ПОСЛЕДНИЙ ЧЕЛОВЕК» написана на чистом
> HTML5 Canvas 2D (без DOM-интерфейса, без сборки). Поэтому финальный интерфейс
> отрисовывается **в канвасе** процедурно: дерево, пергамент, ржавый металл и грязь
> генерируются кодом в `src/renderer.js` (текстуры-тайлы + функции `paper()`,
> `wood()`, `metal()`, `chain()`, `lockIcon()`, `grime()`, `vignette()`), а три зоны
> собираются в `src/main.js`. Ниже — та же сетка в терминах HTML/CSS и готовые
> CSS-приёмы для «грязи», «пергамента» и сворачивания панели; их можно
> переиспользовать для itch-страницы или будущей DOM-оболочки.

## 1. Структура (HTML)

```html
<div class="guild">
  <!-- Верхняя зона: панель монстров -->
  <header class="guild__roster" id="roster">
    <div class="roster__header">
      <span class="roster__title">Гильдия «Последний человек»</span>
      <span class="roster__meta">
        <b data-day>День 1/14</b> ·
        <b data-gold>100 зол.</b> ·
        <b data-threat>Угроза 10%</b> ·
        <b data-staff>Штат 2/4</b>
      </span>
    </div>
    <ul class="roster__slots">
      <!-- слоты генерируются: занятые, пустые и закрытые на замок -->
      <li class="slot slot--monster">
        <img class="slot__portrait" alt="Грак" src="…/goblin.png">
        <span class="slot__name">Грак</span>
        <span class="slot__status">Свободен</span>
      </li>
      <li class="slot slot--locked" title="Улучшите стойла">
        <span class="slot__lock" aria-hidden="true">🔒</span>
        <span class="slot__name">закрыто</span>
      </li>
    </ul>
    <!-- Ржавая цепь — ручка сворачивания -->
    <button class="roster__chain" id="rosterToggle" aria-label="Свернуть панель">
      <span class="chain__links"></span>
      <span class="chain__ring"></span>
    </button>
  </header>

  <!-- Центральная зона: динамический контент -->
  <main class="guild__content">
    <section class="parchment" data-view="hire">…</section>
    <section class="parchment" data-view="quests">…</section>
    <section class="parchment" data-view="shop">…</section>
    <section class="parchment" data-view="items">…</section>
  </main>

  <!-- Нижняя зона: кнопка дня + навигация -->
  <footer class="guild__nav">
    <button class="guild__endday">Закончить день · 1/14</button>
    <nav class="nav">
      <button class="nav__btn nav__btn--active">Найм <i>3/3</i></button>
      <button class="nav__btn">Заказы <i>4</i></button>
      <button class="nav__btn">Магазин</button>
      <button class="nav__btn">Амуниция <i>1</i></button>
    </nav>
  </footer>
</div>
```

## 2. CSS: атмосфера (грязь, пергамент, дерево, металл)

```css
:root {
  --ink: #2a1c10;        /* чернила */
  --ink-soft: #4a3520;   /* выцветшие чернила */
  --paper: #d8c49a;      /* пергамент */
  --gold: #c9a227;
  --wood: #3a2415;
  --rust: #7a3a22;
  --metal: #5a4a3a;
}

.guild {
  position: relative;
  width: min(640px, 100vw);
  aspect-ratio: 4 / 3;
  display: grid;
  grid-template-rows: auto 1fr auto;   /* три зоны */
  overflow: hidden;
  background:
    radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,.55) 100%),
    url('backgrounds/office.png') center/cover;
  color: var(--ink);
}

/* ── Дерево (верхняя и нижняя панели) ─────────────────────────────── */
.guild__roster, .guild__nav {
  background:
    repeating-linear-gradient(90deg,
      rgba(0,0,0,.18) 0 2px, transparent 2px 26px),   /* доски */
    linear-gradient(180deg, #422917, #22140a);
  box-shadow: inset 0 2px 0 rgba(255,220,170,.08), 0 4px 8px rgba(0,0,0,.6);
}

/* ── Пергамент (центральная зона) ─────────────────────────────────── */
.parchment {
  position: relative;
  background:
    radial-gradient(80% 70% at 50% 40%, rgba(60,36,14,0) 55%, rgba(60,36,14,.30) 100%),
    url('data:image/svg+xml;utf8,…') repeat,  /* пятна и волокна */
    linear-gradient(180deg, #e4d2a8, #d8c49a 55%, #bfa878);
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 1.5px rgba(70,44,20,.85),
    inset 0 0 0 4px rgba(255,245,215,.10);
}

/* Обожжённые края пергамента: 4 линейных градиента внутрь */
.parchment::before {
  content: '';
  position: absolute; inset: 0;
  background:
    linear-gradient(180deg, rgba(52,30,12,.72), rgba(70,42,18,0) 12px),
    linear-gradient(0deg,   rgba(52,30,12,.72), rgba(70,42,18,0) 12px),
    linear-gradient(90deg,  rgba(52,30,12,.72), rgba(70,42,18,0) 12px),
    linear-gradient(270deg, rgba(52,30,12,.72), rgba(70,42,18,0) 12px);
  pointer-events: none;
}

/* ── Ржавый металл (кнопки, таблички) ─────────────────────────────── */
.metal-plate {
  background:
    repeating-linear-gradient(90deg, rgba(0,0,0,.12) 0 3px, transparent 3px 7px),
    linear-gradient(180deg, #6b5945, #4a3c2e 45%, #2b2118);
  border: 1.5px solid #1b1410;
  border-radius: 3px;
  box-shadow: inset 0 1px 0 rgba(255,235,200,.12), inset 0 -2px 0 rgba(0,0,0,.35);
  color: #f3e0b0;
}

/* ── Грязь: глобальная зернистость поверх всего ───────────────────── */
.guild::after {
  content: '';
  position: absolute; inset: 0;
  pointer-events: none;
  opacity: .22;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0"/></filter><rect width="100%25" height="100%25" filter="url(%23n)"/></svg>');
  mix-blend-mode: multiply;
}
```

Совет: вместо `url(data:…)`-шумов в продакшене кладите готовые тайлы
(`paper.png`, `wood.png`, `metal.png`, `grime.png`) в `assets/art/ui/` и включайте их
через `background-image` — так же, как это делают процедурные тайлы в канвасе.

## 3. Логика сворачивания панели (цепь, CSS-анимация)

```css
.guild__roster {
  max-height: 108px;                 /* развёрнута */
  transition: max-height .28s cubic-bezier(.4,0,.2,1);
  overflow: hidden;
}
.guild__roster.is-collapsed {
  max-height: 26px;                  /* свернута — видна только шапка */
}
/* цепь при свернутой панели поворачивается и поднимается */
.chain__ring { transition: transform .28s ease; }
.guild__roster.is-collapsed .chain__ring { transform: translateY(-70px) rotate(8deg); }
```

```js
const roster = document.getElementById('roster');
const toggle = document.getElementById('rosterToggle');
toggle.addEventListener('click', () => {
  roster.classList.toggle('is-collapsed');
  toggle.setAttribute('aria-label',
    roster.classList.contains('is-collapsed') ? 'Развернуть панель' : 'Свернуть панель');
});
// Дублируем для клавиши C
window.addEventListener('keydown', e => {
  if (e.code === 'KeyC') roster.classList.toggle('is-collapsed');
});
```

## 4. Замок для закрытых слотов

```html
<li class="slot slot--locked">
  <span class="slot__lock" aria-hidden="true"></span>
  <span class="slot__name">закрыто</span>
</li>
```

```css
.slot--locked {
  background: rgba(10,7,4,.55);
  border: 1px dashed rgba(90,70,45,.5);
  cursor: not-allowed;
}
.slot__lock {
  width: 22px; height: 26px;
  border: 2px solid #6b5a45;
  border-radius: 2px;
  position: relative;
}
/* дужка замка */
.slot__lock::before {
  content: '';
  position: absolute; top: -9px; left: 3px;
  width: 12px; height: 12px;
  border: 2px solid #6b5a45;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
}
/* скважина */
.slot__lock::after {
  content: '';
  position: absolute; left: 8px; top: 9px;
  width: 3px; height: 6px;
  background: rgba(0,0,0,.55);
  box-shadow: 0 2px 0 rgba(0,0,0,.55);
}
```

## 5. Адаптивность

- `width: min(640px, 100vw)` + `aspect-ratio: 4/3` — канвас всегда вписывается в экран.
- На узких экранах (`@media (max-width: 480px)`) сетка слотов переносится на два ряда,
  а подписи под портретами уменьшаются до 9px.
- В канвасе та же логика: ввод пересчитывает координаты с учётом масштаба (`src/input.js`),
  а игра рисуется в логических 640×480 и масштабируется через `devicePixelRatio`.
