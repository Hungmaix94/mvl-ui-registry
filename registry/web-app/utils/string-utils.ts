// src/utils/string-utils.ts

export function parseLatLongString(
  latLongString: string
): { latitude: number; longitude: number } | null {
  const parts = latLongString.split(',')
  if (parts.length === 2) {
    const latitude = parseFloat(parts[0].trim())
    const longitude = parseFloat(parts[1].trim())
    if (!isNaN(latitude) && !isNaN(longitude)) {
      return { latitude, longitude }
    }
  }
  return null
}

/**
 * Map of Vietnamese diacritics to their non-diacritic equivalents
 */
const diacriticsMap: Record<string, string> = {
  à: 'a',
  á: 'a',
  ạ: 'a',
  ả: 'a',
  ã: 'a',
  â: 'a',
  ầ: 'a',
  ấ: 'a',
  ậ: 'a',
  ẩ: 'a',
  ẫ: 'a',
  ă: 'a',
  ằ: 'a',
  ắ: 'a',
  ặ: 'a',
  ẳ: 'a',
  ẵ: 'a',
  è: 'e',
  é: 'e',
  ẹ: 'e',
  ẻ: 'e',
  ẽ: 'e',
  ê: 'e',
  ề: 'e',
  ế: 'e',
  ệ: 'e',
  ể: 'e',
  ễ: 'e',
  ì: 'i',
  í: 'i',
  ị: 'i',
  ỉ: 'i',
  ĩ: 'i',
  ò: 'o',
  ó: 'o',
  ọ: 'o',
  ỏ: 'o',
  õ: 'o',
  ô: 'o',
  ồ: 'o',
  ố: 'o',
  ộ: 'o',
  ổ: 'o',
  ỗ: 'o',
  ơ: 'o',
  ờ: 'o',
  ớ: 'o',
  ợ: 'o',
  ở: 'o',
  ỡ: 'o',
  ù: 'u',
  ú: 'u',
  ụ: 'u',
  ủ: 'u',
  ũ: 'u',
  ư: 'u',
  ừ: 'u',
  ứ: 'u',
  ự: 'u',
  ử: 'u',
  ữ: 'u',
  ỳ: 'y',
  ý: 'y',
  ỵ: 'y',
  ỷ: 'y',
  ỹ: 'y',
  đ: 'd',
  À: 'A',
  Á: 'A',
  Ạ: 'A',
  Ả: 'A',
  Ã: 'A',
  Â: 'A',
  Ầ: 'A',
  Ấ: 'A',
  Ậ: 'A',
  Ẩ: 'A',
  Ẫ: 'A',
  Ă: 'A',
  Ằ: 'A',
  Ắ: 'A',
  Ặ: 'A',
  Ẳ: 'A',
  Ẵ: 'A',
  È: 'E',
  É: 'E',
  Ẹ: 'E',
  Ẻ: 'E',
  Ẽ: 'E',
  Ê: 'E',
  Ề: 'E',
  Ế: 'E',
  Ệ: 'E',
  Ể: 'E',
  Ễ: 'E',
  Ì: 'I',
  Í: 'I',
  Ị: 'I',
  Ỉ: 'I',
  Ĩ: 'I',
  Ò: 'O',
  Ó: 'O',
  Ọ: 'O',
  Ỏ: 'O',
  Õ: 'O',
  Ô: 'O',
  Ồ: 'O',
  Ố: 'O',
  Ộ: 'O',
  Ổ: 'O',
  Ỗ: 'O',
  Ơ: 'O',
  Ờ: 'O',
  Ớ: 'O',
  Ợ: 'O',
  Ở: 'O',
  Ỡ: 'O',
  Ù: 'U',
  Ú: 'U',
  Ụ: 'U',
  Ủ: 'U',
  Ũ: 'U',
  Ư: 'U',
  Ừ: 'U',
  Ứ: 'U',
  Ự: 'U',
  Ử: 'U',
  Ữ: 'U',
  Ỳ: 'Y',
  Ý: 'Y',
  Ỵ: 'Y',
  Ỷ: 'Y',
  Ỹ: 'Y',
  Đ: 'D',
}

/**
 * Removes Vietnamese diacritics from a string
 * Converts Vietnamese characters with diacritics to their non-diacritic equivalents
 *
 * @param str - The string to remove diacritics from
 * @returns The string with diacritics removed
 *
 * @example
 * removeVietnameseDiacritics('Nguyễn Văn An') // Returns 'Nguyen Van An'
 * removeVietnameseDiacritics('Trần Thị Hương') // Returns 'Tran Thi Huong'
 */
export function removeVietnameseDiacritics(str: string): string {
  return str
    .split('')
    .map((char) => diacriticsMap[char] || char)
    .join('')
}

/**
 * Removes leading zeros from a number string while preserving legitimate single zeros and decimals.
 * e.g., "01" -> "1", "00" -> "0", "-05" -> "-5", "0.5" -> "0.5"
 */
export function removeLeadingZeros(str: string): string {
  if (!str) return str
  return str.replace(/^(-?)0+(?=\d)/, '$1')
}

/**
 * Nhãn chuẩn `Mã - Tên` cho mọi bản ghi có cặp code/name (thông tin bán hàng, ngân hàng,
 * sàn, nhân viên...). Vế nào rỗng thì bỏ luôn cả dấu phân cách — nối chuỗi bằng tay
 * (`` `${code} - ${name ?? ''}` ``) để lại đuôi `" - "` treo khi bản ghi thiếu tên.
 *
 * @example
 * formatCodeNameLabel('SA-2026-002093', 'Bảng hàng - Dự án A') // 'SA-2026-002093 - Bảng hàng - Dự án A'
 * formatCodeNameLabel('SA-2026-002093', null)                  // 'SA-2026-002093'
 * formatCodeNameLabel(null, 'Bảng hàng')                       // 'Bảng hàng'
 * formatCodeNameLabel(null, null, '#12')                       // '#12'
 */
export function formatCodeNameLabel(
  code: string | null | undefined,
  name: string | null | undefined,
  fallback = ''
): string {
  const parts = [code, name].map((part) => part?.trim()).filter((part): part is string => !!part)
  return parts.length > 0 ? parts.join(' - ') : fallback
}
