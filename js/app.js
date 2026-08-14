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

      item.addEventListener('click', () => {
        engine.loadTrack(i);
        engine.play();
        updateActiveTrack(i);
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
  const BACKGROUNDS = [
    null,
    '/assets/images/weligama_bg.jpg',
    '/assets/images/srilanka_bg.jpg',
    '/assets/images/novisad_bg.jpg',
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
        };
        img.onerror = () => {
          console.error('BG image failed to load:', src);
          // Пропускаем к следующему
          currentBgIndex = (currentBgIndex + 1) % BACKGROUNDS.length;
        };
        img.src = src;
      } else {
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

});
