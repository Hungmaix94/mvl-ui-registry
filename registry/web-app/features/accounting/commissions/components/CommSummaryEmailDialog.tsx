import { useEffect, useRef, useState } from 'react'
import AppDialog from '@/components/dialog/AppDialog'
import { FullScreenLoading } from '@/components/Loading'
import { Select } from '@/components/ui'
import {
  usePreviewCommissionEmail,
  useSendCommissionEmail,
  type CommissionEmailKind,
  type CommissionEmailPreview,
  type MonthlySummaryRole,
} from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { cn } from '@/utils'

type CommSummaryEmailDialogProps = {
  isOpen: boolean
  onClose: () => void
  role: MonthlySummaryRole
  summaryId: number
  payeeName?: string
}

const KIND_TABS: { value: CommissionEmailKind; label: string }[] = [
  { value: 'detail', label: 'Chi tiết từng căn' },
  { value: 'after_tax', label: 'Sau thuế TNCN' },
]

export function CommSummaryEmailDialog({
  isOpen,
  onClose,
  role,
  summaryId,
  payeeName,
}: CommSummaryEmailDialogProps) {
  const [kind, setKind] = useState<CommissionEmailKind>('detail')
  const [preview, setPreview] = useState<CommissionEmailPreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  // Only meaningful when the summary splits into more than one commission-statement
  // recipient (per-deal "Nhân viên nhận mail" override) - selects which of
  // `preview.statements` the iframe renders. Defaults to the first recipient.
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const previewMutation = usePreviewCommissionEmail()
  const sendMutation = useSendCommissionEmail()

  // Re-render the preview whenever the dialog opens or the email kind changes.
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setPreview(null)
    setPreviewError(null)
    setSelectedEmail(null)
    previewMutation
      .mutateAsync({ role, kind, id: summaryId })
      .then((res) => {
        if (!cancelled) {
          setPreview(res)
          setSelectedEmail(res.statements[0]?.email ?? null)
        }
      })
      .catch((err) => {
        if (!cancelled) setPreviewError(extractErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
    // previewMutation identity is stable (react-query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, kind, role, summaryId])

  const statements = preview?.statements ?? []
  const selectedStatement =
    statements.find((s) => s.email === selectedEmail) ?? statements[0] ?? null

  // Write the SELECTED recipient's rendered HTML into a sandboxed iframe so the email's
  // own styles stay isolated - never the summary-wide `preview.html`, which no longer
  // exists once a summary splits into multiple recipients (ClickUp 86eyhu4rp).
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc || !selectedStatement?.html) return
    doc.open()
    doc.write(selectedStatement.html)
    doc.close()
  }, [selectedStatement])

  const handleSend = async () => {
    try {
      await sendMutation.mutateAsync({ role, kind, id: summaryId })
      toastService.success('Đã gửi email đối chiếu')
      onClose()
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  const titleDescription =
    statements.length > 1
      ? `Người nhận: ${selectedStatement?.email ?? ''}`
      : payeeName
        ? `Người nhận: ${payeeName}`
        : undefined

  return (
    <AppDialog
      variant="custom"
      size="lg"
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Gửi email đối chiếu hoa hồng"
      titleDescription={titleDescription}
      confirmText="Gửi email"
      disableConfirm={previewMutation.isPending || !!previewError}
      loading={sendMutation.isPending}
      onConfirm={handleSend}
      onCancel={onClose}
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

          {statements.length > 1 && (
            <div className="flex flex-col gap-2">
              <Select
                label="Xem trước theo người nhận"
                options={statements.map((s) => ({
                  label: s.email ?? '',
                  value: s.email ?? '',
                }))}
                value={selectedEmail}
                onChange={(val) => setSelectedEmail(val ? String(val) : null)}
                clearable={false}
              />
              <p className="text-content-dark-3 typo-body-sm">
                Bảng kê này tách thành {statements.length} email riêng cho {statements.length} người
                nhận khác nhau — bấm &quot;Gửi email&quot; sẽ gửi tất cả cùng lúc.
              </p>
            </div>
          )}

          <div className="border-border-1 bg-background-1 min-h-[360px] overflow-hidden rounded border">
            {previewMutation.isPending ? (
              <FullScreenLoading className="h-[360px] min-h-[360px] flex-1" />
            ) : previewError ? (
              <div className="text-content-dark-2 flex h-[360px] items-center justify-center px-6 text-center">
                {previewError}
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                className="h-[520px] w-full border-0"
                sandbox="allow-same-origin"
                title="Email preview"
              />
            )}
          </div>
        </div>
      }
    />
  )
}
