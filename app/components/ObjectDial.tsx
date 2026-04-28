'use client'

import { OBJECTS } from '../data/objects'

interface ObjectDialProps {
  selectedIndex: number
  panelOpen: boolean
  onSelect: (index: number) => void
}

export default function ObjectDial({ selectedIndex, panelOpen, onSelect }: ObjectDialProps) {
  const total = OBJECTS.length
  const prev = (selectedIndex - 1 + total) % total
  const next = (selectedIndex + 1) % total
  const obj = OBJECTS[selectedIndex]

  return (
    <div
      className="fixed bottom-0 z-20 transition-all duration-300"
      style={{
        left: panelOpen ? '33.333%' : '50%',
        transform: 'translateX(-50%)',
        width: 520,
        background: '#06060e',
        borderTop: '1px solid #0033aa',
        borderLeft: '1px solid #0033aa',
        borderRight: '1px solid #0033aa',
        fontFamily: 'var(--font-geist-mono)',
      }}
    >
      {/* Top rule */}
      <div className="px-4 pt-2 pb-1" style={{ borderBottom: '1px solid #0d0d2a' }}>
        <div className="text-xs tracking-widest flex justify-between" style={{ color: '#304080' }}>
          <span>OBJECT_SELECTOR.SYS</span>
          <span>{String(selectedIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
        </div>
      </div>

      {/* Main row: prev ← current → next */}
      <div className="flex items-center px-3 py-2 gap-2">
        {/* Prev arrow */}
        <button
          onClick={() => onSelect(prev)}
          className="text-xs tracking-widest transition-opacity hover:opacity-100 shrink-0"
          style={{ color: '#0055ff', opacity: 0.7 }}
        >
          [←]
        </button>

        {/* Prev label */}
        <div className="flex-1 text-right">
          <button
            onClick={() => onSelect(prev)}
            className="text-xs tracking-widest transition-opacity hover:opacity-60"
            style={{ color: '#1a2a50' }}
          >
            {OBJECTS[prev].shortLabel}
          </button>
        </div>

        {/* Current */}
        <div className="text-center shrink-0 px-3" style={{ minWidth: 180 }}>
          <div className="text-sm font-bold tracking-widest leading-none mb-0.5" style={{ color: '#c0ccff' }}>
            {obj.label}
          </div>
          <div className="text-xs tracking-widest" style={{ color: '#304080', fontSize: '0.6rem' }}>
            {obj.class}
          </div>
        </div>

        {/* Next label */}
        <div className="flex-1 text-left">
          <button
            onClick={() => onSelect(next)}
            className="text-xs tracking-widest transition-opacity hover:opacity-60"
            style={{ color: '#1a2a50' }}
          >
            {OBJECTS[next].shortLabel}
          </button>
        </div>

        {/* Next arrow */}
        <button
          onClick={() => onSelect(next)}
          className="text-xs tracking-widest transition-opacity hover:opacity-100 shrink-0"
          style={{ color: '#0055ff', opacity: 0.7 }}
        >
          [→]
        </button>
      </div>

      {/* Tick marks */}
      <div className="flex justify-center items-center gap-3 pb-2">
        {OBJECTS.map((_, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className="flex flex-col items-center gap-0.5 group"
          >
            <div
              className="transition-all duration-200"
              style={{
                width: i === selectedIndex ? 6 : 4,
                height: i === selectedIndex ? 6 : 4,
                borderRadius: '50%',
                background: i === selectedIndex ? '#0055ff' : '#0d1a40',
                border: `1px solid ${i === selectedIndex ? '#0055ff' : '#0d1a40'}`,
                boxShadow: i === selectedIndex ? '0 0 6px #0055ff' : 'none',
              }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
