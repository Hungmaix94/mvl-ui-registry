import { useParams, useNavigate } from 'react-router-dom'
import { useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CommMgrDetail } from '@/features/accounting/commissions/components/CommMgrDetail'
import {
  useMonthlySummary,
  useConfirmMonthlySummary,
  MonthlyBeneficiaryCommissionSummaryDetail,
} from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { Button, PageTitle } from '@/components/ui'
import { IconDownload, IconCheck, IconEnvelopesimple } from '@/assets/icons'
import { QUERY_KEYS } from '@/constants'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { exportElementToPdf } from '@/utils/exportChart'
import { CommMonthlySummaryHoldDialog } from '@/features/accounting/commissions/components/CommMonthlySummaryHoldDialog'
import { CommMonthlySummaryAdvanceDialog } from '@/features/accounting/commissions/components/CommMonthlySummaryAdvanceDialog'
import { CommHhqlEmailDialog } from '@/features/accounting/commissions/components/CommHhqlEmailDialog'
import { useAbility } from '@/lib/ability'

const CommMgrDetailPage = () => {
  const ability = useAbility()
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [isHoldDialogOpen, setIsHoldDialogOpen] = useState(false)
  const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false)
  const [isHhqlEmailDialogOpen, setIsHhqlEmailDialogOpen] = useState(false)

  const { data: record, isLoading, error } = useMonthlySummary('management', id, { enabled: !!id })
  const confirmMutation = useConfirmMonthlySummary()

  const exportRef = useRef<HTMLDivElement>(null)
  const handleExportPdf = useCallback(async () => {
    if (!exportRef.current || !record) return
    const filename = `PhieuChiTraHHQL_${record.month}_${record.year}.pdf`
    try {
      await exportElementToPdf(exportRef.current, {
        fileName: filename,
        overlayMessage: 'Đang tạo PDF...',
      })
    } catch {
      toastService.error('Có lỗi xảy ra khi xuất PDF')
    }
  }, [record])

  const handleConfirm = async () => {
    if (!record) return
    try {
      await confirmMutation.mutateAsync({
        role: 'management',
        id: record.id,
        data: {
          year: record.year,
          month: record.month,
          beneficiary_type: record.beneficiary_type,
          beneficiary_employee: record.beneficiary_employee,
          beneficiary_collaborator: record.beneficiary_collaborator,
          beneficiary_exchange: record.beneficiary_exchange,
        },
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.DETAIL(record.id),
      })
      toastService.success('Duyệt bảng kê thành công')
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  const empDetail = record
    ? (record.beneficiary_employee_detail as MonthlyBeneficiaryCommissionSummaryDetail['beneficiary_employee_detail'] & {
        default_bank_account?: {
          bank?: {
            code?: string
          }
          account_number?: string
        }
        start_date?: string
      })
    : undefined

  const profileName = empDetail?.fullname || '—'

  const customActions = record && (
    <div className="flex gap-2">
      <Button variant="secondary" leftIcon={<IconDownload />} onClick={handleExportPdf}>
        Xuất PDF
      </Button>
      {/* Email 3 — bảng kê HHQL đính kèm Excel. Không có endpoint gửi lẻ: một quản lý đi qua
          đúng path bulk với `ids: [id]`, nên dialog nhận `targets` dạng mảng. */}
      <Button
        variant="secondary"
        leftIcon={<IconEnvelopesimple />}
        onClick={() => setIsHhqlEmailDialogOpen(true)}
      >
        Gửi bảng kê HHQL
      </Button>
      {record.status === 'DRAFT' && (
        <Button
          leftIcon={<IconCheck />}
          onClick={handleConfirm}
          loading={confirmMutation.isPending}
        >
          Duyệt bảng kê
        </Button>
      )}
      {/* Không có nút "Tạo phiếu chi" trên màn này: hoa hồng quản lý chi theo CẢ ĐỢT
          (wave MGMT) — một đợt là một lần chi, không cắt phiếu lẻ từng người. Việc chi đi qua
          `payout_wave_service.pay_wave` / màn lô chi 20.18. Bản cũ cắt phiếu bằng
          `record.net_payable`, vốn là net CẢ KỲ gồm cả tiền đợt Sale, trên đúng bản ghi mà màn
          HH Sale (20.8.1) cũng có nút cắt phiếu ⇒ ký hai phiếu cho cùng một số tiền. */}
    </div>
  )

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title={
          record
            ? `Phiếu chi trả HH Quản lý · Kỳ ${record.month}/${record.year}`
            : 'Phiếu chi trả HH Quản lý'
        }
        idLabel={record ? profileName : 'Chi tiết'}
        enableBackButton
        handleBackButton={() => navigate(-1)}
        customActions={customActions}
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isError={!!error}
        isNotFound={!isLoading && !error && !record}
        hasPermission={ability.can('retrieve', 'managementmonthlycommissionsummary')}
      >
        {record && (
          <div ref={exportRef} className="h-full w-full overflow-y-auto">
            <CommMgrDetail
              summary={record}
              onOpenHoldDialog={() => setIsHoldDialogOpen(true)}
              onOpenAdvanceDialog={() => setIsAdvanceDialogOpen(true)}
            />
          </div>
        )}
      </DetailPageWrapper>

      {record && (
        <>
          <CommMonthlySummaryHoldDialog
            isOpen={isHoldDialogOpen}
            onClose={() => setIsHoldDialogOpen(false)}
            summaryId={record.id}
            role="management"
            currentAmount={Number(record.hold_amount || 0)}
            currentReason={(record as any).hold_reason || 'MANUAL'}
            currentNote={(record as any).hold_note || ''}
            onSuccess={() => {
              queryClient.invalidateQueries({
                queryKey: ['accounting', 'monthly_summaries'],
              })
            }}
          />
          <CommMonthlySummaryAdvanceDialog
            isOpen={isAdvanceDialogOpen}
            onClose={() => setIsAdvanceDialogOpen(false)}
            summaryId={record.id}
            role="management"
            onSuccess={() => {
              queryClient.invalidateQueries({
                queryKey: ['accounting', 'monthly_summaries'],
              })
            }}
          />
          {/* `empDetail?.fullname`, không phải `profileName` — profileName rơi về '—' khi thiếu
              tên và dialog sẽ nhét ký tự đó vào tên file Excel tải về. */}
          <CommHhqlEmailDialog
            isOpen={isHhqlEmailDialogOpen}
            onClose={() => setIsHhqlEmailDialogOpen(false)}
            targets={[{ id: record.id, name: empDetail?.fullname }]}
            onSent={() => {
              queryClient.invalidateQueries({
                queryKey: ['accounting', 'monthly_summaries'],
              })
            }}
          />
        </>
      )}
    </div>
  )
}

export default CommMgrDetailPage
