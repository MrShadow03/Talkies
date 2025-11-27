// Sound Effects Manager using Web Audio API
class SoundManager {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
    this.volume = 0.3; // Default volume (0 to 1)
    this.init();
  }

  init() {
    // Initialize AudioContext on first user interaction
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  // Create a simple beep tone
  createTone(frequency, duration, type = 'sine') {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Play message sent sound (higher pitch, quick)
  messageSent() {
    this.createTone(800, 0.1, 'sine');
  }

  // Play message received sound (lower pitch, soft)
  messageReceived() {
    this.createTone(600, 0.15, 'sine');
  }

  // Play notification sound (two-tone)
  notification() {
    this.createTone(700, 0.08, 'sine');
    setTimeout(() => this.createTone(900, 0.08, 'sine'), 80);
  }

  // Play typing sound (very subtle)
  typing() {
    this.createTone(400, 0.03, 'square');
  }

  // Play click sound (short pop)
  click() {
    this.createTone(300, 0.05, 'sine');
  }

  // Play login sound (ascending tones)
  login() {
    this.createTone(500, 0.1, 'sine');
    setTimeout(() => this.createTone(700, 0.1, 'sine'), 100);
    setTimeout(() => this.createTone(900, 0.15, 'sine'), 200);
  }

  // Play error sound (descending tone)
  error() {
    this.createTone(400, 0.2, 'sawtooth');
    setTimeout(() => this.createTone(300, 0.2, 'sawtooth'), 150);
  }

  // Toggle sound on/off
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('soundEnabled', this.enabled);
    return this.enabled;
  }

  // Set volume (0 to 1)
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('soundVolume', this.volume);
  }

  // Load settings from localStorage
  loadSettings() {
    const savedEnabled = localStorage.getItem('soundEnabled');
    const savedVolume = localStorage.getItem('soundVolume');
    
    if (savedEnabled !== null) {
      this.enabled = savedEnabled === 'true';
    }
    
    if (savedVolume !== null) {
      this.volume = parseFloat(savedVolume);
    }
  }
}

// Create global sound manager instance
const soundManager = new SoundManager();
soundManager.loadSettings();
