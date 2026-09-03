// Dialog xác nhận của luồng "Duyệt nhiều" (CR STT35) — mỗi bản ghi một ô ghi chú riêng.
//
// Vì sao là danh sách thẻ chứ không phải bảng: ghi chú nhập tay là ô nhập rộng, nhét vào một
// cell bảng thì hoặc bóp chữ hoặc kéo bảng tràn ngang. Thẻ cho phép xếp hai tầng — tầng trên
// nhận diện bản ghi, tầng dưới là ô nhập chiếm hết chiều rộng — nên vẫn đọc nhanh được danh
// sách mà vùng gõ không bị chật.
//
// Dải màu dọc bên trái mã hoá bàn duyệt sẽ chạy cho dòng đó: một lần bấm có thể đi qua ba bàn
// khác nhau, và đó là điều dễ gây ngạc nhiên nhất của tính năng này.
import AppDialog from '@/components/dialog/AppDialog'
import { TextField } from '@/components/ui'
import { ReferenceCode } from '@/components/commons'
import { cn } from '@/utils'

import {
  BULK_APPROVE_STEP_LABEL,
  BULK_APPROVE_STEP_TONE,
  type BulkApproveCandidate,
  type BulkApproveStep,
} from './bulk-approve-model'

type Props = {
  open: boolean
  candidates: readonly BulkApproveCandidate[]
  countByStep: Partial<Record<BulkApproveStep, number>>
  /** Danh từ đếm được của màn: "hợp đồng đặt cọc", "phiếu hoàn tiền"… */
  entityLabel: string
  notes: Record<number, string>
  onNoteChange: (id: number, note: string) => void
  loading?: boolean
  onConfirm: () => void | Promise<void>
  onClose: () => void
}

export function BulkApproveConfirmDialog({
  open,
  candidates,
  countByStep,
  entityLabel,
  notes,
  onNoteChange,
  loading,
  onConfirm,
  onClose,
}: Props) {
  const steps = Object.keys(BULK_APPROVE_STEP_LABEL) as BulkApproveStep[]
  const activeSteps = steps.filter((step) => !!countByStep[step])

  return (
    <AppDialog
      variant="custom"
      size="2xl"
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={`Duyệt nhiều ${entityLabel}`}
      titleDescription={
        <>
          Bạn đang phê duyệt cho{' '}
          <span className="text-content-dark-1 font-semibold">{candidates.length}</span>{' '}
          {entityLabel} dưới đây. Ghi chú nhập ở mỗi dòng chỉ lưu vào lịch sử duyệt của đúng bản ghi
          đó.
        </>
      }
      isHideCancelButton={false}
      cancelText="Huỷ"
      confirmText="Xác nhận duyệt"
      loading={loading}
      disableConfirm={candidates.length === 0}
      onConfirm={onConfirm}
      onCancel={onClose}
      content={
        <div className="space-y-4">
          {activeSteps.length > 1 && (
            <div className="border-border-1 bg-background-2 flex flex-wrap items-center gap-2 rounded-lg border px-3.5 py-2.5">
              <span className="text-content-dark-2 text-xs font-medium">
                Lượt duyệt này đi qua {activeSteps.length} cấp:
              </span>
              {activeSteps.map((step) => (
                <span
                  key={step}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-semibold',
                    BULK_APPROVE_STEP_TONE[step].chip
                  )}
                >
                  {countByStep[step]} {BULK_APPROVE_STEP_LABEL[step]}
                </span>
              ))}
            </div>
          )}

          <ul className="max-h-[52vh] space-y-2.5 overflow-y-auto pr-1">
            {candidates.map((candidate, index) => (
              <li
                key={candidate.id}
                className={cn(
                  'border-border-1 bg-content-light-1 relative flex gap-3.5 overflow-hidden rounded-lg border pr-3.5 pl-4 transition-colors',
                  'hover:border-border-3 focus-within:border-content-dark-3'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-0 bottom-0 left-0 w-[3px]',
                    BULK_APPROVE_STEP_TONE[candidate.step].rail
                  )}
                />
                <span className="text-content-dark-4 w-6 shrink-0 pt-3.5 text-right text-xs tabular-nums">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                      <ReferenceCode code={candidate.code} />
                      {candidate.subject && (
                        <span className="text-content-dark-2 truncate text-sm">
                          {candidate.subject}
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                        BULK_APPROVE_STEP_TONE[candidate.step].chip
                      )}
                    >
                      {BULK_APPROVE_STEP_LABEL[candidate.step]}
                    </span>
                  </div>
                  <div className="mt-2">
                    <TextField
                      size="compact"
                      value={notes[candidate.id] ?? ''}
                      onChange={(value) => onNoteChange(candidate.id, value)}
                      placeholder="Ghi chú cho bản ghi này (không bắt buộc)"
                      aria-label={`Ghi chú cho ${candidate.code}`}
                      disabled={loading}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      }
    />
  )
}

export default BulkApproveConfirmDialog
