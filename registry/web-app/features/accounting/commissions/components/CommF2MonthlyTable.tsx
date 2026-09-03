import { useMemo, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useConfirmMonthlySummary } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { CommMonthlySummaryHoldDialog } from './CommMonthlySummaryHoldDialog'
import { CommMonthlySummaryAdvanceDialog } from './CommMonthlySummaryAdvanceDialog'
import type { ColumnDef } from '@tanstack/react-table'
import { Table, Dash } from '@/components/ui'
import { IconReceipt, IconEye, IconCheck, IconEnvelopesimple } from '@/assets/icons'
import { useCommissionEmailDialogs } from '@/features/accounting/commissions/hooks/useCommissionEmailDialogs'
import { formatCurrencyVND } from '@/utils/common'
import { MonthlySummaryStatusBadge } from '@/features/accounting/monthly-summaries/components/MonthlySummaryStatusBadge'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import {
  COMMISSION_ACTION_PERMISSION,
  MONTHLY_SUMMARY_ACTION,
  MONTHLY_SUMMARY_SUBJECT,
} from '../constants/commission-permissions'
import type { TableAction } from '@/types/table'
import type { MonthlyBeneficiaryCommissionSummary } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { MonthlySummaryStatus as MonthlyStatus } from '@/constants/api-schema-aliases'
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

export const CommF2MonthlyTable = ({
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
  const [advanceRecord, setAdvanceRecord] = useState<MonthlyBeneficiaryCommissionSummary | null>(
    null
  )

  const confirmMutation = useConfirmMonthlySummary()

  const { openSingle: openEmailDialog, dialogs: emailDialogs } = useCommissionEmailDialogs(
    'f2',
    () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'monthly_summaries'] })
    }
  )

  const handleConfirm = useCallback(
    async (record: MonthlyBeneficiaryCommissionSummary) => {
      try {
        await confirmMutation.mutateAsync({
          role: 'f2',
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
          payee_type: 'EXCHANGE',
          payee_exchange: record.beneficiary_exchange,
          total_amount: Number(record.net_payable || 0),
        },
      })
    },
    [navigate]
  )

  const columns = useMemo<ColumnDef<MonthlyBeneficiaryCommissionSummary>[]>(
    () => [
      {
        id: 'exchange_info',
        header: 'F2 / Sàn',
        cell: ({ row }) => {
          const ex = row.original.beneficiary_exchange_detail
          const exchangeId = row.original.beneficiary_exchange
          const taxCode = ex?.tax_code
          const canViewExchange = !!exchangeId && ability.can('retrieve', 'exchange')
          const identity = (
            <div className="flex flex-col gap-0.5">
              <span className="group-hover:text-action-primary-red-default leading-snug font-semibold break-words text-gray-800">
                {ex?.code || '—'}
              </span>
              <span className="group-hover:text-action-primary-red-default text-[11px] break-words text-gray-500">
                {ex?.name || '—'}
              </span>
            </div>
          )
          return (
            <div className="flex flex-col gap-0.5">
              {canViewExchange ? (
                <a
                  href={APP_PATH.EXCHANGE_MANAGEMENT_DETAIL.replace(':id', String(exchangeId))}
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
              {taxCode && <span className="text-[11px] text-gray-400">MST: {taxCode}</span>}
            </div>
          )
        },
        meta: { width: 'w-[320px]', frozen: true },
      },
      {
        id: 'account_mgr',
        header: 'NV phụ trách',
        cell: ({ row }) => (
          <span className="text-xs text-gray-600">
            {(row.original as any).account_mgr || '<cần API update>'}
          </span>
        ),
        meta: { width: 'w-[150px]' },
      },
      {
        id: 'deal_count',
        header: 'Số lượng giao dịch',
        cell: ({ row }) => {
          const count = row.original.deals_count || 0
          return <span className={count ? 'text-gray-700' : 'text-gray-300'}>{count}</span>
        },
        meta: { width: 'w-[120px]', align: 'right' },
      },
      {
        id: 'f2_commission',
        header: 'HH theo tiền về',
        cell: ({ row }) =>
          isPositive(row.original.f2_total) ? (
            <span className="font-semibold text-gray-700">{fmt(row.original.f2_total)}</span>
          ) : (
            <Dash />
          ),
        meta: { width: 'w-[160px]', align: 'right' },
      },
      {
        id: 'input_invoice',
        header: 'HĐ đầu vào',
        cell: ({ row }) => {
          const needed = Number(row.original.f2_total || 0)
          const received = Number(row.original.pre_tax_total || 0)
          const missing = Math.max(0, needed - received)
          const hasInvShortage = missing > 0
          const invPct = needed > 0 ? Math.min(100, Math.round((received / needed) * 100)) : 100

          const totalDeals = row.original.deals_count || 0
          const count =
            invPct === 100
              ? totalDeals
              : Math.max(
                  0,
                  Math.min(totalDeals, Math.round(totalDeals * (received / (needed || 1))))
                )

          return (
            <div className="flex min-w-[130px] flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-12 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${invPct}%`,
                      backgroundColor: invPct === 100 ? '#10B981' : '#F59E0B',
                    }}
                  />
                </div>
                <span
                  className="text-xs font-semibold"
                  style={{ color: invPct === 100 ? '#10B981' : '#F59E0B' }}
                >
                  {count}/{totalDeals} HĐ
                </span>
              </div>
              {hasInvShortage ? (
                <span className="text-[10px] font-medium text-amber-600">
                  Thiếu {fmt(missing)} ₫
                </span>
              ) : (
                <span className="text-[10px] text-gray-400">Đủ {fmt(received)} ₫</span>
              )}
            </div>
          )
        },
        meta: { width: 'w-[160px]', align: 'right' },
      },
      {
        id: 'debt_carry',
        header: 'Công nợ kỳ trước',
        cell: ({ row }) => {
          const debt = Number(
            (row.original as any).debt_carry || (row.original as any).carry_forward || 0
          )
          if (debt === 0) return <Dash />
          return debt > 0 ? (
            <span className="font-medium text-red-600" title="MV còn nợ F2 từ kỳ trước">
              +{fmt(debt)}
            </span>
          ) : (
            <span className="font-medium text-green-600" title="F2 còn nợ MV (chi dư kỳ trước)">
              {fmt(debt)}
            </span>
          )
        },
        meta: { width: 'w-[150px]', align: 'right' },
      },
      {
        id: 'paid_amount',
        header: 'Đã chi',
        cell: ({ row }) => {
          const paid = Number(
            (row.original as any).paid_amount || (row.original as any).amount_paid || 0
          )
          return paid > 0 ? (
            <span className="font-medium text-green-600">{fmt(paid)}</span>
          ) : (
            <Dash />
          )
        },
        meta: { width: 'w-[150px]', align: 'right' },
      },
      {
        id: 'net_payable',
        header: 'Còn phải chi',
        cell: ({ row }) => (
          <span className="text-data-green-default font-semibold">
            {fmt(row.original.net_payable)} ₫
          </span>
        ),
        meta: { width: 'w-[180px]', align: 'right' },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const needed = Number(row.original.f2_total || 0)
          const received = Number(row.original.pre_tax_total || 0)
          const hasInvShortage = needed > received
          const payrollCode =
            (row.original as any).payroll_code || (row.original as any).payment_code
          const paidDate = (row.original as any).paid_date || (row.original as any).payment_date
          const isPaid = row.original.status === MonthlyStatus.PAID
          return (
            <div className="flex flex-col items-start gap-1">
              <MonthlySummaryStatusBadge status={row.original.status as MonthlyStatus} />
              {isPaid && payrollCode && (
                <span className="text-[10px] text-gray-400">
                  <code>{payrollCode}</code>
                  {paidDate && ` · ${paidDate}`}
                </span>
              )}
              {hasInvShortage && !isPaid && (
                <span className="text-[10px] text-amber-600">Cần thêm HĐ để chi</span>
              )}
            </div>
          )
        },
        meta: { width: 'w-[180px]', frozenRight: true },
      },
    ],
    [ability]
  )

  // Cùng luật với `getCommSaleMonthlyActions`, khác subject (F2). "Tạo phiếu chi" điều hướng sang
  // màn phiếu chi nên ăn quyền `paymentvoucher`, không phải quyền của bảng kê F2.
  const actions: TableAction<MonthlyBeneficiaryCommissionSummary>[] = useMemo(() => {
    const S = MONTHLY_SUMMARY_SUBJECT.f2
    const can = (action: string) => ability.can(action, S)
    return [
      {
        label: 'Xem phiếu chi tiết',
        icon: <IconEye size={16} />,
        show: () => can(MONTHLY_SUMMARY_ACTION.RETRIEVE),
        onClick: (record) =>
          navigate(APP_PATH.COMMISSION_F2_MONTHLY_DETAIL.replace(':id', record.id.toString())),
      },
      {
        label: 'Duyệt bảng kê',
        icon: <IconCheck size={16} />,
        show: (record) =>
          can(MONTHLY_SUMMARY_ACTION.CONFIRM) && record.status === MonthlyStatus.DRAFT,
        onClick: (record) => handleConfirm(record),
      },
      {
        label: 'Tạo phiếu chi',
        icon: <IconReceipt size={16} />,
        show: (record) =>
          ability.can(
            COMMISSION_ACTION_PERMISSION.CREATE_PAYMENT_VOUCHER.action,
            COMMISSION_ACTION_PERMISSION.CREATE_PAYMENT_VOUCHER.subject
          ) && record.status === MonthlyStatus.CONFIRMED,
        onClick: (record) => handleCreatePaymentVoucher(record),
      },
      {
        label: 'Gửi email đối chiếu',
        icon: <IconEnvelopesimple size={16} />,
        show: (record) =>
          can(MONTHLY_SUMMARY_ACTION.SEND_EMAIL_PREVIEW) && record.status !== MonthlyStatus.DRAFT,
        onClick: (record) => openEmailDialog({ id: record.id }),
      },
    ]
  }, [navigate, ability, handleConfirm, handleCreatePaymentVoucher, openEmailDialog])

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
          navigate(APP_PATH.COMMISSION_F2_MONTHLY_DETAIL.replace(':id', record.id.toString()))
        }
        selectedRows={selectedRows}
        onSelectionChange={onSelectionChange}
      />
      {holdRecord && (
        <CommMonthlySummaryHoldDialog
          isOpen={!!holdRecord}
          onClose={() => setHoldRecord(null)}
          summaryId={holdRecord.id}
          role="f2"
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
      {advanceRecord && (
        <CommMonthlySummaryAdvanceDialog
          isOpen={!!advanceRecord}
          onClose={() => setAdvanceRecord(null)}
          summaryId={advanceRecord.id}
          role="f2"
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
