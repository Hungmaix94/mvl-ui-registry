import { removeVietnameseDiacritics } from '@/utils/string-utils'

const PREFIXES = ['thành phố ', 'thanh pho ', 'tỉnh ', 'tinh ']

/**
 * Normalize province name for comparison (lowercase, trim, remove prefix, remove diacritics).
 * e.g. "Thành phố Hà Nội" -> "ha noi", "Hà Nội" -> "ha noi"
 */
function normalizeProvinceNameForMatch(s: string): string {
  let t = s.trim().toLowerCase()
  for (const prefix of PREFIXES) {
    if (t.startsWith(prefix)) {
      t = t.slice(prefix.length).trim()
      break
    }
  }
  return removeVietnameseDiacritics(t).trim()
}

/**
 * Resolve saved place_of_birth to an option value when labels differ (e.g. "Hà Nội" -> "Thành phố Hà Nội").
 * Returns the option value that matches, or undefined if no match.
 */
export function resolvePlaceOfBirthToOptionValue(
  savedValue: string | undefined,
  optionValues: string[]
): string | undefined {
  if (!savedValue?.trim() || optionValues.length === 0) return undefined

  const saved = savedValue.trim()
  const normalizedSaved = normalizeProvinceNameForMatch(saved)

  // 1) Exact match
  if (optionValues.includes(saved)) return saved

  // 2) Normalized equality (e.g. "Hà Nội" vs "Thành phố Hà Nội" -> both "ha noi")
  const byNormalized = optionValues.find(
    (opt) => normalizeProvinceNameForMatch(opt) === normalizedSaved
  )
  if (byNormalized) return byNormalized

  // 3) One contains the other (normalized)
  const contained = optionValues.find((opt) => {
    const nOpt = normalizeProvinceNameForMatch(opt)
    return nOpt.includes(normalizedSaved) || normalizedSaved.includes(nOpt)
  })
  return contained
}
