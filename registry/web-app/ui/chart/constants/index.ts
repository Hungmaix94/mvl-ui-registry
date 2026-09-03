import { globalColors } from '@/assets/theme'

export const RADIAN = Math.PI / 180

const shadeKeys = ['30', '40', '50', '60', '70', '80'] as const
const excludedFamilies = new Set(['neutral', 'brand'])
export const COLOR_PALETTE = Object.entries(globalColors)
  .filter(([family]) => !excludedFamilies.has(family))
  .map(([family, shades]) => ({
    family,
    swatches: shadeKeys.map((shade) => {
      const value = (shades as Record<string, string>)[shade]
      return { shade, value }
    }),
  }))
  .reduce((result, item) => {
    item.swatches.forEach((color) => {
      result.set(`${item.family}-${color.shade}`, {
        backgroundColor: color.value,
        textColor: ['20', '30', '40', '50'].includes(color.shade) ? '#000000' : '#ffffff',
      })
    })
    return result
  }, new Map<string, { backgroundColor: string; textColor: string }>())
