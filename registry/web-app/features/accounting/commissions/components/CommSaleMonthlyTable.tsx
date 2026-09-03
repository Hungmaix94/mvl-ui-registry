import { useMemo, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Table, Chip, Button, Dash } from '@/components/ui'
import { IconLock, IconReceipt, IconEye, IconCheck, IconEnvelopesimple } from '@/assets/icons'
import { useCommissionEmailDialogs } from '@/features/accounting/commissions/hooks/useCommissionEmailDialogs'
import { formatCurrencyVND } from '@/utils/common'
import { MonthlySummaryStatusBadge } from '@/features/accounting/monthly-summaries/components/MonthlySummaryStatusBadge'
import {
  ROLE_LABELS,
  SourceRole,
} from '@/features/accounting/monthly-summaries/components/MonthlySummaryConstants'
import EmployeeProfileLink from '@/components/commons/EmployeeProfileLink'
import { APP_PATH } from '@/routes'
import type { TableAction } from '@/types/table'
import {
  useConfirmMonthlySummary,
  useBatchApproveMonthlySummary,
  type MonthlyBeneficiaryCommissionSummary,
} from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { canShowConfirmMonthlyButton } from '../utils/comm-confirm-button'
import { useAbility, type AppAbility } from '@/lib/ability'
import {
  COMMISSION_ACTION_PERMISSION,
  MONTHLY_SUMMARY_ACTION,
  MONTHLY_SUMMARY_SUBJECT,
} from '../constants/commission-permissions'
import { ColoredValueVariant } from '@/api/schema'
import {
  PitMethod,
  MonthlySummaryStatus as MonthlyStatus,
  CommissionHoldBeneficiaryType as BeneficiaryType,
} from '@/constants/api-schema-aliases'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { CommMonthlySummaryHoldDialog } from './CommMonthlySummaryHoldDialog'

const isPositive = (value?: string | number | null): boolean => Number(value || 0) > 0
// Bucket subtotals are signed: a period whose deductions outweigh the commission lands
// negative, and those rows are now listed on purpose. Guard them on non-zero (not > 0) or
// the person who was docked sees an empty row.
const hasMoney = (value?: string | number | null): boolean => Number(value || 0) !== 0
const moneyClass = (value?: string | number | null): string =>
  Number(value || 0) < 0 ? 'text-red-500' : 'text-gray-700'
const fmt = (value?: string | number | null): string => formatCurrencyVND(Number(value || 0))

type OrgMetaRow = { label: string; value: string }

/** Resolve beneficiary name + code from the typed nested detail objects. */
function resolveBeneficiary(row: MonthlyBeneficiaryCommissionSummary): {
  name: string
  code: string
} {
  switch (row.beneficiary_type) {
    case BeneficiaryType.EMPLOYEE: {
      const emp = row.beneficiary_employee_detail
      return { name: emp?.fullname || '—', code: emp?.code || '—' }
    }
    case BeneficiaryType.COLLABORATOR: {
      const col = row.beneficiary_collaborator_detail
      return { name: col?.name || '—', code: col?.code || '—' }
    }
    case BeneficiaryType.EXCHANGE: {
      const ex = row.beneficiary_exchange_detail
      return { name: ex?.name || '—', code: ex?.code || '—' }
    }
    default:
      return { name: '—', code: '—' }
  }
}

/** Resolve the "Phòng / Vai trò" chip label + org breakdown (chi nhánh / khối / phòng ban). */
function resolveLevelDept(row: MonthlyBeneficiaryCommissionSummary): {
  chip: string
  meta: OrgMetaRow[]
} {
  switch (row.beneficiary_type) {
    case BeneficiaryType.EMPLOYEE: {
      const emp = row.beneficiary_employee_detail
      const meta: OrgMetaRow[] = []
      if (emp?.branch?.name) meta.push({ label: 'Chi nhánh', value: emp.branch.name })
      if (emp?.block?.name) meta.push({ label: 'Khối', value: emp.block.name })
      if (emp?.department?.name) meta.push({ label: 'Phòng ban', value: emp.department.name })
      return { chip: emp?.position?.name || 'Nhân sự', meta }
    }
    case BeneficiaryType.COLLABORATOR:
      return { chip: 'CTV', meta: [{ label: '', value: 'Cộng tác viên' }] }
    case BeneficiaryType.EXCHANGE:
      return { chip: 'Sàn', meta: [{ label: '', value: 'Sàn liên kết' }] }
    default:
      return { chip: '—', meta: [] }
  }
}

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

/**
 * Mỗi mục gate bằng ĐÚNG quyền nó gọi tới, không phải quyền của màn đang đứng — bốn bảng kê theo
 * tháng dùng chung bộ nhãn này nhưng mỗi bảng đọc một ViewSet riêng, nên subject khác nhau
 * (`docs/ai/conventions.md` §"Gate một hành động bằng đúng quyền mà hành động đó GỌI TỚI").
 * Riêng "Tạo phiếu chi" điều hướng sang màn phiếu chi ⇒ ăn quyền `paymentvoucher`, không phải
 * quyền của bảng kê. Điều kiện quyền đứng TRƯỚC điều kiện trạng thái để đọc ra ý định.
 */
export function getCommSaleMonthlyActions(handlers: {
  navigate: (path: string) => void
  ability: AppAbility
  handleConfirm: (record: MonthlyBeneficiaryCommissionSummary) => void
  handleCreatePaymentVoucher: (record: MonthlyBeneficiaryCommissionSummary) => void
  openEmailDialog: (params: { id: number; payeeName?: string }) => void
  setHoldRecord: (record: MonthlyBeneficiaryCommissionSummary) => void
}): TableAction<MonthlyBeneficiaryCommissionSummary>[] {
  const S = MONTHLY_SUMMARY_SUBJECT.sales
  const can = (action: string) => handlers.ability.can(action, S)
  return [
    {
      label: 'Xem phiếu chi tiết',
      icon: <IconEye size={16} />,
      show: () => can(MONTHLY_SUMMARY_ACTION.RETRIEVE),
      onClick: (record) =>
        handlers.navigate(
          APP_PATH.COMMISSION_SALE_MONTHLY_DETAIL.replace(':id', record.id.toString())
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
      onClick: (record) =>
        handlers.openEmailDialog({ id: record.id, payeeName: resolveBeneficiary(record).name }),
    },
    {
      label: 'Sửa tạm giữ HH',
      icon: <IconLock size={16} />,
      show: (record) => can(MONTHLY_SUMMARY_ACTION.HOLD) && record.status === MonthlyStatus.DRAFT,
      onClick: (record) => handlers.setHoldRecord(record),
    },
  ]
}

export const CommSaleMonthlyTable = ({
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
  const confirmMutation = useConfirmMonthlySummary()
  const batchApproveMutation = useBatchApproveMonthlySummary()

  const {
    openSingle: openEmailDialog,
    openBulk: openBulkEmailDialog,
    dialogs: emailDialogs,
  } = useCommissionEmailDialogs('sales', () => {
    queryClient.invalidateQueries({ queryKey: ['accounting', 'monthly_summaries'] })
  })

  const [holdRecord, setHoldRecord] = useState<MonthlyBeneficiaryCommissionSummary | null>(null)

  const handleConfirm = useCallback(
    async (record: MonthlyBeneficiaryCommissionSummary) => {
      try {
        await confirmMutation.mutateAsync({
          role: 'sales',
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

  const handleBatchConfirm = useCallback(async () => {
    if (!selectedRows || selectedRows.length === 0) return
    try {
      const ids = selectedRows.map((r) => r.id)
      const res = (await batchApproveMutation.mutateAsync({ ids })) as any
      queryClient.invalidateQueries({
        queryKey: ['accounting', 'monthly_summaries'],
      })
      if (onSelectionChange) {
        onSelectionChange([])
      }
      toastService.success(`Đã duyệt thành công ${res.confirmed?.length || 0} bảng kê`)
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }, [selectedRows, batchApproveMutation, queryClient, onSelectionChange])

  const handleCreatePaymentVoucher = useCallback(
    (record: MonthlyBeneficiaryCommissionSummary) => {
      navigate(APP_PATH.PAYMENT_VOUCHER_CREATE, {
        state: {
          payee_type: 'EMPLOYEE',
          payee_employee: record.beneficiary_employee,
          total_amount: Number(record.net_payable || 0),
        },
      })
    },
    [navigate]
  )

  const columns = useMemo<ColumnDef<MonthlyBeneficiaryCommissionSummary>[]>(
    () => [
      {
        id: 'employee_info',
        header: 'Nhân viên',
        cell: ({ row }) => {
          const { name, code } = resolveBeneficiary(row.original)
          return (
            <div className="flex flex-col gap-0.5">
              <Link
                to={APP_PATH.COMMISSION_SALE_MONTHLY_DETAIL.replace(
                  ':id',
                  row.original.id.toString()
                )}
                className="hover:text-action-primary-red-default cursor-pointer leading-snug font-semibold break-words text-gray-800 hover:underline"
              >
                {name}
              </Link>
              <EmployeeProfileLink
                employeeId={row.original.beneficiary_employee}
                className="w-fit"
                title={name}
              >
                <code className="bg-transparent p-0 text-[11px] text-gray-400">{code}</code>
              </EmployeeProfileLink>
            </div>
          )
        },
        meta: { width: 'w-[200px]', frozen: true },
      },
      {
        id: 'level_dept',
        header: 'Phòng / Vai trò',
        cell: ({ row }) => {
          const { chip, meta } = resolveLevelDept(row.original)
          return (
            <div className="flex flex-col items-start gap-1 py-0.5">
              <Chip label={chip} variant={ColoredValueVariant.GREY} size="small" />
              {meta.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  {meta.map((m, i) => (
                    <div key={m.label || i} className="flex gap-1 text-xs leading-snug">
                      {m.label && <span className="shrink-0 text-gray-400">{m.label}:</span>}
                      <span className="break-words text-gray-600">{m.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        },
        meta: { width: 'w-[260px]' },
      },
      {
        id: 'deal_count',
        header: 'Số lượng giao dịch',
        cell: ({ row }) => {
          const count = row.original.deals_count || 0
          return <span className={count ? 'text-gray-700' : 'text-gray-300'}>{count}</span>
        },
        meta: { width: 'w-[150px]', align: 'right' },
      },
      {
        id: 'sale_commission',
        header: 'HH theo tiền về',
        cell: ({ row }) =>
          hasMoney(row.original.sale_total) ? (
            <span className={moneyClass(row.original.sale_total)}>
              {fmt(row.original.sale_total)}
            </span>
          ) : (
            <Dash />
          ),
        meta: { width: 'w-[150px]', align: 'right' },
      },
      {
        id: 'promo_total',
        // Same source as the detail screen (ROLE_LABELS[PROMO]) so the two cannot drift.
        // "Hỗ trợ quảng cáo" is the AD_SUPPORT bonus type, not this field — ClickUp 86eykqe00.
        header: ROLE_LABELS[SourceRole.PROMO],
        cell: ({ row }) =>
          hasMoney(row.original.promo_total) ? (
            <span className={moneyClass(row.original.promo_total)}>
              {fmt(row.original.promo_total)}
            </span>
          ) : (
            <Dash />
          ),
        meta: { width: 'w-[150px]', align: 'right' },
      },
      {
        id: 'bonus_total',
        header: 'Thưởng',
        cell: ({ row }) =>
          hasMoney(row.original.bonus_total) ? (
            <span className={moneyClass(row.original.bonus_total)}>
              {fmt(row.original.bonus_total)}
            </span>
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
          return <span className="font-medium text-gray-600">{pct}%</span>
        },
        meta: { width: 'w-[100px]', align: 'right' },
      },
      {
        id: 'hold_amount',
        header: 'Tạm giữ',
        cell: ({ row }) =>
          isPositive(row.original.hold_amount) ? (
            <span className="text-data-orange-default">{fmt(row.original.hold_amount)}</span>
          ) : (
            <Dash />
          ),
        meta: { width: 'w-[130px]', align: 'right' },
      },
      {
        id: 'advance_recovery',
        header: 'Hoàn ứng',
        cell: ({ row }) =>
          isPositive(row.original.recovered_advance_amount) ? (
            <span className="text-data-orange-default">
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
            {fmt(row.original.net_payable)}
          </span>
        ),
        meta: { width: 'w-[150px]', align: 'right' },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <MonthlySummaryStatusBadge status={row.original.status as MonthlyStatus} />
        ),
        meta: { width: 'w-[130px]', frozenRight: true },
      },
    ],
    []
  )

  const actions: TableAction<MonthlyBeneficiaryCommissionSummary>[] = useMemo(
    () =>
      getCommSaleMonthlyActions({
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
        Có lỗi xảy ra khi tải dữ liệu: {(error as any)?.message || 'Unknown error'}
      </div>
    )
  }

  return (
    <>
      {selectedRows && selectedRows.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-2 mb-4 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/40 px-5 py-3.5 shadow-sm backdrop-blur-md duration-300">
          <div className="flex items-center gap-3">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white shadow-sm">
              {selectedRows.length}
            </div>
            <span className="typo-body-base-medium font-medium text-neutral-700">
              Đang chọn{' '}
              <strong className="font-semibold text-neutral-900">{selectedRows.length}</strong> bảng
              kê hoa hồng
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              size="small"
              variant="primary"
              className="px-5 font-semibold transition-all duration-200"
              leftIcon={<IconCheck className="h-4 w-4" />}
              onClick={handleBatchConfirm}
              loading={batchApproveMutation.isPending}
            >
              Duyệt bảng kê
            </Button>
            <Button
              size="small"
              variant="secondary"
              className="px-5 font-semibold transition-all duration-200"
              leftIcon={<IconEnvelopesimple className="h-4 w-4" />}
              onClick={() => openBulkEmailDialog((selectedRows ?? []).map((r) => r.id))}
            >
              Gửi email đối chiếu
            </Button>
          </div>
        </div>
      )}
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
          navigate(APP_PATH.COMMISSION_SALE_MONTHLY_DETAIL.replace(':id', record.id.toString()))
        }
        selectedRows={selectedRows}
        onSelectionChange={onSelectionChange}
      />
      {holdRecord && (
        <CommMonthlySummaryHoldDialog
          isOpen={!!holdRecord}
          onClose={() => setHoldRecord(null)}
          summaryId={holdRecord.id}
          role="sales"
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
