import { useEffect, useRef, useState } from 'react'
import { beatIndex } from '../content/beats'
import { beep, vibrate } from '../lib/audio'

type Options = {
  running: boolean
  tempoMs: number
  sound: boolean
  haptics: boolean
  onRep: () => boolean
}

export function useRepClock({ running, tempoMs, sound, haptics, onRep }: Options) {
  const [progress, setProgress] = useState(0)
  const [beat, setBeat] = useState(0)
  const accRef = useRef(0)
  const beatRef = useRef(0)
  const onRepRef = useRef(onRep)
  const soundRef = useRef(sound)
  const hapticsRef = useRef(haptics)
  const tempoRef = useRef(tempoMs)
  onRepRef.current = onRep
  soundRef.current = sound
  hapticsRef.current = haptics
  tempoRef.current = tempoMs

  useEffect(() => {
    if (!running) return
    let frame = 0
    let last = performance.now()

    const loop = (now: number) => {
      let delta = now - last
      last = now
      if (delta > 250) delta = 250
      if (delta < 0) delta = 0
      accRef.current += delta
      const tempo = Math.max(500, tempoRef.current)
      while (accRef.current >= tempo) {
        accRef.current -= tempo
        const accepted = onRepRef.current()
        if (!accepted) {
          setProgress(0)
          setBeat(0)
          beatRef.current = 0
          accRef.current = 0
          return
        }
        if (soundRef.current) beep('rep')
        if (hapticsRef.current) vibrate(16)
      }
      const next = accRef.current / tempo
      setProgress(next)
      const nextBeat = beatIndex(next)
      if (nextBeat !== beatRef.current) {
        beatRef.current = nextBeat
        setBeat(nextBeat)
        if (nextBeat !== 0 && soundRef.current) beep('tick')
      }
      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [running])

  return { progress, beat }
}
