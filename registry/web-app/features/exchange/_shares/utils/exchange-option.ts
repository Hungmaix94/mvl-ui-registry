import type { SelectOption } from '@/components/ui/select/Select'

/** Hình dạng tối thiểu của một sàn đủ để dựng option/nhãn cho Select. */
export type ExchangeLike = {
  id: number
  code?: string | null
  name?: string | null
}

/**
 * Nhãn hiển thị của sàn dạng `"tên (mã)"`, khớp với nhãn mà loader source-exchange sinh ra, có
 * fallback khi thiếu tên hoặc mã. Là formatter DUY NHẤT cho nhãn sàn.
 */
export function buildExchangeLabel(ex: ExchangeLike): string {
  const name = (ex.name ?? '').trim()
  const code = (ex.code ?? '').trim()
  return name && code ? `${name} (${code})` : name || code || String(ex.id)
}

/** Dựng một `SelectOption` cho sàn: value là id (string), label theo `buildExchangeLabel`. */
export function buildExchangeOption(ex: ExchangeLike): SelectOption {
  return { value: String(ex.id), label: buildExchangeLabel(ex) }
}

/** Query key có thuộc nhóm cache nguồn sàn (F0) không (`['realestate', 'source-exchanges', ...]`). */
export function isSourceExchangeQueryKey(queryKey: unknown): boolean {
  return (
    Array.isArray(queryKey) && queryKey[0] === 'realestate' && queryKey[1] === 'source-exchanges'
  )
}
