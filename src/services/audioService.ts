// Audio Service for game sounds
// Ready to integrate actual audio files

class AudioService {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;

  constructor() {
    // Preload sounds (uncomment when audio files are added)
    // this.loadSound('roll', '/sounds/dice-roll.mp3');
    // this.loadSound('tick', '/sounds/piece-move.mp3');
    // this.loadSound('capture', '/sounds/capture.mp3');
  }

  private loadSound(name: string, path: string) {
    try {
      const audio = new Audio(path);
      audio.preload = 'auto';
      this.sounds.set(name, audio);
    } catch (error) {
      console.warn(`Failed to load sound: ${name}`, error);
    }
  }

  private play(name: string) {
    if (!this.enabled) return;
    
    const sound = this.sounds.get(name);
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(err => console.warn('Audio play failed:', err));
    } else {
      // Fallback: console log for development
      console.log(`🔊 ${name}`);
    }
  }

  playRoll() {
    this.play('roll');
  }

  playTick() {
    this.play('tick');
  }

  playCapture() {
    this.play('capture');
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }
}

export const audioService = new AudioService();