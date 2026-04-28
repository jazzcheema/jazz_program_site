export interface EQBar { hz: string; pct: number }

export interface ObjectData {
  id: string
  file: string
  label: string
  shortLabel: string
  class: string
  status: string
  eqLabel: string
  eqBars: EQBar[]
  specsLabel: string
  specs: [string, string][]
  scanLabel: string
  materials: [string, string, string, string][]
  finePrint: string
}

export const OBJECTS: ObjectData[] = [
  {
    id: 'lamp1',
    file: '/models/lamp1.glb',
    label: 'LAMP_UNIT_001',
    shortLabel: 'LAMP-001',
    class: 'DECORATIVE-FUNCTIONAL / ANCIENT',
    status: 'ACTIVE',
    eqLabel: 'FREQ_SPECTRUM / dB',
    eqBars: [
      { hz: '31Hz',  pct: 28 }, { hz: '63Hz',  pct: 52 },
      { hz: '125Hz', pct: 71 }, { hz: '250Hz', pct: 88 },
      { hz: '500Hz', pct: 95 }, { hz: '1kHz',  pct: 79 },
      { hz: '2kHz',  pct: 61 }, { hz: '4kHz',  pct: 44 },
      { hz: '8kHz',  pct: 22 },
    ],
    specsLabel: 'OBJECT_SPECS',
    specs: [
      ['ORIGIN',       'MESOPOTAMIA / 3200 BCE EST.'],
      ['FUNCTION',     'ENTITY_BINDING_VESSEL'],
      ['LUMINANCE',    '620 LM / 2700K WARM'],
      ['ENTITY_BOUND', 'YES / 1 DJINN ACTIVE'],
      ['WISHES_LEFT',  '03 / 03 REMAINING'],
      ['CONDITION',    'EXCELLENT / POLISHED'],
    ],
    scanLabel: 'MATERIAL_SCAN',
    materials: [
      ['SURFACE_A', 'HAMMERED_BRASS', 'PBR',  'IOR: 1.480'],
      ['SURFACE_B', 'GOLD_LEAF',      '0.95', 'ROUGHNESS: 0.08'],
      ['SURFACE_C', 'OXIDIZED_BASE',  'NULL', 'OPACITY: 1.000'],
      ['TEXTURE',   '2048×2048',      'BC7',  'MIP: 12 LEVELS'],
    ],
    finePrint: '© 2026 JAZZ.CHEEMA SYSTEMS (INTL) LTD. ENTITY BINDING CONTRACT REG: AX-7741-LAMP-CLASS-B / WISH_FULFILLMENT_PROTOCOL: ACTIVE / BINDING_SIGIL: VERIFIED / NOT FOR REDISTRIBUTION / AUTHORISED PERSONNEL ONLY / BUILD: 2026.04.28.001 / LAMP_UNIT_001 / VER.01.09.26 ////////',
  },
  {
    id: 'lamp2',
    file: '/models/lamp2.glb',
    label: 'LAMP_UNIT_002',
    shortLabel: 'LAMP-002',
    class: 'DECORATIVE-FUNCTIONAL / VARIANT',
    status: 'ACTIVE',
    eqLabel: 'FREQ_SPECTRUM / dB',
    eqBars: [
      { hz: '31Hz',  pct: 35 }, { hz: '63Hz',  pct: 60 },
      { hz: '125Hz', pct: 80 }, { hz: '250Hz', pct: 75 },
      { hz: '500Hz', pct: 68 }, { hz: '1kHz',  pct: 72 },
      { hz: '2kHz',  pct: 58 }, { hz: '4kHz',  pct: 42 },
      { hz: '8kHz',  pct: 19 },
    ],
    specsLabel: 'OBJECT_SPECS',
    specs: [
      ['ORIGIN',       'PERSIA / 1100 CE EST.'],
      ['FUNCTION',     'ENTITY_BINDING_VESSEL (VARIANT)'],
      ['LUMINANCE',    '480 LM / 3000K NEUTRAL'],
      ['ENTITY_BOUND', 'UNKNOWN / UNVERIFIED'],
      ['WISHES_LEFT',  'UNKNOWN / NO_DATA'],
      ['CONDITION',    'WORN / SERVICEABLE'],
    ],
    scanLabel: 'MATERIAL_SCAN',
    materials: [
      ['SURFACE_A', 'CAST_IRON',       'PBR',  'IOR: 2.910'],
      ['SURFACE_B', 'TARNISHED_COPPER','0.70', 'ROUGHNESS: 0.38'],
      ['SURFACE_C', 'AGED_PATINA',     'NULL', 'OPACITY: 1.000'],
      ['TEXTURE',   '2048×2048',       'BC7',  'MIP: 12 LEVELS'],
    ],
    finePrint: '© 2026 JAZZ.CHEEMA SYSTEMS (INTL) LTD. ENTITY BINDING CONTRACT STATUS: UNVERIFIED / BINDING_SIGIL: DEGRADED / PROVENANCE_CERT: AX-7742-LAMP-CLASS-B-VARIANT / NOT FOR REDISTRIBUTION / CONDITION_LOG: WORN_004 / BUILD: 2026.04.28.001 ////////',
  },
  {
    id: 'genie1',
    file: '/models/genie1.glb',
    label: 'ENTITY_DJINN_ALPHA',
    shortLabel: 'DJINN-α',
    class: 'SUPERNATURAL / TIER-1 GRAND_DJINN',
    status: '[BOUND — ACTIVE]',
    eqLabel: 'MANA_OSCILLATION / Hz',
    eqBars: [
      { hz: '31Hz',  pct: 45 }, { hz: '63Hz',  pct: 62 },
      { hz: '125Hz', pct: 78 }, { hz: '250Hz', pct: 85 },
      { hz: '500Hz', pct: 92 }, { hz: '1kHz',  pct: 97 },
      { hz: '2kHz',  pct: 88 }, { hz: '4kHz',  pct: 72 },
      { hz: '8kHz',  pct: 65 },
    ],
    specsLabel: 'ENTITY_PROFILE',
    specs: [
      ['ORIGIN',        'ETHERIC_PLANE_7 / DEEP_STRATUM'],
      ['RANK',          'TIER-1 / GRAND_DJINN'],
      ['MANA_CAPACITY', '8,200 UNITS / 82% CHARGED'],
      ['WISH_COUNT',    '03 / 03 REMAINING'],
      ['THREAT_LEVEL',  '[BENIGN — CURRENTLY BOUND]'],
      ['ELEMENT',       'FIRE + AIR / DUAL_AFFINITY'],
    ],
    scanLabel: 'ENTITY_COMPOSITION',
    materials: [
      ['LAYER_A', 'ETHERIC_PLASMA',   '∞',    'IOR: 2.840'],
      ['LAYER_B', 'SMOKE_CONDENSATE', '0.00', 'TRANSLUCENCY: 0.72'],
      ['EMISSION','[ACTIVE]',         '680nm', 'INTENSITY: 4.20'],
      ['FORM',    'SEMI_CORPOREAL',   'PROC',  'STABILITY: 94%'],
    ],
    finePrint: '© 2026 JAZZ.CHEEMA SYSTEMS (INTL) LTD. SUPERNATURAL ENTITY CLASSIFICATION FILE: DJINN-ALPHA-TIER1 / BINDING_CONTRACT: LAMP_UNIT_001-AX-7741 / WISH_PROTOCOL: ACTIVE / MANA_SEAL: VERIFIED / CONTAINMENT_LEVEL: GREEN / ETHERIC_PLANE_ACCESS: RESTRICTED / AUTHORISED_PERSONNEL_ONLY //////// VER.01.09.26',
  },
  {
    id: 'genie2',
    file: '/models/genie2.glb',
    label: 'ENTITY_DJINN_BETA',
    shortLabel: 'DJINN-β',
    class: 'SUPERNATURAL / TIER-2 LESSER_DJINN',
    status: '[SEMI-BOUND — CAUTION]',
    eqLabel: 'MANA_OSCILLATION / Hz',
    eqBars: [
      { hz: '31Hz',  pct: 30 }, { hz: '63Hz',  pct: 55 },
      { hz: '125Hz', pct: 70 }, { hz: '250Hz', pct: 60 },
      { hz: '500Hz', pct: 75 }, { hz: '1kHz',  pct: 68 },
      { hz: '2kHz',  pct: 55 }, { hz: '4kHz',  pct: 48 },
      { hz: '8kHz',  pct: 35 },
    ],
    specsLabel: 'ENTITY_PROFILE',
    specs: [
      ['ORIGIN',        'ETHERIC_PLANE_4 / MID_STRATUM'],
      ['RANK',          'TIER-2 / LESSER_DJINN'],
      ['MANA_CAPACITY', '4,400 UNITS / 44% CHARGED'],
      ['WISH_COUNT',    '01 / 03 REMAINING'],
      ['THREAT_LEVEL',  '[MODERATE — SEMI-BOUND]'],
      ['ELEMENT',       'AIR / SINGLE_AFFINITY'],
    ],
    scanLabel: 'ENTITY_COMPOSITION',
    materials: [
      ['LAYER_A', 'ETHERIC_MIST',    '0.62', 'IOR: 1.980'],
      ['LAYER_B', 'SEMI_SOLID',      '0.00', 'TRANSLUCENCY: 0.55'],
      ['EMISSION','[INTERMITTENT]',  '520nm', 'INTENSITY: 2.10'],
      ['FORM',    'SEMI_CORPOREAL',  'PROC',  'STABILITY: 61%'],
    ],
    finePrint: '© 2026 JAZZ.CHEEMA SYSTEMS (INTL) LTD. SUPERNATURAL ENTITY CLASSIFICATION FILE: DJINN-BETA-TIER2 / WISH_PROTOCOL: PARTIALLY_EXHAUSTED / MANA_SEAL: DEGRADED / CONTAINMENT_LEVEL: AMBER / ⚠ SEMI-BINDING WARNING: INCREASED MONITORING REQUIRED //////// VER.01.09.26',
  },
  {
    id: 'genie3',
    file: '/models/genie3.glb',
    label: 'ENTITY_DJINN_GAMMA',
    shortLabel: 'DJINN-γ',
    class: 'SUPERNATURAL / TIER-3 MINOR_DJINN',
    status: '[DEPLETED — DORMANT]',
    eqLabel: 'MANA_OSCILLATION / Hz',
    eqBars: [
      { hz: '31Hz',  pct: 8  }, { hz: '63Hz',  pct: 12 },
      { hz: '125Hz', pct: 15 }, { hz: '250Hz', pct: 18 },
      { hz: '500Hz', pct: 20 }, { hz: '1kHz',  pct: 14 },
      { hz: '2kHz',  pct: 10 }, { hz: '4kHz',  pct: 7  },
      { hz: '8kHz',  pct: 5  },
    ],
    specsLabel: 'ENTITY_PROFILE',
    specs: [
      ['ORIGIN',        'ETHERIC_PLANE_2 / SHALLOW_STRATUM'],
      ['RANK',          'TIER-3 / MINOR_DJINN'],
      ['MANA_CAPACITY', '800 UNITS / 8% — CRITICAL'],
      ['WISH_COUNT',    '00 / 03 EXHAUSTED'],
      ['THREAT_LEVEL',  '[DEPLETED — DORMANT / INERT]'],
      ['ELEMENT',       'SMOKE / RESIDUAL_ONLY'],
    ],
    scanLabel: 'ENTITY_COMPOSITION',
    materials: [
      ['LAYER_A', 'DISSIPATING_SMOKE', '0.08', 'IOR: 1.002'],
      ['LAYER_B', 'TRACE_ELEMENTS',    '0.00', 'TRANSLUCENCY: 0.95'],
      ['EMISSION','[INACTIVE]',        'NULL', 'INTENSITY: 0.02'],
      ['FORM',    'NEAR_INCORPOREAL',  'PROC', 'STABILITY: 8%'],
    ],
    finePrint: '© 2026 JAZZ.CHEEMA SYSTEMS (INTL) LTD. ENTITY STATUS: DEPLETED / WISHES_EXHAUSTED: TRUE / MANA_SEAL: COLLAPSED / CONTAINMENT_LEVEL: WHITE — NO_RISK / SCHEDULED_FOR_ETHERIC_RECHARGE: PENDING / DO_NOT_INTERACT //////// VER.01.09.26',
  },
  {
    id: 'carpet',
    file: '/models/carpet.glb',
    label: 'TRANSPORT_UNIT_CARPET',
    shortLabel: 'CARPET-01',
    class: 'LOCOMOTION / AERIAL — ENCHANTED',
    status: 'AIRWORTHY',
    eqLabel: 'LEVITATION_FREQ / Hz',
    eqBars: [
      { hz: '31Hz',  pct: 92 }, { hz: '63Hz',  pct: 80 },
      { hz: '125Hz', pct: 65 }, { hz: '250Hz', pct: 50 },
      { hz: '500Hz', pct: 38 }, { hz: '1kHz',  pct: 28 },
      { hz: '2kHz',  pct: 20 }, { hz: '4kHz',  pct: 14 },
      { hz: '8kHz',  pct: 9  },
    ],
    specsLabel: 'VEHICLE_SPECS',
    specs: [
      ['ORIGIN',        'PERSIA / 900 CE EST.'],
      ['PROPULSION',    'MAGICAL_LEVITATION / CLASS-IV'],
      ['MAX_ALTITUDE',  '8,000 M ASL'],
      ['MAX_VELOCITY',  '240 KM/H CRUISE / 310 KM/H PEAK'],
      ['CARGO',         '2 PERSONS / 120 KG MAX LOAD'],
      ['CERT_STATUS',   'AIRWORTHY / ENCHANTMENT VALID'],
    ],
    scanLabel: 'MATERIAL_SCAN',
    materials: [
      ['SURFACE_A', 'ENCHANTED_SILK',  'PBR',  'IOR: 1.540'],
      ['SURFACE_B', 'GOLD_THREAD',     '0.92', 'ROUGHNESS: 0.05'],
      ['WEAVE',     'PERSIAN_PATTERN', 'PROC', 'DENSITY: 480 TPI'],
      ['ENCHANT',   'CLASS-IV_AURA',   'EMIT', 'LUMINANCE: 0.40'],
    ],
    finePrint: '© 2026 JAZZ.CHEEMA SYSTEMS (INTL) LTD. AERIAL TRANSPORT MANIFEST: CARPET-CLASS-IV / ENCHANTMENT_CERT: AX-8812-CARPET-AERIAL / FLIGHT_LOG: ACTIVE / MAX_LOAD: 120KG / INSURANCE: JAZZ.CHEEMA_AERIAL_COVERAGE_PLAN_B / NOT_FOR_COMMERCIAL_USE //////// VER.01.09.26',
  },
]
