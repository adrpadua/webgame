import { useEffect, useRef, useState } from 'react'

// One flash mechanism for every gauge number: when the watched value drops,
// the number flashes red, then settles. The key remounts the flashing span
// so back-to-back hits each restart the animation. Watch the *displayed*
// value, not the state's — during a staggered playout the flash belongs to
// the moment the blow lands on screen.
export function useDamageFlash(value: number): { flashing: boolean; flashKey: number } {
  const previous = useRef(value)
  const [flashKey, setFlashKey] = useState(0)
  const [flashing, setFlashing] = useState(false)
  useEffect(() => {
    if (value < previous.current) {
      setFlashKey((key) => key + 1)
      setFlashing(true)
      const timer = setTimeout(() => setFlashing(false), 500)
      previous.current = value
      return () => clearTimeout(timer)
    }
    previous.current = value
  }, [value])
  return { flashing, flashKey }
}
