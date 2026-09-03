import { EmployeeCommissionPayoutBatchWave } from '@/api/schema'
import { EmployeePayoutBatchStatus as EmployeeCommissionPayoutBatchStatus } from '@/constants/api-schema-aliases'
// Payout waves: SALE + MGMT (employees) and CTV (collaborators). The order below is the display
// order in the form's wave picker — the enum itself is the source of truth for the values.
export const PAYOUT_WAVES = [
  EmployeeCommissionPayoutBatchWave.SALE,
  EmployeeCommissionPayoutBatchWave.MGMT,
  EmployeeCommissionPayoutBatchWave.CTV,
] as const

export type PayoutWave = EmployeeCommissionPayoutBatchWave

export const PAYOUT_WAVE_LABELS: Record<PayoutWave, string> = {
  [EmployeeCommissionPayoutBatchWave.SALE]: 'Đợt chi SALE',
  [EmployeeCommissionPayoutBatchWave.MGMT]: 'Đợt chi MGMT',
  [EmployeeCommissionPayoutBatchWave.CTV]: 'Đợt chi CTV',
}

// Maps a raw wave code to its Vietnamese label; unknown codes fall back to the code itself, and
// empty/null renders as a dash. Shared by the list table, detail page, detail drawer and the form.
export const formatPayoutWave = (wave?: string | null): string =>
  wave ? (PAYOUT_WAVE_LABELS[wave as PayoutWave] ?? wave) : '-'

// Vài mã trạng thái chưa có bản dịch trong app-constant nên rơi về chuỗi tiếng Anh; vá tại chỗ.
// Chỉ ghi đè ĐÚNG nhãn chưa dịch để không đè lên bản dịch hợp lệ nếu backend bổ sung sau này.
const STATUS_LABEL_OVERRIDES: Partial<
  Record<EmployeeCommissionPayoutBatchStatus, { when: string; use: string }>
> = {
  [EmployeeCommissionPayoutBatchStatus.SENT_TO_BANK]: {
    when: 'Sent to bank',
    use: 'Đã gửi ngân hàng',
  },
  [EmployeeCommissionPayoutBatchStatus.PAID]: { when: 'Paid', use: 'Đã thanh toán' },
  [EmployeeCommissionPayoutBatchStatus.DRAFT]: { when: 'Bản nháp', use: 'Nháp' },
}

/**
 * Nhãn hiển thị của một trạng thái đợt chi.
 *
 * Dùng CHUNG cho chip trạng thái trên bảng và ô chọn trong bộ lọc — hai nơi mà người dùng nhìn
 * cạnh nhau, nên tách map riêng cho từng nơi là mời gọi lệch nhãn (CR 86eyj428y).
 *
 * @param status mã trạng thái từ API
 * @param statusLabels bảng nhãn lấy từ `useAppConstant`, có thể chưa tải xong
 */
export const formatPayoutBatchStatus = (
  status: string,
  statusLabels?: Record<string, string> | null
): string => {
  const label = statusLabels?.[status] ?? status
  const override = STATUS_LABEL_OVERRIDES[status as EmployeeCommissionPayoutBatchStatus]
  return override && label === override.when ? override.use : label
}

// Per-wave outcome returned by `create_for_month`. The BE only ever emits CREATED or BLOCKED at
// runtime (the schema enum's UPDATED/UNCHANGED have no producers); BLOCKED means an active batch
// already exists for that wave. All waves blocked -> the endpoint responds 409 instead.
export const PAYOUT_BATCH_OUTCOME = {
  CREATED: 'CREATED',
  BLOCKED: 'BLOCKED',
} as const

export type PayoutBatchOutcome = (typeof PAYOUT_BATCH_OUTCOME)[keyof typeof PAYOUT_BATCH_OUTCOME]
