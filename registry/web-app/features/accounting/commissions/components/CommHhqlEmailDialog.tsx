import { useState } from 'react'
import AppDialog from '@/components/dialog/AppDialog'
import { Button } from '@/components/ui'
import { IconDownload } from '@/assets/icons'
import {
  useBulkSendHhqlEmail,
  useDownloadHhqlEmailPreview,
  type CommissionEmailBulkResult,
} from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'

export type HhqlEmailTarget = { id: number; name?: string }

type CommHhqlEmailDialogProps = {
  isOpen: boolean
  onClose: () => void
  /** Managers to send to. One row = row action, many = the toolbar's bulk action. */
  targets: HhqlEmailTarget[]
  onSent?: () => void
}

function previewFilename(target: HhqlEmailTarget): string {
  const name = target.name?.trim().replace(/\s+/g, '-')
  return `Bang-ke-HHQL-${name || target.id}.xlsx`
}

/**
 * Email 3 — the HHQL (management commission) statement, sent to each manager with the detail as an
 * attached Excel workbook.
 *
 * Differs from the other two commission emails on purpose: the preview is an Excel download (the
 * statement IS the workbook, there is no HTML body to render), and there is no per-summary send
 * endpoint — a single manager is sent through the same bulk path with `ids: [id]`.
 */
export function CommHhqlEmailDialog({
  isOpen,
  onClose,
  targets,
  onSent,
}: CommHhqlEmailDialogProps) {
  const [result, setResult] = useState<CommissionEmailBulkResult | null>(null)
  const sendMutation = useBulkSendHhqlEmail()
  const previewMutation = useDownloadHhqlEmailPreview()

  const isSingle = targets.length === 1

  const handleDownloadPreview = async () => {
    const target = targets[0]
    if (!target) return
    try {
      await previewMutation.mutateAsync({ id: target.id, filename: previewFilename(target) })
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  const handleSend = async () => {
    try {
      const res = await sendMutation.mutateAsync({ ids: targets.map((t) => t.id) })
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
      title="Gửi bảng kê hoa hồng quản lý"
      titleDescription={
        isSingle && targets[0]?.name
          ? `Người nhận: ${targets[0].name}`
          : `${targets.length} quản lý được chọn`
      }
      confirmText={result ? 'Gửi lại' : 'Gửi email'}
      disableConfirm={targets.length === 0}
      loading={sendMutation.isPending}
      onConfirm={handleSend}
      onCancel={handleClose}
      isHideCancelButton={false}
      content={
        <div className="flex flex-col gap-4">
          <p className="typo-body-base text-content-dark-3">
            Mỗi quản lý nhận một email kèm file Excel bảng kê hoa hồng quản lý của riêng mình. Gửi
            email không làm đổi trạng thái bảng tổng kết. Quản lý thiếu email hoặc không có dòng hoa
            hồng nào sẽ được bỏ qua và liệt kê bên dưới.
          </p>

          {isSingle && (
            <div>
              <Button
                size="small"
                variant="secondary-border"
                leftIcon={<IconDownload className="h-4 w-4" />}
                onClick={handleDownloadPreview}
                loading={previewMutation.isPending}
              >
                Tải file Excel xem trước
              </Button>
              <p className="typo-body-sm text-content-dark-3 mt-2">
                Tải về đúng file sẽ đính kèm trong email — xem trước không gửi email cho ai.
              </p>
            </div>
          )}

          {result && result.skipped && result.skipped.length > 0 && (
            <div className="border-border-1 max-h-[220px] overflow-auto rounded border">
              <div className="bg-background-2 typo-body-sm-medium text-content-dark-2 px-4 py-2">
                Bỏ qua {result.skipped.length} quản lý
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
