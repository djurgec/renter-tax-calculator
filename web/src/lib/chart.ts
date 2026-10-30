import geo from './croatia.json'

/** Same equirectangular projection the outline in croatia.json was drawn with. */
const LON0 = 13.2
const LON1 = 19.6
const LAT0 = 42.25
const LAT1 = 46.7

export const CHART_W: number = geo.W
export const CHART_H: number = geo.H
export const CROATIA: string = geo.croatia
export const NEIGHBOURS: string[] = geo.neighbours

export function project(lat: number, lon: number): [number, number] {
  return [((lon - LON0) / (LON1 - LON0)) * CHART_W, ((LAT1 - lat) / (LAT1 - LAT0)) * CHART_H]
}

/** Rate classes for the per-bed flat-rate tax; the legend and the dots share them. */
export const RATE_CLASSES = [
  { max: 50, fill: 'var(--rate-1)', edge: 'var(--rate-1-edge)' },
  { max: 100, fill: 'var(--rate-2)', edge: 'none' },
  { max: 200, fill: 'var(--rate-3)', edge: 'none' },
  { max: Infinity, fill: 'var(--rate-4)', edge: 'none' },
] as const

export function rateClass(rate: number) {
  return RATE_CLASSES.find((c) => rate < c.max) ?? RATE_CLASSES[RATE_CLASSES.length - 1]
}
