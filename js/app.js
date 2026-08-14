// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ DRAG-AND-DROP И ФОНОВЫХ АНИМАЦИЙ ===
let dragSrcIndex = null;          // индекс перетаскиваемого трека
let lightningEnabled = true;      // управляет молниями
let shootingStarsEnabled = true;  // управляет падающими звёздами
let rainInterval = null;          // интервал дождя

document.addEventListener('DOMContentLoaded', async () => {
// === TRACK CHANGE BURST ANIMATION ===
function showTrackChangeBurst(track) {
  const burst = document.createElement('div');
  burst.className = 'track-burst track-burst-small';
  burst.innerHTML = `
    <div class="track-burst-inner">
      <div class="track-burst-title">${track ? track.title : ''}</div>
      <div class="track-burst-artist">${track ? track.artist : ''}</div>
    </div>
  `;
  document.body.appendChild(burst);
  
  const flash = document.createElement('div');
  flash.className = 'track-burst-flash track-burst-flash-small';
  document.body.appendChild(flash);
  
  setTimeout(() => {
    burst.classList.add('hiding');
    if(flash.parentNode) flash.remove();
    setTimeout(() => { if(burst.parentNode) burst.remove(); }, 300);
  }, 1100);
}

  // 1. Load tracks.js
  let tracks = [];
  if (typeof TRACKS_DATA !== 'undefined') {
    tracks = Array.isArray(TRACKS_DATA) ? TRACKS_DATA : (TRACKS_DATA.tracks || []);
  } else {
    console.error('TRACKS_DATA is not defined. Ensure js/tracks.js is loaded.');
  }

  // 2. Initialize engines
  const engine = new AudioEngine();
  const triggerEngine = new TriggerEngine(document.getElementById('media-overlay'));
  const screensaver = new ScreensaverEngine(
    document.getElementById('screensaver-canvas'),
    document.getElementById('screensaver-overlay')
  );
  const mediaShowEl = document.getElementById('mediashow-layer');
  const mediaShow = window.MediaShow ? new MediaShow(mediaShowEl) : null;

  // 3. Helper Functions
  function updateMarquee(track) {
    if (!track) return;
    const marquee = document.getElementById('track-marquee');
    if (!marquee) return;
    let inner = marquee.querySelector('.marquee-inner');
    if (!inner) {
      inner = document.createElement('div');
      inner.className = 'marquee-inner';
      marquee.innerHTML = '';
      marquee.appendChild(inner);
    }
    inner.innerText = `${track.artist} — ${track.title}   `;
  }

  function updateActiveTrack(index) {
    const items = document.querySelectorAll('.playlist-item');
    items.forEach(item => item.classList.remove('active'));

    const activeItem = document.querySelector(`.playlist-item[data-index="${index}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function renderPlaylist(trackList) {
    const container = document.getElementById('playlist-container');
    if (!container) return;
    container.innerHTML = '';

    trackList.forEach((track, i) => {
      const item = document.createElement('div');
      item.className = 'playlist-item';
      item.setAttribute('data-index', i);
      item.setAttribute('draggable', 'true'); // разрешаем перетаскивание

      const numSpan = document.createElement('span');
      numSpan.className = 'track-num';
      numSpan.textContent = String(i + 1).padStart(2, '0') + '. ';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'track-title';
      titleSpan.textContent = track.title;

      item.appendChild(numSpan);
      item.appendChild(titleSpan);

      if (track.url === 'PLACEHOLDER') {
        item.classList.add('unavailable');
        const iconSpan = document.createElement('span');
        iconSpan.className = 'unavailable-icon';
        iconSpan.textContent = ' ❌';
        item.appendChild(iconSpan);
      }

      // Клик для воспроизведения
      item.addEventListener('click', () => {
        engine.loadTrack(i);
        engine.play();
        updateActiveTrack(i);
      });

      // === DRAG-AND-DROP обработчики ===

      // Начало перетаскивания
      item.addEventListener('dragstart', (e) => {
        dragSrcIndex = i;
        e.dataTransfer.effectAllowed = 'move';
      });

      // Елемент под курсором
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('drag-over');
      });

      // Курсор ушёл
      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      // Сброс (перемещаем треки)
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        if (dragSrcIndex === null || dragSrcIndex === i) return;

        const dropTargetIndex = i;

        // Определяем текущий индекс воспроизведения до перемещения
        const playingIdx = engine.currentIndex;

        // Меняем треки местами
        const moved = trackList.splice(dragSrcIndex, 1)[0];
        trackList.splice(dropTargetIndex, 0, moved);

        // Обновляем движка (engine.tracks — ссылка на тот же массив)
        engine.tracks = trackList;

        // Обновляем текущий индекс если играется трек
        if (playingIdx === dragSrcIndex) {
          engine.currentIndex = dropTargetIndex;
        } else if (dragSrcIndex < playingIdx && dropTargetIndex >= playingIdx) {
          engine.currentIndex = playingIdx - 1;
        } else if (dragSrcIndex > playingIdx && dropTargetIndex <= playingIdx) {
          engine.currentIndex = playingIdx + 1;
        }

        dragSrcIndex = null;
        renderPlaylist(trackList);
        updateActiveTrack(engine.currentIndex);
      });

      container.appendChild(item);
    });
  }

  function loadAndUpdateUI(index) {
    engine.loadTrack(index);
    const track = engine.getCurrentTrack();
    if (track) {
      updateMarquee(track);
      triggerEngine.setTriggers(track.triggers || []);
    }
    updateActiveTrack(index);
  }

  // 4. AudioEngine Callbacks
  engine.onTrackLoad = (track) => {
    // Бурст при смене трека (кроме первой загрузки)
    if (isAppInitialized) showTrackChangeBurst(track);
    const bitrateDisplay = document.getElementById('bitrate-display');
    if (bitrateDisplay) bitrateDisplay.textContent = '128 kbps';
    if (track) updateMarquee(track);
    updateActiveTrack(engine.currentIndex);
    triggerEngine.setTriggers(track?.triggers || []);
    const durationDisplay = document.getElementById('duration-display');
    if (durationDisplay) {
      durationDisplay.textContent = engine.formatTime(engine.audio.duration || 0);
    }
  };

  engine.onTimeUpdate = (currentTime, duration) => {
    const timeDisplay = document.getElementById('time-display');
    if (timeDisplay) timeDisplay.textContent = engine.formatTime(currentTime);

    const durationDisplay = document.getElementById('duration-display');
    if (durationDisplay) durationDisplay.textContent = engine.formatTime(duration);

    const seekBar = document.getElementById('seek-bar');
    if (seekBar) {
      seekBar.value = duration > 0 ? (currentTime / duration * 100) : 0;
    }

    triggerEngine.tick(currentTime);
  };

  engine.onTrackEnd = () => {
    engine.nextTrack();
    // nextTrack() уже вызывает loadTrack() + play() внутри
    // здесь только обновляем UI
    const track = engine.getCurrentTrack();
    if (track) {
      updateMarquee(track);
      triggerEngine.setTriggers(track.triggers || []);
    }
    updateActiveTrack(engine.currentIndex);
  };

  engine.onStateChange = (state) => {
    const btnPlay = document.getElementById('btn-play');
    const btnPause = document.getElementById('btn-pause');
    if (btnPlay && btnPause) {
      if (state === 'playing') {
        btnPlay.style.display = 'none';
        btnPause.style.display = 'inline-block';
      } else {
        btnPlay.style.display = 'inline-block';
        btnPause.style.display = 'none';
      }
    }
    if (btnPlay) {
      btnPlay.classList.toggle('active', state === 'playing');
    }
    
    // Управляем пульсацией логотипа
    const titlebar = document.querySelector('.winamp-titlebar');
    if (titlebar) titlebar.classList.toggle('is-playing', state === 'playing');
    
    // Управляем EQ-барами
    const eqBars = document.getElementById('eq-bars');
    if (eqBars) eqBars.classList.toggle('playing', state === 'playing');
    
    // Пауза/возобновление mediashow
    if (mediaShow) {
      if (state === 'playing') mediaShow.start();
      else mediaShow.stop();
    }
  };

  // 5. Control Bindings
  const btnPlay = document.getElementById('btn-play');
  if (btnPlay) btnPlay.addEventListener('click', () => engine.play());

  const btnPause = document.getElementById('btn-pause');
  if (btnPause) btnPause.addEventListener('click', () => engine.pause());

  const btnStop = document.getElementById('btn-stop');
  if (btnStop) {
    btnStop.addEventListener('click', () => {
      engine.stop();
      triggerEngine.reset();
    });
  }

  const btnPrev = document.getElementById('btn-prev');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      engine.prevTrack();
    });
  }

  const btnNext = document.getElementById('btn-next');
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      engine.nextTrack();
    });
  }

  const btnShuffle = document.getElementById('btn-shuffle');
  if (btnShuffle) {
    btnShuffle.addEventListener('click', () => {
      const on = engine.toggleShuffle();
      btnShuffle.classList.toggle('shuffle-on', on);
    });
  }


  const seekBar = document.getElementById('seek-bar');
  if (seekBar) {
    seekBar.addEventListener('input', () => {
      const t = (seekBar.value / 100) * (engine.audio.duration || 0);
      engine.seekTo(t);
    });
  }

  const volSlider = document.getElementById('volume-slider');
  if (volSlider) {
    engine.setVolume(volSlider.value / 100);
    volSlider.addEventListener('input', () => {
      engine.setVolume(volSlider.value / 100);
    });
  }

  // Minimize / Expand Toggle
  const winampWindow = document.getElementById('winamp-window');
  const btnToggleMin = document.getElementById('btn-toggle-minimize');
  if (btnToggleMin && winampWindow) {
    btnToggleMin.addEventListener('click', () => {
      const isMin = winampWindow.classList.toggle('minimized');
      const icon = btnToggleMin.querySelector('.min-icon');
      const text = btnToggleMin.querySelector('.min-text');
      if (icon) icon.textContent = isMin ? '🗖' : '🗕';
      if (text) text.textContent = isMin ? 'Развернуть' : 'Свернуть';
      btnToggleMin.title = isMin ? 'Развернуть плеер' : 'Свернуть плеер';
    });
  }

  const toggleTriggers = document.getElementById('toggle-triggers');
  if (toggleTriggers) {
    toggleTriggers.addEventListener('click', () => {
      const enabled = triggerEngine.toggle();
      toggleTriggers.classList.toggle('active', enabled);
      toggleTriggers.classList.toggle('off', !enabled);
    });
  }

  const toggleMediashow = document.getElementById('toggle-mediashow');
  if (toggleMediashow) {
    toggleMediashow.addEventListener('click', () => {
      if (mediaShow) {
        const enabled = mediaShow.toggle();
        toggleMediashow.classList.toggle('active', enabled);
        toggleMediashow.classList.toggle('off', !enabled);
      }
    });
  }

  const toggleSpeed = document.getElementById('toggle-speed');
  const speedLevelText = document.getElementById('speed-level');
  if (toggleSpeed) {
    toggleSpeed.addEventListener('click', () => {
      if (mediaShow) {
        const newLevel = mediaShow.cycleSpeed();
        if (speedLevelText) speedLevelText.textContent = newLevel;
      }
    });
  }

  // === ПЕРЕКЛЮЧЕНИЕ ФОНА ===
  const toggleBackground = document.getElementById('toggle-background');
  const bgLayer = document.getElementById('bg-layer');
  const blobBg = document.querySelector('.blob-bg');
  // Вычисляем базовый путь — работает и при file://, и при http://
  const _base = window.location.href.replace(/\/[^\/]*$/, '/');
  const BACKGROUNDS = [
    null,
    _base + 'assets/images/weligama_bg.jpg',
    _base + 'assets/images/srilanka_bg.jpg',
    _base + 'assets/images/novisad_bg.jpg',
  ];
  let currentBgIndex = 0;

  if (toggleBackground && bgLayer) {
    toggleBackground.addEventListener('click', () => {
      currentBgIndex = (currentBgIndex + 1) % BACKGROUNDS.length;
      const src = BACKGROUNDS[currentBgIndex];

      if (src) {
        const img = new Image();
        img.onload = () => {
          bgLayer.style.backgroundImage = `url("${src}")`;
          bgLayer.classList.add('visible');
          if (blobBg) blobBg.style.opacity = '0';
          toggleBackground.classList.add('active');

          const so = document.getElementById('screensaver-overlay');
          if (so) so.style.display = 'none';
          if (typeof screensaver !== 'undefined') screensaver.stop();

          // Фон 1 — Велигама: сёрфер и океан
          if (currentBgIndex === 1) {
            lightningEnabled = false;
            shootingStarsEnabled = false;
            startWeligamaOcean();
          // Фон 2 — Шри-Ланка: дождь
          } else if (currentBgIndex === 2) {
            lightningEnabled = false;
            shootingStarsEnabled = false;
            startRain();
          // Фон 3 — Нови Сад: деревья и птицы
          } else {
            lightningEnabled = false;
            shootingStarsEnabled = false;
            startNoviSad();
          }
        };
        img.onerror = () => {
          console.error('BG image failed to load:', src);
          // Пропускаем к следующему
          currentBgIndex = (currentBgIndex + 1) % BACKGROUNDS.length;
        };
        img.src = src;
      } else {
        // Фон 0 — дефолт: молнии + звёзды
        lightningEnabled = true;
        shootingStarsEnabled = true;
        stopBgAnimation();
        
        const so = document.getElementById('screensaver-overlay');
        if (so) so.style.display = 'block';
        if (typeof screensaver !== 'undefined') screensaver.start();

        bgLayer.classList.remove('visible');
        setTimeout(() => { bgLayer.style.backgroundImage = ''; }, 650);
        if (blobBg) blobBg.style.opacity = '';
        toggleBackground.classList.remove('active');
      }
    });
  } else {
    console.warn('BG switcher: missing element', { toggleBackground, bgLayer });
  }

  // 6. Initialization Logic
  let isAppInitialized = false;
  function startApp() {
    if (isAppInitialized) return;
    isAppInitialized = true;
    engine.init(tracks);
    renderPlaylist(tracks);
    screensaver.start();
    if (mediaShow) mediaShow.start();
    loadAndUpdateUI(0);

    // Автоплей при входе
    const playPromise = engine.play();
    if (playPromise) {
      playPromise.catch(() => {
        const startOnUserAction = () => {
          engine.play();
          document.removeEventListener('click', startOnUserAction, true);
          document.removeEventListener('touchstart', startOnUserAction, true);
        };
        document.addEventListener('click', startOnUserAction, { once: true, capture: true });
        document.addEventListener('touchstart', startOnUserAction, { once: true, capture: true });
      });
    }
  }

  // --- Splash Screen Logic ---
  const splashScreen = document.getElementById('splash-screen');
  const splashBtn = document.getElementById('btn-splash-hello');
  const fireworksContainer = document.querySelector('.fireworks-container');

  // Generate fireworks
  if (fireworksContainer) {
    for (let i = 0; i < 20; i++) {
      const fw = document.createElement('div');
      fw.className = 'firework';
      fw.style.left = Math.random() * 100 + '%';
      fw.style.top = Math.random() * 100 + '%';
      fw.style.animationDelay = (Math.random() * 2) + 's';
      fireworksContainer.appendChild(fw);
    }
  }

  if (splashScreen && splashBtn) {
    splashBtn.addEventListener('click', () => {
      splashScreen.classList.add('hidden');
      startApp();
      // Remove splash from DOM after transition
      setTimeout(() => splashScreen.remove(), 1000);
    });
  } else {
    startApp();
  }

  // === LIGHTNING ANIMATION ===
  function scheduleLightning() {
    const min = 2 * 60 * 1000;
    const max = 5 * 60 * 1000;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;

    setTimeout(() => {
      // Пропускаем цикл если молнии выключены
      if (!lightningEnabled) { scheduleLightning(); return; }

      const flash = document.createElement('div');
      flash.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: white; z-index: 99999; pointer-events: none; animation: lightning-flash 2s ease-out forwards;';
      document.body.appendChild(flash);
      setTimeout(() => {
        if(flash.parentNode) flash.remove();
        scheduleLightning();
      }, 2000);
    }, delay);
  }
  scheduleLightning();

  // === JS-ТУЛТИПЫ (нижний бар) ===
  // Показываются при hover и долгом нажатии, исчезают через 2с
  const BUTTON_TOOLTIPS = {
    'toggle-background':  'Смена фона',
    'toggle-triggers':    'Надписи / Всплывашки',
    'toggle-mediashow':   'Фото и видео',
    'toggle-speed':       'Скорость медиа',
  };


  let tooltipEl = null;
  let tooltipHideTimer = null;

  function showTooltip(btn, text) {
    // Убираем старый если есть
    if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
    if (tooltipHideTimer) { clearTimeout(tooltipHideTimer); tooltipHideTimer = null; }

    const tip = document.createElement('div');
    tip.className = 'btn-tooltip';
    tip.textContent = text;
    document.body.appendChild(tip);

    // Позиционирование НАД кнопкой
    const rect = btn.getBoundingClientRect();
    const tipW = tip.offsetWidth || 120;
    const tipH = tip.offsetHeight || 30;
    let left = rect.left + rect.width / 2 - tipW / 2;
    left = Math.max(8, Math.min(window.innerWidth - tipW - 8, left));
    tip.style.left = left + 'px';
    tip.style.top = (rect.top - tipH - 10) + 'px';

    // Появление
    requestAnimationFrame(() => tip.classList.add('visible'));
    tooltipEl = tip;

    // Авто-скрытие через 2с
    tooltipHideTimer = setTimeout(() => hideTooltip(), 2000);
  }

  function hideTooltip() {
    if (!tooltipEl) return;
    tooltipEl.classList.remove('visible');
    const el = tooltipEl;
    tooltipEl = null;
    setTimeout(() => { if (el.parentNode) el.remove(); }, 250);
    if (tooltipHideTimer) { clearTimeout(tooltipHideTimer); tooltipHideTimer = null; }
  }

  Object.entries(BUTTON_TOOLTIPS).forEach(([id, text]) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    let holdTimer = null;

    // Ховер (десктоп)
    btn.addEventListener('mouseenter', () => showTooltip(btn, text));
    btn.addEventListener('mouseleave', () => hideTooltip());

    // Долгое нажатие (touch: 500ms)
    btn.addEventListener('touchstart', () => {
      holdTimer = setTimeout(() => showTooltip(btn, text), 500);
    }, { passive: true });
    btn.addEventListener('touchend', () => {
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    });
    btn.addEventListener('touchcancel', () => {
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    });
  });

  // === Кнопка ИНФО — легенда ===
  (function() {
    const btn = document.getElementById('toggle-info');
    if (!btn) return;

    let legend = null;

    function createLegend() {
      const el = document.createElement('div');
      el.id = 'info-legend';
      el.innerHTML = `
        <div class="info-legend-row"><span>💬</span><span>Надписи / Всплывашки — вкл/выкл текстовые триггеры</span></div>
        <div class="info-legend-row"><span>🖼</span><span>Фото и видео — вкл/выкл медиашоу</span></div>
        <div class="info-legend-row"><span>⚡</span><span>Скорость медиа — меняет скорость появления (1–5)</span></div>
        <div class="info-legend-row"><span>🌄</span><span>Смена фона — переключает 4 разных фона</span></div>
      `;
      el.style.cssText = `
        position: fixed;
        z-index: 99999;
        background: rgba(10, 18, 28, 0.97);
        border: 1px solid rgba(0, 242, 254, 0.6);
        border-radius: 12px;
        padding: 14px 18px;
        font-family: 'Share Tech Mono', monospace;
        font-size: 12px;
        color: #E2ECF6;
        box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 16px rgba(0,242,254,0.2);
        pointer-events: auto;
        min-width: 220px;
        max-width: 90vw;
      `;
      return el;
    }

    function positionLegend(el) {
      const bar = document.getElementById('bottom-toggles-bar');
      const barRect = bar ? bar.getBoundingClientRect() : { top: window.innerHeight - 70, left: window.innerWidth / 2 };
      const elH = el.offsetHeight || 120;
      const elW = el.offsetWidth || 240;
      let top = barRect.top - elH - 14;
      let left = barRect.left + barRect.width / 2 - elW / 2;
      top = Math.max(8, top);
      left = Math.max(8, Math.min(window.innerWidth - elW - 8, left));
      el.style.top = top + 'px';
      el.style.left = left + 'px';
    }

    function showLegend() {
      if (legend) return;
      legend = createLegend();
      document.body.appendChild(legend);
      requestAnimationFrame(() => positionLegend(legend));
      btn.classList.add('active');

      // Закрытие по клику вне
      setTimeout(() => {
        document.addEventListener('click', outsideClose, { once: true, capture: true });
      }, 10);
    }

    function hideLegend() {
      if (!legend) return;
      legend.remove();
      legend = null;
      btn.classList.remove('active');
      document.removeEventListener('click', outsideClose, true);
    }

    function outsideClose(e) {
      if (legend && !legend.contains(e.target) && e.target !== btn) {
        hideLegend();
      } else if (legend) {
        // Оставляем слушатель если клик внутри
        setTimeout(() => {
          document.addEventListener('click', outsideClose, { once: true, capture: true });
        }, 10);
      }
    }

    btn.addEventListener('click', () => {
      if (legend) hideLegend();
      else showLegend();
    });
  })();

  // === ПАДАЮЩИЕ ЗВЁЗДЫ ===
  function startShootingStars() {
    function spawnStar() {
      // Пропускаем если звёзды выключены
      if (!shootingStarsEnabled) return;

      const star = document.createElement('div');
      const goRight = Math.random() > 0.5;
      const startX = Math.random() * window.innerWidth;
      const startY = Math.random() * window.innerHeight * 0.4; // верхняя 40%
      const angle = goRight ? (30 + Math.random() * 30) : (150 - Math.random() * 30); // 30-60° или 120-150°
      const length = 80 + Math.random() * 80;
      const duration = 900 + Math.random() * 600; // ms

      const rad = angle * Math.PI / 180;
      const dx = Math.cos(rad) * length * 3;
      const dy = Math.sin(rad) * length * 3;

      star.style.cssText = `
        position: fixed;
        top: ${startY}px;
        left: ${startX}px;
        width: ${length}px;
        height: 2px;
        background: linear-gradient(${goRight ? '90deg' : '270deg'}, rgba(255,255,255,0), rgba(255,255,255,0.9) 60%, #00F2FE);
        border-radius: 2px;
        box-shadow: 0 0 6px 1px rgba(0,242,254,0.6), 0 0 2px 0 #fff;
        z-index: 50;
        pointer-events: none;
        transform: rotate(${angle}deg) scaleX(0);
        transform-origin: right center;
        opacity: 0;
      `;
      document.body.appendChild(star);

      const keyframes = [
        { opacity: 0, transform: `rotate(${angle}deg) scaleX(0) translate(0,0)` },
        { opacity: 1, transform: `rotate(${angle}deg) scaleX(1) translate(0,0)`, offset: 0.2 },
        { opacity: 0, transform: `rotate(${angle}deg) scaleX(0.3) translate(${dx}px, ${dy}px)` }
      ];
      const anim = star.animate(keyframes, { duration, easing: 'ease-in', fill: 'forwards' });
      anim.onfinish = () => { if (star.parentNode) star.remove(); };
    }

    function scheduleWave() {
      const delay = 10000 + Math.random() * 5000; // 10-15 с
      setTimeout(() => {
        const count = 1 + Math.floor(Math.random() * 3); // 1-3 звезды
        for (let i = 0; i < count; i++) {
          setTimeout(spawnStar, i * (200 + Math.random() * 300));
        }
        scheduleWave();
      }, delay);
    }
    scheduleWave();
  }
  startShootingStars();

  // === ФОНОВЫЕ АНИМАЦИИ ===
  const bgAnimLayer = document.getElementById('bg-animation-layer');

  // Остановка всех фоновых анимаций
  function stopBgAnimation() {
    if (bgAnimLayer) bgAnimLayer.innerHTML = '';
    if (rainInterval) { clearInterval(rainInterval); rainInterval = null; }
  }

  // Дождь (фон 2 — центр Шри-Ланки)
  function startRain() {
    stopBgAnimation();
    rainInterval = setInterval(() => {
      if (!bgAnimLayer) return;
      const drop = document.createElement('div');
      const x = Math.random() * 100; // по всему экрану
      const duration = 0.6 + Math.random() * 0.6;
      const size = 1 + Math.random() * 1.5;
      drop.style.cssText = `
        position: absolute;
        left: ${x}%;
        top: 0;
        width: ${size}px;
        height: ${12 + Math.random() * 15}px;
        background: linear-gradient(180deg, transparent, rgba(200,220,255,0.6));
        border-radius: 50%;
        animation: rain-fall ${duration}s linear forwards;
      `;
      bgAnimLayer.appendChild(drop);
      setTimeout(() => { if (drop.parentNode) drop.remove(); }, duration * 1000 + 100);
    }, 15); // Чаще спавним для густого дождя
  }

  // Велигама (Океан и сёрфер)
  let surferInterval = null;
  function startWeligamaOcean() {
    stopBgAnimation();
    if (!bgAnimLayer) return;

    // Слой океана внизу
    const ocean = document.createElement('div');
    ocean.style.cssText = `
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 25vh;
      background: linear-gradient(180deg, transparent, rgba(0, 119, 190, 0.4) 40%, rgba(0, 80, 140, 0.7));
      animation: ocean-wave 6s ease-in-out infinite;
      pointer-events: none;
    `;
    bgAnimLayer.appendChild(ocean);

    // Периодический спавн сёрферов
    surferInterval = setInterval(() => {
      if (document.hidden) return;
      const count = Math.random() > 0.7 ? 2 : 1; // иногда 2 сёрфера
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          const surfer = document.createElement('div');
          // Реалистичный SVG сёрфера с анимированными руками и балансировкой
          surfer.innerHTML = `
            <svg viewBox="0 0 100 100" width="80" height="80">
              <path d="M 5 70 Q 50 85 95 70 Q 50 60 5 70" fill="#E2ECF6" opacity="0.9"/>
              <g class="surfer-body">
                <line x1="30" y1="70" x2="45" y2="45" stroke="#101820" stroke-width="5" stroke-linecap="round"/>
                <line x1="70" y1="70" x2="55" y2="45" stroke="#101820" stroke-width="5" stroke-linecap="round"/>
                <line x1="50" y1="45" x2="55" y2="25" stroke="#101820" stroke-width="7" stroke-linecap="round"/>
                <line x1="55" y1="30" x2="25" y2="35" stroke="#101820" stroke-width="4" stroke-linecap="round" class="surfer-arm-left"/>
                <line x1="55" y1="30" x2="85" y2="20" stroke="#101820" stroke-width="4" stroke-linecap="round" class="surfer-arm-right"/>
                <circle cx="58" cy="15" r="7" fill="#101820"/>
              </g>
            </svg>
          `;
          surfer.style.cssText = `
            position: absolute;
            bottom: 12vh;
            left: -100px;
            animation: surfer-ride ${7 + Math.random() * 2}s linear forwards;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
            z-index: 5;
          `;
          bgAnimLayer.appendChild(surfer);
          setTimeout(() => { if (surfer.parentNode) surfer.remove(); }, 9000);
        }, i * (1000 + Math.random() * 2000));
      }
    }, 10000 + Math.random() * 5000); // каждые 10-15 секунд
  }

  // Нови Сад (Деревья и птицы)
  let birdInterval = null;
  function startNoviSad() {
    stopBgAnimation();
    if (!bgAnimLayer) return;

    // Деревья по краям (реалистичные SVG силуэты крон)
    const treeSVG = `
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        <path d="M0,200 Q50,150 100,100 Q120,80 200,0 Q130,50 100,80 Q50,100 0,200" stroke="#050A10" stroke-width="8" fill="none"/>
        <circle cx="100" cy="100" r="45" fill="#0A121A" opacity="0.95"/>
        <circle cx="150" cy="50" r="35" fill="#050A10" opacity="0.9"/>
        <circle cx="120" cy="30" r="25" fill="#070D14" opacity="0.95"/>
        <circle cx="60" cy="130" r="40" fill="#050A10" opacity="0.9"/>
        <circle cx="80" cy="70" r="50" fill="#0A121A" opacity="0.85"/>
        <circle cx="170" cy="80" r="20" fill="#050A10" opacity="0.9"/>
      </svg>
    `;
    const positions = [
      { left: '-40px', top: '5%', delay: '0s', size: 250, flip: false },
      { left: '-20px', top: '40%', delay: '1s', size: 180, flip: false },
      { right: '-40px', top: '10%', delay: '0.5s', size: 300, flip: true },
      { right: '-20px', top: '50%', delay: '1.5s', size: 200, flip: true }
    ];
    positions.forEach(p => {
      const tree = document.createElement('div');
      tree.innerHTML = treeSVG;
      tree.style.cssText = `
        position: absolute;
        ${p.left ? `left: ${p.left};` : ''}
        ${p.right ? `right: ${p.right};` : ''}
        top: ${p.top};
        width: ${p.size}px;
        height: ${p.size}px;
        animation: leaf-sway ${4 + Math.random() * 3}s ease-in-out infinite;
        animation-delay: ${p.delay};
        filter: drop-shadow(0 5px 15px rgba(0,0,0,0.6));
        transform-origin: ${p.left ? '0% 100%' : '100% 100%'};
      `;
      if (p.flip) tree.querySelector('svg').style.transform = 'scaleX(-1)';
      bgAnimLayer.appendChild(tree);
    });

    // Периодический пролёт птиц
    birdInterval = setInterval(() => {
      if (document.hidden) return;
      const birdCount = 1 + Math.floor(Math.random() * 3); // стайка из 1-3 птиц
      for (let i = 0; i < birdCount; i++) {
        setTimeout(() => {
          const bird = document.createElement('div');
          bird.innerHTML = '🐦';
          const startY = 10 + Math.random() * 30; // верхняя часть неба
          bird.style.cssText = `
            position: absolute;
            top: ${startY}vh;
            left: -50px;
            font-size: 24px;
            animation: bird-fly ${6 + Math.random() * 3}s linear forwards;
            opacity: 0.6;
            filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));
            transform: scaleX(-1); /* птица смотрит вправо */
          `;
          bgAnimLayer.appendChild(bird);
          setTimeout(() => { if (bird.parentNode) bird.remove(); }, 9500);
        }, i * 400); // небольшая задержка между птицами в стайке
      }
    }, 15000 + Math.random() * 10000); // каждые 15-25 секунд
  }

  // Обновлённая очистка интервалов
  const originalStopBg = stopBgAnimation;
  stopBgAnimation = function() {
    originalStopBg();
    if (surferInterval) { clearInterval(surferInterval); surferInterval = null; }
    if (birdInterval) { clearInterval(birdInterval); birdInterval = null; }
  };

});
