# Starforge Relay — speaker notes (3–5 min)

**Формат:** 5 слайдов → сразу live Telegram Mini App.  
**Слайды:** `public/pitch/demo-slides.html` → live `/pitch/demo-slides.html` · `← →` / Space · `F` fullscreen
**Live:** https://starforge-relay.onrender.com  
**Repo:** https://github.com/dnzg/starforge-relay  

Говори жюри **на английском** (ниже — готовые фразы). Заметки слева — для тебя.

---

## Тайминг (всего ~4:00 + demo)

| Блок | Время | Слайд |
|------|-------|-------|
| Hook | 0:00–0:40 | 1 |
| Gap | 0:40–1:20 | 2 |
| Loop | 1:20–2:00 | 3 |
| Stack / $ | 2:00–2:50 | 4 |
| Demo setup | 2:50–3:10 | 5 |
| Live play | 3:10–5:00 | Telegram |

Если режут по времени: **1 → 3 → 5 → demo**. Слайд 2 и 4 сжимай в 1–2 предложения.

---

## Slide 1 — What it is (~40s)

**Смысл:** одна фраза продукта + где живёт.

**Скажи:**
> Starforge Relay is an AI-native Telegram arcade — a ship combat game where the universe itself is the content pipeline.

> You fly, fight, jump sectors. Every world can be generated with AI and cached by seed — so it stays cheap to run.

> It’s live now as a Telegram Mini App on Render.

**Не уходи в:** историю пивота, WebGL детали, список багов.

**Жест:** ткни Live-пилл / покажи URL мельком.

---

## Slide 2 — The problem (~40s)

**Смысл:** у Telegram есть дистрибуция, нет «бесконечных миров, которые всё ещё ощущаются как игра».

**Проблема одной фразой (EN):**
> Telegram has distribution. It doesn’t have infinite game worlds that still feel like games.

**Три следствия:**
> - **Dead art** — tappers with the same skins forever; content dies after day one  
> - **Fake games** — AI chat toys generate text, not skill or tension  
> - **Cost wall** — naive “AI every session” burns money; unit economics collapse  

**Мост к решению (слайд 3):**
> So we built an arcade loop where AI is the content pipeline — generate once per seed, cache forever, then play.

---

## Slide 3 — Product loop (~40s)

**Смысл:** combat → relay → AI world. Картинки = реальный Fal cache из игры.

**Скажи:**
> One sector. Clear hostiles. Jump. New world.

> Combat is WASD or touch — interceptors, gunships, drones. Mana fills into a super rail.

> After kills, the jump gate unlocks. Hyperspace into the next seed — and the planet/sky can be a fresh Fal texture or a cache hit.

> These panels are real in-game AI textures from our cache — not mockups.

**Не уходи в:** Three.js / R3F / object pooling (если спросят — в Q&A).

---

## Slide 4 — Why we win / commercial (~50s)

**Смысл:** партнёры хакатона + как зарабатывать без pay-to-win.

**Скажи:**
> Built on the partner stack we actually ship: Fal for art, x.ai for voice, Render for the live URL, Telegram for zero-install distribution.

> Commercial angle:
> - **Money** — Telegram Stars buy taste and time: cosmetics, energy, AI rerolls — not damage  
> - **Moat** — seeded AI worlds plus cache = infinite look without infinite cost  
> - **Ship** — live on Render, auto-deploy from GitHub main, open inside Telegram  

**Одна добивка:**
> Distribution is free: deep-link a sector, challenge a friend.

---

## Slide 5 — Demo checklist (~20s)

**Смысл:** скажи жюри, на что смотреть — потом молча играй.

**Скажи:**
> I’ll play in Telegram. Watch for four beats:
> 1. Fly, kill three hostiles — JUMP unlocks  
> 2. Gate jump — new sector texture, generated or cached  
> 3. Ship AI line — avatar / voice  
> 4. Super attack when mana is full  

> Opening the Mini App now.

**Переход:** `F` выйти из слайдов → Telegram → Play.

---

## Live demo — чеклист для тебя

Перед выходом на сцену (за 2 мин):
- [ ] Телефон / Telegram: бот открывается, Mini App грузится (если cold start — подожди 30–60с **до** выхода)
- [ ] Звук / TTS ок (или mute ок — не извиняйся долго)
- [ ] Управление: WASD или touch; RMB не открывает меню
- [ ] Свайп вниз не закрывает апп (`disableVerticalSwipes`)
- [ ] Слайды на втором экране / ноуте, demo на телефоне

Во время demo:
1. Стартуй ран → покажи корабль + врагов  
2. Убей 3 → укажи JUMP  
3. Прыжок → «new seed / texture»  
4. Если успеешь: голос или супер  

Если что-то отвалилось:
> Browser fallback also works for judges — same arcade loop at starforge-relay.onrender.com

Не чини на сцене больше 15 секунд.

---

## Однострочники (если спросят)

| Вопрос | Ответ |
|--------|--------|
| Почему Telegram? | Zero install, Stars payments, viral deep links, huge mobile graph. |
| Почему не только voice? | Voice is a bonus ship AI — arcade controls are the core loop everyone gets in 10 seconds. |
| Как не сжечь Fal $? | Generate once per seed, cache forever; rerolls are the paid cosmetic/time loop. |
| Стек? | React + Three.js / R3F, Fal, x.ai Voice, Render, Telegram WebApp. |
| Что дальше? | Stars cosmetics + energy, shareable sector challenges, leaderboard, richer AI sectors. |
| Почему вы? | Full partner stack in one shippable loop — game feel + AI content economics + live Mini App today. |

---

## Closing (10s, после demo)

**Скажи:**
> Starforge Relay — AI-native Telegram arcade. Live now. Happy to take questions.

Улыбнись. Ссылка / QR если есть — не обязательно, URL уже на слайдах.
