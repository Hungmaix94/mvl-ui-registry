import type { SelectOption } from '@/components/ui/select/Select'

/** Hình dạng tối thiểu của một chủ đầu tư đủ để dựng option/nhãn cho Select. */
export type InvestorLike = {
  id: number
  code?: string | null
  name?: string | null
}

/**
 * Nhãn hiển thị của chủ đầu tư dạng `"mã - tên"`, có fallback khi thiếu mã hoặc tên.
 * Là formatter DUY NHẤT cho nhãn chủ đầu tư — dùng chung ở `useInvestorSelect` và
 * `InvestorSelectWithCreate` để nhãn không lệch nhau giữa nguồn local và nguồn fetch.
 */
export function buildInvestorLabel(inv: InvestorLike): string {
  const code = (inv.code ?? '').trim()
  const name = (inv.name ?? '').trim()
  return code && name ? `${code} - ${name}` : code || name || String(inv.id)
}

/** Dựng một `SelectOption` cho chủ đầu tư: value là id (string), label theo `buildInvestorLabel`. */
export function buildInvestorOption(inv: InvestorLike): SelectOption {
  return { value: String(inv.id), label: buildInvestorLabel(inv) }
}

/** Query key có thuộc nhóm cache chủ đầu tư không (`['realestate', 'investors', ...]`). */
export function isInvestorQueryKey(queryKey: unknown): boolean {
  return Array.isArray(queryKey) && queryKey[0] === 'realestate' && queryKey[1] === 'investors'
}

// Helpers dùng chung cho mọi picker foreign-key (không riêng chủ đầu tư) — re-export dưới tên
// quen thuộc để nơi gọi hiện tại không phải đổi import.
export {
  toSelectId as toInvestorId,
  mergeSelectOption as mergeInvestorOption,
} from '@/utils/select-option-utils.ts'
