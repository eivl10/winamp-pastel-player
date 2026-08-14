// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ DRAG-AND-DROP И ФОНОВЫХ АНИМАЦИЙ ===
let dragSrcIndex = null;          // индекс перетаскиваемого трека
let lightningEnabled = true;      // управляет молниями
let shootingStarsEnabled = true;  // управляет падающими звёздами
let rainInterval = null;          // интервал дождя
let mediaShowUserEnabled = true;

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
    
    // Пауза/возобновление mediashow (только если пользователь не выключил)
    if (mediaShow) {
      if (state === 'playing' && mediaShowUserEnabled) mediaShow.start();
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
        mediaShowUserEnabled = !mediaShowUserEnabled;
        const enabled = mediaShowUserEnabled;
        if (!enabled) {
          mediaShow.stop();
        } else if (engine.audio && !engine.audio.paused) {
          mediaShow.start();
        }
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
  toggleBackground.setAttribute('data-bg', '0');
  toggleBackground.textContent = '🌑';
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
      const BG_ICONS = ['🌑', '🌊', '🌿', '🏙'];
      // иконка обновится чуть позже, после загрузки фона
      const src = BACKGROUNDS[currentBgIndex];

      if (src) {
        const img = new Image();
        img.onload = () => {
          bgLayer.style.backgroundImage = `url("${src}")`;
          
          // Применяем фильтр живой воды для Велигамы (1) и Нови Сада (3)
          if (currentBgIndex === 1 || currentBgIndex === 3) {
            bgLayer.style.filter = 'url(#waterRipple) brightness(1.05)';
          } else {
            bgLayer.style.filter = 'none';
          }
          
          bgLayer.classList.add('visible');
          toggleBackground.textContent = BG_ICONS[currentBgIndex];
          if (blobBg) blobBg.style.opacity = '0';
          toggleBackground.setAttribute('data-bg', currentBgIndex);

          const so = document.getElementById('screensaver-overlay');
          if (so) so.style.display = 'none';
          if (typeof screensaver !== 'undefined') screensaver.stop();

          // Фон 1 — Велигама: сёрферы
          if (currentBgIndex === 1) {
            lightningEnabled = false;
            shootingStarsEnabled = false;
            startWeligamaSurfers();
          // Фон 2 — Шри-Ланка: дождь и облака
          } else if (currentBgIndex === 2) {
            lightningEnabled = false;
            shootingStarsEnabled = false;
            startSriLankaRain();
          // Фон 3 — Нови Сад: лодки
          } else {
            lightningEnabled = false;
            shootingStarsEnabled = false;
            startNoviSadBoats();
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
        toggleBackground.textContent = BG_ICONS[0];
        setTimeout(() => { bgLayer.style.backgroundImage = ''; }, 650);
        if (blobBg) blobBg.style.opacity = '';
        toggleBackground.setAttribute('data-bg', '0');
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
  let genElementIntervals = [];
  let bgAnimActive = false;
  function stopBgAnimation() {
    bgAnimActive = false;
    if (bgAnimLayer) bgAnimLayer.innerHTML = '';
    if (typeof rainInterval !== 'undefined' && rainInterval) { clearInterval(rainInterval); rainInterval = null; }
    genElementIntervals.forEach(i => clearInterval(i));
    genElementIntervals = [];
  }

  // Велигама (Сёрферы)
  function startWeligamaSurfers() {
    stopBgAnimation();
    bgAnimActive = true;
    if (!bgAnimLayer) return;

    // Живой эффект воды — бегущие пены/блики
    function spawnFoam() {
      if (!bgAnimActive || currentBgIndex !== 1) return;
      const foam = document.createElement('div');
      const foamY = 20 + Math.random() * 20; // vh - зона волн
      const foamW = 40 + Math.random() * 80; // px
      const dur = 3 + Math.random() * 3; // s
      foam.style.cssText = `
        position: absolute;
        left: ${Math.random() * 90}%;
        bottom: ${foamY}vh;
        width: ${foamW}px;
        height: 4px;
        background: rgba(255,255,255,0.6);
        border-radius: 50%;
        filter: blur(2px);
        animation: foam-drift ${dur}s ease-out forwards;
        pointer-events: none;
      `;
      bgAnimLayer.appendChild(foam);
      setTimeout(() => { if (foam.parentNode) foam.remove(); }, dur * 1000 + 200);
    }
    const foamInterval = setInterval(spawnFoam, 400);
    genElementIntervals.push(foamInterval);
    spawnFoam();

    // Анимируем SVG-фильтр живой воды
    let wavePhase = 0;
    const waterAnimInterval = setInterval(() => {
      if (!bgAnimActive || currentBgIndex !== 1) { clearInterval(waterAnimInterval); return; }
      wavePhase += 0.025;
      const bfX = 0.008 + Math.sin(wavePhase) * 0.004;
      const bfY = 0.005 + Math.cos(wavePhase * 0.7) * 0.002;
      const turbEl = document.querySelector('#waterRipple feTurbulence');
      if (turbEl) turbEl.setAttribute('baseFrequency', `${bfX.toFixed(4)} ${bfY.toFixed(4)}`);
    }, 80);
    genElementIntervals.push(waterAnimInterval);

    // Пульсирующий световой оверлей (имитация бликов на воде)
    const shineOverlay = document.createElement('div');
    shineOverlay.style.cssText = `
      position: absolute;
      bottom: 20%;
      left: 0;
      width: 100%;
      height: 40%;
      pointer-events: none;
      z-index: 2;
      background: radial-gradient(ellipse 80% 50% at 35% 60%,
        rgba(255,255,255,0.07) 0%,
        rgba(150,220,255,0.04) 50%,
        transparent 100%);
      animation: ocean-pulse 5s ease-in-out infinite;
    `;
    bgAnimLayer.appendChild(shineOverlay);

    function spawnSurfersWave() {
      if (currentBgIndex !== 1 || document.hidden) return;
      // Спавним от 1 до 3 сёрферов одновременно
      const count = 1; // один сёрфер за раз
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          if (!bgAnimActive || currentBgIndex !== 1) return;

          // 3 разных SVG-сёрфера (вместо PNG с белым фоном)
          const SURFER_SVGS = [
            // Сёрфер 1 — красная доска, синие шорты
            `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 90'><ellipse cx='50' cy='78' rx='42' ry='7' fill='%23FF6B6B'/><ellipse cx='15' cy='78' rx='10' ry='3' fill='rgba(255,255,255,0.7)'/><rect x='46' y='42' width='8' height='22' rx='4' fill='%23FFDAA0'/><circle cx='50' cy='33' r='9' fill='%23FFDAA0'/><line x1='46' y1='50' x2='28' y2='44' stroke='%23FFDAA0' stroke-width='5' stroke-linecap='round'/><line x1='54' y1='50' x2='72' y2='46' stroke='%23FFDAA0' stroke-width='5' stroke-linecap='round'/><rect x='44' y='62' width='6' height='14' rx='3' fill='%233B5BDB'/><rect x='50' y='62' width='6' height='14' rx='3' fill='%233B5BDB'/><circle cx='50' cy='26' r='4' fill='%23111' opacity='0.7'/></svg>`,
            // Сёрфер 2 — жёлтая доска, зелёные шорты, длинные волосы
            `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 90'><ellipse cx='50' cy='78' rx='42' ry='7' fill='%23FFD166'/><ellipse cx='15' cy='78' rx='10' ry='3' fill='rgba(255,255,255,0.7)'/><rect x='46' y='42' width='8' height='22' rx='4' fill='%23C68642'/><circle cx='50' cy='33' r='9' fill='%23C68642'/><path d='M43 28 Q50 18 57 28' fill='%23222'/><line x1='46' y1='48' x2='26' y2='42' stroke='%23C68642' stroke-width='5' stroke-linecap='round'/><line x1='54' y1='48' x2='74' y2='43' stroke='%23C68642' stroke-width='5' stroke-linecap='round'/><rect x='44' y='62' width='6' height='14' rx='3' fill='%232ECC40'/><rect x='50' y='62' width='6' height='14' rx='3' fill='%232ECC40'/></svg>`,
            // Сёрфер 3 — фиолетовая доска, белый топ
            `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 90'><ellipse cx='50' cy='78' rx='42' ry='7' fill='%23A855F7'/><ellipse cx='15' cy='78' rx='10' ry='3' fill='rgba(255,255,255,0.7)'/><rect x='45' y='41' width='10' height='24' rx='5' fill='white'/><circle cx='50' cy='32' r='9' fill='%23FFDAA0'/><line x1='45' y1='49' x2='25' y2='43' stroke='white' stroke-width='5' stroke-linecap='round'/><line x1='55' y1='49' x2='75' y2='44' stroke='white' stroke-width='5' stroke-linecap='round'/><rect x='44' y='63' width='6' height='14' rx='3' fill='%23FF6B6B'/><rect x='50' y='63' width='6' height='14' rx='3' fill='%23FF6B6B'/></svg>`
          ];

          const scale = 0.35 + Math.random() * 0.3; // мельче — они на фоне волн
          const depthOpacity = 0.6 + scale * 0.3;
          const bottomPos = 32 + Math.random() * 14; // зона волн Велигамы
          const animDuration = 14 + Math.floor(Math.random() * 5); // 14-19s — короче, wipeout раньше
          const svgIdx = Math.floor(Math.random() * SURFER_SVGS.length);

          const surfer = document.createElement('div');
          surfer.className = 'gen-element gen-surfer';
          surfer.style.bottom = bottomPos + 'vh';
          surfer.style.opacity = depthOpacity;
          surfer.style.animationDuration = animDuration + 's';
          surfer.style.width = Math.round(120 * scale) + 'px';
          surfer.style.height = Math.round(120 * scale) + 'px';

          const inner = document.createElement('div');
          inner.className = 'surfer-inner';
          inner.style.backgroundImage = `url("${SURFER_SVGS[svgIdx]}")`;

          surfer.appendChild(inner);

          // Интерактив: клик/тап — выбиваем сёрфера с доски
          let surferHit = false;
          function wipeoutSurfer(e) {
            if (surferHit) return;
            surferHit = true;
            e.stopPropagation();
            // Захватываем текущую позицию
            const currentTransform = window.getComputedStyle(surfer).transform;
            surfer.style.animation = 'none';
            surfer.style.transform = currentTransform;
            // Разворачиваем inner обратно для показа фигуры прямо
            // Wipeout: фигура улетает вверх-вбок, доска отдельно уходит вниз
            surfer.style.transition = 'transform 1.2s cubic-bezier(0.2,0,0.8,1), opacity 1s ease-in';
            surfer.style.transform = currentTransform + ' translateY(-60px) rotate(-40deg) scale(0.5)';
            surfer.style.opacity = '0';
            // Брызги воды
            const rect = surfer.getBoundingClientRect();
            for (let s = 0; s < 12; s++) {
              const splash = document.createElement('div');
              const angle = (s / 12) * Math.PI * 2;
              const dist = 20 + Math.random() * 50;
              const tx = Math.cos(angle) * dist;
              const ty = Math.sin(angle) * dist - 35;
              splash.style.cssText = `
                position: fixed;
                left: ${rect.left + rect.width/2}px;
                top: ${rect.top + rect.height*0.8}px;
                width: ${3+Math.random()*7}px;
                height: ${3+Math.random()*7}px;
                background: rgba(150,220,255,0.9);
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
              `;
              document.body.appendChild(splash);
              const dur = 500 + Math.random() * 700;
              splash.animate([
                { transform: 'translate(0,0) scale(1)', opacity: 1 },
                { transform: `translate(${tx}px,${ty}px) scale(0.2)`, opacity: 0 }
              ], { duration: dur, easing: 'ease-out', fill: 'forwards' });
              setTimeout(() => { if (splash.parentNode) splash.remove(); }, dur + 100);
            }
            setTimeout(() => { if (surfer.parentNode) surfer.remove(); }, 1500);
          }
          surfer.style.pointerEvents = 'auto';
          surfer.style.cursor = 'crosshair';
          surfer.addEventListener('click', wipeoutSurfer);
          surfer.addEventListener('touchstart', wipeoutSurfer, { passive: false });

          bgAnimLayer.appendChild(surfer);
          setTimeout(() => { if (surfer.parentNode) surfer.remove(); }, (animDuration + 4) * 1000);
        }, i * (800 + Math.random() * 1500));
      }
    }

    spawnSurfersWave();
    const interval = setInterval(spawnSurfersWave, 10000 + Math.random() * 6000); // Спавн гораздо чаще!
    genElementIntervals.push(interval);
  }

  // Нови Сад (Лодки)
  function startNoviSadBoats() {
    stopBgAnimation();
    bgAnimActive = true;
    if (!bgAnimLayer) return;

    function spawnBoat() {
      if (!bgAnimActive || currentBgIndex !== 3 || document.hidden) return;
      // 3 разных SVG-лодки
      const BOAT_SVGS = [
        // Лодка 1 — деревянная весельная лодка
        `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 80'><path d='M10 45 Q100 35 190 45 L175 65 Q100 70 25 65 Z' fill='%23C8A96E'/><path d='M10 45 Q100 35 190 45' fill='none' stroke='%23A0784A' stroke-width='3'/><rect x='85' y='20' width='30' height='25' rx='3' fill='%23E8D5B0' stroke='%23A0784A' stroke-width='2'/><rect x='88' y='23' width='10' height='8' rx='1' fill='%2387CEEB' opacity='0.8'/><rect x='102' y='23' width='10' height='8' rx='1' fill='%2387CEEB' opacity='0.8'/><line x1='30' y1='50' x2='10' y2='40' stroke='%23A0784A' stroke-width='3' stroke-linecap='round'/><line x1='165' y1='50' x2='185' y2='40' stroke='%23A0784A' stroke-width='3' stroke-linecap='round'/></svg>`,
        // Лодка 2 — синяя моторная лодка
        `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 70'><path d='M5 42 Q100 30 195 42 L185 60 Q100 68 15 60 Z' fill='%231E90FF'/><path d='M5 42 Q100 30 195 42' fill='none' stroke='%230066CC' stroke-width='2'/><path d='M50 42 Q100 28 150 42 L140 30 Q100 20 60 30 Z' fill='white' opacity='0.9'/><rect x='130' y='25' width='35' height='20' rx='4' fill='%23555'/><circle cx='175' cy='50' r='6' fill='%23333'/><ellipse cx='185' cy='55' rx='8' ry='3' fill='rgba(255,255,255,0.5)'/></svg>`,
        // Лодка 3 — красно-белый катер с флагом
        `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 80'><path d='M15 48 Q100 36 185 48 L170 68 Q100 75 30 68 Z' fill='%23CC2200'/><path d='M15 48 Q100 36 185 48' fill='none' stroke='%23990000' stroke-width='3'/><path d='M30 48 L30 30' stroke='%23666' stroke-width='2'/><rect x='30' y='20' width='18' height='10' fill='%2300CC44'/><rect x='70' y='32' width='70' height='18' rx='3' fill='white' stroke='%23CC2200' stroke-width='2'/><rect x='73' y='35' width='20' height='6' rx='1' fill='%2387CEEB' opacity='0.8'/><rect x='97' y='35' width='20' height='6' rx='1' fill='%2387CEEB' opacity='0.8'/><ellipse cx='190' cy='58' rx='6' ry='2' fill='rgba(255,255,255,0.6)'/></svg>`
      ];

      const boatScale = 0.35 + Math.random() * 0.3; // меньше — река далеко, вид сверху
      // Правая часть реки (начало маршрута лодки)
      // Река: bottom 9-41vh (из скриншота). Лодки — строго в воде.
      const boatBottom = 8 + Math.random() * 20; // 8-28vh — центр реки
      const animDuration = 44 + Math.floor(Math.random() * 14);
      const svgIdx = Math.floor(Math.random() * BOAT_SVGS.length);

      const boat = document.createElement('div');
      boat.className = 'gen-element gen-boat';
      boat.style.bottom = boatBottom + 'vh';
      boat.style.width = Math.round(200 * boatScale) + 'px';
      boat.style.height = Math.round(70 * boatScale) + 'px';
      boat.style.opacity = 0.75 + boatScale * 0.2;
      boat.style.zIndex = '10';
      boat.style.animationDuration = animDuration + 's';

      const boatInner = document.createElement('div');
      boatInner.style.cssText = 'width:100%;height:100%;background-size:contain;background-repeat:no-repeat;background-position:center bottom;';
      boatInner.style.backgroundImage = `url("${BOAT_SVGS[svgIdx]}")`;

      boat.appendChild(boatInner);

      // Интерактив: клик/тап — топим лодку
      boat.style.pointerEvents = 'auto';
      boat.style.cursor = 'pointer';
      let boatSunk = false;
      function sinkBoat(e) {
        if (boatSunk) return;
        boatSunk = true;
        e.stopPropagation();
        // Останавливаем анимацию движения
        const currentTransform = window.getComputedStyle(boat).transform;
        boat.style.animation = 'none';
        boat.style.transform = currentTransform;
        // Анимация потопления: лодка уходит вниз + вращается + пузыри
        boat.style.transition = 'transform 1.8s cubic-bezier(0.4,0,1,1), opacity 1.5s ease-in';
        boat.style.transform = currentTransform + ' translateY(80px) rotate(25deg) scaleY(0.3)';
        boat.style.opacity = '0';
        // Брызги
        for (let b = 0; b < 8; b++) {
          const splash = document.createElement('div');
          const rect = boat.getBoundingClientRect();
          const bx = rect.left + rect.width/2 + (Math.random()-0.5)*rect.width;
          const by = rect.top + rect.height*0.7;
          splash.style.cssText = `
            position: fixed;
            left: ${bx}px;
            top: ${by}px;
            width: ${4+Math.random()*8}px;
            height: ${4+Math.random()*8}px;
            background: rgba(100,180,255,0.8);
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            animation: boat-splash-drop ${0.6+Math.random()*0.8}s ease-out forwards;
            transform: translate(${(Math.random()-0.5)*60}px, 0);
          `;
          document.body.appendChild(splash);
          setTimeout(() => { if (splash.parentNode) splash.remove(); }, 1500);
        }
        setTimeout(() => { if (boat.parentNode) boat.remove(); }, 2000);
      }
      boat.addEventListener('click', sinkBoat);
      boat.addEventListener('touchstart', sinkBoat, { passive: false });

      bgAnimLayer.appendChild(boat);
      setTimeout(() => { if (boat.parentNode) boat.remove(); }, (animDuration + 4) * 1000);
    }

    spawnBoat();
    const interval = setInterval(spawnBoat, 18000 + Math.random() * 12000); // Спавн очень частый
    genElementIntervals.push(interval);
  }

  // Дождь и облака (фон 2 — центр Шри-Ланки)
  function startSriLankaRain() {
    stopBgAnimation();
    bgAnimActive = true;
    if (!bgAnimLayer) return;
    // Дождь
    rainInterval = setInterval(() => {
      if (!bgAnimActive) return;
      const drop = document.createElement('div');
      const x = Math.random() * 100;
      const duration = 0.5 + Math.random() * 0.4;
      const size = 2 + Math.random() * 2;
      const windOffset = 8 + Math.random() * 10; // px horizontal drift
      const opacity = 0.4 + Math.random() * 0.4;
      drop.style.cssText = `
        position: absolute;
        left: ${x}%;
        top: -5px;
        width: ${size}px;
        height: ${22 + Math.random() * 18}px;
        background: linear-gradient(170deg, transparent 0%, rgba(200,230,255,${opacity}) 100%);
        border-radius: 2px;
        transform: rotate(10deg);
        animation: rain-fall ${duration}s linear forwards;
      `;
      bgAnimLayer.appendChild(drop);
      setTimeout(() => { if (drop.parentNode) drop.remove(); }, duration * 1000 + 100);
    }, 15);

    // SVG облака — 3 варианта
    const CLOUD_SVGS = [
      `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 280 120'><ellipse cx='100' cy='75' rx='95' ry='45' fill='white' opacity='0.85'/><ellipse cx='180' cy='80' rx='80' ry='38' fill='white' opacity='0.8'/><ellipse cx='90' cy='60' rx='55' ry='40' fill='white' opacity='0.9'/><ellipse cx='160' cy='55' rx='65' ry='45' fill='white' opacity='0.9'/><ellipse cx='220' cy='65' rx='50' ry='35' fill='white' opacity='0.85'/></svg>`,
      `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 280 100'><ellipse cx='140' cy='65' rx='120' ry='35' fill='white' opacity='0.8'/><ellipse cx='80' cy='55' rx='60' ry='38' fill='white' opacity='0.85'/><ellipse cx='190' cy='52' rx='70' ry='42' fill='white' opacity='0.85'/><ellipse cx='130' cy='45' rx='55' ry='35' fill='white' opacity='0.9'/></svg>`,
      `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 90'><ellipse cx='120' cy='60' rx='105' ry='30' fill='rgba(220,230,255,0.9)'/><ellipse cx='70' cy='50' rx='55' ry='35' fill='rgba(220,230,255,0.85)'/><ellipse cx='165' cy='48' rx='60' ry='38' fill='white' opacity='0.9'/><ellipse cx='120' cy='40' rx='50' ry='30' fill='white' opacity='0.95'/></svg>`
    ];

    // Спавним первые 3 облака сразу
    for (let ci = 0; ci < 3; ci++) {
      setTimeout(() => {
        if (!bgAnimActive) return;
        const cloud = document.createElement('div');
        cloud.className = 'gen-element gen-cloud';
        const svgIdx = Math.floor(Math.random() * CLOUD_SVGS.length);
        cloud.style.backgroundImage = `url("${CLOUD_SVGS[svgIdx]}")`;
        cloud.style.top = (5 + Math.random() * 35) + 'vh';
        cloud.style.left = (ci * 30 + Math.random() * 20) + 'vw'; // распределяем по экрану
        const cScale = 0.6 + Math.random() * 0.9;
        cloud.style.width = Math.round(280 * cScale) + 'px';
        cloud.style.height = Math.round(120 * cScale) + 'px';
        cloud.style.opacity = 0.7 + Math.random() * 0.25;
        const dur = 50 + Math.random() * 20;
        cloud.style.animationDuration = dur + 's';

        // Интерактив: перетаскивание облака
        cloud.style.pointerEvents = 'auto';
        cloud.style.cursor = 'grab';
        let isDraggingCloud = false;
        let cloudDragStartX = 0, cloudDragStartY = 0;
        let cloudOrigLeft = 0, cloudOrigTop = 0;

        function startDragCloud(e) {
          isDraggingCloud = true;
          const cs = window.getComputedStyle(cloud);
          const rect = cloud.getBoundingClientRect();
          cloudOrigLeft = rect.left;
          cloudOrigTop = rect.top;
          cloud.style.animation = 'none';
          cloud.style.position = 'fixed';
          cloud.style.left = cloudOrigLeft + 'px';
          cloud.style.top = cloudOrigTop + 'px';
          cloud.style.bottom = 'auto';
          cloud.style.transform = 'none';
          cloud.style.cursor = 'grabbing';
          cloud.style.zIndex = '999';
          const point = e.touches ? e.touches[0] : e;
          cloudDragStartX = point.clientX - cloudOrigLeft;
          cloudDragStartY = point.clientY - cloudOrigTop;
          e.preventDefault();
        }

        function moveDragCloud(e) {
          if (!isDraggingCloud) return;
          const point = e.touches ? e.touches[0] : e;
          cloud.style.left = (point.clientX - cloudDragStartX) + 'px';
          cloud.style.top  = (point.clientY - cloudDragStartY) + 'px';
          e.preventDefault();
        }

        function cleanupCloudDrag() {
          document.removeEventListener('mousemove', moveDragCloud);
          document.removeEventListener('touchmove', moveDragCloud);
          document.removeEventListener('mouseup', endDragCloud);
          document.removeEventListener('touchend', endDragCloud);
        }

        function endDragCloud(e) {
          if (!isDraggingCloud) return;
          isDraggingCloud = false;
          cloud.style.cursor = 'grab';
          const curLeft = parseFloat(cloud.style.left) || 0;
          const targetLeft = window.innerWidth + 200;
          const remainDist = Math.max(targetLeft - curLeft, 100);
          const remainTime = Math.max((remainDist / window.innerWidth) * 55000, 2000);
          cloud.style.transition = `left ${remainTime}ms linear`;
          cloud.style.left = targetLeft + 'px';
          setTimeout(() => {
            if (cloud.parentNode) cloud.remove();
            cleanupCloudDrag();
          }, remainTime + 200);
        }

        cloud.addEventListener('mousedown', startDragCloud);
        cloud.addEventListener('touchstart', startDragCloud, { passive: false });
        document.addEventListener('mousemove', moveDragCloud);
        document.addEventListener('touchmove', moveDragCloud, { passive: false });
        document.addEventListener('mouseup', endDragCloud);
        document.addEventListener('touchend', endDragCloud);

        bgAnimLayer.appendChild(cloud);
        setTimeout(() => {
          if (cloud.parentNode) cloud.remove();
          cleanupCloudDrag();
        }, (dur + 3) * 1000);
      }, ci * 3000);
    }

    const cloudInterval = setInterval(() => {
      if (!bgAnimActive || document.hidden) return; // ВАЖНО: bgAnimActive guard
      const cloud = document.createElement('div');
      cloud.className = 'gen-element gen-cloud';
      const svgIdx = Math.floor(Math.random() * CLOUD_SVGS.length);
      cloud.style.backgroundImage = `url("${CLOUD_SVGS[svgIdx]}")`;
      cloud.style.top = (5 + Math.random() * 35) + 'vh';
      const cScale = 0.6 + Math.random() * 0.9;
      cloud.style.width = Math.round(280 * cScale) + 'px';
      cloud.style.height = Math.round(120 * cScale) + 'px';
      cloud.style.opacity = 0.7 + Math.random() * 0.25;
      const dur = 50 + Math.random() * 20;
      cloud.style.animationDuration = dur + 's';

      // Интерактив: перетаскивание облака
      cloud.style.pointerEvents = 'auto';
      cloud.style.cursor = 'grab';
      let isDraggingCloud = false;
      let cloudDragStartX = 0, cloudDragStartY = 0;
      let cloudOrigLeft = 0, cloudOrigTop = 0;

      function startDragCloud(e) {
        isDraggingCloud = true;
        const cs = window.getComputedStyle(cloud);
        const rect = cloud.getBoundingClientRect();
        cloudOrigLeft = rect.left;
        cloudOrigTop = rect.top;
        cloud.style.animation = 'none';
        cloud.style.position = 'fixed';
        cloud.style.left = cloudOrigLeft + 'px';
        cloud.style.top = cloudOrigTop + 'px';
        cloud.style.bottom = 'auto';
        cloud.style.transform = 'none';
        cloud.style.cursor = 'grabbing';
        cloud.style.zIndex = '999';
        const point = e.touches ? e.touches[0] : e;
        cloudDragStartX = point.clientX - cloudOrigLeft;
        cloudDragStartY = point.clientY - cloudOrigTop;
        e.preventDefault();
      }

      function moveDragCloud(e) {
        if (!isDraggingCloud) return;
        const point = e.touches ? e.touches[0] : e;
        cloud.style.left = (point.clientX - cloudDragStartX) + 'px';
        cloud.style.top  = (point.clientY - cloudDragStartY) + 'px';
        e.preventDefault();
      }

      function cleanupCloudDrag() {
        document.removeEventListener('mousemove', moveDragCloud);
        document.removeEventListener('touchmove', moveDragCloud);
        document.removeEventListener('mouseup', endDragCloud);
        document.removeEventListener('touchend', endDragCloud);
      }

      function endDragCloud(e) {
        if (!isDraggingCloud) return;
        isDraggingCloud = false;
        cloud.style.cursor = 'grab';
        const curLeft = parseFloat(cloud.style.left) || 0;
        const targetLeft = window.innerWidth + 200;
        const remainDist = Math.max(targetLeft - curLeft, 100);
        const remainTime = Math.max((remainDist / window.innerWidth) * 55000, 2000);
        cloud.style.transition = `left ${remainTime}ms linear`;
        cloud.style.left = targetLeft + 'px';
        setTimeout(() => {
          if (cloud.parentNode) cloud.remove();
          cleanupCloudDrag();
        }, remainTime + 200);
      }

      cloud.addEventListener('mousedown', startDragCloud);
      cloud.addEventListener('touchstart', startDragCloud, { passive: false });
      document.addEventListener('mousemove', moveDragCloud);
      document.addEventListener('touchmove', moveDragCloud, { passive: false });
      document.addEventListener('mouseup', endDragCloud);
      document.addEventListener('touchend', endDragCloud);

      bgAnimLayer.appendChild(cloud);
      setTimeout(() => {
        if (cloud.parentNode) cloud.remove();
        cleanupCloudDrag();
      }, (dur + 3) * 1000);
    }, 10000 + Math.random() * 8000);
    genElementIntervals.push(cloudInterval);
  }

});
