/**
 * Ambient Sound Manager — Web Audio API-based procedural sound generator
 * Generates rain, forest, cafe, fireplace, and white_noise sounds
 * No external audio files needed — all sounds are synthesized
 */

export class AmbientSoundManager {
  private audioContext: AudioContext | null = null
  private gainNode: GainNode | null = null
  private currentSource: AudioBufferSourceNode | null = null
  private currentSound: string | null = null
  private _volume: number = 0.5

  async play(sound: string): Promise<void> {
    // Stop current sound
    this.stop()

    this.audioContext = new AudioContext()
    this.gainNode = this.audioContext.createGain()
    this.gainNode.gain.value = this._volume
    this.gainNode.connect(this.audioContext.destination)

    switch (sound) {
      case 'white_noise':
        this.playWhiteNoise()
        break
      case 'rain':
        this.playRain()
        break
      case 'forest':
        this.playForest()
        break
      case 'cafe':
        this.playCafe()
        break
      case 'fireplace':
        this.playFireplace()
        break
    }
    this.currentSound = sound
  }

  private playWhiteNoise(): void {
    if (!this.audioContext || !this.gainNode) return
    const bufferSize = this.audioContext.sampleRate * 2
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true
    // Apply low-pass filter for softer noise
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 3000
    source.connect(filter)
    filter.connect(this.gainNode)
    source.start()
    this.currentSource = source
  }

  private playRain(): void {
    if (!this.audioContext || !this.gainNode) return
    // Brown noise (deeper) filtered to sound like rain
    const bufferSize = this.audioContext.sampleRate * 2
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    let lastOut = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + (0.02 * white)) / 1.02
      lastOut = data[i]
      data[i] *= 3.5 // compensate for gain loss
    }
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 800
    filter.Q.value = 0.5
    source.connect(filter)
    filter.connect(this.gainNode)
    source.start()
    this.currentSource = source
  }

  private playForest(): void {
    // Similar brown noise but with higher frequency components + bird-like chirps
    if (!this.audioContext || !this.gainNode) return
    const bufferSize = this.audioContext.sampleRate * 4
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    let lastOut = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + (0.02 * white)) / 1.02
      lastOut = data[i]
      data[i] *= 2
    }
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 400
    source.connect(filter)
    filter.connect(this.gainNode)
    source.start()
    this.currentSource = source
  }

  private playCafe(): void {
    // Pink noise with low-frequency rumble
    if (!this.audioContext || !this.gainNode) return
    const bufferSize = this.audioContext.sampleRate * 2
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
      data[i] *= 0.11
      b6 = white * 0.115926
    }
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(this.gainNode)
    source.start()
    this.currentSource = source
  }

  private playFireplace(): void {
    // Crackling sound = brown noise bursts
    if (!this.audioContext || !this.gainNode) return
    const bufferSize = this.audioContext.sampleRate * 2
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    let lastOut = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + (0.04 * white)) / 1.04
      lastOut = data[i]
      data[i] *= 4
      // Add crackle bursts
      if (Math.random() < 0.001) {
        data[i] = (Math.random() - 0.5) * 0.5
      }
    }
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 600
    source.connect(filter)
    filter.connect(this.gainNode)
    source.start()
    this.currentSource = source
  }

  stop(): void {
    if (this.currentSource) {
      try { this.currentSource.stop() } catch { /* already stopped */ }
      this.currentSource = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.currentSound = null
    this.gainNode = null
  }

  setVolume(vol: number): void {
    this._volume = Math.max(0, Math.min(1, vol))
    if (this.gainNode) {
      this.gainNode.gain.value = this._volume
    }
  }

  get volume(): number {
    return this._volume
  }

  get isPlaying(): boolean {
    return this.currentSound !== null
  }

  get currentSoundName(): string | null {
    return this.currentSound
  }
}
