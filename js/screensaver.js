class ScreensaverEngine {
  constructor(canvasEl, overlayEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.overlay = overlayEl;
    this.animFrame = null;
    this.running = false;
    this.stars = [];
    this.mode = 'normal'; 
    this._loop = this._loop.bind(this);
  }

  _initStars() {
    this.stars = [];
    const count = window.innerWidth < 768 ? 50 : 120;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        z: Math.random() * 2,
        size: Math.random() * 1.2 + 0.3,
        alpha: Math.random() * 0.5 + 0.1
      });
    }
  }

  _resize() {
    if (!this.canvas) return;
    const cw = document.documentElement.clientWidth;
    const ch = document.documentElement.clientHeight;
    this.canvas.width = cw;
    this.canvas.height = ch;
    this._initStars();
  }

  start() {
    if (this.running) return;
    this.running = true;
    window.addEventListener('resize', this._resize.bind(this));
    this._resize();
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  }

  toggleMode() {
    if (this.mode === 'normal') this.mode = 'fast';
    else if (this.mode === 'fast') this.mode = 'paused';
    else this.mode = 'normal';
    return this.mode;
  }

  _loop() {
    if (!this.running) return;
    
    this.ctx.fillStyle = 'rgba(5, 7, 15, 0.3)'; 
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.mode !== 'paused') {
      const speedMult = this.mode === 'fast' ? 4 : 0.6;
      
      for (const star of this.stars) {
        star.y -= (star.z * 0.5 + 0.1) * speedMult;
        
        star.alpha += (Math.random() - 0.5) * 0.03;
        if (star.alpha < 0.1) star.alpha = 0.1;
        if (star.alpha > 0.6) star.alpha = 0.6;

        if (star.y < -5) {
          star.y = this.canvas.height + 5;
          star.x = Math.random() * this.canvas.width;
        }

        this.ctx.fillStyle = 'rgba(180, 200, 255, ' + star.alpha + ')';
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    this.animFrame = requestAnimationFrame(this._loop);
  }
}

window.ScreensaverEngine = ScreensaverEngine;
