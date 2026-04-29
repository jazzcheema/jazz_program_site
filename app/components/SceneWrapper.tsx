'use client'

import { useState } from 'react'
import CarpetScene from './CarpetScene'
import InfoPanel from './InfoPanel'
import CloudsPage from './CloudsPage'
import SandPage from './SandPage'
import VortexBackground from './VortexBackground'
import type { ObjectData } from '../data/objects'

const CARPET_DATA: ObjectData = {
  id: 'carpet',
  file: '/models/carpet.glb',
  label: 'TRANSPORT_UNIT_CARPET',
  shortLabel: 'CARPET-01',
  class: 'LOCOMOTION / AERIAL — ENCHANTED',
  status: 'AWAITING_PILOT',
  eqLabel: 'LEVITATION_FREQ / Hz',
  eqBars: [
    { hz: '31Hz',  pct: 92 }, { hz: '63Hz',  pct: 80 },
    { hz: '125Hz', pct: 65 }, { hz: '250Hz', pct: 50 },
    { hz: '500Hz', pct: 38 }, { hz: '1kHz',  pct: 28 },
    { hz: '2kHz',  pct: 20 }, { hz: '4kHz',  pct: 14 },
    { hz: '8kHz',  pct: 9  },
  ],
  specsLabel: 'MISSION_BRIEF',
  specs: [
    ['MISSION',    'FLY CARPET INTO CLOUDS'],
    ['TARGET',     'SECTOR-TR / TOP-RIGHT'],
    ['ALTITUDE',   'CLOUD-LEVEL / HIGH'],
    ['PROPULSION', 'MAGICAL_LEVITATION / CLASS-IV'],
    ['WARNING',    '⚠ CARPET WILL RESIST PILOT'],
    ['CONDITION',  'AIRWORTHY / ENCHANTMENT ACTIVE'],
  ],
  scanLabel: 'MATERIAL_SCAN',
  materials: [
    ['SURFACE_A', 'ENCHNTD_SLK',  'PBR',  'IOR: 1.540'],
    ['SURFACE_B', 'GOLD_THREAD',     '0.92', 'ROUGHNESS: 0.05'],
    ['WEAVE',     'PERSIAN_PTRN', 'PROC', 'DENSITY: 480 TPI'],
    ['ENCHANT',   'CLASS-IV_AURA',   'EMIT', 'LUMINANCE: 0.40'],
  ],
  finePrint: '© 2026 JAZZ.CHEEMA SYSTEMS (INTL) LTD. AERIAL TRANSPORT MANIFEST: CARPET-CLASS-IV / ENCHANTMENT_CERT: AX-8812-CARPET-AERIAL / MISSION: FLY_TO_CLOUDS / TARGET: SECTOR-TR / WARNING: RESISTANCE_EXPECTED / NOT_FOR_COMMERCIAL_USE / PILOT_ASSUMES_ALL_RISK //////// VER.01.09.26',
}

export default function SceneWrapper() {
  const [panelOpen, setPanelOpen] = useState(false)
  const [reached, setReached] = useState(false)
  const [reachedSand, setReachedSand] = useState(false)
  const [flashing, setFlashing] = useState(false)

  const handleReachClouds = () => {
    setPanelOpen(false)
    setFlashing(true)
    setTimeout(() => {
      setReached(true)
      setFlashing(false)
    }, 450)
  }

  const handleReachSandcastle = () => {
    setPanelOpen(false)
    setFlashing(true)
    setTimeout(() => {
      setReachedSand(true)
      setFlashing(false)
    }, 450)
  }

  if (reached) return <CloudsPage />
  if (reachedSand) return <SandPage />

  return (
    <div className="w-dvw h-dvh overflow-hidden relative" style={{ width: '100dvw', height: '100dvh', background: '#0c0c0c' }}>
      <div className="absolute inset-0 pointer-events-none">
        <VortexBackground className="w-full h-full" />
      </div>

      <div className="absolute inset-0">
        <CarpetScene
          onCarpetClick={() => setPanelOpen(true)}
          onReachClouds={handleReachClouds}
          onReachSandcastle={handleReachSandcastle}
        />
      </div>

      <InfoPanel
        open={panelOpen}
        data={CARPET_DATA}
        onClose={() => setPanelOpen(false)}
      />

      {/* White flash on reach */}
      <div
        className="fixed inset-0 pointer-events-none transition-opacity duration-300"
        style={{ background: '#ffffff', opacity: flashing ? 1 : 0, zIndex: 50 }}
      />

      {/* Hint — shown until first interaction */}
      {!panelOpen && (
        <div
          className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 text-[0.65rem] sm:text-xs tracking-widest pointer-events-none text-center"
          style={{
            color: '#282828',
            fontFamily: 'var(--font-geist-mono)',
            width: 'min(34rem, calc(100vw - 32px))',
          }}
        >
          → CLICK CARPET FOR MISSION DATA → DRAG TO CLOUDS OR SANDCASTLE
        </div>
      )}
    </div>
  )
}
