import { useMemo, useCallback, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useConfirmMonthlySummary } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { CommMonthlySummaryHoldDialog } from './CommMonthlySummaryHoldDialog'
import {
  ADVANCE_REQUEST_ACTION_LABEL,
  CommMonthlySummaryAdvanceDialog,
} from './CommMonthlySummaryAdvanceDialog'
import type { ColumnDef } from '@tanstack/react-table'
import { Table, Dash } from '@/components/ui'
import {
  IconLock,
  IconDownload,
  IconEye,
  IconCheck,
  IconPencilsimple,
  IconEnvelopesimple,
} from '@/assets/icons'
import { useCommissionEmailDialogs } from '@/features/accounting/commissions/hooks/useCommissionEmailDialogs'
import { useStickyTableHeader } from '@/hooks/useStickyTableHeader'
import { formatCurrencyVND } from '@/utils/common'
import { MonthlySummaryStatusBadge } from '@/features/accounting/monthly-summaries/components/MonthlySummaryStatusBadge'
import {
  ROLE_LABELS,
  SourceRole,
} from '@/features/accounting/monthly-summaries/components/MonthlySummaryConstants'
import EmployeeProfileLink from '@/components/commons/EmployeeProfileLink'
import { APP_PATH } from '@/routes'
import type { TableAction } from '@/types/table'
import { useAbility, type AppAbility } from '@/lib/ability'
import {
  MONTHLY_SUMMARY_ACTION,
  MONTHLY_SUMMARY_SUBJECT,
} from '../constants/commission-permissions'
import type { MonthlyBeneficiaryCommissionSummary } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import {
  PitMethod,
  MonthlySummaryStatus as MonthlyStatus,
  CommissionHoldBeneficiaryType as BeneficiaryType,
} from '@/constants/api-schema-aliases'

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

/** Scopes the sticky-header lookup to this table only. */
const TABLE_SCOPE_CLASS = 'js-comm-mgr-monthly-table'

const isPositive = (value?: string | number | null): boolean => Number(value || 0) > 0
// Bucket subtotals are signed: a period whose deductions outweigh the commission lands negative,
// and those rows are now listed on purpose. Guard them on non-zero (not > 0) or the person who
// was docked sees an empty row. `hold_amount` / `recovered_advance_amount` / `pit_amount` keep
// the `> 0` guard — they are magnitudes, never signed.
const hasMoney = (value?: string | number | null): boolean => Number(value || 0) !== 0
// Negative uses the design token, not raw `text-red-500`: "Thuế TNCN" two columns over already
// renders its minus in `text-data-red-default`, so a raw palette red puts two different reds on
// the same row.
const NEGATIVE_MONEY_CLASS = 'text-data-red-default'
const moneyClass = (value?: string | number | null): string =>
  Number(value || 0) < 0 ? NEGATIVE_MONEY_CLASS : 'text-gray-700'
const fmt = (value?: string | number | null): string => formatCurrencyVND(Number(value || 0))

/**
 * Resolve beneficiary name + code + chức vụ from the typed nested detail objects.
 *
 * Chức vụ belongs to the person, so it renders in the "Nhân viên" cell (CR 86eyj2er9) —
 * as plain text, not a Chip: a long title like "Phó Giám đốc Kinh doanh Chi nhánh" blew
 * a fixed-width Chip out of its column.
 */
function resolveBeneficiary(row: MonthlyBeneficiaryCommissionSummary): {
  name: string
  code: string
  position: string
} {
  switch (row.beneficiary_type) {
    case BeneficiaryType.EMPLOYEE: {
      const emp = row.beneficiary_employee_detail
      return {
        name: emp?.fullname || '—',
        code: emp?.code || '—',
        position: emp?.position?.name || '',
      }
    }
    case BeneficiaryType.COLLABORATOR: {
      const col = row.beneficiary_collaborator_detail
      return { name: col?.name || '—', code: col?.code || '—', position: 'Cộng tác viên' }
    }
    case BeneficiaryType.EXCHANGE: {
      const ex = row.beneficiary_exchange_detail
      return { name: ex?.name || '—', code: ex?.code || '—', position: 'Sàn liên kết' }
    }
    default:
      return { name: '—', code: '—', position: '' }
  }
}

/**
 * Row actions of the "HH theo tháng — Quản lý" list.
 *
 * Exported (like `getCommSaleMonthlyActions` / `getCommCtvMonthlyActions`) so the labels can be
 * asserted without mounting the table — see `comm-confirm-button.test.ts`. Bug 86eynz1a2: the
 * advance entry used to be labelled "Trừ hoàn ứng", which reads as *deducting a recovery* while
 * the dialog it opens creates a NEW advance request and pushes it into the approval ladder.
 */
export function getCommMgrMonthlyActions(handlers: {
  navigate: (path: string) => void
  ability: AppAbility
  handleConfirm: (record: MonthlyBeneficiaryCommissionSummary) => void
  openEmailDialog: (params: { id: number; payeeName?: string }) => void
  setHoldRecord: (record: MonthlyBeneficiaryCommissionSummary) => void
  setAdvanceRecord: (record: MonthlyBeneficiaryCommissionSummary) => void
}): TableAction<MonthlyBeneficiaryCommissionSummary>[] {
  const S = MONTHLY_SUMMARY_SUBJECT.management
  const can = (action: string) => handlers.ability.can(action, S)
  return [
    {
      label: 'Xem phiếu chi tiết',
      icon: <IconEye size={16} />,
      show: () => can(MONTHLY_SUMMARY_ACTION.RETRIEVE),
      onClick: (record) =>
        handlers.navigate(APP_PATH.COMMISSION_MANAGER_DETAIL.replace(':id', record.id.toString())),
    },
    {
      label: 'Duyệt bảng kê',
      icon: <IconCheck size={16} />,
      show: (record) =>
        can(MONTHLY_SUMMARY_ACTION.CONFIRM) && record.status === MonthlyStatus.DRAFT,
      onClick: (record) => handlers.handleConfirm(record),
    },
    // Không có "Tạo phiếu chi" ở đây: hoa hồng quản lý chi theo CẢ ĐỢT (wave MGMT), một đợt
    // là một lần chi — không cắt phiếu lẻ từng người. Xem `payout_wave_service.pay_wave` /
    // màn 20.18. Trước đây action này cắt phiếu bằng `record.net_payable`, vốn là net CẢ KỲ
    // (gồm cả tiền đợt Sale) trên cùng bản ghi mà màn HH Sale cũng cắt phiếu — chi hai lần.
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
    {
      label: ADVANCE_REQUEST_ACTION_LABEL,
      icon: <IconPencilsimple size={16} />,
      // Dialog này gọi `POST .../management/{id}/request-advance/` (`useRequestAdvanceMonthlySummary`),
      // KHÔNG phải `POST /commission-advances/` — nên quyền là `…summary.request_advance`, không
      // phải `commissionadvance.create`. Hai mã này thuộc hai vai trò nghiệp vụ khác nhau.
      show: (record) =>
        can(MONTHLY_SUMMARY_ACTION.REQUEST_ADVANCE) && record.status === MonthlyStatus.DRAFT,
      onClick: (record) => handlers.setAdvanceRecord(record),
    },
    {
      // KHÔNG gate: chưa gọi gì cả, chỉ bắn toast "đang phát triển". Gắn quyền cho một hành động
      // rỗng là khoá nhầm người dùng vì một tính năng chưa tồn tại — khi nào nối API thật thì lấy
      // mã ở chính endpoint đó rồi mới gate.
      label: 'Xuất bảng kê (PDF)',
      icon: <IconDownload size={16} />,
      onClick: () => {
        toastService.info('Tính năng đang phát triển')
      },
    },
  ]
}

type OrgMetaRow = { label: string; value: string }

/** Rows of the "Đơn vị" cell: chi nhánh / khối / phòng ban of the beneficiary. */
function resolveOrgUnit(row: MonthlyBeneficiaryCommissionSummary): OrgMetaRow[] {
  if (row.beneficiary_type !== BeneficiaryType.EMPLOYEE) return []

  const emp = row.beneficiary_employee_detail
  const meta: OrgMetaRow[] = []
  if (emp?.branch?.name) meta.push({ label: 'Chi nhánh', value: emp.branch.name })
  if (emp?.block?.name) meta.push({ label: 'Khối', value: emp.block.name })
  if (emp?.department?.name) meta.push({ label: 'Phòng ban', value: emp.department.name })
  return meta
}

export const CommMgrMonthlyTable = ({
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

  // Header stays under the navbar while the list scrolls (CR 86eyj2er9). Re-syncs on `data`
  // because React swaps the `<thead>` node whenever the page of rows changes.
  useStickyTableHeader(`.${TABLE_SCOPE_CLASS}`, data)

  const { openSingle: openEmailDialog, dialogs: emailDialogs } = useCommissionEmailDialogs(
    'management',
    () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'monthly_summaries'] })
    }
  )

  const handleConfirm = useCallback(
    async (record: MonthlyBeneficiaryCommissionSummary) => {
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
          queryKey: ['accounting', 'monthly_summaries'],
        })
        toastService.success('Duyệt bảng kê thành công')
      } catch (err) {
        toastService.error(extractErrorMessage(err))
      }
    },
    [confirmMutation, queryClient]
  )

  const columns = useMemo<ColumnDef<MonthlyBeneficiaryCommissionSummary>[]>(
    () => [
      {
        id: 'employee_info',
        header: 'Nhân viên',
        cell: ({ row }) => {
          const { name, code, position } = resolveBeneficiary(row.original)
          return (
            <div className="flex flex-col gap-0.5">
              <Link
                to={APP_PATH.COMMISSION_MANAGER_DETAIL.replace(':id', row.original.id.toString())}
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
              {position && (
                <span className="text-xs leading-snug break-words text-gray-600" title={position}>
                  {position}
                </span>
              )}
            </div>
          )
        },
        meta: { width: 'w-[220px]', frozen: true },
      },
      {
        id: 'org_unit',
        header: 'Đơn vị',
        cell: ({ row }) => {
          const meta = resolveOrgUnit(row.original)
          if (meta.length === 0) return <Dash />
          return (
            <div className="flex flex-col gap-0.5 py-0.5">
              {meta.map((m) => (
                <div key={m.label} className="flex gap-1 text-xs leading-snug">
                  <span className="shrink-0 text-gray-400">{m.label}:</span>
                  <span className="break-words text-gray-600">{m.value}</span>
                </div>
              ))}
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
        // `promo_total` — kept on this screen even though it is usually empty: PROMO money is
        // paid out in the MGMT wave and is already inside `pre_tax_total`, so hiding it would
        // leave "Tổng HH" unreconcilable against the columns beside it.
        //
        // Header comes from ROLE_LABELS[PROMO], the same map the detail screen reads, so the
        // two can no longer drift apart. It used to be the literal "Hỗ trợ quảng cáo"
        // (CR 86eyj2er9) — but that wording belongs to the AD_SUPPORT bonus type, so one label
        // named two different pots of money while this list disagreed with its own detail page.
        // ClickUp 86eykqe00, 2026-08-21, BA Nhung Nguyễn:
        // "E map lại cho c list đồng nhất vs chi tiết nhé"
        // https://app.clickup.com/t/86eykqe00
        id: 'group_a',
        header: ROLE_LABELS[SourceRole.PROMO],
        cell: ({ row }) =>
          hasMoney(row.original.promo_total) ? (
            <span
              className={
                Number(row.original.promo_total || 0) < 0
                  ? `${NEGATIVE_MONEY_CLASS} font-medium`
                  : 'text-data-blue-default font-medium'
              }
            >
              {fmt(row.original.promo_total)}
            </span>
          ) : (
            <Dash />
          ),
        meta: { width: 'w-[150px]', align: 'right' },
      },
      {
        // Sits next to "HHQL" (`hhql_total`, HH quản lý theo KPI phòng) — the pair only reads
        // correctly when this one names its own source: the deal's TBC config (`mgmt_*`).
        id: 'group_b',
        header: 'HH quản lý (TBC)',
        cell: ({ row }) =>
          hasMoney(row.original.mgmt_total) ? (
            <span className={moneyClass(row.original.mgmt_total)}>
              {fmt(row.original.mgmt_total)}
            </span>
          ) : (
            <Dash />
          ),
        meta: { width: 'w-[160px]', align: 'right' },
      },
      {
        id: 'hhql_total',
        header: 'HHQL',
        cell: ({ row }) =>
          hasMoney(row.original.hhql_total) ? (
            <span className={moneyClass(row.original.hhql_total)}>
              {fmt(row.original.hhql_total)}
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
        // `project_director_total` is the real column; the cell used to guess at `gdda_amount` /
        // `gdda_total` / `gdda_commission`, none of which the API ever returned, so GDDA money
        // rendered as "—" while still counting inside "Tổng HH".
        id: 'project_director_total',
        header: 'HH Giám đốc dự án',
        cell: ({ row }) =>
          hasMoney(row.original.project_director_total) ? (
            <span className={moneyClass(row.original.project_director_total)}>
              {fmt(row.original.project_director_total)}
            </span>
          ) : (
            <Dash />
          ),
        meta: { width: 'w-[160px]', align: 'right' },
      },
      {
        // SLK and Backoffice joined this screen when it became the whole MANAGEMENT payout wave
        // instead of `mgmt_total > 0` (BE 2026-08-07). A row can now be here solely because of
        // one of them, and both already count in "Tổng HH" — without their own columns that
        // total has nothing on the row to reconcile against.
        id: 'slk_total',
        header: 'HH Sàn liên kết',
        cell: ({ row }) =>
          hasMoney(row.original.slk_total) ? (
            <span className={moneyClass(row.original.slk_total)}>
              {fmt(row.original.slk_total)}
            </span>
          ) : (
            <Dash />
          ),
        meta: { width: 'w-[150px]', align: 'right' },
      },
      {
        id: 'backoffice_total',
        header: 'HH Back office',
        cell: ({ row }) =>
          hasMoney(row.original.backoffice_total) ? (
            <span className={moneyClass(row.original.backoffice_total)}>
              {fmt(row.original.backoffice_total)}
            </span>
          ) : (
            <Dash />
          ),
        meta: { width: 'w-[150px]', align: 'right' },
      },
      {
        // The three transfer columns are what actually makes "Tổng HH" add up on this screen: a
        // row can be listed with every commission bucket at zero and nothing but a transfer
        // (verified 08/2026 — one payee's whole period is a 500.000 `transfer_in`), and a
        // deduction pulls the total BELOW the commission columns beside it. Same three columns,
        // same labels, as the Manager export.
        id: 'transfer_out_total',
        header: 'Khấu trừ thưởng người khác',
        cell: ({ row }) =>
          hasMoney(row.original.transfer_out_total) ? (
            <span className={moneyClass(row.original.transfer_out_total)}>
              {fmt(row.original.transfer_out_total)}
            </span>
          ) : (
            <Dash />
          ),
        meta: { width: 'w-[190px]', align: 'right' },
      },
      {
        id: 'transfer_in_total',
        header: 'Thưởng từ khấu trừ',
        cell: ({ row }) =>
          hasMoney(row.original.transfer_in_total) ? (
            <span className={moneyClass(row.original.transfer_in_total)}>
              {fmt(row.original.transfer_in_total)}
            </span>
          ) : (
            <Dash />
          ),
        meta: { width: 'w-[165px]', align: 'right' },
      },
      {
        id: 'deduction_total',
        header: 'Khấu trừ khác',
        cell: ({ row }) =>
          hasMoney(row.original.deduction_total) ? (
            <span className={moneyClass(row.original.deduction_total)}>
              {fmt(row.original.deduction_total)}
            </span>
          ) : (
            <Dash />
          ),
        meta: { width: 'w-[150px]', align: 'right' },
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
        id: 'total_commission',
        header: 'Tổng HH',
        cell: ({ row }) => (
          <span className="font-bold text-gray-900">{fmt(row.original.pre_tax_total)}</span>
        ),
        meta: { width: 'w-[150px]', align: 'right' },
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
      getCommMgrMonthlyActions({
        navigate,
        ability,
        handleConfirm,
        openEmailDialog,
        setHoldRecord,
        setAdvanceRecord,
      }),
    [navigate, ability, handleConfirm, openEmailDialog, setHoldRecord, setAdvanceRecord]
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
        className={`${TABLE_SCOPE_CLASS} !px-0`}
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
          navigate(APP_PATH.COMMISSION_MANAGER_DETAIL.replace(':id', record.id.toString()))
        }
        selectedRows={selectedRows}
        onSelectionChange={onSelectionChange}
      />
      {holdRecord && (
        <CommMonthlySummaryHoldDialog
          isOpen={!!holdRecord}
          onClose={() => setHoldRecord(null)}
          summaryId={holdRecord.id}
          role="management"
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
          role="management"
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
