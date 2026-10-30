import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MapPoint } from '../api/types'
import { CHART_H, CHART_W, CROATIA, NEIGHBOURS, RATE_CLASSES, project, rateClass } from '../lib/chart'
import { eur } from '../lib/format'

export interface Sounding {
  code: number
  name: string
  lat: number
  lon: number
  rate: number | null
}

interface Props {
  points: MapPoint[]
  /** The position fix: the address (or municipality) being looked at. */
  fix?: { lat: number; lon: number; label: string } | null
  /** Neighbouring rates, set around the fix like depth soundings on a chart. */
  soundings?: Sounding[]
  /** Municipality to emphasise (hovered in a list, or the one being shown). */
  highlight?: number | null
  onOpen?: (code: number) => void
  onHover?: (code: number | null) => void
  /** Show the name/rate tip for `highlight` too (lists that drive the map). */
  highlightTip?: boolean
}

type Box = [number, number, number, number]
const FULL: Box = [-10, 0, CHART_W + 20, CHART_H]
const ZOOM_W = 380

/** Chart of Croatia with every municipality as a sounding of its per-bed rate. */
export function ChartMap({ points, fix, soundings = [], highlight, onOpen, onHover, highlightTip = false }: Props) {
  const { t } = useTranslation()
  const [zoomed, setZoomed] = useState(true)
  const [hover, setHover] = useState<number | null>(null)
  const fixXY = fix ? project(fix.lat, fix.lon) : null
  const fx = fixXY?.[0]
  const fy = fixXY?.[1]

  const zh = (ZOOM_W * CHART_H) / CHART_W
  const target: Box = fx == null || fy == null || !zoomed ? FULL : [fx - ZOOM_W / 2, fy - zh / 2, ZOOM_W, zh]
  const box = useAnimatedBox(...target)
  const k = box[2] / CHART_W // user units per "full view" unit: keeps marks the same size on screen
  const dotR = Math.max(5.2 * k * 1.25, 2.4)

  const shown = hover ?? highlight ?? null
  const tipCode = hover ?? (highlightTip ? (highlight ?? null) : null)
  const hovered = tipCode != null ? points.find((p) => p.code === tipCode) : undefined

  return (
    <div className="relative h-full min-h-[22rem] w-full overflow-hidden rounded-[1.25rem] bg-[var(--sea)]">
      <svg
        viewBox={box.join(' ')}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={t('chart.label', { count: points.length })}
        onPointerLeave={() => {
          setHover(null)
          onHover?.(null)
        }}
      >
        <rect x={-2000} y={-2000} width={5000} height={5000} fill="var(--sea)" />
        {/* isobaths: the coast drawn again in wider, paler strokes */}
        {[
          [34, 'var(--iso-1)'],
          [18, 'var(--iso-2)'],
          [7, 'var(--iso-3)'],
        ].map(([w, c]) => (
          <path
            key={w}
            d={CROATIA}
            fill="none"
            stroke={c as string}
            strokeWidth={w as number}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {NEIGHBOURS.map((d, i) => (
          <path key={i} d={d} fill="var(--land-other)" stroke="var(--land-other-edge)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        <path d={CROATIA} fill="var(--land)" stroke="var(--land-edge)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />

        {!fix && (
          <text
            x={170}
            y={720}
            className="display"
            fontStyle="italic"
            fontSize={30}
            fill="var(--sounding)"
            transform="rotate(38 170 720)"
          >
            {t('chart.sea')}
          </text>
        )}

        {points.map((p) => {
          const [x, y] = project(p.lat, p.lon)
          const rate = p.rate_bed ?? p.rate_max
          const cls = rate != null ? rateClass(rate) : null
          const several = p.rate_bed == null && p.rate_max != null
          const active = shown === p.code
          return (
            <circle
              key={p.code}
              cx={x}
              cy={y}
              r={active ? dotR * 1.7 : dotR}
              fill={several || !cls ? 'var(--surface)' : cls.fill}
              stroke={several && cls ? cls.fill : cls?.edge === 'none' ? 'none' : 'var(--rate-1-edge)'}
              strokeWidth={several ? dotR * 0.55 : dotR * 0.18}
              className={onOpen ? 'cursor-pointer' : undefined}
              onPointerEnter={() => {
                setHover(p.code)
                onHover?.(p.code)
              }}
              onClick={onOpen ? () => onOpen(p.code) : undefined}
            />
          )
        })}

        {fixXY &&
          placeSoundings(soundings, fixXY, dotR, 17 * k * 1.6).map(({ s, x, y }) => {
            return (
              <text
                key={`${s.code}-${fix?.label}`}
                x={x}
                y={y}
                className="display sounding"
                fontStyle="italic"
                fontSize={17 * k * 1.6}
                fill="var(--sounding)"
                paintOrder="stroke"
                stroke="var(--sea)"
                strokeWidth={4 * k}
              >
                {Math.round(s.rate!)}
              </text>
            )
          })}

        {fixXY && (
          <g key={fix!.label} pointerEvents="none">
            <circle className="fix-ring" cx={fixXY[0]} cy={fixXY[1]} r={13 * k * 1.4} fill="var(--surface)" stroke="var(--fix)" strokeWidth={4.5 * k * 1.4} />
            <circle cx={fixXY[0]} cy={fixXY[1]} r={3.6 * k * 1.4} fill="var(--fix)" />
          </g>
        )}
      </svg>

      {hovered && (
        <Tip point={hovered} box={box} />
      )}

      <div className="pointer-events-none absolute inset-x-4 top-4 flex items-start justify-between gap-3">
        <p className="pointer-events-auto rounded-lg bg-surface/90 px-3 py-1.5 text-sm font-semibold">{t('chart.title')}</p>
        {fix && (
          <button
            type="button"
            onClick={() => setZoomed((z) => !z)}
            className="press pointer-events-auto rounded-full bg-surface/90 px-3.5 py-1.5 text-sm font-semibold text-ink hover:bg-surface"
          >
            {zoomed ? t('chart.zoomOut') : t('chart.zoomIn')}
          </button>
        )}
      </div>

      <Legend fix={!!fix} hasSoundings={!!fix && soundings.some((s) => s.rate != null)} />
    </div>
  )
}

function Tip({ point, box }: { point: MapPoint; box: Box }) {
  const { t } = useTranslation()
  const [x, y] = project(point.lat, point.lon)
  const left = ((x - box[0]) / box[2]) * 100
  const top = ((y - box[1]) / box[3]) * 100
  const rate =
    point.rate_bed != null
      ? t('chart.perBed', { amount: eur(point.rate_bed) })
      : point.rate_min != null && point.rate_max != null
        ? t('chart.rangePerBed', { from: eur(point.rate_min), to: eur(point.rate_max) })
        : t('chart.noRate')
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+14px)] whitespace-nowrap rounded-lg bg-brand px-3 py-2 text-sm text-on-brand shadow-[0_6px_18px_rgb(10_25_40/0.25)]"
      style={{ left: `${left}%`, top: `${top}%` }}
      role="status"
    >
      <span className="font-semibold">{point.name}</span>
      <span className="text-on-brand-muted"> · {rate}</span>
    </div>
  )
}

function Legend({ fix, hasSoundings }: { fix: boolean; hasSoundings: boolean }) {
  const { t } = useTranslation()
  const labels = [
    t('chart.upTo', { amount: eur(50) }),
    t('chart.between', { from: 50, to: eur(100) }),
    t('chart.between', { from: 100, to: eur(200) }),
    t('chart.andMore', { amount: eur(200) }),
  ]
  return (
    <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-1.5 sm:right-auto">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 rounded-xl bg-surface/92 px-3.5 py-2.5 text-[0.8rem]">
        {RATE_CLASSES.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3">
              <circle cx="6" cy="6" r="5" fill={c.fill} stroke={c.edge === 'none' ? 'none' : c.edge} />
            </svg>
            {labels[i]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3">
            <circle cx="6" cy="6" r="4" fill="var(--surface)" stroke="var(--rate-3)" strokeWidth="2.5" />
          </svg>
          {t('chart.several')}
        </span>
        {fix && (
          <span className="flex items-center gap-1.5 font-semibold text-fix">
            <svg aria-hidden="true" viewBox="0 0 14 14" className="h-3.5 w-3.5">
              <circle cx="7" cy="7" r="5.2" fill="var(--surface)" stroke="var(--fix)" strokeWidth="2.4" />
              <circle cx="7" cy="7" r="1.6" fill="var(--fix)" />
            </svg>
            {t('chart.yourAddress')}
          </span>
        )}
      </div>
      {hasSoundings && (
        <p className="self-start rounded-lg bg-surface/92 px-3 py-1.5 text-[0.8rem] text-sounding">
          <span className="display mr-1 italic">150</span> {t('chart.neighbours')}
        </p>
      )}
    </div>
  )
}

/** Eases the SVG viewBox towards the target box (a chart "zooming" onto the fix). */
function useAnimatedBox(x: number, y: number, w: number, h: number): Box {
  const [box, setBox] = useState<Box>([x, y, w, h])
  const current = useRef<Box>([x, y, w, h])
  useEffect(() => {
    const target: Box = [x, y, w, h]
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const from = current.current
    const start = performance.now()
    const dur = reduce ? 0 : 650
    let raf = 0
    const step = (now: number) => {
      const p = dur === 0 ? 1 : Math.min(1, (now - start) / dur)
      const e = 1 - Math.pow(1 - p, 4)
      const next = from.map((v, i) => v + (target[i] - v) * e) as Box
      current.current = next
      setBox(next)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [x, y, w, h])
  return box
}

/**
 * Puts each neighbour's rate beside its dot without overlapping the other figures or the fix,
 * trying the four corners around the dot in turn (like a chart's sounding labels).
 */
function placeSoundings(soundings: Sounding[], fix: [number, number], dotR: number, size: number) {
  type Rect = [number, number, number, number]
  const taken: Rect[] = [[fix[0] - size, fix[1] - size, fix[0] + size, fix[1] + size]]
  const pad = size * 0.3
  const hit = (a: Rect) =>
    taken.some((b) => a[0] - pad < b[2] && a[2] + pad > b[0] && a[1] - pad < b[3] && a[3] + pad > b[1])
  const out: { s: Sounding; x: number; y: number }[] = []
  for (const s of soundings) {
    if (s.rate == null) continue
    const [cx, cy] = project(s.lat, s.lon)
    const w = String(Math.round(s.rate)).length * size * 0.56
    const h = size * 0.8
    const gap = dotR * 1.4
    const spots: [number, number][] = [
      [cx + gap, cy - gap * 0.4],
      [cx + gap, cy + h + gap * 0.2],
      [cx - gap - w, cy - gap * 0.4],
      [cx - gap - w, cy + h + gap * 0.2],
      [cx - w / 2, cy - gap - h * 0.2],
      [cx - w / 2, cy + gap + h],
    ]
    for (const [x, y] of spots) {
      const r: Rect = [x, y - h, x + w, y]
      if (!hit(r)) {
        taken.push(r)
        out.push({ s, x, y })
        break
      }
    }
  }
  return out
}
