// Thanh hành động hiện ra khi đã tích chọn ít nhất một dòng (CR STT35).
//
// Chủ ý thiết kế: con số đứng trước và to hơn hẳn phần chữ, vì thứ người duyệt cần đọc trong
// một nhịp là "mình đang cầm bao nhiêu bản ghi". Các chip bàn duyệt nói tiếp điều mà một nút
// duy nhất không nói được: cú bấm này chạy nhiều cấp duyệt khác nhau.
import { Button } from '@/components/ui'
import { cn } from '@/utils'

import {
  BULK_APPROVE_MAX_ITEMS,
  BULK_APPROVE_STEP_LABEL,
  BULK_APPROVE_STEP_TONE,
  type BulkApproveStep,
} from './bulk-approve-model'

type Props = {
  selectedCount: number
  countByStep: Partial<Record<BulkApproveStep, number>>
  /** Danh từ đếm được của màn: "hợp đồng đặt cọc", "phiếu hoàn tiền"… */
  entityLabel: string
  isOverLimit: boolean
  loading?: boolean
  onClear: () => void
  onApprove: () => void
}

export function BulkApproveBar({
  selectedCount,
  countByStep,
  entityLabel,
  isOverLimit,
  loading,
  onClear,
  onApprove,
}: Props) {
  if (selectedCount === 0) return null

  const steps = Object.keys(BULK_APPROVE_STEP_LABEL) as BulkApproveStep[]

  return (
    <div className="border-border-1 bg-background-2 flex flex-wrap items-center gap-x-5 gap-y-3 border-b px-7 py-3">
      <div className="flex items-baseline gap-2">
        {/* Dải dọc neo con số vào lề trái, cùng ngôn ngữ với dải màu bàn duyệt trong dialog. */}
        <span className="bg-content-dark-1 mr-1 h-6 w-[3px] self-center rounded-full" />
        <span className="text-content-dark-1 text-2xl leading-none font-bold">{selectedCount}</span>
        <span className="text-content-dark-2 text-sm">{entityLabel} đã chọn</span>
      </div>

      {!isOverLimit && (
        <div className="flex flex-wrap items-center gap-1.5">
          {steps.map((step) => {
            const count = countByStep[step]
            if (!count) return null
            return (
              <span
                key={step}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-semibold',
                  BULK_APPROVE_STEP_TONE[step].chip
                )}
              >
                {count} chờ {BULK_APPROVE_STEP_LABEL[step]}
              </span>
            )
          })}
        </div>
      )}

      {isOverLimit && (
        <p className="text-data-red-default text-sm font-medium">
          Mỗi lượt duyệt tối đa {BULK_APPROVE_MAX_ITEMS} bản ghi — hãy bỏ chọn{' '}
          {selectedCount - BULK_APPROVE_MAX_ITEMS} dòng.
        </p>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Button type="button" variant="secondary-border" onClick={onClear} disabled={loading}>
          Bỏ chọn
        </Button>
        <Button type="button" onClick={onApprove} loading={loading} disabled={isOverLimit}>
          Duyệt nhiều
        </Button>
      </div>
    </div>
  )
}

export default BulkApproveBar
