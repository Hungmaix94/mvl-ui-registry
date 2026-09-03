// Dialog kết quả của luồng "Duyệt nhiều" (CR STT35).
//
// Nhóm "bỏ qua" đứng TRÊN nhóm "đã duyệt" một cách có chủ ý: phần đã duyệt thì xong rồi, phần
// cần người đọc làm tiếp là phần bị chặn. Với HĐ đặt cọc, gate phiếu hỗ trợ phí khiến chuyện
// có dòng bị bỏ qua là ca thường chứ không phải ngoại lệ — nên đây là nội dung chính của dialog.
import AppDialog from '@/components/dialog/AppDialog'
import { ReferenceCode } from '@/components/commons'
import { IconCheckcircle, IconProhibit } from '@/assets/icons'
import { cn } from '@/utils'

import {
  BULK_APPROVE_STEP_LABEL,
  BULK_APPROVE_STEP_TONE,
  type BulkApproveOutcome,
  type BulkApproveResultRow,
} from './bulk-approve-model'

type Props = {
  outcome: BulkApproveOutcome | null
  /** Danh từ đếm được của màn: "hợp đồng đặt cọc", "phiếu hoàn tiền"… */
  entityLabel: string
  onClose: () => void
}

function StatCard({
  tone,
  count,
  label,
}: {
  tone: 'success' | 'fail'
  count: number
  label: string
}) {
  const isFail = tone === 'fail'
  return (
    <div
      className={cn(
        'flex items-center gap-3.5 rounded-xl px-4 py-3.5',
        isFail ? 'bg-data-red-disabled' : 'bg-data-green-disabled'
      )}
    >
      <span
        className={cn(
          'bg-content-light-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-sm',
          isFail ? 'text-data-red-default' : 'text-data-green-default'
        )}
      >
        {isFail ? <IconProhibit size={24} /> : <IconCheckcircle size={24} />}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            'text-2xl leading-none font-bold',
            isFail ? 'text-data-red-default' : 'text-data-green-default'
          )}
        >
          {count}
        </p>
        <p className="text-content-dark-2 mt-1.5 text-xs font-medium">{label}</p>
      </div>
    </div>
  )
}

function RowIdentity({ row }: { row: BulkApproveResultRow }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
      <ReferenceCode code={row.code} />
      {row.subject && <span className="text-content-dark-2 truncate text-sm">{row.subject}</span>}
    </div>
  )
}

export function BulkApproveResultDialog({ outcome, entityLabel, onClose }: Props) {
  const approvedRows = outcome?.approvedRows ?? []
  const skippedRows = outcome?.skippedRows ?? []

  return (
    <AppDialog
      variant="custom"
      size="2xl"
      open={!!outcome}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={`Kết quả duyệt nhiều ${entityLabel}`}
      isHideCancelButton={true}
      confirmText="Đóng"
      onConfirm={onClose}
      onCancel={onClose}
      content={
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <StatCard tone="fail" count={skippedRows.length} label="Bị bỏ qua" />
            <StatCard tone="success" count={approvedRows.length} label="Duyệt thành công" />
          </div>

          {skippedRows.length > 0 && (
            <section>
              <p className="text-data-red-default mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <IconProhibit size={16} />
                Bị bỏ qua ({skippedRows.length})
              </p>
              <ul className="border-border-1 max-h-[30vh] divide-y divide-[var(--color-border-1)] overflow-y-auto rounded-lg border">
                {skippedRows.map((row) => (
                  <li key={row.id} className="px-4 py-3">
                    <RowIdentity row={row} />
                    <p className="text-data-red-default mt-1.5 text-sm">{row.reason}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {approvedRows.length > 0 && (
            <section>
              <p className="text-data-green-default mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <IconCheckcircle size={16} />
                Đã duyệt ({approvedRows.length})
              </p>
              <ul className="border-border-1 max-h-[30vh] divide-y divide-[var(--color-border-1)] overflow-y-auto rounded-lg border">
                {approvedRows.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-4 py-3"
                  >
                    <RowIdentity row={row} />
                    {row.step && (
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                          BULK_APPROVE_STEP_TONE[row.step].chip
                        )}
                      >
                        Đã qua {BULK_APPROVE_STEP_LABEL[row.step]}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      }
    />
  )
}

export default BulkApproveResultDialog
