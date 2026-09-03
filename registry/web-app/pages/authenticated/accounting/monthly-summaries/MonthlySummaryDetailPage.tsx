import { useCallback, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Text, Badge } from '@radix-ui/themes'
import { Button, PageTitle } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import DisplayField from '@/components/commons/DisplayField'
import { useAbility } from '@/lib/ability'
import { QUERY_KEYS } from '@/constants'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { APP_PATH } from '@/routes/AppRoute.constant'
import {
  useMonthlySummary,
  useConfirmMonthlySummary,
  useAggregateMonthlySummary,
  useMonthlySummaryHistories,
  MonthlySummaryRole,
} from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { MonthlySummaryDetailTabs } from '@/features/accounting/monthly-summaries/components/MonthlySummaryDetailTabs'
import { CommMonthlySummaryHoldDialog } from '@/features/accounting/commissions/components/CommMonthlySummaryHoldDialog'
import { CommMonthlySummaryAdvanceDialog } from '@/features/accounting/commissions/components/CommMonthlySummaryAdvanceDialog'
import AppDialog from '@/components/dialog/AppDialog'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { IconReceipt } from '@/assets/icons'
import {
  MonthlySummaryStatus as MonthlyBeneficiaryCommissionSummaryStatus,
  CommissionHoldBeneficiaryType as MonthlyBeneficiaryCommissionSummaryBeneficiary_type,
} from '@/constants/api-schema-aliases'

const MonthlySummaryDetailPage = () => {
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [
      APP_CONSTANT_KEY.ACCOUNTING.MONTHLY_BENEFICIARY_COMMISSION_SUMMARY_BENEFICIARY_TYPE_CHOICES,
    ],
  })

  const beneficiaryTypeLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.MONTHLY_BENEFICIARY_COMMISSION_SUMMARY_BENEFICIARY_TYPE_CHOICES
  ) as Record<string, string> | null
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const role = (searchParams.get('role') as MonthlySummaryRole) || 'employees'

  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isAggregateOpen, setIsAggregateOpen] = useState(false)
  const [isHoldDialogOpen, setIsHoldDialogOpen] = useState(false)
  const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false)
  const queryClient = useQueryClient()
  const ability = useAbility()

  const { data: record, isLoading, error } = useMonthlySummary(role, id, { enabled: !!id })
  const { data: historiesResponse, isLoading: isHistoriesLoading } = useMonthlySummaryHistories(
    role,
    id,
    undefined,
    { enabled: !!id }
  )
  const auditLogs = historiesResponse?.results ?? []
  const { mutateAsync: confirmSummary, isPending: isConfirming } = useConfirmMonthlySummary()
  const { mutateAsync: aggregateSummary, isPending: isAggregating } = useAggregateMonthlySummary()

  const subjectMap: Record<MonthlySummaryRole, string> = {
    employees: 'employeemonthlycommissionsummary',
    collaborators: 'collaboratormonthlycommissionsummary',
    f2: 'f2monthlycommissionsummary',
    sales: 'salesmonthlycommissionsummary',
    management: 'managementmonthlycommissionsummary',
  }
  const subject = subjectMap[role] || 'employeemonthlycommissionsummary'
  const canRetrieve =
    ability.can('retrieve', subject) || ability.can('retrieve', 'monthlycommissionsummary')
  const canCreate =
    ability.can('create', subject) || ability.can('create', 'monthlycommissionsummary')

  const getBeneficiaryName = () => {
    if (!record) return ''
    if (record.beneficiary_type === 'EMPLOYEE') {
      return (
        record.beneficiary_employee_detail?.fullname || String(record.beneficiary_employee || '')
      )
    }
    if (record.beneficiary_type === 'COLLABORATOR') {
      return (
        record.beneficiary_collaborator_detail?.name ||
        String(record.beneficiary_collaborator || '')
      )
    }
    if (record.beneficiary_type === 'EXCHANGE') {
      return record.beneficiary_exchange_detail?.name || String(record.beneficiary_exchange || '')
    }
    return 'Chi tiết'
  }

  const handleConfirm = useCallback(async () => {
    setIsConfirmOpen(false)
    try {
      if (!record) return
      await confirmSummary({
        role,
        id,
        data: {
          year: record.year,
          month: record.month,
          beneficiary_type:
            record.beneficiary_type as MonthlyBeneficiaryCommissionSummaryBeneficiary_type,
          beneficiary_employee: record.beneficiary_employee,
          beneficiary_collaborator: record.beneficiary_collaborator,
          beneficiary_exchange: record.beneficiary_exchange,
        },
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.DETAIL(id),
      })
      toastService.success('Xác nhận bảng hoa hồng thành công')
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }, [confirmSummary, id, record, queryClient])

  const handleAggregate = useCallback(async () => {
    setIsAggregateOpen(false)
    try {
      if (!record) return
      await aggregateSummary({ year: record.year, month: record.month })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.DETAIL(id),
      })
      toastService.success('Tổng hợp hoa hồng thành công')
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }, [aggregateSummary, id, record, queryClient])

  const isDraft = record?.status === MonthlyBeneficiaryCommissionSummaryStatus.DRAFT

  return (
    <>
      <AppDialog
        variant="alert"
        open={isAggregateOpen}
        onOpenChange={setIsAggregateOpen}
        onConfirm={handleAggregate}
        title="Xác nhận tổng hợp hoa hồng"
        titleDescription="Hành động này sẽ tính toán lại hoa hồng cho người thụ hưởng này. Bạn có muốn tiếp tục?"
        content={null}
        loading={isAggregating}
        onCancel={() => setIsAggregateOpen(false)}
      />
      <AppDialog
        variant="alert"
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={handleConfirm}
        title="Xác nhận chốt bảng hoa hồng"
        titleDescription="Sau khi chốt, bạn sẽ không thể chỉnh sửa thông tin cho đến khi bảng được mở lại. Bạn có muốn tiếp tục?"
        confirmText="Xác nhận chốt"
        content={null}
        loading={isConfirming}
        onCancel={() => setIsConfirmOpen(false)}
      />

      <PageTitle
        title={record ? `Tổng kết hoa hồng - ${getBeneficiaryName()}` : 'Tổng kết hoa hồng'}
        enableBackButton
        breadcrumb={[
          { label: 'Kế toán', href: '#' },
          { label: 'Tổng kết HH theo người', href: APP_PATH.COMM_EMPLOYEE_PAYROLL },
          {
            label: record ? `${String(record.month).padStart(2, '0')}/${record.year}` : 'Chi tiết',
            isCurrentPage: true,
          },
        ]}
        customActions={
          isDraft && canCreate ? (
            <div className="flex items-center gap-3">
              <Button
                variant="secondary-border"
                onClick={() => setIsAggregateOpen(true)}
                disabled={isAggregating || isConfirming}
                loading={isAggregating}
              >
                Tổng hợp
              </Button>
              <Button
                variant="primary"
                onClick={() => setIsConfirmOpen(true)}
                disabled={isConfirming || isAggregating}
                loading={isConfirming}
              >
                Xác nhận
              </Button>
            </div>
          ) : record?.status === 'CONFIRMED' ? (
            <Button
              variant="primary"
              leftIcon={<IconReceipt />}
              onClick={() => {
                const state: any = {
                  payee_type: record.beneficiary_type,
                  total_amount: Number(record.net_payable || 0),
                }
                if (record.beneficiary_type === 'EMPLOYEE') {
                  state.payee_employee = record.beneficiary_employee
                } else if (record.beneficiary_type === 'COLLABORATOR') {
                  state.payee_collaborator = record.beneficiary_collaborator
                } else if (record.beneficiary_type === 'EXCHANGE') {
                  state.payee_exchange = record.beneficiary_exchange
                }
                navigate(APP_PATH.PAYMENT_VOUCHER_CREATE, { state })
              }}
            >
              Tạo phiếu chi
            </Button>
          ) : null
        }
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isError={!!error}
        isNotFound={!isLoading && !error && !record}
        hasPermission={canRetrieve}
      >
        {record && (
          <div className="flex flex-col gap-5 px-10 py-6">
            <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin kỳ kế toán</Text>

            <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6 shadow-sm">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <DisplayField
                  label="Kỳ tháng"
                  value={
                    <Badge color="blue" variant="soft" size="2">
                      Tháng {String(record.month).padStart(2, '0')}/{record.year}
                    </Badge>
                  }
                />

                <DisplayField
                  label="Loại người nhận"
                  value={
                    (record.beneficiary_type && beneficiaryTypeLabels?.[record.beneficiary_type]) ??
                    record.beneficiary_type
                  }
                />

                <DisplayField
                  label="Người thụ hưởng"
                  value={<Text weight="medium">{getBeneficiaryName() || '-'}</Text>}
                />
              </div>
            </div>

            <MonthlySummaryDetailTabs
              record={record}
              role={role}
              onEditHold={isDraft ? () => setIsHoldDialogOpen(true) : undefined}
              onEditAdvance={isDraft ? () => setIsAdvanceDialogOpen(true) : undefined}
              auditLogs={auditLogs}
              isHistoriesLoading={isHistoriesLoading}
            />
          </div>
        )}
      </DetailPageWrapper>

      {record && (
        <>
          <CommMonthlySummaryHoldDialog
            isOpen={isHoldDialogOpen}
            onClose={() => setIsHoldDialogOpen(false)}
            summaryId={id}
            role={role}
            currentAmount={Number(record.hold_amount || 0)}
            currentReason={(record as any).hold_reason || 'MANUAL'}
            currentNote={(record as any).hold_note || ''}
            onSuccess={() => {
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.DETAIL(id),
              })
            }}
          />
          <CommMonthlySummaryAdvanceDialog
            isOpen={isAdvanceDialogOpen}
            onClose={() => setIsAdvanceDialogOpen(false)}
            summaryId={id}
            role={role}
            onSuccess={() => {
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.DETAIL(id),
              })
            }}
          />
        </>
      )}
    </>
  )
}

export default MonthlySummaryDetailPage
