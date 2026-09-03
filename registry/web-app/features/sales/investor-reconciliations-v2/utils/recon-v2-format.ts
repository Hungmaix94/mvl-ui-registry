import { formatCurrencyVND } from '@/utils/common'

export function vnd(value: number): string {
  return `${formatCurrencyVND(value, { maximumFractionDigits: 0 })} VNĐ`
}

export function numOrNull(value: string | null | undefined): number | null {
  if (value == null || value === '') return null
  return Number(value)
}

/** "0" amt nghĩa là "không có số cố định" (XOR với %) — coi như null để nhánh % giữ vai trò chính. */
export function amtOrNull(value: string | null | undefined): number | null {
  const n = numOrNull(value)
  return n != null && n !== 0 ? n : null
}
