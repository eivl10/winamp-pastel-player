const MEDIA_IMAGES = [
  'assets/images/photo_2026-08-13_19-51-07.webp',
  'assets/images/жаба.webp',
  'assets/images/ирка.webp',
  'assets/images/ключ.webp',
  'assets/images/мася хуля.webp',
  'assets/images/мася.webp',
  'assets/images/перцы.webp',
  'assets/images/плащ 2.webp',
  'assets/images/плащ.webp',
  'assets/images/фрукты.webp',
  'assets/images/хуля и мы.webp',
  'assets/images/хуля.webp',
  'assets/images/дома.webp',
  'assets/images/ланка.webp',
  'assets/images/храм.webp',
  'assets/images/ы.webp'
];

const MEDIA_VIDEOS = [
  'assets/videos/круг 3.mp4',
  'assets/videos/круг2.mp4',
  'assets/videos/кружок1.mp4',
  'assets/videos/обнимахи.mp4',
  'assets/videos/шаги.mp4',
  'assets/videos/поезд.mp4',
  'assets/videos/чотаэ.mp4'
];

const ALL_EMOJIS = ['🌹', '💃', '✨', '🔥', '🎺', '🐸', '👑', '🌟', '💫', '🌊', '🦀', '🍍', '🍰', '🌈'];

// Скорости появления медиа (1-5)
const SPEED_INTERVALS = {
  1: 14000, // Очень редко
  2: 9000,  // Редко (по умолчанию)
  3: 5500,  // Средне
  4: 3200,  // Быстро
  5: 1600   // Турбо
};

class MediaShow {
  constructor(containerEl) {
    this.container = containerEl; // #mediashow-layer
    this.running = false;
    this.interval = null;
    this.activeItems = 0;
    this.MAX_ITEMS = 3;
    this.speedLevel = 2; // По умолчанию уровень 2 (редко)
    this.enabled = true;
    this.totalShown = 0;
    this.specialVideoShown = false;
    this._preloadAssets();
  }

  _preloadAssets() {
    // Preload images
    MEDIA_IMAGES.forEach(src => {
      const img = new Image();
      img.src = src;
    });
    // Preload videos
    MEDIA_VIDEOS.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'video';
      link.href = src;
      document.head.appendChild(link);
    });
  }

  setSpeed(level) {
    this.speedLevel = Math.max(1, Math.min(5, level));
    if (this.running && this.enabled) {
      if (this.interval) clearInterval(this.interval);
      const intervalMs = SPEED_INTERVALS[this.speedLevel] || 9000;
      this.interval = setInterval(() => this._showNext(), intervalMs);
    }
    return this.speedLevel;
  }

  cycleSpeed() {
    let nextLevel = this.speedLevel + 1;
    if (nextLevel > 5) nextLevel = 1;
    return this.setSpeed(nextLevel);
  }

  toggle(enable) {
    this.enabled = typeof enable === 'boolean' ? enable : !this.enabled;
    if (!this.enabled) {
      this.stop();
    } else {
      this.start();
    }
    return this.enabled;
  }

  start() {
    if (!this.enabled) return;
    this.running = true;
    this._showNext();
    if (this.interval) clearInterval(this.interval);
    const intervalMs = SPEED_INTERVALS[this.speedLevel] || 9000;
    this.interval = setInterval(() => this._showNext(), intervalMs);
  }

  stop() {
    this.running = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.container.innerHTML = '';
    this.activeItems = 0;
  }

  _showNext() {
    if (!this.running || this.activeItems >= this.MAX_ITEMS) return;
    
    this.totalShown++;
    if (this.totalShown >= 10 && !this.specialVideoShown) {
      this.specialVideoShown = true;
      this._showVideo('assets/videos/bolshoe.mp4');
      return;
    }
    
    const roll = Math.random();
    if (roll < 0.65) {
      this._showImage();
    } else if (roll < 0.85) {
      this._showVideo();
    } else {
      this._showEmojiShower();
    }
  }

  _getSafeZone() {
    const zones = [
      { top: '16px', left: '14px' },
      { top: '16px', right: '14px' },
      { bottom: '80px', left: '14px' },
      { bottom: '80px', right: '14px' },
      { top: '38%', left: '10px' },
      { top: '38%', right: '10px' },
      { top: '56%', left: '14px' },
      { top: '56%', right: '14px' }
    ];
    return zones[Math.floor(Math.random() * zones.length)];
  }

  _attachDragAndScale(el, onFullscreenToggle) {
    let posX = 0, posY = 0, scale = 1.0;
    let startX = 0, startY = 0;
    let isDragging = false;
    let hasMoved = false;
    let initialDistance = 0;
    let initialScale = 1.0;

    // Остановка плавания при ручном взаимодействии
    const freezeFloating = () => {
      el.classList.remove('zero-gravity-1', 'zero-gravity-2', 'zero-gravity-3', 'zero-gravity-4');
      el.style.animation = 'none';
      el.style.zIndex = '300';
    };

    const applyTransform = () => {
      el.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    };

    // --- Touch события (Палец: перемещение и масштабирование Pinch) ---
    el.addEventListener('touchstart', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      e.stopPropagation(); // Предотвращаем клик сквозь медиа
      if (e.touches.length === 1) e.preventDefault();
      
      freezeFloating();

      if (e.touches.length === 1) {
        isDragging = true;
        hasMoved = false;
        startX = e.touches[0].clientX - posX;
        startY = e.touches[0].clientY - posY;
      } else if (e.touches.length === 2) {
        isDragging = false;
        initialDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialScale = scale;
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging && e.touches.length !== 2) return;
      if (!el.parentNode) return;

      if (isDragging && e.touches.length === 1) {
        const currentX = e.touches[0].clientX - startX;
        const currentY = e.touches[0].clientY - startY;
        if (Math.abs(currentX - posX) > 4 || Math.abs(currentY - posY) > 4) {
          hasMoved = true;
          e.preventDefault();
        }
        posX = currentX;
        posY = currentY;
        applyTransform();
      } else if (e.touches.length === 2 && initialDistance > 0) {
        e.preventDefault();
        hasMoved = true;
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = currentDist / initialDistance;
        scale = Math.max(0.4, Math.min(3.5, initialScale * factor));
        applyTransform();
      }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      if (isDragging && !hasMoved && e.touches.length === 0) {
        // Обычный тап без сдвига -> Fullscreen Toggle
        if (onFullscreenToggle) onFullscreenToggle();
      }
      isDragging = false;
    });

    // --- Mouse события (Мышь: Drag и Wheel Scale) ---
    el.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      e.preventDefault();
      e.stopPropagation(); // Предотвращаем клик сквозь медиа
      freezeFloating();
      isDragging = true;
      hasMoved = false;
      startX = e.clientX - posX;
      startY = e.clientY - posY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging || !el.parentNode) return;
      const currentX = e.clientX - startX;
      const currentY = e.clientY - startY;
      if (Math.abs(currentX - posX) > 3 || Math.abs(currentY - posY) > 3) {
        hasMoved = true;
      }
      posX = currentX;
      posY = currentY;
      applyTransform();
    });

    window.addEventListener('mouseup', () => {
      if (isDragging && !hasMoved) {
        if (onFullscreenToggle) onFullscreenToggle();
      }
      isDragging = false;
    });

    // Колесо мыши для масштабирования
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      freezeFloating();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      scale = Math.max(0.4, Math.min(3.5, scale + delta));
      applyTransform();
    }, { passive: false });
  }

  _showImage() {
    const src = MEDIA_IMAGES[Math.floor(Math.random() * MEDIA_IMAGES.length)];
    
    const el = document.createElement('img');
    el.src = src;
    
    // Случайный размер: от компактного до крупного
    const roll = Math.random();
    let size;
    const isMobile = window.innerWidth <= 480;
    
    if (roll < 0.25) {
      size = isMobile ? (60 + Math.floor(Math.random() * 20)) : (80 + Math.floor(Math.random() * 20)); // маленький
    } else if (roll < 0.65) {
      size = isMobile ? (100 + Math.floor(Math.random() * 30)) : (120 + Math.floor(Math.random() * 30)); // средний
    } else {
      // КРУПНЫЙ размер (впечатляющий вид)
      size = isMobile ? Math.min(160, Math.floor(window.innerWidth * 0.45)) : (180 + Math.floor(Math.random() * 40));
    }

    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.maxWidth = '72vw';
    el.style.maxHeight = '52vh';
    el.style.objectFit = 'cover';
    el.style.borderRadius = '14px';
    el.style.position = 'fixed';
    el.style.zIndex = '150';
    el.style.opacity = '0'; // Скрыто до загрузки
    el.style.transition = 'opacity 0.6s ease-out';
    if (el.complete) {
      el.style.opacity = '1';
    } else {
      el.onload = () => { el.style.opacity = '1'; };
    }
    el.style.background = '#000000';
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'grab';
    el.style.touchAction = 'none'; // для плавного touch drag
    el.style.boxShadow = '0 8px 28px rgba(0,0,0,0.65), 0 0 16px rgba(0, 242, 254, 0.4)';
    el.style.border = '2px solid rgba(255, 255, 255, 0.6)';
    
    const zone = this._getSafeZone();
    Object.assign(el.style, zone);
    
    const effects = ['trigger-bounce-in', 'trigger-zoom-burst', 'trigger-spin-in', 'trigger-float-up'];
    const effect = effects[Math.floor(Math.random() * effects.length)];
    const floatClass = 'zero-gravity-' + (Math.floor(Math.random() * 4) + 1);

    let isFullscreen = false;
    let removeTimeout = null;

    const scheduleRemoval = (delay) => {
      if (removeTimeout) clearTimeout(removeTimeout);
      removeTimeout = setTimeout(() => {
        if (isFullscreen) return;
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        el.style.opacity = '0';
        el.style.transform = 'scale(0.5)';
        setTimeout(() => { 
          if (el.parentNode) el.remove(); 
          this.activeItems = Math.max(0, this.activeItems - 1); 
        }, 650);
      }, delay);
    };

    const toggleFullscreen = () => {
      isFullscreen = !isFullscreen;
      if (isFullscreen) {
        if (removeTimeout) clearTimeout(removeTimeout);
        el.classList.remove(effect, floatClass);
        el.classList.add('media-fullscreen');
      } else {
        el.classList.remove('media-fullscreen');
        el.classList.add(floatClass);
        scheduleRemoval(8000);
      }
    };

    this._attachDragAndScale(el, toggleFullscreen);
    
    this.container.appendChild(el);
    this.activeItems++;
    
    const triggerEffect = () => {
      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.classList.add(effect);

        setTimeout(() => {
          if (!isFullscreen && el.parentNode) {
            el.classList.remove(effect);
            el.classList.add(floatClass);
          }
        }, 650);
      });
    };

    if (el.complete) {
      triggerEffect();
    } else {
      el.addEventListener('load', triggerEffect);
    }
    
    const duration = 12000 + Math.random() * 8000;
    scheduleRemoval(duration);
  }

  _showVideo(srcOverride) {
    const src = srcOverride || MEDIA_VIDEOS[Math.floor(Math.random() * MEDIA_VIDEOS.length)];
    
    const videoEl = document.createElement('video');
    videoEl.src = src;
    videoEl.autoplay = true;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.loop = true;
    
    const isMobile = window.innerWidth <= 480;
    const roll = Math.random();
    const size = isMobile 
      ? (roll < 0.5 ? 110 : Math.min(160, Math.floor(window.innerWidth * 0.40)))
      : (roll < 0.5 ? 130 : 190);

    videoEl.style.width = size + 'px';
    videoEl.style.height = size + 'px';
    videoEl.style.maxWidth = '70vw';
    videoEl.style.maxHeight = '52vh';
    videoEl.style.objectFit = 'cover';
    videoEl.style.borderRadius = '14px';
    videoEl.style.display = 'block';
    videoEl.style.background = '#000000';
    videoEl.style.opacity = '1'; // 100% сплошная непрозрачность
    videoEl.style.boxShadow = '0 8px 30px rgba(0,0,0,0.7)';
    videoEl.style.border = '2px solid rgba(0, 242, 254, 0.6)';

    // Кнопка звука
    const muteBtn = document.createElement('button');
    muteBtn.textContent = '🔇';
    muteBtn.style.cssText = `
      position: absolute;
      bottom: 8px; right: 8px;
      background: rgba(0,0,0,0.85);
      border: 1px solid rgba(255,255,255,0.6);
      border-radius: 50%;
      width: 36px; height: 36px;
      font-size: 16px;
      cursor: pointer;
      color: white;
      display: flex; align-items: center; justify-content: center;
      z-index: 20;
      pointer-events: auto;
      transition: transform 0.15s;
    `;
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      videoEl.muted = !videoEl.muted;
      muteBtn.textContent = videoEl.muted ? '🔇' : '🔊';
    });

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: fixed;
      z-index: 155;
      pointer-events: auto;
      display: inline-block;
      cursor: grab;
      touch-action: none;
      opacity: 0;
      transition: opacity 0.8s ease-out;
      background: #000000;
      border-radius: 14px;
    `;
    
    const zone = this._getSafeZone();
    Object.assign(wrapper.style, zone);
    
    const effects = ['trigger-bounce-in', 'trigger-zoom-burst', 'trigger-spin-in', 'trigger-float-up'];
    const effect = effects[Math.floor(Math.random() * effects.length)];
    const floatClass = 'zero-gravity-' + (Math.floor(Math.random() * 4) + 1);
    
    wrapper.appendChild(videoEl);
    wrapper.appendChild(muteBtn);

    let isFullscreen = false;
    let removeTimeout = null;

    const scheduleRemoval = (delay) => {
      if (removeTimeout) clearTimeout(removeTimeout);
      removeTimeout = setTimeout(() => {
        if (isFullscreen) return;
        wrapper.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        wrapper.style.opacity = '0';
        wrapper.style.transform = 'scale(0.5)';
        setTimeout(() => { 
          if (wrapper.parentNode) wrapper.remove(); 
          this.activeItems = Math.max(0, this.activeItems - 1); 
        }, 650);
      }, delay);
    };

    const toggleFullscreen = () => {
      isFullscreen = !isFullscreen;
      if (isFullscreen) {
        if (removeTimeout) clearTimeout(removeTimeout);
        wrapper.classList.remove(effect, floatClass);
        wrapper.classList.add('media-fullscreen');
      } else {
        wrapper.classList.remove('media-fullscreen');
        wrapper.classList.add(floatClass);
        scheduleRemoval(8000);
      }
    };

    this._attachDragAndScale(wrapper, toggleFullscreen);

    this.container.appendChild(wrapper);
    this.activeItems++;
    
    const triggerEffect = () => {
      requestAnimationFrame(() => {
        wrapper.style.opacity = '1';
        wrapper.classList.add(effect);

        setTimeout(() => {
          if (wrapper.parentNode) {
            wrapper.classList.remove(effect);
            wrapper.classList.add(floatClass);
          }
        }, 650);
      });
    };

    if (videoEl.readyState >= 3) {
      triggerEffect();
    } else {
      videoEl.addEventListener('loadeddata', triggerEffect);
    }
    
    const duration = 14000 + Math.random() * 8000;
    scheduleRemoval(duration);
  }

  _showEmojiShower() {
    const count = 12 + Math.floor(Math.random() * 8);
    const emojis = [
      ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)],
      ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)],
      ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)]
    ];
    
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const span = document.createElement('span');
        span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        span.style.position = 'fixed';
        span.style.left = (Math.random() * 86 + 6) + 'vw';
        span.style.top = '-40px';
        span.style.fontSize = (20 + Math.random() * 24) + 'px';
        span.style.zIndex = '500';
        span.style.pointerEvents = 'none';
        span.style.animation = `trigger-confetti-fall ${1.5 + Math.random() * 2.0}s ease-in forwards`;
        document.body.appendChild(span);
        setTimeout(() => span.remove(), 4500);
      }, i * 90);
    }
  }
}

window.MediaShow = MediaShow;
