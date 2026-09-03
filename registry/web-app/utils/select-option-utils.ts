import type { SelectOption } from '@/components/ui/select/Select'

/**
 * Chuẩn hoá giá trị `onChange` của `Select` (single-select) về một id dạng number, hoặc null khi
 * rỗng/clear. Dùng chung cho các picker foreign-key bọc `Select`.
 */
export function toSelectId(next: string | number | (string | number)[] | null): number | null {
  const raw = Array.isArray(next) ? next[0] : next
  return raw != null && raw !== '' ? Number(raw) : null
}

/** Thêm một option lên đầu danh sách, loại trùng theo `value` (immutable). */
export function mergeSelectOption(prev: SelectOption[], option: SelectOption): SelectOption[] {
  return [option, ...prev.filter((o) => o.value !== option.value)]
}
