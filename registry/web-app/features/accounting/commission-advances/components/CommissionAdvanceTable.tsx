import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Table, Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import {
  IconCheck,
  IconX,
  IconCurrencydollar,
  IconTrash,
  IconEye,
  IconPencilsimple,
  IconInfo,
} from '@/assets/icons'
import { Popover, PopoverTrigger, PopoverContentPrimitive } from '@/components/ui/popover'
import { PAGE_SIZE } from '@/constants/table'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes'
import type { CommissionAdvance as BaseCommissionAdvance } from '@/features/accounting/commission-advances/services/commission-advance-service'
import {
  CommissionAdvanceStatusBadge,
  CommissionAdvanceStatus,
} from './CommissionAdvanceStatusBadge'
import { ReferenceCode } from '@/components/commons'
import type { TableAction, ColumnConfig } from '@/types/table'
import { useColumnConfig } from '@/hooks/useColumnConfig.ts'
import {
  isAwaitingAccountant,
  isAdminApprovable,
  isRejectable,
  isDeletable,
} from '@/features/accounting/commission-advances/utils/commission-advance-row-actions'

export type CommissionAdvance = BaseCommissionAdvance & {
  requester_employee_details?: {
    name?: string
    full_name?: string
  }
  requester_employee_name?: string
}

type Props = {
  data: CommissionAdvance[]
  isLoading: boolean
  totalRecords?: number
  pageSize?: number
  pageCount?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  onAdminApprove?: (item: CommissionAdvance) => void
  onAdminLeadApprove?: (item: CommissionAdvance) => void
  onApprove?: (item: CommissionAdvance) => void
  onResubmit?: (item: CommissionAdvance) => void
  onReject?: (item: CommissionAdvance) => void
  onMarkPaid?: (item: CommissionAdvance) => void
  onDelete?: (item: CommissionAdvance) => void
  isShowTableColumnConfig?: boolean
}

const CommissionAdvanceTable = ({
  data,
  isLoading,
  totalRecords = 0,
  pageSize = PAGE_SIZE,
  pageCount = 0,
  currentPageIndex = 0,
  onPaginationChange,
  onAdminApprove,
  onAdminLeadApprove,
  onApprove,
  onResubmit,
  onReject,
  onMarkPaid,
  onDelete,
  isShowTableColumnConfig,
}: Props) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const allColumns = useMemo<ColumnDef<CommissionAdvance>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã phiếu',
        cell: ({ row }) => (
          <ReferenceCode
            code={row.original.code}
            linkTo={APP_PATH.COMMISSION_ADVANCE_DETAIL.replace(':id', row.original.id.toString())}
          />
        ),
        meta: { width: 'w-[130px]', sortable: true, frozen: true },
      },
      {
        id: 'period',
        header: 'Kỳ kế toán',
        cell: ({ row }) => {
          const month = row.original.period_month
          const year = row.original.period_year
          if (!month || !year) return '—'
          return (
            <Chip
              variant={ColoredValueVariant.GREY}
              label={`${String(month).padStart(2, '0')}/${year}`}
              size="small"
            />
          )
        },
        meta: { width: 'w-[130px]' },
      },
      {
        accessorKey: 'created_at',
        header: 'Ngày đề xuất',
        cell: ({ row }) => formatDate(row.original.created_at),
        meta: { width: 'w-[120px]', sortable: true },
      },
      {
        id: 'deal',
        header: 'Dự án / Mã căn',
        cell: ({ row }) => {
          const dealDetail = row.original.deal_detail
          const dealId = row.original.deal
          if (!dealDetail && !dealId) return '—'

          const projectName = dealDetail?.project?.name
          const unit = dealDetail?.product_inventory
          const unitLabel = [unit?.tower, unit?.unit_number].filter(Boolean).join(' - ')
          const dealCode = dealDetail?.code

          return (
            <div className="flex flex-col gap-1">
              {projectName && (
                <span className="text-sm font-semibold text-gray-900" title={projectName}>
                  {projectName}
                </span>
              )}
              {unitLabel && (
                <span className="text-xs text-gray-500" title={unitLabel}>
                  Căn {unitLabel}
                </span>
              )}
              <ReferenceCode
                code={dealCode || `Giao dịch #${dealId}`}
                linkTo={dealId ? APP_PATH.DEAL_DETAIL.replace(':id', dealId.toString()) : undefined}
              />
            </div>
          )
        },
        meta: { width: 'w-[220px]' },
      },
      {
        id: 'employee',
        header: 'Nhân viên thụ hưởng',
        cell: ({ row }) => {
          const lines = row.original.recipient_lines || []
          if (lines.length === 0) {
            const details = row.original.requester_employee_detail
            const empName = row.original.requester_employee_name
            const name = details?.fullname || empName || `ID: ${row.original.requester_employee}`
            const code = details?.code || `ID: ${row.original.requester_employee}`
            return (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-gray-900">{name}</span>
                <span className="text-xs text-gray-500">{code}</span>
              </div>
            )
          }

          if (lines.length === 1) {
            const detail = lines[0].recipient_employee_detail
            const name = detail?.fullname || `ID: ${lines[0].recipient_employee}`
            const code = detail?.code || `ID: ${lines[0].recipient_employee}`
            return (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-gray-900">{name}</span>
                <span className="text-xs text-gray-500">{code}</span>
              </div>
            )
          }

          const firstDetail = lines[0].recipient_employee_detail
          const firstName = firstDetail?.fullname || `ID: ${lines[0].recipient_employee}`
          const firstCode = firstDetail?.code || `ID: ${lines[0].recipient_employee}`
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-gray-900">{firstName}</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="text-action-primary-blue-default hover:bg-action-primary-blue-hover/10 rounded p-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconInfo size={16} className="cursor-pointer text-blue-600" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContentPrimitive
                    side="right"
                    align="start"
                    className="z-50 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
                  >
                    <div className="flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                      <span className="border-b pb-2 text-sm font-bold text-gray-900">
                        Danh sách thụ hưởng ({lines.length} nhân sự)
                      </span>
                      <div className="flex max-h-60 flex-col gap-2.5 overflow-y-auto pr-1">
                        {lines.map((line, idx) => {
                          const name =
                            line.recipient_employee_detail?.fullname ||
                            `ID: ${line.recipient_employee}`
                          const code = line.recipient_employee_detail?.code || '—'
                          const dept = line.recipient_employee_detail?.department?.name || '—'
                          const amount = formatCurrencyVND(Number(line.requested_amount || 0))
                          return (
                            <div
                              key={line.id || idx}
                              className="flex items-start justify-between border-b border-gray-50 pb-2 text-xs last:border-0 last:pb-0"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-gray-800">{name}</span>
                                <span className="font-mono text-gray-500">
                                  {code} | {dept}
                                </span>
                              </div>
                              <span className="font-semibold whitespace-nowrap text-blue-600">
                                {amount} VNĐ
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </PopoverContentPrimitive>
                </Popover>
              </div>
              <span className="text-xs text-gray-500">{firstCode}</span>
            </div>
          )
        },
        meta: { width: 'w-[240px]' },
      },
      {
        accessorKey: 'requested_amount',
        header: 'Tổng tạm ứng',
        cell: ({ row }) => formatCurrencyVND(row.original.requested_amount || '0'),
        meta: { width: 'w-[140px]', align: 'right', sortable: true },
      },
      {
        accessorKey: 'paid_amount',
        header: 'Đã thanh toán',
        cell: ({ row }) => {
          const amt = Number(row.original.paid_amount || 0)
          return (
            <span className={amt > 0 ? 'font-medium text-green-600' : 'text-gray-400'}>
              {amt > 0 ? formatCurrencyVND(amt) : '—'}
            </span>
          )
        },
        meta: { width: 'w-[140px]', align: 'right' },
      },
      {
        accessorKey: 'recovered_amount',
        header: 'Đã thu hồi',
        cell: ({ row }) => {
          const amt = Number(row.original.recovered_amount || 0)
          return (
            <span className={amt > 0 ? 'font-medium text-amber-600' : 'text-gray-400'}>
              {amt > 0 ? formatCurrencyVND(amt) : '—'}
            </span>
          )
        },
        meta: { width: 'w-[140px]', align: 'right' },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <div className="max-w-[180px]">
            <CommissionAdvanceStatusBadge status={row.original.status} />
          </div>
        ),
        // Đo thật trên máy: nhãn dài nhất của thang duyệt ("Chờ người nhận xác nhận",
        // "Bị trả về (chờ chỉnh sửa)", "Chờ trưởng phòng duyệt") rộng 152-160px, cộng padding
        // ô ~32px. 120px cũ cắt ngang chữ; 200px đủ cho mọi nhãn mà không phải cắt.
        meta: { width: 'w-[200px]', sortable: true },
      },
    ],
    []
  )

  const defaultColumnConfig: ColumnConfig[] = useMemo(
    () => [
      { id: 'code', label: 'Mã phiếu', visible: true, order: 0 },
      { id: 'period', label: 'Kỳ kế toán', visible: true, order: 1 },
      { id: 'created_at', label: 'Ngày đề xuất', visible: true, order: 2 },
      { id: 'deal', label: 'Dự án / Mã căn', visible: true, order: 3 },
      { id: 'employee', label: 'Nhân viên thụ hưởng', visible: true, order: 4 },
      { id: 'requested_amount', label: 'Tổng tạm ứng', visible: true, order: 5 },
      { id: 'paid_amount', label: 'Đã thanh toán', visible: true, order: 6 },
      { id: 'recovered_amount', label: 'Đã thu hồi', visible: true, order: 7 },
      { id: 'status', label: 'Trạng thái', visible: true, order: 8 },
    ],
    []
  )

  const {
    columns: columnConfig,
    handleApply,
    handleReset,
  } = useColumnConfig(defaultColumnConfig, {
    storageKey: 'accounting-commission-advances',
  })

  const visibleColumns = useMemo(() => {
    return columnConfig
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order)
      .map((c) => allColumns.find((col) => (col as any).accessorKey === c.id || col.id === c.id))
      .filter(Boolean) as ColumnDef<CommissionAdvance>[]
  }, [columnConfig, allColumns])

  const actions = useMemo<TableAction<CommissionAdvance>[]>(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        show: () => ability.can('retrieve', 'commissionadvance'),
        onClick: (record) => {
          navigate(APP_PATH.COMMISSION_ADVANCE_DETAIL.replace(':id', record.id.toString()))
        },
      },
      {
        // TKKD tier — only a mobile-initiated advance reaches PENDING_ADMIN (a web-created one
        // enters one tier higher). TKKD confirms it up to the TKKD-lead here.
        label: 'TKKD duyệt',
        icon: <IconCheck size={16} />,
        show: (record) =>
          ability.can('admin_approve', 'commissionadvance') &&
          isAdminApprovable(record.status as string),
        onClick: (record) => {
          if (onAdminApprove) onAdminApprove(record)
        },
      },
      {
        // The TKKD-lead tier is where a web-created advance now lands — without this the row menu
        // would be empty for every freshly created advance.
        label: 'TP TKKD duyệt',
        icon: <IconCheck size={16} />,
        show: (record) =>
          ability.can('admin_lead_approve', 'commissionadvance') &&
          (record.status as string) === CommissionAdvanceStatus.PENDING_ADMIN_LEAD,
        onClick: (record) => {
          if (onAdminLeadApprove) onAdminLeadApprove(record)
        },
      },
      {
        label: 'Phê duyệt',
        icon: <IconCheck size={16} />,
        show: (record) =>
          ability.can('update', 'commissionadvance') &&
          isAwaitingAccountant(record.status as string),
        onClick: (record) => {
          if (onApprove) onApprove(record)
        },
      },
      {
        label: 'Gửi lại',
        icon: <IconCheck size={16} />,
        show: (record) =>
          ability.can('resubmit', 'commissionadvance') &&
          (record.status as string) === CommissionAdvanceStatus.REJECTED,
        onClick: (record) => {
          if (onResubmit) onResubmit(record)
        },
      },
      {
        label: 'Từ chối',
        icon: <IconX size={16} />,
        show: (record) =>
          ability.can('update', 'commissionadvance') && isRejectable(record.status as string),
        onClick: (record) => {
          if (onReject) onReject(record)
        },
      },
      {
        // Editing is only open once the advance has been returned for rework.
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        show: (record) =>
          ability.can('update', 'commissionadvance') &&
          (record.status as string) === CommissionAdvanceStatus.REJECTED,
        onClick: (record) => {
          navigate(APP_PATH.COMMISSION_ADVANCE_EDIT.replace(':id', record.id.toString()))
        },
      },
      {
        label: 'Đã chi',
        icon: <IconCurrencydollar size={16} />,
        show: (record) =>
          ability.can('update', 'commissionadvance') &&
          (record.status as string) === CommissionAdvanceStatus.APPROVED,
        onClick: (record) => {
          if (onMarkPaid) onMarkPaid(record)
        },
      },
      {
        label: 'Xóa đề xuất',
        icon: <IconTrash size={16} />,
        variant: 'danger',
        show: (record) =>
          ability.can('destroy', 'commissionadvance') && isDeletable(record.status as string),
        onClick: (record) => {
          if (onDelete) onDelete(record)
        },
      },
    ],
    [
      navigate,
      ability,
      onAdminApprove,
      onAdminLeadApprove,
      onApprove,
      onResubmit,
      onReject,
      onMarkPaid,
      onDelete,
    ]
  )

  return (
    <div className="border-border-1">
      <Table
        columns={visibleColumns}
        data={data}
        showSTT
        showActions={true}
        actionRenderType="menu"
        // Menu mở tại con trỏ — xem ghi chú cùng nội dung ở `AccountingPeriodTable`.
        actionMenuPosition="cursor"
        rowActions={actions}
        isLoading={isLoading}
        totalRecords={totalRecords}
        pageSize={pageSize}
        pageCount={pageCount}
        currentPageIndex={currentPageIndex}
        onPaginationChange={onPaginationChange}
        enablePagination
        manualPagination
        disableInnerOverflow={true}
        paginationPosition="static"
        stickyHeader
        isShowTableColumnConfig={isShowTableColumnConfig}
        columnConfig={columnConfig}
        onColumnConfigApply={handleApply}
        onColumnConfigReset={handleReset}
      />
    </div>
  )
}

export default CommissionAdvanceTable
