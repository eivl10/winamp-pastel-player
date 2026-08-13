# 🎵 Winamp Pastel Player (Alla Pugacheva Special Edition)

Ретро-плеер в стилистике классического Winamp с пастельно-неоновой эстетикой, оптимизированным фоновым скринсейвером (3D Pipes), динамическим медиа-шоу (фото/видео/эмодзи) и поддержкой мобильных устройств (iOS Safari AudioContext unlock).

---

## 🚀 Ключевые возможности & Архитектура

### 1. Архитектура и модули
- **`index.html`**: Мобильно-адаптивный каркас (viewport, safe-area-inset, поддержка PWA/iOS).
- **`js/player.js` (`AudioEngine`)**:
  - Полное управление аудио (play, pause, stop, prev, next, seek, volume, shuffle).
  - Поддержка iOS Safari AudioContext Unlock (`setupIOSUnlock`).
  - Система событий: `onTimeUpdate`, `onTrackLoad`, `onTrackEnd`, `onStateChange`.
- **`js/triggers.js` (`TriggerEngine`)**:
  - Запуск синхронных медиа-триггеров по таймкодам трека (`popup`, `image`, `video`, `emoji-shower`, `flash`).
  - Разнообразные CSS-эффекты: `bounce`, `zoom-burst`, `spin-in`, `shake`, `float-up`, `glitch`, `fade-in`.
- **`js/mediashow.js` (`MediaShow`)**:
  - Фоновое динамическое шоу: случайные фото разных размеров (55px / 110-190px / 200-330px), видеоролики с кнопкой вкл/выкл звука (`🔇/🔊`), ливни эмодзи.
  - Авто-пауза при остановке трека.
- **`js/screensaver.js` (`ScreensaverEngine`)**:
  - Фоновый скринсейвер XP Pipes (3D трубы) на Canvas.
  - **Оптимизация:** Троттлинг до ~6fps (`setTimeout`), уменьшенное количество труб (3), крупная сетка (GRID 30) — 0% просадки производительности.
  - Кнопка `📺` переключает режимы: Normal ➔ Fast ➔ Pause.
  - Авто-очистка канваса каждые 45 секунд.
- **`js/app.js`**:
  - Инициализация и оркестрация всех модулей.
  - Яркая анимация смены трека (`showTrackChangeBurst`): вспышка, плашка трека, эмодзи-конфетти.

### 2. Дизайн и темы (`css/style.css`, `css/winamp.css`)
- **Светлый Kosmosky-стиль**:
  - Белый фон `#FFFFFF` со статичными цветными градиентными пятнами (синий, желтый, фиолетовый).
  - Сплошной (solid) непрозрачный плеер без тормозящих `backdrop-filter: blur`.
  - Моноширинный ретро-шрифт `Share Tech Mono`.
  - Кастомные слайдеры громкости и перемотки.

### 3. Данные (`data/tracks.json`)
- 21 трек Аллы Пугачёвой.
- 84+ настроенных триггера с таймкодами, позициями на экране и визуальными эффектами.

---

## 🛠 Запуск локально

```bash
# Статический сервер (например через Python или Node)
npx serve .
# или
python -m http.server 3030
```

---

## 📦 Деплой

- Сконфигурирован для **Vercel** (`vercel.json`).
- Поддержка автоматического деплоя через GitHub.
