/**
 * Layout maths for category (X) axis tick labels.
 *
 * Recharts hides tick labels that would overlap their neighbour, which leaves blank
 * slots under the bars as soon as the plot area narrows (browser zoom, small screens).
 * Charts therefore render every tick (`interval={0}`) and use these helpers to pick a
 * layout that actually fits: wrap onto a couple of lines while the category band is
 * wide enough, rotate the labels once wrapping would shred them into too many lines.
 */

/** Approximate glyph width of the 12px tick font, as a ratio of the font size. */
const AVG_CHAR_WIDTH_RATIO = 0.58
/** Breathing room so a wrapped label never touches the neighbouring category. */
const TICK_HORIZONTAL_PADDING = 8
/** Room below the last label line (tick margin + descenders). */
const TICK_VERTICAL_PADDING = 24
/** Wrapping past this many lines shreds words, so rotate the labels instead. */
const MAX_HORIZONTAL_TICK_LINES = 2
/** Bottom margin that fits one or two horizontal label lines (the previous fixed value). */
const DEFAULT_BOTTOM_MARGIN = 60
const MAX_BOTTOM_MARGIN = 170
const MAX_EXTRA_LEFT_MARGIN = 120

export const TICK_FONT_SIZE = 12
export const TICK_LINE_HEIGHT = 14
/** Rotation applied to X ticks that cannot fit horizontally (matches CustomBarChart). */
export const TICK_ROTATE_DEGREE = -32

const ROTATE_RADIAN = (Math.abs(TICK_ROTATE_DEGREE) * Math.PI) / 180
const ROTATE_COS = Math.cos(ROTATE_RADIAN)
const ROTATE_SIN = Math.sin(ROTATE_RADIAN)

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Estimated rendered width (px) of `text` at `fontSize`. */
export function estimateTextWidth(text: string, fontSize = TICK_FONT_SIZE): number {
  return text.length * fontSize * AVG_CHAR_WIDTH_RATIO
}

/** Split `text` into lines that each fit within `maxWidthPx`. */
export function wrapTextToLines(
  text: string,
  maxWidthPx: number,
  fontSize = TICK_FONT_SIZE
): string[] {
  const avgCharWidth = fontSize * AVG_CHAR_WIDTH_RATIO
  const maxCharsPerLine = Math.max(1, Math.floor(maxWidthPx / avgCharWidth))
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return [text]

  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine
    } else {
      if (currentLine) lines.push(currentLine)
      if (word.length > maxCharsPerLine) {
        for (let i = 0; i < word.length; i += maxCharsPerLine) {
          lines.push(word.slice(i, i + maxCharsPerLine))
        }
        currentLine = ''
      } else {
        currentLine = word
      }
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

export type XAxisTickLayoutInput = {
  /** Category labels, in axis order. */
  labels: string[]
  /** Width (px) of the plotting area: container width minus margins and Y axis widths. */
  plotWidth: number
  /** Space (px) between the container's left edge and the plotting area. */
  leftOffset: number
  fontSize?: number
}

export type XAxisTickLayout = {
  /** Render each label on one rotated line instead of wrapping it horizontally. */
  shouldRotate: boolean
  /** Max width (px) a horizontal label may use. `0` means "unknown — do not wrap". */
  labelWidth: number
  /** Chart bottom margin needed for the resulting labels. */
  bottomMargin: number
  /** Extra left margin so the first rotated label is not cut off by the container edge. */
  extraLeftMargin: number
}

const UNMEASURED_LAYOUT: XAxisTickLayout = {
  shouldRotate: false,
  labelWidth: 0,
  bottomMargin: DEFAULT_BOTTOM_MARGIN,
  extraLeftMargin: 0,
}

/**
 * Pick the X axis tick layout for `labels` given the measured plot width.
 * Falls back to plain single-line labels while the container width is still unknown
 * (`plotWidth <= 0`); callers that HAVE measured a container narrower than the chart
 * chrome must pass a small positive width so the labels rotate instead of overlapping.
 */
export function getXAxisTickLayout({
  labels,
  plotWidth,
  leftOffset,
  fontSize = TICK_FONT_SIZE,
}: XAxisTickLayoutInput): XAxisTickLayout {
  if (labels.length === 0 || plotWidth <= 0) {
    return UNMEASURED_LAYOUT
  }

  const bandWidth = plotWidth / labels.length
  const labelWidth = Math.max(0, bandWidth - TICK_HORIZONTAL_PADDING)
  const maxLines = labels.reduce(
    (acc, label) => Math.max(acc, wrapTextToLines(label, labelWidth, fontSize).length),
    0
  )

  if (maxLines <= MAX_HORIZONTAL_TICK_LINES) {
    return {
      shouldRotate: false,
      labelWidth,
      bottomMargin: Math.max(
        DEFAULT_BOTTOM_MARGIN,
        TICK_VERTICAL_PADDING + maxLines * TICK_LINE_HEIGHT
      ),
      extraLeftMargin: 0,
    }
  }

  const longestLabelWidth = labels.reduce(
    (acc, label) => Math.max(acc, estimateTextWidth(label, fontSize)),
    0
  )
  // Rotated text runs down-left from its anchor: it needs vertical room below the axis
  // and, for the first category, horizontal room to the left of the plotting area.
  const bottomMargin = clamp(
    Math.ceil(longestLabelWidth * ROTATE_SIN) + 2 * TICK_LINE_HEIGHT,
    DEFAULT_BOTTOM_MARGIN,
    MAX_BOTTOM_MARGIN
  )
  const firstLabelReach = estimateTextWidth(labels[0], fontSize) * ROTATE_COS
  const extraLeftMargin = clamp(
    Math.ceil(firstLabelReach - leftOffset - bandWidth / 2),
    0,
    MAX_EXTRA_LEFT_MARGIN
  )

  return { shouldRotate: true, labelWidth: 0, bottomMargin, extraLeftMargin }
}

/**
 * Text lines to draw for one tick under `layout`. Rotated labels always stay on a single
 * line (rotation already buys the room); an unmeasured layout also stays single-line so the
 * first paint never wraps a label into one character per line.
 */
export function getTickLines(label: string, layout: XAxisTickLayout): string[] {
  if (layout.shouldRotate || layout.labelWidth <= 0) {
    return [label]
  }
  return wrapTextToLines(label, layout.labelWidth)
}
