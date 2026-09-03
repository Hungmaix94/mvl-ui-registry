import { useMemo, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useConfirmMonthlySummary } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { CommMonthlySummaryHoldDialog } from './CommMonthlySummaryHoldDialog'
import type { ColumnDef } from '@tanstack/react-table'
import { Table, Dash } from '@/components/ui'
import { IconLock, IconReceipt, IconEye, IconCheck, IconEnvelopesimple } from '@/assets/icons'
import { useCommissionEmailDialogs } from '@/features/accounting/commissions/hooks/useCommissionEmailDialogs'
import { formatCurrencyVND, formatNumber } from '@/utils/common'
import { MonthlySummaryStatusBadge } from '@/features/accounting/monthly-summaries/components/MonthlySummaryStatusBadge'
import { APP_PATH } from '@/routes'
import { useAbility, type AppAbility } from '@/lib/ability'
import {
  COMMISSION_ACTION_PERMISSION,
  MONTHLY_SUMMARY_ACTION,
  MONTHLY_SUMMARY_SUBJECT,
} from '../constants/commission-permissions'
import type { TableAction } from '@/types/table'
import type { MonthlyBeneficiaryCommissionSummary } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { canShowConfirmMonthlyButton } from '../utils/comm-confirm-button'
import { PitMethod, MonthlySummaryStatus as MonthlyStatus } from '@/constants/api-schema-aliases'

const isPositive = (value?: string | number | null): boolean => Number(value || 0) > 0
const fmt = (value?: string | number | null): string => formatCurrencyVND(Number(value || 0))

type Props = {
  data: MonthlyBeneficiaryCommissionSummary[]
  isLoading: boolean
  error?: Error | null
  totalRecords?: number
  pageSize?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  selectedRows?: MonthlyBeneficiaryCommissionSummary[]
  onSelectionChange?: (selectedRows: MonthlyBeneficiaryCommissionSummary[]) => void
}

/** Xem ghi chú ở `getCommSaleMonthlyActions` — cùng luật, khác subject (CTV thay vì Sale). */
export function getCommCtvMonthlyActions(handlers: {
  navigate: (path: string) => void
  ability: AppAbility
  handleConfirm: (record: MonthlyBeneficiaryCommissionSummary) => void
  handleCreatePaymentVoucher: (record: MonthlyBeneficiaryCommissionSummary) => void
  openEmailDialog: (params: { id: number }) => void
  setHoldRecord: (record: MonthlyBeneficiaryCommissionSummary) => void
}): TableAction<MonthlyBeneficiaryCommissionSummary>[] {
  const S = MONTHLY_SUMMARY_SUBJECT.collaborators
  const can = (action: string) => handlers.ability.can(action, S)
  return [
    {
      label: 'Xem phiếu chi tiết',
      icon: <IconEye size={16} />,
      show: () => can(MONTHLY_SUMMARY_ACTION.RETRIEVE),
      onClick: (record) =>
        handlers.navigate(
          APP_PATH.COMMISSION_CTV_MONTHLY_DETAIL.replace(':id', record.id.toString())
        ),
    },
    {
      label: 'Duyệt bảng kê',
      icon: <IconCheck size={16} />,
      show: (record) =>
        can(MONTHLY_SUMMARY_ACTION.CONFIRM) && canShowConfirmMonthlyButton(record.status),
      onClick: (record) => handlers.handleConfirm(record),
    },
    {
      label: 'Tạo phiếu chi',
      icon: <IconReceipt size={16} />,
      show: (record) =>
        handlers.ability.can(
          COMMISSION_ACTION_PERMISSION.CREATE_PAYMENT_VOUCHER.action,
          COMMISSION_ACTION_PERMISSION.CREATE_PAYMENT_VOUCHER.subject
        ) && record.status === MonthlyStatus.CONFIRMED,
      onClick: (record) => handlers.handleCreatePaymentVoucher(record),
    },
    {
      label: 'Gửi email đối chiếu',
      icon: <IconEnvelopesimple size={16} />,
      show: (record) =>
        can(MONTHLY_SUMMARY_ACTION.SEND_EMAIL_PREVIEW) && record.status !== MonthlyStatus.DRAFT,
      onClick: (record) => handlers.openEmailDialog({ id: record.id }),
    },
    {
      label: 'Sửa tạm giữ HH',
      icon: <IconLock size={16} />,
      show: (record) => can(MONTHLY_SUMMARY_ACTION.HOLD) && record.status === MonthlyStatus.DRAFT,
      onClick: (record) => handlers.setHoldRecord(record),
    },
  ]
}

export const CommCtvMonthlyTable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = 25,
  currentPageIndex = 0,
  onPaginationChange,
  selectedRows,
  onSelectionChange,
}: Props) => {
  const navigate = useNavigate()
  const ability = useAbility()
  const queryClient = useQueryClient()
  const [holdRecord, setHoldRecord] = useState<MonthlyBeneficiaryCommissionSummary | null>(null)

  const confirmMutation = useConfirmMonthlySummary()

  const { openSingle: openEmailDialog, dialogs: emailDialogs } = useCommissionEmailDialogs(
    'collaborators',
    () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'monthly_summaries'] })
    }
  )

  const handleConfirm = useCallback(
    async (record: MonthlyBeneficiaryCommissionSummary) => {
      try {
        await confirmMutation.mutateAsync({
          role: 'collaborators',
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
          queryKey: ['accounting', 'monthly_summaries'],
        })
        toastService.success('Duyệt bảng kê thành công')
      } catch (err) {
        toastService.error(extractErrorMessage(err))
      }
    },
    [confirmMutation, queryClient]
  )

  const handleCreatePaymentVoucher = useCallback(
    (record: MonthlyBeneficiaryCommissionSummary) => {
      navigate(APP_PATH.PAYMENT_VOUCHER_CREATE, {
        state: {
          payee_type: 'COLLABORATOR',
          payee_collaborator: record.beneficiary_collaborator,
          total_amount: Number(record.net_payable || 0),
        },
      })
    },
    [navigate]
  )

  const columns = useMemo<ColumnDef<MonthlyBeneficiaryCommissionSummary>[]>(
    () => [
      {
        id: 'collaborator_info',
        header: 'CTV',
        cell: ({ row }) => {
          const col = row.original.beneficiary_collaborator_detail
          const collaboratorId = row.original.beneficiary_collaborator
          const idNumber = col?.id_number
          const canViewCollaborator = !!collaboratorId && ability.can('retrieve', 'collaborator')
          const identity = (
            <div className="flex flex-col gap-0.5">
              <span className="group-hover:text-action-primary-red-default leading-snug font-semibold break-words text-gray-900">
                {col?.code || '—'}
              </span>
              <span className="group-hover:text-action-primary-red-default text-[11px] break-words text-gray-500">
                {col?.name || '—'}
              </span>
            </div>
          )
          return (
            <div className="flex flex-col gap-0.5">
              {canViewCollaborator ? (
                <a
                  href={APP_PATH.COLLABORATOR_DETAIL.replace(':id', String(collaboratorId))}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="group cursor-pointer hover:underline"
                >
                  {identity}
                </a>
              ) : (
                identity
              )}
              {idNumber && <span className="text-[11px] text-gray-400">CCCD: {idNumber}</span>}
            </div>
          )
        },
        meta: { width: 'w-[220px]', frozen: true },
      },
      {
        id: 'docs',
        header: 'Giấy tờ',
        cell: () => <span className="text-[11px] text-gray-400">{'<cần API update>'}</span>,
        meta: { width: 'w-[140px]' },
      },
      {
        id: 'contracts',
        header: 'HĐ CTV',
        cell: ({ row }) => {
          const missingContractAmt = Number(
            (row.original as any).missing_contract_amount ||
              (row.original as any).held_contracts_amount ||
              0
          )
          const totalContracts = row.original.deals_count || 0
          const signedContracts =
            missingContractAmt > 0 ? Math.max(0, totalContracts - 1) : totalContracts
          const ctrPct =
            totalContracts > 0 ? Math.round((signedContracts / totalContracts) * 100) : 100

          return (
            <div className="flex min-w-[100px] items-center gap-2">
              <div className="h-1.5 w-10 overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${ctrPct}%`,
                    backgroundColor: ctrPct === 100 ? '#10B981' : '#F59E0B',
                  }}
                />
              </div>
              <span
                className="text-xs font-semibold"
                style={{ color: ctrPct === 100 ? '#10B981' : '#F59E0B' }}
              >
                {signedContracts}/{totalContracts}
              </span>
            </div>
          )
        },
        meta: { width: 'w-[120px]' },
      },
      {
        id: 'deal_count',
        header: 'Số lượng giao dịch',
        cell: ({ row }) => {
          const count = row.original.deals_count || 0
          return <span className={count ? 'text-gray-700' : 'text-gray-300'}>{count}</span>
        },
        meta: { width: 'w-[100px]', align: 'right' },
      },
      {
        id: 'total_commission',
        header: 'HH tiền về',
        cell: ({ row }) => (
          <span className="font-semibold text-gray-700">{fmt(row.original.pre_tax_total)}</span>
        ),
        meta: { width: 'w-[140px]', align: 'right' },
      },
      {
        id: 'bonus_total',
        header: 'Thưởng',
        cell: ({ row }) =>
          isPositive(row.original.bonus_total) ? (
            <span className="text-gray-700">{fmt(row.original.bonus_total)}</span>
          ) : (
            <Dash />
          ),
        meta: { width: 'w-[130px]', align: 'right' },
      },
      {
        id: 'pit_method',
        header: 'Cách tính PIT',
        cell: ({ row }) => {
          const method = row.original.pit_method
          if (!method || method === PitMethod.NONE) return <Dash />
          const labels: Record<string, string> = {
            [PitMethod.FLAT_10]: 'Khấu trừ 10%',
            [PitMethod.PROGRESSIVE]: 'Lũy tiến',
          }
          return <span className="text-xs text-gray-600">{labels[method] || method}</span>
        },
        meta: { width: 'w-[130px]', align: 'center' },
      },
      {
        id: 'pit_rate',
        header: 'Tỷ lệ PIT',
        cell: ({ row }) => {
          const rate = row.original.pit_rate
          if (rate == null) return <Dash />
          const pct = Number(rate) * 100
          return <span className="font-medium text-gray-600">{formatNumber(pct)}%</span>
        },
        meta: { width: 'w-[100px]', align: 'right' },
      },
      {
        id: 'missing_contract',
        header: 'Hoãn (thiếu HĐ)',
        cell: ({ row }) => {
          const missingContractAmt = Number(
            (row.original as any).missing_contract_amount ||
              (row.original as any).held_contracts_amount ||
              0
          )
          return missingContractAmt > 0 ? (
            <span className="font-medium text-amber-500">−{fmt(missingContractAmt)}</span>
          ) : (
            <Dash />
          )
        },
        meta: { width: 'w-[130px]', align: 'right' },
      },
      {
        id: 'hold_amount',
        header: 'Tạm giữ',
        cell: ({ row }) => {
          const holdAmt = Number(row.original.hold_amount || 0)
          const holdPct =
            holdAmt > 0 ? Math.round((holdAmt / Number(row.original.pre_tax_total || 1)) * 100) : 0
          return holdAmt > 0 ? (
            <span className="text-data-orange-default">
              −{fmt(holdAmt)} <span className="text-[10px] text-gray-400">({holdPct}%)</span>
            </span>
          ) : (
            <Dash />
          )
        },
        meta: { width: 'w-[130px]', align: 'right' },
      },
      {
        id: 'advance_recovery',
        header: 'Hoàn ứng',
        cell: ({ row }) =>
          isPositive(row.original.recovered_advance_amount) ? (
            <span className="font-medium text-purple-600">
              −{fmt(row.original.recovered_advance_amount)}
            </span>
          ) : (
            <Dash />
          ),
        meta: { width: 'w-[130px]', align: 'right' },
      },
      {
        id: 'pit_amount',
        header: 'Thuế TNCN',
        cell: ({ row }) =>
          isPositive(row.original.pit_amount) ? (
            <span className="text-data-red-default">−{fmt(row.original.pit_amount)}</span>
          ) : (
            <Dash />
          ),
        meta: { width: 'w-[130px]', align: 'right' },
      },
      {
        id: 'net_payable',
        header: 'Phải chi',
        cell: ({ row }) => (
          <span className="text-data-green-default font-semibold">
            {fmt(row.original.net_payable)} ₫
          </span>
        ),
        meta: { width: 'w-[150px]', align: 'right' },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const payrollCode =
            (row.original as any).payroll_code || (row.original as any).payment_code
          const paidDate = (row.original as any).paid_date || (row.original as any).payment_date
          const isPaid = row.original.status === MonthlyStatus.PAID
          return (
            <div className="flex flex-col items-start gap-0.5">
              <MonthlySummaryStatusBadge status={row.original.status as MonthlyStatus} />
              {isPaid && payrollCode && (
                <span className="text-[10px] text-gray-400">
                  <code>{payrollCode}</code>
                  {paidDate && ` · ${paidDate}`}
                </span>
              )}
            </div>
          )
        },
        meta: { width: 'w-[140px]', frozenRight: true },
      },
    ],
    [ability]
  )

  const actions: TableAction<MonthlyBeneficiaryCommissionSummary>[] = useMemo(
    () =>
      getCommCtvMonthlyActions({
        navigate,
        ability,
        handleConfirm,
        handleCreatePaymentVoucher,
        openEmailDialog,
        setHoldRecord,
      }),
    [navigate, ability, handleConfirm, handleCreatePaymentVoucher, openEmailDialog, setHoldRecord]
  )

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        Có lỗi xảy ra khi tải dữ liệu: {(error as Error)?.message || 'Unknown error'}
      </div>
    )
  }

  return (
    <>
      {emailDialogs}
      <Table
        className="!px-0"
        data={data}
        columns={columns}
        isLoading={isLoading}
        totalRecords={totalRecords}
        pageSize={pageSize}
        currentPageIndex={currentPageIndex}
        onPaginationChange={onPaginationChange}
        pageCount={totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 0}
        enableRowSelection
        enablePagination
        manualPagination
        showActions
        rowActions={actions}
        disableInnerOverflow={true}
        paginationPosition="static"
        stickyHeader
        onRowClick={(record) =>
          navigate(APP_PATH.COMMISSION_CTV_MONTHLY_DETAIL.replace(':id', record.id.toString()))
        }
        selectedRows={selectedRows}
        onSelectionChange={onSelectionChange}
      />
      {holdRecord && (
        <CommMonthlySummaryHoldDialog
          isOpen={!!holdRecord}
          onClose={() => setHoldRecord(null)}
          summaryId={holdRecord.id}
          role="collaborators"
          currentAmount={Number(holdRecord.hold_amount || 0)}
          currentReason={(holdRecord as any).hold_reason || 'MANUAL'}
          currentNote={(holdRecord as any).hold_note || ''}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ['accounting', 'monthly_summaries'],
            })
          }}
        />
      )}
    </>
  )
}
