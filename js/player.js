class AudioEngine {
  constructor() {
    this.audio = new Audio();
    this.tracks = [];
    this.currentIndex = 0;
    this.isShuffled = false;
    this.shuffleHistory = [];
    this.volume = 0.7;
    this.isPlaying = false;
    
    // Callbacks
    this.onTimeUpdate = null;  // fn(currentTime, duration)
    this.onTrackLoad = null;   // fn(track)
    this.onTrackEnd = null;    // fn()
    this.onStateChange = null; // fn(state) — 'playing'|'paused'|'stopped'
    this.onTrackChange = null; // fn(track)
  }

  init(tracks) {
    this.tracks = tracks || [];
    this.audio.volume = this.volume;

    this.audio.addEventListener('timeupdate', () => {
      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.audio.currentTime, this.audio.duration || 0);
      }
    });

    this.audio.addEventListener('ended', () => {
      if (this.onTrackEnd) this.onTrackEnd();
      this.nextTrack();
    });

    this.audio.addEventListener('loadedmetadata', () => {
      if (this.onTrackLoad) {
        this.onTrackLoad(this.getCurrentTrack());
      }
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Audio playback error:', e);
      this.nextTrack();
    });
  }

  loadTrack(index) {
    if (!this.tracks.length) return;
    this.currentIndex = index;
    const track = this.tracks[this.currentIndex];
    this.audio.src = track.url;
    
    if (this.onTrackChange) {
      this.onTrackChange(track);
    }
  }

  play() {
    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      return playPromise.then(() => {
        this.isPlaying = true;
        if (this.onStateChange) this.onStateChange('playing');
      }).catch(error => {
        if (error.name === 'NotAllowedError') {
          console.warn('iOS autoplay prevented');
        } else {
          console.warn('Play error:', error);
        }
      });
    }
    return Promise.resolve();
  }

  pause() {
    this.audio.pause();
    this.isPlaying = false;
    if (this.onStateChange) this.onStateChange('paused');
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
    if (this.onStateChange) this.onStateChange('stopped');
  }

  seekTo(seconds) {
    this.audio.currentTime = seconds;
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    this.audio.volume = this.volume;
  }

  nextTrack() {
    if (!this.tracks.length) return;
    let nextIndex;
    if (this.isShuffled && this.tracks.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * this.tracks.length);
      } while (nextIndex === this.currentIndex);
    } else {
      nextIndex = (this.currentIndex + 1) % this.tracks.length;
    }
    this.loadTrack(nextIndex);
    this.play();
  }

  prevTrack() {
    if (!this.tracks.length) return;
    if (this.audio.currentTime > 3) {
      this.seekTo(0);
    } else {
      let prevIndex = (this.currentIndex - 1 + this.tracks.length) % this.tracks.length;
      this.loadTrack(prevIndex);
      this.play();
    }
  }

  toggleShuffle() {
    this.isShuffled = !this.isShuffled;
    return this.isShuffled;
  }

  getCurrentTrack() {
    return this.tracks[this.currentIndex] || null;
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

function setupIOSUnlock(audioEngine, onUnlocked) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (!isIOS) { 
    if (onUnlocked) onUnlocked(); 
    return; 
  }
  
  const unlockScreen = document.getElementById('ios-unlock-screen');
  if (unlockScreen) unlockScreen.style.display = 'flex';
  
  const unlock = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      ctx.resume();
    }
    if (unlockScreen) unlockScreen.style.display = 'none';
    if (onUnlocked) onUnlocked();
  };
  
  const screen = document.getElementById('ios-unlock-screen');
  if (screen) {
    screen.addEventListener('click', unlock, { once: true });
  }
}

window.AudioEngine = AudioEngine;
window.setupIOSUnlock = setupIOSUnlock;
