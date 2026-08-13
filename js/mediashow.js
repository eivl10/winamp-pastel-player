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
  'assets/images/хуля.webp'
];

const MEDIA_VIDEOS = [
  'assets/videos/круг 3.mp4',
  'assets/videos/круг2.mp4',
  'assets/videos/кружок1.mp4',
  'assets/videos/обнимахи.mp4',
  'assets/videos/шаги.mp4'
];

const ALL_EMOJIS = ['🌹', '💃', '✨', '🔥', '🎺', '🐸', '👑', '🌟', '💫', '🌊', '🦀', '🍍', '🍰', '🌈'];

class MediaShow {
  constructor(containerEl) {
    this.container = containerEl; // #mediashow-layer
    this.running = false;
    this.interval = null;
    this.activeItems = 0;
    this.MAX_ITEMS = 4;
    this.MIN_INTERVAL = 3000; // каждые 3 сек
    this.enabled = true;
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
    this.interval = setInterval(() => this._showNext(), this.MIN_INTERVAL);
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
      { top: '10px', left: '10px' },
      { top: '10px', right: '10px' },
      { bottom: '70px', left: '10px' },
      { bottom: '70px', right: '10px' },
      { top: '35%', left: '8px' },
      { top: '35%', right: '8px' },
      { top: '55%', left: '12px' },
      { top: '55%', right: '12px' }
    ];
    return zones[Math.floor(Math.random() * zones.length)];
  }

  _showImage() {
    const src = MEDIA_IMAGES[Math.floor(Math.random() * MEDIA_IMAGES.length)];
    
    const el = document.createElement('img');
    el.src = src;
    
    // Случайный размер: от компактного до крупного (в невесомости)
    const roll = Math.random();
    let size;
    const isMobile = window.innerWidth <= 480;
    
    if (roll < 0.25) {
      size = isMobile ? (75 + Math.floor(Math.random() * 30)) : (100 + Math.floor(Math.random() * 40)); // маленький
    } else if (roll < 0.65) {
      size = isMobile ? (130 + Math.floor(Math.random() * 45)) : (170 + Math.floor(Math.random() * 60)); // средний
    } else {
      // КРУПНЫЙ размер (впечатляющий вид)
      size = isMobile ? Math.min(260, Math.floor(window.innerWidth * 0.65)) : (270 + Math.floor(Math.random() * 90));
    }

    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.maxWidth = '68vw';
    el.style.maxHeight = '48vh';
    el.style.objectFit = 'cover';
    el.style.borderRadius = '14px';
    el.style.position = 'fixed';
    el.style.zIndex = '150';
    el.style.opacity = '0';
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'zoom-in';
    el.style.boxShadow = '0 8px 26px rgba(0,0,0,0.55), 0 0 16px rgba(0, 242, 254, 0.35)';
    el.style.border = '1px solid rgba(255, 255, 255, 0.45)';
    
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
        el.style.transform = 'scale(0.6)';
        setTimeout(() => { 
          if (el.parentNode) el.remove(); 
          this.activeItems = Math.max(0, this.activeItems - 1); 
        }, 650);
      }, delay);
    };

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      isFullscreen = !isFullscreen;
      if (isFullscreen) {
        if (removeTimeout) clearTimeout(removeTimeout);
        el.classList.remove(effect, floatClass);
        el.classList.add('media-fullscreen');
      } else {
        el.classList.remove('media-fullscreen');
        el.classList.add(floatClass);
        scheduleRemoval(5000);
      }
    });
    
    this.container.appendChild(el);
    this.activeItems++;
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.5s ease';
        el.style.opacity = '0.94';
        el.classList.add(effect);

        // Переход в плавную невесомость после эффекта появления
        setTimeout(() => {
          if (!isFullscreen && el.parentNode) {
            el.classList.remove(effect);
            el.classList.add(floatClass);
          }
        }, 650);
      });
    });
    
    const duration = 6500 + Math.random() * 4500;
    scheduleRemoval(duration);
  }

  _showVideo() {
    const src = MEDIA_VIDEOS[Math.floor(Math.random() * MEDIA_VIDEOS.length)];
    
    const videoEl = document.createElement('video');
    videoEl.src = src;
    videoEl.autoplay = true;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.loop = true;
    
    const isMobile = window.innerWidth <= 480;
    const roll = Math.random();
    const size = isMobile 
      ? (roll < 0.5 ? 140 : Math.min(240, Math.floor(window.innerWidth * 0.60)))
      : (roll < 0.5 ? 180 : 260);

    videoEl.style.width = size + 'px';
    videoEl.style.height = size + 'px';
    videoEl.style.maxWidth = '65vw';
    videoEl.style.maxHeight = '48vh';
    videoEl.style.objectFit = 'cover';
    videoEl.style.borderRadius = '12px';
    videoEl.style.display = 'block';
    videoEl.style.boxShadow = '0 8px 28px rgba(0,0,0,0.65)';
    videoEl.style.border = '1px solid rgba(0, 242, 254, 0.45)';

    // Кнопка звука
    const muteBtn = document.createElement('button');
    muteBtn.textContent = '🔇';
    muteBtn.style.cssText = `
      position: absolute;
      bottom: 8px; right: 8px;
      background: rgba(0,0,0,0.75);
      border: 1px solid rgba(255,255,255,0.5);
      border-radius: 50%;
      width: 34px; height: 34px;
      font-size: 15px;
      cursor: pointer;
      color: white;
      display: flex; align-items: center; justify-content: center;
      z-index: 2;
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
    `;
    
    const zone = this._getSafeZone();
    Object.assign(wrapper.style, zone);
    wrapper.style.opacity = '0';
    
    const effects = ['trigger-bounce-in', 'trigger-zoom-burst', 'trigger-spin-in', 'trigger-float-up'];
    const effect = effects[Math.floor(Math.random() * effects.length)];
    const floatClass = 'zero-gravity-' + (Math.floor(Math.random() * 4) + 1);
    
    wrapper.appendChild(videoEl);
    wrapper.appendChild(muteBtn);
    this.container.appendChild(wrapper);
    this.activeItems++;
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wrapper.style.transition = 'opacity 0.5s ease';
        wrapper.style.opacity = '0.96';
        wrapper.classList.add(effect);

        setTimeout(() => {
          if (wrapper.parentNode) {
            wrapper.classList.remove(effect);
            wrapper.classList.add(floatClass);
          }
        }, 650);
      });
    });
    
    const duration = 8000 + Math.random() * 5000;
    setTimeout(() => {
      wrapper.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      wrapper.style.opacity = '0';
      wrapper.style.transform = 'scale(0.6)';
      setTimeout(() => { 
        if (wrapper.parentNode) wrapper.remove(); 
        this.activeItems = Math.max(0, this.activeItems - 1); 
      }, 650);
    }, duration);
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
        span.style.fontSize = (18 + Math.random() * 24) + 'px';
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
