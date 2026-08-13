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

  _showImage() {
    const src = MEDIA_IMAGES[Math.floor(Math.random() * MEDIA_IMAGES.length)];
    
    const el = document.createElement('img');
    el.src = src;
    
    // Случайный размер: маленький / средний / большой (веса 20% / 50% / 30%)
    const roll = Math.random();
    let size;
    if (roll < 0.2) {
      size = 55 + Math.floor(Math.random() * 45); // 55-100px маленький
    } else if (roll < 0.7) {
      size = 110 + Math.floor(Math.random() * 80); // 110-190px средний
    } else {
      size = 200 + Math.floor(Math.random() * 130); // 200-330px большой
    }
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.objectFit = 'cover';
    el.style.borderRadius = '12px';
    el.style.position = 'fixed';
    el.style.zIndex = '50';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.6), 0 0 15px rgba(220,208,255,0.3)';
    
    // Рандомная позиция в четырёх зонах экрана
    // Края: не очень центр (там плеер)
    const zones = [
      { top: '5%', left: '2%' },
      { top: '5%', right: '2%' },
      { bottom: '5%', left: '2%' },
      { bottom: '5%', right: '2%' },
      { top: '40%', left: '2%' },
      { top: '40%', right: '2%' }
    ];
    const zone = zones[Math.floor(Math.random() * zones.length)];
    Object.assign(el.style, zone);
    
    // Случайный эффект появления
    const effects = ['trigger-bounce-in', 'trigger-zoom-burst', 'trigger-spin-in', 'trigger-shake'];
    const effect = effects[Math.floor(Math.random() * effects.length)];
    
    // Случайный небольшой поворот
    const rot = (Math.random() - 0.5) * 20;
    el.style.transform = `rotate(${rot}deg)`;
    
    this.container.appendChild(el);
    this.activeItems++;
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.4s ease';
        el.style.opacity = '0.85';
        el.classList.add(effect);
      });
    });
    
    // Автоудаление через 5-9 секунд
    const duration = 5000 + Math.random() * 4000;
    setTimeout(() => {
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      el.style.opacity = '0';
      el.style.transform = `rotate(${rot}deg) scale(0.8)`;
      setTimeout(() => { 
        if (el.parentNode) el.remove(); 
        this.activeItems--; 
      }, 700);
    }, duration);
  }

  _showVideo() {
    const src = MEDIA_VIDEOS[Math.floor(Math.random() * MEDIA_VIDEOS.length)];
    
    const videoEl = document.createElement('video');
    videoEl.src = src;
    videoEl.autoplay = true;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.loop = true;
    
    // размер 150-220px
    const size = 150 + Math.floor(Math.random() * 70);
    videoEl.style.width = size + 'px';
    videoEl.style.height = size + 'px';
    videoEl.style.objectFit = 'cover';
    videoEl.style.borderRadius = '8px';
    videoEl.style.display = 'block';
    videoEl.style.boxShadow = '0 4px 20px rgba(0,0,0,0.6), 0 0 15px rgba(220,208,255,0.3)';

    // Кнопка звука — фиксированна поверх видео
    const muteBtn = document.createElement('button');
    muteBtn.textContent = '🔇';
    muteBtn.style.cssText = `
      position: absolute;
      bottom: 6px; right: 6px;
      background: rgba(0,0,0,0.6);
      border: none;
      border-radius: 50%;
      width: 32px; height: 32px;
      font-size: 14px;
      cursor: pointer;
      color: white;
      display: flex; align-items: center; justify-content: center;
      z-index: 1;
      pointer-events: all;
      transition: background 0.2s;
    `;
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      videoEl.muted = !videoEl.muted;
      muteBtn.textContent = videoEl.muted ? '🔇' : '🔊';
    });

    // Обёрни видео в wrapper div вместе с кнопкой
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: fixed;
      z-index: 52;
      pointer-events: all;
      display: inline-block;
    `;
    
    const zones = [
      { top: '5%', left: '2%' },
      { top: '5%', right: '2%' },
      { bottom: '5%', left: '2%' },
      { bottom: '5%', right: '2%' },
      { top: '40%', left: '2%' },
      { top: '40%', right: '2%' }
    ];
    const zone = zones[Math.floor(Math.random() * zones.length)];
    Object.assign(wrapper.style, zone);
    wrapper.style.opacity = '0';
    
    const effects = ['trigger-bounce-in', 'trigger-zoom-burst', 'trigger-spin-in', 'trigger-shake'];
    const effect = effects[Math.floor(Math.random() * effects.length)];
    
    const rot = (Math.random() - 0.5) * 20;
    wrapper.style.transform = `rotate(${rot}deg)`;
    
    wrapper.appendChild(videoEl);
    wrapper.appendChild(muteBtn);
    this.container.appendChild(wrapper);
    this.activeItems++;
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wrapper.style.transition = 'opacity 0.4s ease';
        wrapper.style.opacity = '0.85';
        wrapper.classList.add(effect);
      });
    });
    
    // Длительность: 7000 + random*5000 мс
    const duration = 7000 + Math.random() * 5000;
    setTimeout(() => {
      wrapper.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      wrapper.style.opacity = '0';
      wrapper.style.transform = `rotate(${rot}deg) scale(0.8)`;
      setTimeout(() => { 
        if (wrapper.parentNode) wrapper.remove(); 
        this.activeItems--; 
      }, 700);
    }, duration);
  }

  _showEmojiShower() {
    const count = 12 + Math.floor(Math.random() * 10);
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
        span.style.left = (Math.random() * 90 + 5) + 'vw';
        span.style.top = '-40px';
        span.style.fontSize = (18 + Math.random() * 28) + 'px';
        span.style.zIndex = '55';
        span.style.pointerEvents = 'none';
        span.style.animation = `trigger-confetti-fall ${1.5 + Math.random() * 2.5}s ease-in forwards`;
        document.body.appendChild(span);
        setTimeout(() => {
          if (span.parentNode) span.remove();
        }, 5000);
      }, i * 100);
    }
  }
}

window.MediaShow = MediaShow;
