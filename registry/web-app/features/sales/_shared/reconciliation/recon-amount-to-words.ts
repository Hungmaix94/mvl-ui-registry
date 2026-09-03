/**
 * Convert a VND amount to Vietnamese words — e.g. `1_136_300_001` →
 * `"Một tỷ một trăm ba mươi sáu triệu ba trăm nghìn một đồng"`.
 *
 * Rounds to the nearest đồng; `0` → `"Không đồng"`. Negative inputs are converted by magnitude
 * (the caller prepends "Âm" when the amount is negative). Used by the sheet-total summary
 * (`ReconSheetTotalSummary`) — "Tổng kết phiếu đối chiếu" của cả CĐT / F2 / CTV.
 */
export function amountToVietnameseWords(amount: number): string {
  const n = Math.round(amount)
  if (n === 0) return 'Không đồng'

  const ones = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']
  const units = ['', 'nghìn', 'triệu', 'tỷ']

  function twoDigitsToWords(num: number): string {
    const tens = Math.floor(num / 10)
    const onesDigit = num % 10
    if (tens === 0) return onesDigit > 0 ? ones[onesDigit]! : ''
    if (tens === 1) {
      const base = 'mười'
      if (onesDigit === 5) return `${base} lăm`
      if (onesDigit > 0) return `${base} ${ones[onesDigit]}`
      return base
    }
    const base = `${ones[tens]} mươi`
    if (onesDigit === 0) return base
    if (onesDigit === 1) return `${base} mốt`
    if (onesDigit === 5) return `${base} lăm`
    return `${base} ${ones[onesDigit]}`
  }

  function threeDigitsToWords(num: number): string {
    const hundreds = Math.floor(num / 100)
    const rest = num % 100
    const parts: string[] = []
    if (hundreds > 0) {
      parts.push(`${ones[hundreds]} trăm`)
      if (rest === 0) return parts.join(' ')
    }
    if (rest > 0) {
      if (hundreds > 0 && rest < 10) parts.push('lẻ')
      parts.push(twoDigitsToWords(rest))
    }
    return parts.join(' ')
  }

  const groups: number[] = []
  let temp = Math.abs(n)
  while (temp > 0) {
    groups.push(temp % 1000)
    temp = Math.floor(temp / 1000)
  }

  const words: string[] = []
  for (let i = groups.length - 1; i >= 0; i--) {
    const groupVal = groups[i]
    if (!groupVal) continue
    const unit = units[i] ?? ''
    const groupWords = threeDigitsToWords(groupVal)
    words.push(unit ? `${groupWords} ${unit}`.trim() : groupWords)
  }

  const result = words.join(' ').replace(/\s+/g, ' ').trim()
  const cap = result.charAt(0).toUpperCase() + result.slice(1)
  return `${cap} đồng`
}
