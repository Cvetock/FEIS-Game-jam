# Формулы баланса — ПОСЛЕДНИЙ ЧЕЛОВЕК

## 1. Успех задания (Base Success Chance)

```
base_chance = 0.5 + (monster_effective_stat - task_difficulty) * 0.05
```

Где `monster_effective_stat` — основная стата монстра для типа задания:
- ферма, караван, склад, базар, мост → **Сила**
- пещера, руины, канализация, башня, ритуал → **Интеллект**
- деревня, город, лес → **Ловкость**
- любой → **Удача** (если нет специализации)

Модификаторы:
- Экипировка оружия: +кузня_уровень к Силе
- Черта «Устрашающий»: +2 к effective_stat на устрашении
- Черта «Трусливый»: -2 к effective_stat
- Черта «Мудрый»: +2 Интеллект
- Черта «Глюпой»: -2 Интеллект
- Черта «Удачливый»: +2 Удача
- Предпочтение «любит_риск» на сложности ≥6: +10% шанс
- Предпочтение «только_лёгкие» на сложности ≤4: +10% шанс

Результат clamp: 5% — 95%.

---

## 2. Определение типа результата

После успешного броска (успех) проверяем **Overkill**:

```
overkill_threshold = task_difficulty * 1.5
monster_roll = effective_stat + equipment_bonus + random(1-20)

if monster_roll >= overkill_threshold:
    result = OVERKILL
else:
    result = SUCCESS
```

При неудаче (1 - base_chance):
- 70% → FAIL (неудача)
- 20% → INJURY (травма)
- 10% → LOST (исчезновение, если черта «Неуловимый» → INJURY)

---

## 3. Награды и последствия по типам результата

| Результат | Золото | Угроза | Травма | Отчёт |
|---|---|---|---|---|
| SUCCESS | 100% награды | 0 | 0% | success_honest / success_lie |
| OVERKILL | **150% награды** | **+1** | **30%** | overkill (всегда «честный» в смысле гордости) |
| PARTIAL_SUCCESS | 50% награды | 0 | 10% | success_honest / success_lie |
| FAIL | 0 | 0 | 20% | fail_honest / fail_lie |
| INJURY | 0 | 0 | 100% (1 день) | injury |
| LOST | 0 | 0 | — (монстр ушёл) | lost |

---

## 4. Честность отчёта (Unreliable Narrator)

```
honesty_chance = 
  if intellect >= 14: 1.0 (100%)
  elif intellect >= 8: 0.5 (50%)
  else: 0.1 (10%)
```

Модификаторы:
- Черта «Мудрый»: +2 к интеллекту для честности
- Черта «Глюпой»: -2 к интеллекту для честности
- Улучшение **«Школа лжи»**: для интеллекта ≤13 умножает шанс лжи на 0.75 (снижает ложь на 25%)

Логика генерации отчёта:
```
if result == SUCCESS or OVERKILL:
    if random() < honesty_chance: template = success_honest
    else: template = success_lie
elif result == FAIL or PARTIAL_SUCCESS:
    if random() < honesty_chance: template = fail_honest
    else: template = fail_lie
elif result == INJURY: template = injury
elif result == LOST: template = lost
```

Игрок видит **только текст отчёта**, не истинный результат.

---

## 5. Найм (Собеседование)

Каждый кандидат имеет **скрытое предпочтение** (1 из 15).
При нажатии «Нанять»:

```
hire_check(preference, current_roster, task_board, threat_level):
    switch preference:
        case "работать_только_с_нежитью":
            return has_type(roster, [SKELETON, VAMPIRE])
        case "не_работать_с_нежитью":
            return not has_type(roster, [SKELETON, VAMPIRE])
        case "работать_только_с_гоблинами":
            return has_type(roster, [GOBLIN])
        case "не_лезть_в_пещеры":
            return not has_task_type(task_board, [CAVE, RUINS, CITADEL])
        case "только_подземелья":
            return has_task_type(task_board, [CAVE, RUINS, CITADEL])
        case "требует_вампира_в_команде":
            return has_type(roster, [VAMPIRE])
        case "боится_огня":
            return not has_task_tag(task_board, [FIRE])
        case "любит_риск":
            return has_task_difficulty(task_board, >= 6)
        case "только_лёгкие_задания":
            return has_task_difficulty(task_board, <= 4)
        case "работает_только_один":
            return len(roster) < 2
        case "требует_импа":
            return has_type(roster, [IMP])
        case "не_работает_с_слизями":
            return not has_type(roster, [SLIME])
        case "требует_троя_в_штате":
            return has_type(roster, [TROLL])
        case "любит_золото":
            return max_task_reward(task_board) >= 50  // +20% шанс
        case "трусливый":
            return random() > threat_level * 0.3  // +30% отказа при высокой угрозе
```

Если проверка пройдена → монстр присоединяется.
Если нет → монстр уходит с фразой (генерируется из шаблонов отказа), день не тратится, но **слот собеседования использован** (макс 3 в день).

---

## 6. Перехват заданий конкурентами (Rival Agencies)

```
rival_take_chance = threat_level * intercept_multiplier
```

- `threat_level`: 0.1 (низкая) → 0.2 (средняя) → 0.3 (высокая) → 0.4+ (критичная)
- `intercept_multiplier`: 0.1 (базовый) → 0.05 (с «Отделом разведки»)

При генерации доски заказов (3–4 задания в день):
```
for each task:
    if random() < rival_take_chance:
        task.intercepted = true
        task.reward = 0  // недоступно
```

---

## 7. Угроза героев (Threat Level)

```
threat_level = min(1.0, day * 0.035 + overkill_count * 0.05 - intel_level * 0.02)
```

- Базовый рост: +3.5% в день (≈ каждые 2 дня +1 ступень: 10% → 20% → 30% → 40%)
- Каждый Overkill: +5% угрозы
- Уровень «Отдела разведки»: -2% в день (если куплен)
- Уровень «Школы лжи»: не влияет на угрозу напрямую

Ступени:
- 0–15%: Низкая (10% перехват)
- 15–25%: Средняя (20% перехват)
- 25–35%: Высокая (30% перехват)
- 35%+: Критичная (40%+ перехват)

---

## 8. Финальный тендер (Tender)

Условия запуска: день ≥ 14 ИЛИ уровень агентства ≥ 5.

Игрок и ИИ-герой получают одинаковое задание (цитадель, сложность 8, награда 200).

```
player_score = evaluate_report(player_monster, task)
ai_score = evaluate_report(ai_monster, task)

if player_score > ai_score: VICTORY
else: DEFEAT
```

`evaluate_report(monster, task)`:
```
base = monster_effective_stat - task_difficulty
honesty_bonus = (intellect >= 14) ? 10 : (intellect >= 8) ? 5 : -5
preference_bonus = preference_matches_task(monster, task) ? 5 : -5
overkill_penalty = monster.overkill_count * 2  // риск за перестарательства
random_factor = random(-5, 5)

return base + honesty_bonus + preference_bonus - overkill_penalty + random_factor
```

ИИ-герой выбирает монстра с максимальным `intellect + preference_match`.

---

## 9. Экономика (золото)

| Действие | Стоимость/Доход |
|---|---|
| Начальное золото | 100 |
| Новый кандидат (слот собеседования) | 0 (время) |
| Нанимать монстра | 0 (только если прошёл собеседование) |
| Экипировка | 20–100 |
| Улучшения агентства | 40–240 (растёт геометрически) |
| Задание (базовая награда) | 10–200 |
| Overkill бонус | +50% к награде |
| Продажа предмета | 50% цены |

---

## 10. Роуглайк-прогрессия (New Game+)

При новом запуске:
- Монстры: новые имена, статы, предпочтения
- Задания: перемешаны
- Улучшения агентства: сбрасываются
- Золото: 100
- Угроза: 10%
- **Сохраняются:** разблокированные типы монстров (если были найманы), разблокированные улучшения (для отображения в меню), статистика предыдущих забегов.

---

## 11. Приоритеты MVP (Scope Control)

**Обязательно (Must Have):**
1. Собеседования (3 кандидата/день, скрытые предпочтения, найм/отказ)
2. Задания (генерация, сложность, награда, перехват)
3. Результаты (success, fail, overkill, injury, lost)
4. Отчёты монстров (честность = f(intellect), только текст виден)
5. Угроза героев = конкуренты (растёт, перехватывает задания)
6. Улучшения агентства (7 видов, включая разведку и школу лжи)
7. Финальный тендер (День 14, Герой-Директор, сравнение отчётов)
8. Роуглайк: новый запуск = новый рандом

**Желательно (Should Have):**
- Экипировка предметов
- Черты монстров (модификаторы)
- Анимации/эффекты (мигание overkill, подозрительный звук лжи)

**Можно вырезать (Could Cut):**
- ambient звуки
- анимации переходов
- детальная статистика в конце дня
- localStorage сохранение