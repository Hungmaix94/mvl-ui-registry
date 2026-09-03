import { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Table, Chip, type TableAction } from '@/components/ui'
import { DepartmentCommissionPool } from '@/features/accounting/department-commission-pools/services/department-commission-pools-service'
import { formatCurrencyVND } from '@/utils/common'
import { IconEye, IconUploadsimple } from '@/assets/icons'
import { PAGE_SIZES } from '@/constants/table'
import { useStickyTableHeader } from '@/hooks/useStickyTableHeader'
import RevenueRecomputeBadge from '@/features/accounting/accounting-periods/components/RevenueRecomputeBadge'
import {
  POOL_STATUS_DISPLAY,
  SPLIT_STATUS_DISPLAY,
  resolveStatusDisplay,
} from '../constants/department-monthly-kpi-status'
import { DepartmentCommissionPoolStatus as PoolStatus } from '@/constants/api-schema-aliases'
import { useAbility } from '@/lib/ability'
import { COMMISSION_ACTION_PERMISSION } from '@/features/accounting/commissions/constants/commission-permissions'

type Props = {
  data: DepartmentCommissionPool[]
  isLoading: boolean
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (page: number, pageSize: number) => void
  onViewDetail: (row: DepartmentCommissionPool) => void
  onImportLines?: (row: DepartmentCommissionPool) => void
  /**
   * Kỳ đang lọc. `revenue_recompute_needed` là cờ cấp KỲ (bất kỳ phòng ban nào trong kỳ đổi
   * input cũng set true cho cả kỳ), không phải cấp dòng — nên KHÔNG được gắn thẳng lên mọi
   * dòng. Dòng đã `CONFIRMED` (đã xác nhận/khoá số) phải ẩn badge dù cờ kỳ đang bật, vì số
   * của dòng đó đã chốt, không đổi theo lần compute() lại của kỳ (ClickUp 86eyqcjn2).
   */
  activePeriod?: { revenue_recompute_needed?: boolean } | null
  hasFilter?: boolean
}

const POOL_STALE_TITLE =
  'Số của phòng ban này không còn khớp với dữ liệu đầu vào hiện tại. Bấm "Tính lại HH phòng ban" rồi duyệt lại.'

// TODO(schema): drop the cast once BE deploy + `yarn api:update` ship `is_stale`.
function readIsStale(pool: unknown): boolean | null {
  const value = (pool as { is_stale?: boolean } | null | undefined)?.is_stale
  return typeof value === 'boolean' ? value : null
}

/** Scopes the sticky-header lookup to this table only. */
const TABLE_SCOPE_CLASS = 'js-dept-monthly-kpi-table'

export function DepartmentMonthlyKpiTable({
  data,
  isLoading,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onViewDetail,
  onImportLines,
  activePeriod,
  hasFilter,
}: Props) {
  const ability = useAbility()
  // CSS `position: sticky` một mình KHÔNG ghim được trên trang danh sách này: Radix bọc
  // `Table.Root` trong `.rt-ScrollAreaViewport` có `overflow: scroll` nên nó chiếm quyền làm
  // sticky container dù không hề cuộn — thứ cuộn thật là `window`. Hook đẩy offset bằng
  // `transform` từ JS. Truyền `data` để re-sync vì React thay node `<thead>` mỗi lần đổi trang.
  useStickyTableHeader(`.${TABLE_SCOPE_CLASS}`, data)

  const columns = useMemo<ColumnDef<DepartmentCommissionPool>[]>(
    () => [
      {
        id: 'name',
        header: 'Phòng ban',
        size: 280,
        // Phòng ban / Khối / Chi nhánh xếp dọc trong một ô: đọc theo chiều tổ chức mà không
        // phải nới thêm ba cột. Không hiển thị mã phòng ban.
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-content-dark-1 flex items-center gap-1.5 font-medium break-words">
              {row.original.department_name || '---'}
              {/* Per row, not per period: `is_stale` compares THIS pool's contributions with
                  what its inputs produce now — the same comparison confirm() refuses on, so
                  looking at a pool and approving it cannot disagree. Falls back to the
                  period flag while the backend field is still rolling out. */}
              <RevenueRecomputeBadge
                stale={
                  row.original.status === PoolStatus.CONFIRMED
                    ? false
                    : (readIsStale(row.original) ?? undefined)
                }
                period={row.original.status === PoolStatus.CONFIRMED ? null : activePeriod}
                title={POOL_STALE_TITLE}
              />
            </span>
            <span className="text-content-dark-3 text-xs break-words">
              {row.original.block_name || '---'}
            </span>
            <span className="text-content-dark-3 text-xs break-words">
              {row.original.branch_name || '---'}
            </span>
          </div>
        ),
      },
      {
        id: 'amount',
        header: () => <div className="text-right">Tổng</div>,
        size: 180,
        cell: ({ row }) => (
          <div className="text-right font-semibold text-neutral-900">
            {formatCurrencyVND(Number(row.original.total_amount || 0))}
          </div>
        ),
        meta: { align: 'right' },
      },
      {
        id: 'status',
        header: 'Trạng thái duyệt',
        size: 160,
        cell: ({ row }) => {
          const info = resolveStatusDisplay(POOL_STATUS_DISPLAY, row.original.status)
          return <Chip label={info.label} variant={info.variant} size="small" />
        },
      },
      {
        id: 'split_status',
        header: 'Trạng thái chia',
        size: 160,
        cell: ({ row }) => {
          const info = resolveStatusDisplay(SPLIT_STATUS_DISPLAY, row.original.split_status)
          return <Chip label={info.label} variant={info.variant} size="small" />
        },
      },
    ],
    [activePeriod]
  )

  const rowActions = useMemo<TableAction<DepartmentCommissionPool>[]>(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        // Điều hướng `DEPARTMENT_MONTHLY_KPI_DETAIL` — route khai `departmentcommissionpool.retrieve`.
        show: () =>
          ability.can(
            COMMISSION_ACTION_PERMISSION.VIEW_DEPT_POOL.action,
            COMMISSION_ACTION_PERMISSION.VIEW_DEPT_POOL.subject
          ),
        onClick: (row) => onViewDetail(row),
      },
      ...(onImportLines
        ? [
            {
              label: 'Nhập chia hoa hồng',
              icon: <IconUploadsimple size={16} />,
              // Trước đây viết là `hidden:` — `<Table>` chỉ đọc `show`, nên điều kiện đó chưa
              // bao giờ chạy. Giữ nguyên ý định của tác giả bằng đúng key mà bảng hiểu.
              //
              // Quyền là `import_lines` (endpoint `POST .../{id}/import-lines/`), KHÔNG phải
              // `retrieve` của cùng resource: đây là hành động GHI, người chỉ được xem không
              // được nhập file chia hoa hồng.
              show: (row: DepartmentCommissionPool) =>
                ability.can(
                  COMMISSION_ACTION_PERMISSION.IMPORT_DEPT_POOL_LINES.action,
                  COMMISSION_ACTION_PERMISSION.IMPORT_DEPT_POOL_LINES.subject
                ) &&
                (row.status === PoolStatus.DRAFT || row.status === PoolStatus.CONFIRMED),
              onClick: (row: DepartmentCommissionPool) => onImportLines(row),
            },
          ]
        : []),
    ],
    [ability, onViewDetail, onImportLines]
  )

  return (
    <Table
      columns={columns}
      data={data}
      isLoading={isLoading}
      hasFilter={hasFilter}
      pageCount={pageCount}
      pageSize={pageSize}
      pageSizeOptions={PAGE_SIZES}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      showSTT
      showActions
      rowActions={rowActions}
      manualPagination
      className={TABLE_SCOPE_CLASS}
      disableInnerOverflow
      paginationPosition="static"
      stickyHeader
    />
  )
}

export default DepartmentMonthlyKpiTable
