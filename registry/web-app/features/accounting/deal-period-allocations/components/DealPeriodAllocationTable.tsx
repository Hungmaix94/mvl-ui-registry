import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Table, Chip } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconCheck, IconProhibit, IconCheckcircle, IconCaretright } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { PAGE_SIZE } from '@/constants/table'
import { formatDate } from '@/utils/date-utils'
import { formatCurrencyVND } from '@/utils/common'
import { useAbility } from '@/lib/ability'
import { cn } from '@/utils'
import { ReferenceCode } from '@/components/commons'
import { Badge } from '@radix-ui/themes'
import {
  getRecipientInfo,
  RECIPIENT_EXCHANGE_ROLE,
} from '@/features/accounting/_shares/utils/recipient-utils'
import type { DealPeriodAllocation } from '@/features/accounting/deal-period-allocations/services/deal-period-allocation-service'
export type DealPeriodAllocationWithSuspension = DealPeriodAllocation & {
  payment_suspended?: boolean
  receipt_voucher_code?: string | null
  sales_invoice_code?: string | null
  deal_detail?: {
    id: number
    code: string
    product_inventory?: {
      id: number
      code: string
      unit_number: string
      tower?: string | null
      status?: string | null
    } | null
    project?: {
      id: number
      code: string
      name: string
    } | null
    deposit_contract?: {
      id: number
      code: string
      contract_date?: string | null
    } | null
  } | null
}
import { DealPeriodAllocationStatusBadge } from './DealPeriodAllocationStatusBadge'
import { ColoredValueVariant } from '@/api/schema'
import type { TableAction, ColumnConfig } from '@/types/table'
import { useColumnConfig } from '@/hooks/useColumnConfig.ts'
import { netAfterHold } from '@/features/accounting/commission-splits/utils/payout-math'
import { DealPeriodAllocationStatus as DealPeriodAllocationStatus } from '@/constants/api-schema-aliases'

type Props = {
  data: DealPeriodAllocationWithSuspension[]
  isLoading: boolean
  error?: unknown
  totalRecords?: number
  pageSize?: number
  pageCount?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  onApprove?: (record: DealPeriodAllocationWithSuspension) => void
  onSuspend?: (record: DealPeriodAllocationWithSuspension) => void
  onRelease?: (record: DealPeriodAllocationWithSuspension) => void
  className?: string
  detailPathPattern?: string
  abilityResource?: string
  isShowTableColumnConfig?: boolean
}

const DealPeriodAllocationTable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = PAGE_SIZE,
  pageCount = 0,
  currentPageIndex = 0,
  onPaginationChange,
  onApprove,
  onSuspend,
  onRelease,
  className,
  detailPathPattern,
  abilityResource,
  isShowTableColumnConfig,
}: Props) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const allColumns = useMemo<ColumnDef<DealPeriodAllocationWithSuspension>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã căn / Dự án / Mã phân bổ',
        cell: ({ row }) => {
          const hasSubrows = row.original.recipient_lines && row.original.recipient_lines.length > 0
          const isExpanded = row.getIsExpanded()
          const unitNumber = row.original.deal_detail?.product_inventory?.unit_number
          const projectName = row.original.deal_detail?.project?.name

          return (
            <div className="flex items-center gap-2">
              {hasSubrows && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    row.toggleExpanded()
                  }}
                  className={cn(
                    'tr-chev hover:bg-red-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition-all duration-200 hover:text-red-600',
                    isExpanded && 'bg-red-10 text-red-600'
                  )}
                >
                  <IconCaretright
                    size={10}
                    className={cn(
                      'flex-shrink-0 transition-transform duration-200',
                      isExpanded && 'rotate-90'
                    )}
                  />
                </button>
              )}
              {!hasSubrows && <div className="w-6" />}
              <div className="flex flex-col items-start gap-0.5 py-1">
                {unitNumber ? (
                  <span
                    className="bg-red-10 text-brand-primary-default inline-flex cursor-pointer items-center rounded px-2 py-0.5 text-xs font-semibold hover:underline"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (row.original.deal_detail?.product_inventory?.code) {
                        navigate(
                          `${APP_PATH.PROJECT_PRODUCT_INVENTORIES}?search=${encodeURIComponent(
                            row.original.deal_detail.product_inventory.code
                          )}`
                        )
                      }
                    }}
                  >
                    {unitNumber}
                  </span>
                ) : (
                  <span className="text-neutral-400">—</span>
                )}
                <span className="text-xs font-medium text-neutral-500">
                  {projectName ? (
                    <>
                      {row.original.deal_detail?.project?.id ? (
                        <span
                          className="text-brand-primary-default cursor-pointer hover:underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(
                              APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(
                                ':id',
                                row.original.deal_detail!.project!.id.toString()
                              )
                            )
                          }}
                        >
                          {projectName}
                        </span>
                      ) : (
                        projectName
                      )}
                      {' · '}
                    </>
                  ) : (
                    ''
                  )}
                  <ReferenceCode
                    code={row.original.code}
                    linkTo={(detailPathPattern || APP_PATH.DEAL_PERIOD_ALLOCATION_DETAIL).replace(
                      ':id',
                      row.original.id.toString()
                    )}
                  />
                </span>
              </div>
            </div>
          )
        },
        meta: { width: 'w-[280px]', sortable: true, frozen: true },
      },
      {
        accessorKey: 'receipt_voucher_line',
        header: 'Phiếu thu · HĐ',
        cell: ({ row }) => {
          const receiptCode = row.original.receipt_voucher_code
          const invoiceCode = row.original.sales_invoice_code
          return (
            <div className="flex flex-col gap-0.5 py-1">
              {receiptCode ? (
                <span className="font-semibold text-neutral-800">{receiptCode}</span>
              ) : row.original.receipt_voucher_line ? (
                <span className="font-semibold text-neutral-800">
                  #{row.original.receipt_voucher_line}
                </span>
              ) : (
                <span className="text-neutral-400">—</span>
              )}
              {invoiceCode && (
                <span className="text-xs font-medium text-neutral-400">HĐ: {invoiceCode}</span>
              )}
            </div>
          )
        },
        meta: { width: 'w-[180px]', sortable: false },
      },
      {
        accessorKey: 'amount',
        header: 'Số tiền thu đợt này',
        cell: ({ row }) =>
          row.original.amount ? formatCurrencyVND(Number(row.original.amount)) : '—',
        meta: { width: 'w-[160px]', sortable: false, align: 'right' },
      },
      {
        id: 'hold_amount',
        header: 'Hold',
        cell: ({ row }) => {
          const isSuspended = row.original.payment_suspended
          const totalHold =
            row.original.recipient_lines?.reduce((sum, r) => sum + Number(r.hold_amount || 0), 0) ||
            0

          if (isSuspended) {
            return <span className="font-semibold text-rose-600">Tạm ngưng</span>
          }

          return totalHold > 0 ? (
            <span className="font-semibold text-rose-600">-{formatCurrencyVND(totalHold)}</span>
          ) : (
            <span className="text-neutral-400">—</span>
          )
        },
        meta: { width: 'w-[140px]', sortable: false, align: 'right' },
      },
      {
        id: 'payout',
        header: 'Thực chi',
        cell: ({ row }) => {
          const amt = Number(row.original.amount || 0)
          const totalHold =
            row.original.recipient_lines?.reduce((sum, r) => sum + Number(r.hold_amount || 0), 0) ||
            0
          const payout = netAfterHold(amt, totalHold)
          return <span className="font-bold text-neutral-800">{formatCurrencyVND(payout)}</span>
        },
        meta: { width: 'w-[160px]', sortable: false, align: 'right' },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) =>
          row.original.status ? (
            <DealPeriodAllocationStatusBadge
              status={row.original.status as DealPeriodAllocationStatus}
            />
          ) : (
            '—'
          ),
        meta: { width: 'w-[140px]', sortable: true },
      },
      {
        id: 'has_commission_payable',
        header: 'Đã chia thực nhận',
        cell: ({ row }) => {
          const val = row.original.has_commission_payable
          return val ? (
            <Chip label="Đã chia" variant={ColoredValueVariant.GREEN} />
          ) : (
            <Chip label="Chưa chia" variant={ColoredValueVariant.GREY} />
          )
        },
        meta: { width: 'w-[140px]', sortable: false },
      },
      {
        id: 'note',
        header: 'Ghi chú / Lý do',
        cell: ({ row }) => {
          const voidReason = row.original.void_reason
          const suspendReason = row.original.payment_suspended ? 'Tạm ngưng chi trả' : ''
          const reasons = row.original.recipient_lines
            ?.map((r) => r.hold_reason || r.override_reason)
            .filter(Boolean)
          const childrenReason = reasons && reasons.length > 0 ? reasons.join('; ') : ''

          const displayReason = voidReason || suspendReason || childrenReason || '—'
          return (
            <span
              className="block max-w-[180px] truncate text-neutral-500 italic"
              title={displayReason}
            >
              {displayReason}
            </span>
          )
        },
        meta: { width: 'w-[180px]', sortable: false },
      },
      {
        accessorKey: 'created_at',
        header: 'Ngày tạo',
        cell: ({ row }) => (row.original.created_at ? formatDate(row.original.created_at) : '—'),
        meta: { width: 'w-[120px]', sortable: true },
      },
      {
        accessorKey: 'approved_at',
        header: 'Ngày duyệt',
        cell: ({ row }) => (row.original.approved_at ? formatDate(row.original.approved_at) : '—'),
        meta: { width: 'w-[120px]', sortable: false },
      },
    ],
    [detailPathPattern]
  )

  const defaultColumnConfig: ColumnConfig[] = useMemo(
    () => [
      { id: 'code', label: 'Mã căn / Dự án / Mã phân bổ', visible: true, order: 0 },
      { id: 'receipt_voucher_line', label: 'Phiếu thu · HĐ', visible: true, order: 1 },
      { id: 'amount', label: 'Số tiền thu đợt này', visible: true, order: 2 },
      { id: 'hold_amount', label: 'Hold', visible: true, order: 3 },
      { id: 'payout', label: 'Thực chi', visible: true, order: 4 },
      { id: 'status', label: 'Trạng thái', visible: true, order: 5 },
      { id: 'has_commission_payable', label: 'Đã chia thực nhận', visible: true, order: 6 },
      { id: 'note', label: 'Ghi chú / Lý do', visible: true, order: 7 },
      { id: 'created_at', label: 'Ngày tạo', visible: true, order: 8 },
      { id: 'approved_at', label: 'Ngày duyệt', visible: true, order: 9 },
    ],
    []
  )

  const {
    columns: columnConfig,
    handleApply,
    handleReset,
  } = useColumnConfig(defaultColumnConfig, {
    storageKey: 'accounting-deal-period-allocations',
  })

  const visibleColumns = useMemo(() => {
    return columnConfig
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order)
      .map((c) => allColumns.find((col) => (col as any).accessorKey === c.id || col.id === c.id))
      .filter(Boolean) as ColumnDef<DealPeriodAllocationWithSuspension>[]
  }, [columnConfig, allColumns])

  const rowActions = useMemo<TableAction<DealPeriodAllocationWithSuspension>[]>(() => {
    const actions: TableAction<DealPeriodAllocationWithSuspension>[] = []
    const resource = abilityResource || 'dealperiodallocation'

    if (ability.can('retrieve', resource)) {
      actions.push({
        label: 'Chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) => {
          navigate(
            (detailPathPattern || APP_PATH.DEAL_PERIOD_ALLOCATION_DETAIL).replace(
              ':id',
              record.id.toString()
            )
          )
        },
      })
    }

    if (ability.can('approve', resource) && onApprove) {
      actions.push({
        label: 'Duyệt',
        icon: <IconCheck size={16} />,
        variant: 'success',
        show: (record) => record.status === DealPeriodAllocationStatus.DRAFT,
        onClick: (record) => onApprove(record),
      })
    }

    if (ability.can('create', 'dealpaymentsuspension') && onSuspend) {
      actions.push({
        label: 'Tạm ngưng chi trả',
        icon: <IconProhibit size={16} />,
        variant: 'danger',
        show: (record) => !record.payment_suspended,
        onClick: (record) => onSuspend(record),
      })
    }

    if (ability.can('release', 'dealpaymentsuspension') && onRelease) {
      actions.push({
        label: 'Bỏ tạm ngưng chi trả',
        icon: <IconCheckcircle size={16} />,
        variant: 'success',
        show: (record) => !!record.payment_suspended,
        onClick: (record) => onRelease(record),
      })
    }

    return actions
  }, [ability, navigate, onApprove, onSuspend, onRelease, detailPathPattern, abilityResource])

  const renderRowSubComponent = (
    row: import('@tanstack/react-table').Row<DealPeriodAllocationWithSuspension>
  ) => {
    const record = row.original
    if (!record.recipient_lines || record.recipient_lines.length === 0) return null

    return <DealPeriodAllocationRecipientRows record={record} />
  }

  if (error) {
    return <TableError />
  }

  return (
    <Table
      data={data}
      columns={visibleColumns}
      showActions={true}
      actionRenderType="menu"
      rowActions={rowActions}
      isLoading={isLoading}
      totalRecords={totalRecords}
      pageSize={pageSize}
      pageCount={pageCount}
      currentPageIndex={currentPageIndex}
      onPaginationChange={onPaginationChange}
      className={cn('px-0', className)}
      renderRowSubComponent={renderRowSubComponent}
      enablePagination
      manualPagination
      isShowTableColumnConfig={isShowTableColumnConfig}
      columnConfig={columnConfig}
      onColumnConfigApply={handleApply}
      onColumnConfigReset={handleReset}
    />
  )
}

const DealPeriodAllocationRecipientRows = ({
  record,
}: {
  record: DealPeriodAllocationWithSuspension
}) => {
  return (
    <>
      {record.recipient_lines.map((line: any) => {
        const { name, code, role } = getRecipientInfo(line)
        const holdAmountVal = Number(line.hold_amount || 0)
        const allocatedAmountVal = Number(line.allocated_amount || 0)
        const payoutVal = netAfterHold(allocatedAmountVal, holdAmountVal)
        const fullyHeld = !!line.is_held

        // Get percentage/rate from the API response directly
        const ratePct = (() => {
          if (line.commission_share && typeof line.commission_share === 'object') {
            return line.commission_share.percentage || line.commission_share.actual_rate_percentage
          }
          if (line.commission_share_percentage !== undefined)
            return line.commission_share_percentage
          if (line.commission_share_rate !== undefined) return line.commission_share_rate
          if (line.percentage !== undefined) return line.percentage
          if (line.rate !== undefined) return line.rate
          if (typeof line.commission_share === 'number' && line.commission_share <= 100) {
            return line.commission_share
          }
          return null
        })()
        const rateText = ratePct !== null ? `${ratePct}%` : ''

        return (
          <tr key={line.id} className={cn('tr-person', fullyHeld && 'off')}>
            {/* Cell 0: Indentation for STT */}
            <td></td>

            {/* Cell 1: Recipient details (covers Mã căn / Người nhận HH and Phiếu thu · HĐ columns) */}
            <td colSpan={2} className="relative p-2.5 pl-12 text-left align-middle">
              <div className="relative z-10 flex flex-col items-start gap-1 py-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-content-dark-1 text-[13px] font-semibold tracking-tight">
                    {name}
                  </span>
                  {rateText && (
                    <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                      {rateText}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <Chip
                    label={role}
                    variant={
                      line.recipient_employee
                        ? role.toLowerCase().includes('trưởng') ||
                          role.toLowerCase().includes('giám đốc') ||
                          role.toLowerCase().includes('quản lý') ||
                          role === 'QL PHÒNG'
                          ? ColoredValueVariant.PURPLE
                          : ColoredValueVariant.BLUE
                        : role === RECIPIENT_EXCHANGE_ROLE
                          ? ColoredValueVariant.ORANGE
                          : ColoredValueVariant.GREY
                    }
                    size="small"
                  />
                  {code && <span className="text-content-dark-3 text-xs font-medium">#{code}</span>}
                </div>
              </div>
            </td>

            {/* Cell 2: Amount (matches "Số tiền thu đợt này" column) */}
            <td className="num">
              {line.allocated_amount ? formatCurrencyVND(allocatedAmountVal) : '-'}
            </td>

            {/* Cell 3: Hold (matches "Hold" column) */}
            <td className="num">
              {holdAmountVal > 0 ? (
                <span className="font-semibold text-rose-600">
                  -{formatCurrencyVND(holdAmountVal)}
                </span>
              ) : (
                <span className="text-neutral-400">—</span>
              )}
            </td>

            {/* Cell 4: Thực chi (matches "Thực chi" column) */}
            <td className="num">
              <span
                className={cn('font-bold', payoutVal === 0 ? 'text-rose-600' : 'text-emerald-600')}
              >
                {formatCurrencyVND(payoutVal)}
              </span>
            </td>

            {/* Cell 5: Status (matches "Trạng thái" column) */}
            <td className="text-center">
              {fullyHeld ? (
                <Badge size="1" color="red" variant="soft">
                  Không chi
                </Badge>
              ) : line.is_held ? (
                <Badge size="1" color="orange" variant="soft">
                  Đang giữ
                </Badge>
              ) : (
                <Badge size="1" color="green" variant="soft">
                  OK chi
                </Badge>
              )}
            </td>

            {/* Cell 6: Đã chia thực nhận (matches "Đã chia thực nhận" column) */}
            <td className="text-center text-neutral-400">—</td>

            {/* Cell 7: Ghi chú / Lý do (matches "Ghi chú / Lý do" column) */}
            <td
              className="max-w-[180px] truncate text-neutral-500 italic"
              title={line.hold_reason || line.override_reason}
            >
              {line.hold_reason || line.override_reason || '-'}
            </td>

            {/* Cell 7: Created At (matches "Ngày tạo" column) */}
            <td className="text-center text-neutral-400">—</td>

            {/* Cell 8: Approved At (matches "Ngày duyệt" column) */}
            <td className="text-center text-neutral-400">—</td>

            {/* Cell 9: Actions Column (Indentation) */}
            <td></td>
          </tr>
        )
      })}
    </>
  )
}

export default DealPeriodAllocationTable
