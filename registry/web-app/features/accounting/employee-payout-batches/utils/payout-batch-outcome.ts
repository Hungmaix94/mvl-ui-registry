import { PAYOUT_BATCH_OUTCOME } from '../constants'

// Shape of one entry in the `create_for_month` response.
type CreateForMonthResult = { outcome?: string }

export type CreateForMonthSummary = {
  message: string
  tone: 'success' | 'info'
  navigate: boolean
}

// Normalises the `create_for_month` response into a flat list of per-wave results.
//
// The BE returns a bare JSON list `[{outcome, batch}, ...]` on 200 (all waves blocked -> 409, which
// the caller handles in its catch). We also tolerate a paginated `{results: [...]}` envelope in case
// the response shape changes once the endpoint is regenerated into the schema.
function extractResults(res: unknown): CreateForMonthResult[] {
  if (Array.isArray(res)) return res as CreateForMonthResult[]
  const results = (res as { results?: unknown })?.results
  return Array.isArray(results) ? (results as CreateForMonthResult[]) : []
}

// Builds the toast message + navigation decision from a `create_for_month` response.
//
// A 200 always contains at least one CREATED (an all-blocked request is a 409), so any successful
// response navigates back to the list. When some waves were blocked, we surface that instead of
// silently swallowing them.
export function summarizeCreateForMonthResults(res: unknown): CreateForMonthSummary {
  const results = extractResults(res)
  const created = results.filter((r) => r.outcome === PAYOUT_BATCH_OUTCOME.CREATED).length
  const blocked = results.filter((r) => r.outcome === PAYOUT_BATCH_OUTCOME.BLOCKED).length

  if (created > 0) {
    const message =
      blocked > 0
        ? `Đã tạo ${created} đợt chi. ${blocked} đợt đã tồn tại — dùng "Tính lại" trên đợt hiện có.`
        : `Đã tạo ${created} đợt chi`
    return { message, tone: 'success', navigate: true }
  }

  return {
    message: 'Không có khoản nào cần chi cho tháng/đợt đã chọn',
    tone: 'info',
    navigate: false,
  }
}
