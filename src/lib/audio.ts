let audio: AudioContext | null = null

function context() {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!audio) audio = new Ctx()
  return audio
}

export function unlockAudio() {
  const ctx = context()
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

export function beep(kind: 'tick' | 'rep' | 'set' | 'rest') {
  const ctx = context()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const now = ctx.currentTime
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.type = 'triangle'
  const freq = kind === 'tick' ? 620 : kind === 'rep' ? 880 : kind === 'set' ? 520 : 392
  const duration = kind === 'tick' ? 0.045 : kind === 'rep' ? 0.08 : 0.22
  oscillator.frequency.setValueAtTime(freq, now)
  if (kind === 'set') oscillator.frequency.exponentialRampToValueAtTime(784, now + duration)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(kind === 'tick' ? 0.025 : 0.045, now + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.02)
}

export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern)
  }
}
