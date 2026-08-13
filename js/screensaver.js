class ScreensaverEngine {
  constructor(canvasEl, overlayEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.overlay = overlayEl; // сохраняем для совместимости с app.js
    this.animFrame = null;
    this.running = false;
    this.frameCount = 0;
    this.pipes = [];
    this.PIPE_COUNT = 3;
    this.GRID = 30;
    this.mode = 'normal'; // 'normal' | 'fast' | 'paused'
    this.COLORS = [
      '#2980B9', '#1ABC9C', '#8E44AD', '#E67E22',
      '#E74C3C', '#27AE60', '#2C3E50', '#D35400',
      '#16A085', '#9B59B6', '#C0392B', '#2471A3'
    ];
    this._loop = this._loop.bind(this);
  }

  _initPipes() {
    this.pipes = [];
    for (let i = 0; i < this.PIPE_COUNT; i++) {
      this.pipes.push(this._createNewPipe());
    }
  }

  _createNewPipe() {
    const w = Math.floor(this.canvas.width / this.GRID);
    const h = Math.floor(this.canvas.height / this.GRID);
    const dirs = ['up', 'down', 'left', 'right'];
    const startX = Math.floor(Math.random() * Math.max(1, w - 4)) + 2;
    const startY = Math.floor(Math.random() * Math.max(1, h - 4)) + 2;
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    return {
      x: startX,
      y: startY,
      prevX: startX,
      prevY: startY,
      dir: dir,
      prevDir: null,
      color: this.COLORS[Math.floor(Math.random() * this.COLORS.length)],
      length: 0,
      maxLength: Math.floor(Math.random() * 35) + 15,
      justReset: true
    };
  }

  _resetPipe(pipe) {
    const clearSize = this.GRID * 2;
    const clearX = (pipe.x * this.GRID + this.GRID / 2) - clearSize / 2;
    const clearY = (pipe.y * this.GRID + this.GRID / 2) - clearSize / 2;
    this.ctx.fillStyle = 'rgba(248, 251, 252, 0.9)';
    this.ctx.fillRect(clearX, clearY, clearSize, clearSize);

    const newPipe = this._createNewPipe();
    Object.assign(pipe, newPipe);
  }

  _updatePipe(pipe) {
    if (pipe.justReset) {
      pipe.justReset = false;
      return;
    }

    pipe.prevX = pipe.x;
    pipe.prevY = pipe.y;
    pipe.prevDir = pipe.dir;

    if (Math.random() < 0.2) {
      if (pipe.dir === 'up' || pipe.dir === 'down') {
        pipe.dir = Math.random() < 0.5 ? 'left' : 'right';
      } else {
        pipe.dir = Math.random() < 0.5 ? 'up' : 'down';
      }
    }

    if (pipe.dir === 'up') pipe.y--;
    else if (pipe.dir === 'down') pipe.y++;
    else if (pipe.dir === 'left') pipe.x--;
    else if (pipe.dir === 'right') pipe.x++;

    pipe.length++;

    const w = Math.floor(this.canvas.width / this.GRID);
    const h = Math.floor(this.canvas.height / this.GRID);

    if (pipe.length >= pipe.maxLength || 
        pipe.x < 1 || pipe.x >= w - 1 || 
        pipe.y < 1 || pipe.y >= h - 1) {
      this._resetPipe(pipe);
    }
  }

  _lightenColor(hex) {
    let c = hex.replace('#', '');
    if (c.length === 6) {
      let r = parseInt(c.substring(0, 2), 16);
      let g = parseInt(c.substring(2, 4), 16);
      let b = parseInt(c.substring(4, 6), 16);
      r = Math.min(255, Math.floor(r + (255 - r) * 0.3));
      g = Math.min(255, Math.floor(g + (255 - g) * 0.3));
      b = Math.min(255, Math.floor(b + (255 - b) * 0.3));
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    return hex + 'ff';
  }

  _draw() {
    for (const pipe of this.pipes) {
      if (pipe.justReset) continue;

      const p1x = pipe.prevX * this.GRID + this.GRID / 2;
      const p1y = pipe.prevY * this.GRID + this.GRID / 2;
      const p2x = pipe.x * this.GRID + this.GRID / 2;
      const p2y = pipe.y * this.GRID + this.GRID / 2;

      this.ctx.strokeStyle = pipe.color;
      this.ctx.lineWidth = this.GRID * 0.55;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(p1x, p1y);
      this.ctx.lineTo(p2x, p2y);
      this.ctx.stroke();

      if (pipe.prevDir && pipe.dir !== pipe.prevDir) {
        this.ctx.fillStyle = pipe.color;
        this.ctx.beginPath();
        this.ctx.arc(p1x, p1y, (this.GRID * 0.55) / 2, 0, Math.PI * 2);
        this.ctx.fill();
      }

      const r = this.GRID * 0.4;
      this.ctx.fillStyle = this._lightenColor(pipe.color);
      this.ctx.beginPath();
      this.ctx.arc(p2x, p2y, r, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  _loop() {
    if (!this.running) return;

    if (this.mode !== 'paused') {
      this.frameCount++;

      // Сброс каждые ~200 шагов (45 сек при 4fps)
      if (this.frameCount > 0 && this.frameCount % 200 === 0) {
        this.ctx.fillStyle = 'rgba(248, 251, 252, 0.95)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this._initPipes();
      }

      for (const pipe of this.pipes) {
        this._updatePipe(pipe);
      }
      this._draw();
    }

    const delay = this.mode === 'fast' ? 60 : 150; // ~16fps / ~6fps
    this.animFrame = setTimeout(() => this._loop(), delay);
  }

  toggleMode() {
    if (this.mode === 'normal') this.mode = 'fast';
    else if (this.mode === 'fast') this.mode = 'paused';
    else { this.mode = 'normal'; if (!this.running) { this.running = true; this._loop(); } }
    return this.mode;
  }

  start() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.fillStyle = 'rgba(248, 251, 252, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this._initPipes();
    this.running = true;
    this._loop();
    
    window.addEventListener('resize', () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    });
  }

  stop() {
    this.running = false;
    if (this.animFrame) {
      clearTimeout(this.animFrame);
      cancelAnimationFrame(this.animFrame);
    }
  }
}

window.ScreensaverEngine = ScreensaverEngine;
