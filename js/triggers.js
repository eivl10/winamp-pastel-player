class TriggerEngine {
  constructor(overlayEl) {
    this.overlay = overlayEl;
    this.triggers = [];
    this.fired = new Set();
    this.timers = [];
    this.enabled = true;
  }

  setTriggers(triggers) {
    this.triggers = triggers || [];
    this.reset();
  }

  toggle(enable) {
    this.enabled = typeof enable === 'boolean' ? enable : !this.enabled;
    if (!this.enabled) this.reset();
    return this.enabled;
  }

  tick(currentTime) {
    if (!this.enabled) return;
    for (let i = 0; i < this.triggers.length; i++) {
      const trigger = this.triggers[i];
      if (!this.fired.has(i) && Math.abs(currentTime - trigger.time) < 1.5) {
        this.fired.add(i);
        this._showTrigger(trigger);
      }
    }
  }

  _showTrigger(trigger) {
    if (trigger.type === 'flash') {
      this._showFlash(trigger);
      return;
    }
    if (trigger.type === 'emoji-shower') {
      this._showEmojiShower(trigger);
      return;
    }

    let el;
    if (trigger.type === 'image') {
      const item = window.MediaPool ? window.MediaPool.getNextOfType('image') : null;
      const src = item ? item.src : trigger.src;
      el = document.createElement('img');
      el.src = src;
      el.style.maxWidth = '75vw';
      el.style.maxHeight = '55vh';
      el.style.borderRadius = '14px';
      el.style.boxShadow = '0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(220,208,255,0.4)';
      el.style.objectFit = 'contain';
      el.style.display = 'block';
      el.style.cursor = 'zoom-in';
      el.style.pointerEvents = 'auto';

      let isFullscreen = false;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        isFullscreen = !isFullscreen;
        if (isFullscreen) {
          el.classList.add('media-fullscreen');
        } else {
          el.classList.remove('media-fullscreen');
        }
      });
    } else if (trigger.type === 'video') {
      const item = window.MediaPool ? window.MediaPool.getNextOfType('video') : null;
      const src = item ? item.src : trigger.src;
      el = document.createElement('video');
      el.src = src;
      el.autoplay = true;
      el.muted = true;
      el.playsInline = true;
      el.loop = trigger.loop || false;
      el.style.maxWidth = '75vw';
      el.style.maxHeight = '55vh';
      el.style.borderRadius = '14px';
      el.style.boxShadow = '0 8px 40px rgba(0,0,0,0.5)';
      el.style.display = 'block';
      el.addEventListener('click', () => el.remove());
    } else if (trigger.type === 'popup') {
      el = document.createElement('div');
      el.className = 'overlay-popup overlay-popup-small';
      const cleanText = (trigger.content || '').replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '').trim();
      el.innerHTML = cleanText;
      const colors = ['var(--cyan)', 'var(--mint)', 'var(--lavender-deep)', 'var(--butter)'];
      el.style.borderColor = colors[Math.floor(Math.random() * colors.length)];
    } else {
      return; // Unknown trigger
    }

    this._applyPosition(el, trigger.position || 'center');
    this._applyEffect(el, trigger.effect || 'fade-in');
    
    if (this.overlay) {
        this.overlay.appendChild(el);
    } else {
        document.body.appendChild(el);
    }
    
    // Попапы убираем в 2 раза быстрее, как просил пользователь
    const durationMult = trigger.type === 'popup' ? 500 : 1000;
    this._scheduleRemoval(el, (trigger.duration || 4) * durationMult);
  }

  _applyEffect(el, effect) {
    el.style.opacity = '0';
    el.style.transition = 'none';
    el.style.transform = 'scale(1)';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        switch(effect) {
          case 'bounce':
            el.classList.add('trigger-bounce-in');
            el.style.opacity = '1';
            break;
          case 'zoom-burst':
            el.classList.add('trigger-zoom-burst');
            el.style.opacity = '1';
            break;
          case 'spin-in':
            el.classList.add('trigger-spin-in');
            el.style.opacity = '1';
            break;
          case 'shake':
            el.style.transition = 'opacity 0.3s ease';
            el.style.opacity = '1';
            setTimeout(() => el.classList.add('trigger-shake'), 300);
            break;
          case 'float-up':
            el.classList.add('trigger-float-up');
            el.style.opacity = '1';
            break;
          case 'glitch':
            el.classList.add('trigger-glitch');
            el.style.opacity = '1';
            break;
          default: // fade-in
            el.style.transition = 'opacity 0.5s ease';
            el.style.opacity = '1';
        }
      });
    });
  }

  _applyPosition(el, position) {
    el.style.position = 'fixed';
    el.style.zIndex = '500';
    el.style.cursor = 'pointer';

    let pos = position;
    if (pos === 'random') {
      const positions = ['center', 'top-right', 'bottom-left', 'top-left', 'bottom-right'];
      pos = positions[Math.floor(Math.random() * positions.length)];
    }

    el.style.top = '';
    el.style.left = '';
    el.style.right = '';
    el.style.bottom = '';
    el.style.transform = '';

    switch(pos) {
      case 'top-left':
        el.style.top = '80px'; el.style.left = '12px';
        break;
      case 'top-right':
        el.style.top = '80px'; el.style.right = '12px';
        break;
      case 'bottom-left':
        el.style.bottom = '80px'; el.style.left = '12px';
        break;
      case 'bottom-right':
        el.style.bottom = '80px'; el.style.right = '12px';
        break;
      default: // center
        el.style.top = '50%';
        el.style.left = '50%';
        el.style.transform = 'translate(-50%, -50%)';
    }
  }

  _showEmojiShower(trigger) {
    const emojis = trigger.emojis || ['✨', '🌹', '💫', '🎵', '⭐'];
    const count = trigger.count || 20;
    
    for (let i = 0; i < count; i++) {
      const t = setTimeout(() => {
        const span = document.createElement('span');
        span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        span.style.position = 'fixed';
        span.style.left = Math.random() * 100 + 'vw';
        span.style.top = '-30px';
        span.style.fontSize = (20 + Math.random() * 24) + 'px';
        span.style.zIndex = '600';
        span.style.pointerEvents = 'none';
        span.style.animation = `trigger-confetti-fall ${1.5 + Math.random() * 2}s ease-in forwards`;
        document.body.appendChild(span);
        setTimeout(() => span.remove(), 4000);
      }, i * 80);
      this.timers.push(t);
    }
  }

  _showFlash(trigger) {
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.inset = '0';
    flash.style.zIndex = '800';
    flash.style.pointerEvents = 'none';
    flash.style.background = trigger.color || 'rgba(253,253,150,0.4)';
    flash.style.animation = 'trigger-flash-screen 0.6s ease-out forwards';
    document.body.appendChild(flash);
    const t = setTimeout(() => flash.remove(), 700);
    this.timers.push(t);
  }

  _scheduleRemoval(el, durationMs) {
    const t = setTimeout(() => {
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      el.style.opacity = '0';
      el.classList.remove('trigger-shake', 'trigger-bounce-in', 'trigger-zoom-burst',
        'trigger-spin-in', 'trigger-float-up', 'trigger-glitch');
      setTimeout(() => el.remove(), 600);
    }, durationMs);
    this.timers.push(t);
  }

  reset() {
    this.fired.clear();
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    this.clear();
  }

  clear() {
    if (this.overlay) {
        this.overlay.innerHTML = '';
    }
  }
}

window.TriggerEngine = TriggerEngine;
