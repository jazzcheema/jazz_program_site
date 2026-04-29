'use client'

import type { CSSProperties } from 'react'
import styles from './WindTextChars.module.css'

type Props = {
  active: boolean
  text: string
  baseDelay?: number
  stagger?: number
  mode?: 'chars' | 'words'
}

export default function WindTextChars({ active, text, baseDelay = 0, stagger = 44, mode = 'chars' }: Props) {
  const units =
    mode === 'words'
      ? text.split(' ').flatMap((w, i, arr) => (i < arr.length - 1 ? [w, ' '] : [w]))
      : [...text]

  let unitIdx = 0

  return (
    <span className={styles.root}>
      {units.map((unit, i) => {
        if (unit === ' ') {
          return (
            <span key={i} className={styles.space}>
              {' '}
            </span>
          )
        }

        const idx = unitIdx++
        // Deterministic pseudo-random, SSR-safe
        const s1 = ((idx * 137 + 17) % 100) / 100
        const s2 = ((idx * 97 + 43) % 100) / 100
        const s3 = ((idx * 53 + 71) % 100) / 100

        // Scatter in all directions — radial distribution around final position
        const angle = s1 * Math.PI * 2
        const rx = 28 + s2 * 38  // horizontal radius 28–66vw
        const ry = 18 + s3 * 30  // vertical radius 18–48vh
        const wxVal = Math.cos(angle) * rx
        const wyVal = Math.sin(angle) * ry

        // Rotation and depth follow direction of travel
        const rotZ = Math.sin(angle) * 18
        const rotY = -Math.cos(angle) * 14
        // Ghost offset leads the char in the direction it's coming from
        const gx = wxVal > 0 ? '1.6em' : '-1.6em'
        const gy = wyVal > 0 ? '0.25em' : '-0.25em'

        return (
          <span
            key={i}
            className={`${styles.unit} ${active ? styles.active : ''}`}
            data-text={unit}
            style={
              {
                '--d': `${baseDelay + idx * stagger}ms`,
                '--wx': `${wxVal.toFixed(2)}vw`,
                '--wy': `${wyVal.toFixed(2)}vh`,
                '--wz': `${25 + s3 * 75}px`,
                '--wr': `${rotZ.toFixed(2)}deg`,
                '--wry': `${rotY.toFixed(2)}deg`,
                '--wb': `${1.5 + s3 * 3}px`,
                '--gx': gx,
                '--gy': gy,
              } as CSSProperties
            }
          >
            {unit}
          </span>
        )
      })}
    </span>
  )
}
