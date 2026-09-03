import { useState } from 'react'
import AppDialog from '@/components/dialog/AppDialog'
import {
  useBulkSendCommissionEmail,
  type CommissionEmailBulkResult,
  type CommissionEmailKind,
  type MonthlySummaryRole,
} from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { cn } from '@/utils'

type CommSummaryBulkEmailDialogProps = {
  isOpen: boolean
  onClose: () => void
  role: MonthlySummaryRole
  /** Selected summary ids to send to. Select-all covers the whole period. */
  ids: number[]
  onSent?: () => void
}

const KIND_TABS: { value: CommissionEmailKind; label: string }[] = [
  { value: 'detail', label: 'Chi tiết từng căn' },
  { value: 'after_tax', label: 'Sau thuế TNCN' },
]

export function CommSummaryBulkEmailDialog({
  isOpen,
  onClose,
  role,
  ids,
  onSent,
}: CommSummaryBulkEmailDialogProps) {
  const [kind, setKind] = useState<CommissionEmailKind>('detail')
  const [result, setResult] = useState<CommissionEmailBulkResult | null>(null)
  const bulkMutation = useBulkSendCommissionEmail()

  const handleSend = async () => {
    try {
      const res = await bulkMutation.mutateAsync({ role, kind, data: { ids } })
      setResult(res)
      const sent = res.total_recipients ?? 0
      const skipped = res.skipped?.length ?? 0
      if (sent > 0) {
        toastService.success(`Đã gửi ${sent} email${skipped > 0 ? `, bỏ qua ${skipped}` : ''}`)
        onSent?.()
      } else {
        toastService.error(`Không gửi được email nào (${skipped} bị bỏ qua)`)
      }
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  const handleClose = () => {
    setResult(null)
    onClose()
  }

  return (
    <AppDialog
      variant="custom"
      size="md"
      open={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      title="Gửi email đối chiếu hàng loạt"
      titleDescription={`${ids.length} bảng kê được chọn`}
      confirmText={result ? 'Gửi lại' : 'Gửi email'}
      disableConfirm={ids.length === 0}
      loading={bulkMutation.isPending}
      onConfirm={handleSend}
      onCancel={handleClose}
      isHideCancelButton={false}
      content={
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {KIND_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setKind(tab.value)}
                className={cn(
                  'typo-body-base-medium rounded-lg border px-4 py-2 transition-colors',
                  kind === tab.value
                    ? 'border-action-primary-red-default text-action-primary-red-default bg-action-primary-red-default/5'
                    : 'border-border-1 text-content-dark-3 hover:border-border-2'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <p className="typo-body-base text-content-dark-3">
            Mỗi người nhận sẽ nhận một bảng kê riêng. Các bảng kê chưa chốt hoặc người nhận thiếu
            email sẽ được bỏ qua và liệt kê bên dưới.
          </p>

          {result && result.skipped && result.skipped.length > 0 && (
            <div className="border-border-1 max-h-[220px] overflow-auto rounded border">
              <div className="bg-background-2 typo-body-sm-medium text-content-dark-2 px-4 py-2">
                Bỏ qua {result.skipped.length} bảng kê
              </div>
              <ul className="divide-border-1 divide-y">
                {result.skipped.map((row) => (
                  <li key={row.summary_id} className="typo-body-sm flex gap-3 px-4 py-2">
                    <span className="text-content-dark-1 min-w-[160px] font-medium">
                      {row.payee || `#${row.summary_id}`}
                    </span>
                    <span className="text-content-dark-3 flex-1">{row.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      }
    />
  )
}
