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
      data-panel-open={panelOpen}
      className="object-dial fixed bottom-0 z-20 transition-all duration-300"
      style={{
        transform: 'translateX(-50%)',
        width: 'min(520px, calc(100vw - 24px))',
        background: '#0c0c0c',
        borderTop: '1px solid #1e1e1e',
        borderLeft: '1px solid #1e1e1e',
        borderRight: '1px solid #1e1e1e',
        fontFamily: 'var(--font-geist-mono)',
      }}
    >
      {/* Top rule */}
      <div className="px-3 sm:px-4 pt-2 pb-1" style={{ borderBottom: '1px solid #1e1e1e' }}>
        <div className="text-[0.65rem] sm:text-xs tracking-widest flex justify-between gap-3" style={{ color: '#484848' }}>
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
          style={{ color: '#808080', opacity: 0.7 }}
        >
          [←]
        </button>

        {/* Prev label */}
        <div className="flex-1 text-right">
          <button
            onClick={() => onSelect(prev)}
            className="hidden sm:inline text-xs tracking-widest transition-opacity hover:opacity-60"
            style={{ color: '#303030' }}
          >
            {OBJECTS[prev].shortLabel}
          </button>
        </div>

        {/* Current */}
        <div className="text-center shrink min-w-0 px-2 sm:px-3" style={{ minWidth: 0 }}>
          <div className="text-xs sm:text-sm font-bold tracking-widest leading-tight mb-0.5 break-words" style={{ color: '#c8c8c8' }}>
            {obj.label}
          </div>
          <div className="text-[0.55rem] sm:text-xs tracking-widest break-words" style={{ color: '#484848' }}>
            {obj.class}
          </div>
        </div>

        {/* Next label */}
        <div className="flex-1 text-left">
          <button
            onClick={() => onSelect(next)}
            className="hidden sm:inline text-xs tracking-widest transition-opacity hover:opacity-60"
            style={{ color: '#303030' }}
          >
            {OBJECTS[next].shortLabel}
          </button>
        </div>

        {/* Next arrow */}
        <button
          onClick={() => onSelect(next)}
          className="text-xs tracking-widest transition-opacity hover:opacity-100 shrink-0"
          style={{ color: '#808080', opacity: 0.7 }}
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
                background: i === selectedIndex ? '#808080' : '#303030',
                border: `1px solid ${i === selectedIndex ? '#808080' : '#303030'}`,
              }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
