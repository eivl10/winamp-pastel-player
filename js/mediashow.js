const MEDIA_IMAGES = [
  'assets/images/жаба.jpg',
  'assets/images/ключ.jpg',
  'assets/images/мася.jpg',
  'assets/images/перцы.jpg',
  'assets/images/плащ.jpg',
  'assets/images/фрукты.jpg',
  'assets/images/хуля.webp'
  // Добавь сюда новые файлы через пробел, массив автоматически расширяется
  // 'assets/images/photo-new.jpg',
];

const MEDIA_VIDEOS = [
  'assets/videos/кружок1.mp4',
  'assets/videos/круг2.mp4',
  'assets/videos/круг 3.mp4'
];

const ALL_EMOJIS = ['🌹', '💃', '✨', '🔥', '🎺', '🐸', '👑', '🌟', '💫', '🌊', '🦀', '🍍', '🍰', '🌈'];

class MediaShow {
  constructor(containerEl) {
    this.container = containerEl; // #mediashow-layer
    this.running = false;
    this.interval = null;
    this.activeItems = 0;
    this.MAX_ITEMS = 3;
    this.MIN_INTERVAL = 3500; // мин 3.5 секунды между появлениями
  }

  start() {
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
    
    // Чередуем: изображение, видео, emoji-shower (веса 7:2:1)
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
      { top: '12px', left: '12px' },
      { top: '12px', right: '12px' },
      { bottom: '16px', left: '12px' },
      { bottom: '16px', right: '12px' },
      { top: '42%', left: '8px' },
      { top: '42%', right: '8px' }
    ];
    return zones[Math.floor(Math.random() * zones.length)];
  }

  _showImage() {
    const src = MEDIA_IMAGES[Math.floor(Math.random() * MEDIA_IMAGES.length)];
    
    const el = document.createElement('img');
    el.src = src;
    
    // Адаптивный безопасный размер (не вылезает за пределы мобильного экрана)
    const maxAvailable = Math.min(220, Math.floor(window.innerWidth * 0.40));
    const roll = Math.random();
    let size;
    if (roll < 0.25) {
      size = Math.max(60, Math.floor(maxAvailable * 0.5)); // маленький
    } else if (roll < 0.7) {
      size = Math.max(85, Math.floor(maxAvailable * 0.75)); // средний
    } else {
      size = maxAvailable; // максимальный безопасный
    }

    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.maxWidth = '42vw';
    el.style.maxHeight = '36vh';
    el.style.objectFit = 'cover';
    el.style.borderRadius = '12px';
    el.style.position = 'fixed';
    el.style.zIndex = '150';
    el.style.opacity = '0';
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'zoom-in';
    el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5), 0 0 12px rgba(0, 242, 254, 0.3)';
    el.style.border = '1px solid rgba(255, 255, 255, 0.4)';
    
    const zone = this._getSafeZone();
    Object.assign(el.style, zone);
    
    const effects = ['trigger-bounce-in', 'trigger-zoom-burst', 'trigger-spin-in', 'trigger-shake'];
    const effect = effects[Math.floor(Math.random() * effects.length)];
    
    // Легкий наклон
    const rot = (Math.random() - 0.5) * 12;
    el.style.transform = `rotate(${rot}deg)`;

    let isFullscreen = false;
    let removeTimeout = null;

    const scheduleRemoval = (delay) => {
      if (removeTimeout) clearTimeout(removeTimeout);
      removeTimeout = setTimeout(() => {
        if (isFullscreen) return;
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        el.style.opacity = '0';
        el.style.transform = `rotate(${rot}deg) scale(0.7)`;
        setTimeout(() => { 
          if (el.parentNode) el.remove(); 
          this.activeItems = Math.max(0, this.activeItems - 1); 
        }, 550);
      }, delay);
    };

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      isFullscreen = !isFullscreen;
      if (isFullscreen) {
        if (removeTimeout) clearTimeout(removeTimeout);
        el.classList.remove(effect);
        el.classList.add('media-fullscreen');
      } else {
        el.classList.remove('media-fullscreen');
        scheduleRemoval(4000);
      }
    });
    
    this.container.appendChild(el);
    this.activeItems++;
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.4s ease';
        el.style.opacity = '0.92';
        el.classList.add(effect);
      });
    });
    
    const duration = 5000 + Math.random() * 4000;
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
    
    const maxAvailable = Math.min(220, Math.floor(window.innerWidth * 0.42));
    const size = Math.max(110, maxAvailable);

    videoEl.style.width = size + 'px';
    videoEl.style.height = size + 'px';
    videoEl.style.maxWidth = '44vw';
    videoEl.style.maxHeight = '38vh';
    videoEl.style.objectFit = 'cover';
    videoEl.style.borderRadius = '10px';
    videoEl.style.display = 'block';
    videoEl.style.boxShadow = '0 6px 20px rgba(0,0,0,0.6)';
    videoEl.style.border = '1px solid rgba(0, 242, 254, 0.4)';

    // Кнопка звука
    const muteBtn = document.createElement('button');
    muteBtn.textContent = '🔇';
    muteBtn.style.cssText = `
      position: absolute;
      bottom: 6px; right: 6px;
      background: rgba(0,0,0,0.7);
      border: 1px solid rgba(255,255,255,0.4);
      border-radius: 50%;
      width: 32px; height: 32px;
      font-size: 14px;
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
    
    const effects = ['trigger-bounce-in', 'trigger-zoom-burst', 'trigger-spin-in', 'trigger-shake'];
    const effect = effects[Math.floor(Math.random() * effects.length)];
    
    const rot = (Math.random() - 0.5) * 10;
    wrapper.style.transform = `rotate(${rot}deg)`;
    
    wrapper.appendChild(videoEl);
    wrapper.appendChild(muteBtn);
    this.container.appendChild(wrapper);
    this.activeItems++;
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wrapper.style.transition = 'opacity 0.4s ease';
        wrapper.style.opacity = '0.95';
        wrapper.classList.add(effect);
      });
    });
    
    const duration = 7000 + Math.random() * 5000;
    setTimeout(() => {
      wrapper.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      wrapper.style.opacity = '0';
      wrapper.style.transform = `rotate(${rot}deg) scale(0.7)`;
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
