document.addEventListener('DOMContentLoaded', async () => {
// === TRACK CHANGE BURST ANIMATION ===
function showTrackChangeBurst(track) {
  // 1. Большое центральное попап с названием трека
  const burst = document.createElement('div');
  burst.className = 'track-burst';
  burst.innerHTML = `
    <div class="track-burst-inner">
      <div class="track-burst-emoji">🎵</div>
      <div class="track-burst-title">${track ? track.title : ''}</div>
      <div class="track-burst-artist">${track ? track.artist : ''}</div>
    </div>
  `;
  document.body.appendChild(burst);
  
  // 2. Удар света (вспышка)
  const flash = document.createElement('div');
  flash.className = 'track-burst-flash';
  document.body.appendChild(flash);
  
  // 3. Дождь эмоджи вокруг названия
  const emojiSet = ['🌹', '✨', '💃', '🎺', '🔥', '🌟', '💫', '⭐', '🦀', '🌈'];
  for (let i = 0; i < 18; i++) {
    setTimeout(() => {
      const em = document.createElement('span');
      em.textContent = emojiSet[Math.floor(Math.random() * emojiSet.length)];
      em.style.cssText = `
        position: fixed;
        font-size: ${20 + Math.random() * 30}px;
        left: ${Math.random() * 90 + 5}vw;
        top: -40px;
        z-index: 9000;
        pointer-events: none;
        animation: trigger-confetti-fall ${1.2 + Math.random() * 1.8}s ease-in forwards;
      `;
      document.body.appendChild(em);
      setTimeout(() => em.remove(), 4000);
    }, i * 60);
  }
  
  // 4. Автоудаление
  setTimeout(() => {
    burst.classList.add('hiding');
    flash.remove();
    setTimeout(() => burst.remove(), 600);
  }, 2200);
}

  // 1. Load tracks.json
  let tracks = [];
  try {
    const res = await fetch('data/tracks.json');
    const data = await res.json();
    tracks = Array.isArray(data) ? data : (data.tracks || []);
  } catch (err) {
    console.error('Failed to load tracks.json:', err);
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
    loadAndUpdateUI(engine.currentIndex);
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

  const btnScreensaver = document.getElementById('btn-screensaver');
  if (btnScreensaver) {
    btnScreensaver.addEventListener('click', () => {
      const mode = screensaver.toggleMode();
      btnScreensaver.title = mode === 'fast' ? '📺 Быстро' : mode === 'paused' ? '📺 Пауза' : '📺 Норма';
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

  // Bottom Toggles Bar
  const toggleScreensaver = document.getElementById('toggle-screensaver');
  if (toggleScreensaver) {
    toggleScreensaver.addEventListener('click', () => {
      const enabled = screensaver.toggleEnabled();
      toggleScreensaver.classList.toggle('active', enabled);
      toggleScreensaver.classList.toggle('off', !enabled);
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
        toggleSpeed.title = `Скорость появления медиа: ${newLevel}/5`;
      }
    });
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
          window.removeEventListener('click', startOnUserAction);
          window.removeEventListener('touchstart', startOnUserAction);
        };
        window.addEventListener('click', startOnUserAction, { once: true });
        window.addEventListener('touchstart', startOnUserAction, { once: true });
      });
    }
  }

  startApp();
});
