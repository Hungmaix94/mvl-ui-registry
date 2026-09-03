import { useNavigate } from 'react-router-dom'

import { ColoredValueVariant } from '@/api/schema'
import { IconChecks, IconDownload, IconPrinter } from '@/assets/icons'
import { Button, PageTitle } from '@/components/ui'
import Chip from '@/components/ui/chip/Chip'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes'

import type {
  CommissionSplitDetail,
  CommissionSplitListRow,
} from '../services/commission-splits-service'

import { WORKSHEET_STATUS, useWorksheetStatusLabels } from './WorksheetStatusChip'

export interface CommissionSplitPageHeaderProps {
  detail: CommissionSplitDetail
  activeWorksheet: CommissionSplitListRow | null
  /** Tên dự án lấy từ deal workspace — header không tự fetch. */
  projectName?: string | null
  investorName?: string | null
  /** Màn "Giao dịch tiền về đợt này" (admin) vs màn "Thực nhận HH" (kế toán). */
  isAdminView: boolean
  canAdminApprove: boolean
  isApproving: boolean
  isReopening: boolean
  isReleasing: boolean
  isPaymentSuspended: boolean
  onBack: () => void
  onApproveDisbursement: () => void
  onReopenWorksheet: () => void
  onReleaseSuspension: () => void
  onOpenSuspend: () => void
}

const STATUS_TAG_STYLE: Record<string, { chip: string; dot: string }> = {
  [WORKSHEET_STATUS.APPROVED]: {
    chip: 'border-green-30 bg-green-20 text-green-70',
    dot: 'bg-data-green-default',
  },
  [WORKSHEET_STATUS.ADMIN_APPROVED]: {
    chip: 'border-data-blue-focus bg-data-blue-disabled text-data-blue-hover',
    dot: 'bg-data-blue-default',
  },
  [WORKSHEET_STATUS.VOIDED]: {
    chip: 'border-red-30 bg-red-20 text-red-70',
    dot: 'bg-data-red-default',
  },
  [WORKSHEET_STATUS.DRAFT]: {
    chip: 'border-orange-30 bg-orange-20 text-orange-70',
    dot: 'bg-data-orange-default',
  },
}

/**
 * Nhãn trạng thái bảng kê cạnh tiêu đề.
 *
 * Chữ lấy từ app-constant của BE — cùng nguồn với cột trạng thái ở màn danh sách và bộ
 * lọc — để ba chỗ luôn hiện y một câu (bug 86ey45799).
 */
function WorksheetStatusTag({ status }: { status?: string | null }) {
  const labels = useWorksheetStatusLabels()
  const key = status || WORKSHEET_STATUS.DRAFT
  const style = STATUS_TAG_STYLE[status || ''] ?? STATUS_TAG_STYLE[WORKSHEET_STATUS.DRAFT]
  const label = labels[key]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-bold ${style.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {label ?? key}
    </span>
  )
}

/**
 * Thanh tiêu đề màn chi tiết bảng chia hoa hồng: tên căn, trạng thái, breadcrumb
 * và toàn bộ nút hành động cấp trang (duyệt chi / mở lại / tạm ngưng / in / xuất).
 *
 * Nút nào hiện là chuyện của header, nên điều kiện quyền nằm luôn ở đây thay vì
 * bắt trang cha tính sẵn rồi truyền xuống từng cờ boolean.
 */
export function CommissionSplitPageHeader({
  detail,
  activeWorksheet,
  projectName,
  investorName,
  isAdminView,
  canAdminApprove,
  isApproving,
  isReopening,
  isReleasing,
  isPaymentSuspended,
  onBack,
  onApproveDisbursement,
  onReopenWorksheet,
  onReleaseSuspension,
  onOpenSuspend,
}: CommissionSplitPageHeaderProps) {
  const navigate = useNavigate()
  const ability = useAbility()

  const unitLabel = detail.unit_number || detail.prop_code || detail.deal_code
  const periodLabel =
    detail.period_month && detail.period_year
      ? `${String(detail.period_month).padStart(2, '0')}/${detail.period_year}`
      : '—'

  /**
   * Nhãn thay cho `:id` trong breadcrumb. Các cấp còn lại do `PageTitle` tự dựng từ metadata
   * route (`ACCOUNTING_ROUTES`) — KHÔNG tự ráp mảng crumb: header này được render ở hai route
   * khác nhau, tự ráp là phải đoán mình đang ở đâu qua `isAdminView`, tức kéo chuyện điều
   * hướng xuống tầng feature và làm nhãn trôi khỏi menu (xem docs/ai/conventions.md, và test
   * khoá hợp đồng: src/routes/breadcrumb-detail-routes.test.tsx).
   */
  const breadcrumbIdLabel = unitLabel || '-'

  const worksheetStatus = activeWorksheet?.worksheet_status

  // KT "Duyệt chi thực nhận" chỉ khả dụng sau khi admin đã "Duyệt chi"
  // (worksheet ADMIN_APPROVED) — BE chặn 409 nếu gọi sớm hơn. Đây là lệnh
  // chốt (approveWorksheet), KHÔNG phụ thuộc recipients_editable: BE duyệt
  // các PBTV DRAFT/APPROVED và bỏ qua PBTV đã LOCKED, nên vẫn phải cho KT
  // chốt kể cả khi bảng chia không còn sửa được.
  const canApproveNow =
    worksheetStatus !== WORKSHEET_STATUS.APPROVED &&
    ((isAdminView && canAdminApprove && worksheetStatus === WORKSHEET_STATUS.DRAFT) ||
      (!isAdminView &&
        ability.can('approve', 'dealperiodworksheet') &&
        worksheetStatus === WORKSHEET_STATUS.ADMIN_APPROVED))

  // Kỳ đã duyệt nhưng kỳ kế toán chưa khóa: kế toán mở lại bảng kê để chia
  // lại rồi duyệt chi lần nữa (BE hủy các khoản phải chi chưa thanh toán).
  const canReopenNow =
    !isAdminView &&
    ability.can('reopen', 'dealperiodworksheet') &&
    worksheetStatus === WORKSHEET_STATUS.APPROVED &&
    !detail.is_locked

  return (
    <PageTitle
      title={
        <div className="flex flex-wrap items-center gap-2.5">
          <span>{isAdminView ? 'Giao dịch tiền về đợt này' : 'Thực nhận HH'} · </span>
          <span className="text-action-primary-red-default mr-1.5 font-mono">{unitLabel}</span>
          {activeWorksheet && <WorksheetStatusTag status={worksheetStatus} />}
          {((activeWorksheet as { payment_suspended?: boolean } | null)?.payment_suspended ||
            detail.payment_suspended) && (
            <Chip label="Tạm ngưng chi trả" variant={ColoredValueVariant.RED} size="small" />
          )}
        </div>
      }
      enableBackButton
      handleBackButton={onBack}
      idLabel={breadcrumbIdLabel}
      sub={
        <div className="mt-1 flex items-center gap-1.5 text-[14px] text-neutral-400">
          {detail.project_id && projectName ? (
            <span
              className="text-brand-primary-default cursor-pointer hover:underline"
              onClick={() =>
                navigate(
                  APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', detail.project_id!.toString())
                )
              }
            >
              {projectName}
            </span>
          ) : (
            <span>{projectName || '—'}</span>
          )}
          <span>·</span>
          <span>{investorName || '—'}</span>
          <span>·</span>
          <span>HĐ {periodLabel}</span>
          {activeWorksheet?.invoice_no && activeWorksheet.invoice_no !== '—' && (
            <>
              <span>·</span>
              <span>số {activeWorksheet.invoice_no}</span>
            </>
          )}
        </div>
      }
      customActions={
        <div className="flex items-center gap-4">
          {canApproveNow && (
            <Button
              variant="primary"
              onClick={onApproveDisbursement}
              loading={isApproving}
              leftIcon={<IconChecks />}
            >
              {isAdminView ? 'Duyệt chi' : 'Duyệt chi thực nhận'}
            </Button>
          )}
          {canReopenNow && (
            <Button
              variant="secondary"
              onClick={onReopenWorksheet}
              loading={isReopening}
              disabled={isApproving}
            >
              Mở lại bảng kê để sửa thực nhận
            </Button>
          )}
          {isAdminView &&
            (isPaymentSuspended ? (
              <Button
                variant="secondary"
                onClick={onReleaseSuspension}
                loading={isReleasing}
                disabled={isApproving}
              >
                Mở lại chi trả
              </Button>
            ) : (
              <Button variant="secondary" onClick={onOpenSuspend} disabled={isApproving}>
                Tạm ngưng chi trả
              </Button>
            ))}
          {!isAdminView && (
            <>
              {/* Gate mọi thao tác khác trong lúc duyệt chi: in/xuất một bảng đang được
                  ghi lại giữa 2 PATCH sẽ ra số nửa vời. */}
              <Button
                variant="secondary"
                leftIcon={<IconPrinter />}
                onClick={() => window.print()}
                disabled={isApproving}
              >
                In
              </Button>
              <Button variant="secondary" leftIcon={<IconDownload />} disabled={isApproving}>
                Xuất Excel
              </Button>
            </>
          )}
        </div>
      }
    />
  )
}
