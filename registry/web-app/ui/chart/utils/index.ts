import { COLOR_PALETTE } from '../../../ui/chart/constants'

type PaletteColor = { backgroundColor: string; textColor: string }

const DEFAULT_COLOR: PaletteColor = {
  backgroundColor: '#bfbfbf',
  textColor: '#1f2937',
}

const rawPaletteEntries = Array.from(COLOR_PALETTE.entries())

const harmonizedPalette = (() => {
  if (rawPaletteEntries.length === 0) {
    return [] as PaletteColor[]
  }

  const familyColors = rawPaletteEntries.reduce((map, [key, color]) => {
    const [family, shade] = key.split('-')
    if (!family || !shade) {
      return map
    }

    const familyList = map.get(family) ?? []
    familyList.push({ shade, color })
    map.set(family, familyList)
    return map
  }, new Map<string, Array<{ shade: string; color: PaletteColor }>>())

  const preferredShades = ['40', '50', '30']
  const fallbackShades = ['60']

  const families = Array.from(familyColors.entries())
  // .sort((a, b) => a[0].localeCompare(b[0]))
  const result: PaletteColor[] = []

  const pushByShades = (shades: string[]) => {
    shades.forEach((shade) => {
      families.forEach(([, colors]) => {
        const match = colors.find((item) => item.shade === shade)
        if (match && !result.includes(match.color)) {
          result.push(match.color)
        }
      })
    })
  }

  pushByShades(preferredShades)
  pushByShades(fallbackShades)

  families.forEach(([, colors]) => {
    colors.forEach(({ color }) => {
      if (!result.includes(color)) {
        result.push(color)
      }
    })
  })

  return result
})()

const paletteEntries =
  harmonizedPalette.length > 0 ? harmonizedPalette : rawPaletteEntries.map(([, color]) => color)

export const getColorForLabelByIndex = (index: number) => {
  if (paletteEntries.length === 0) {
    return DEFAULT_COLOR
  }

  const paletteLength = paletteEntries.length
  const normalizedIndex = index % paletteLength
  return paletteEntries[normalizedIndex] ?? DEFAULT_COLOR
}
