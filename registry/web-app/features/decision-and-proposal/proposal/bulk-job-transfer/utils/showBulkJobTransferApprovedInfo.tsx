import { useDialog } from '@/hooks/useDialog.ts'
import { formatDate } from '@/utils/date-utils.ts'

type DisplayCustom = ReturnType<typeof useDialog>['displayCustom']

/**
 * Bulk job transfer: approving only records the decision — the actual org move happens later,
 * deferred to the effective date via a daily celery task (FSD §4.4). Inform the approver so it's
 * clear nothing moved yet. Deferred via setTimeout so it opens only after the approve dialog has
 * fully closed (avoids the two dialogs racing in the shared dialog store).
 */
export function showBulkJobTransferApprovedInfo(
  displayCustom: DisplayCustom,
  proposal: { job_transfer_lines?: unknown[]; job_transfer_effective_date?: string | null } | null
) {
  // job_transfer_lines is only serialized by the dedicated bulk-job-transfer endpoint — the
  // generic "Quản lý đề xuất" screen's ProposalCombined record doesn't carry it. Don't claim a
  // count of 0 in that case; fall back to a count-less message instead.
  const lines = proposal?.job_transfer_lines
  const effectiveDate = proposal?.job_transfer_effective_date
  const dateText = effectiveDate ? formatDate(effectiveDate) : '-'

  setTimeout(() => {
    displayCustom({
      title: 'Đã duyệt đề xuất điều chuyển hàng loạt',
      content: (
        <p className="typo-body-base-regular text-content-dark-2">
          {lines
            ? `Hệ thống sẽ tự động điều chuyển ${lines.length} nhân sự vào ngày ${dateText}.`
            : `Hệ thống sẽ tự động điều chuyển toàn bộ nhân sự trong phiếu vào ngày ${dateText}.`}{' '}
          Không cần thao tác thêm.
        </p>
      ),
      confirmText: 'Đã hiểu',
    })
  }, 300)
}
