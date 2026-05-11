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
