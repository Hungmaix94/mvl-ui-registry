import { useMemo } from 'react'
import {
  IconCheckcircle,
  IconCopy,
  IconEye,
  IconPaperplane,
  IconPencilsimple,
  IconTrash,
  IconXcircle,
} from '@/assets/icons'
import { type ColumnDef, Table, type TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { PAGE_SIZE } from '@/constants/table'
import { formatCurrencyVND } from '@/utils'
import { LadBatchStatus } from '../constants/lad-constants'
import type { LadBatchList } from '../types/lad-types'
import { toNum } from '../utils/lad-parse'
import { LadBatchStatusBadge } from './LadBatchStatusBadge'

interface LadBatchListTableProps {
  data: LadBatchList[]
  isLoading: boolean
  error?: unknown
  totalRecords?: number
  pageSize?: number
  pageCount?: number
  currentPageIndex?: number
  /** SA code for the PHẠM VI cell (host scope). */
  saCode?: string
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  onOpenBatch: (batchId: number) => void
  /**
   * Tiếp tục chỉnh sửa lô (mở wizard). Chỉ hiện với lô nháp — caller gate quyền `update` rồi mới
   * truyền (cùng điều kiện với nút "Tiếp tục chỉnh sửa" ở màn detail).
   */
  onEditBatch?: (batchId: number) => void
  /** BE chỉ cho xóa lô draft (409 nếu không) — caller gate quyền destroy rồi mới truyền. */
  onDeleteBatch?: (batchId: number) => void
  /**
   * Chuyển lô nháp sang dự kiến. Chỉ hiện với lô nháp — caller gate quyền `submit` (cùng điều kiện
   * với nút "Chuyển sang dự kiến" ở màn detail). Bắn submit ngay (không confirm), lỗi xử lý ở caller.
   */
  onSubmitBatch?: (batchId: number) => void
  /** Áp dụng lô đang chờ duyệt — caller gate quyền `approve`; chỉ hiện với lô pending. */
  onApproveBatch?: (batchId: number) => void
  /** Hủy áp dụng lô đang chờ duyệt (mở dialog nhập lý do) — caller gate quyền `reject`; chỉ hiện pending. */
  onRejectBatch?: (batchId: number) => void
  /** Nhân bản lô đã áp dụng / đã từ chối thành lô nháp mới — caller gate quyền `clone`. */
  onCloneBatch?: (batchId: number) => void
}

/** Δ tổng phí: positive = green, negative = red, zero = grey. List item has no delta yet → '—'. */
function DeltaCell({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-content-dark-3">—</span>
  const cls =
    value > 0
      ? 'text-data-green-default'
      : value < 0
        ? 'text-data-red-default'
        : 'text-content-dark-2'
  const sign = value > 0 ? '+' : ''
  return <span className={`font-semibold ${cls}`}>{`${sign}${formatCurrencyVND(value)} đ`}</span>
}

export function LadBatchListTable({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = PAGE_SIZE,
  pageCount = 0,
  currentPageIndex = 0,
  saCode,
  onPaginationChange,
  onOpenBatch,
  onEditBatch,
  onDeleteBatch,
  onSubmitBatch,
  onApproveBatch,
  onRejectBatch,
  onCloneBatch,
}: LadBatchListTableProps) {
  const columns: ColumnDef<LadBatchList>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã lô',
        cell: ({ row }) => (
          <span className="text-content-dark-1 font-medium">{row.original.code}</span>
        ),
        meta: { width: 'w-[170px]', sortable: true },
      },
      {
        accessorKey: 'name',
        header: 'Tên lô',
        // Tên lô (đậm, đen) ở trên; lý do (reason_excerpt, xám nhạt) ở dưới — KHÔNG dùng lý do làm
        // tên (chúng là 2 dòng riêng). Lô nháp chưa đặt tên → tên hiện "—".
        cell: ({ row }) => {
          const name = row.original.name?.trim()
          const reason = row.original.reason_excerpt?.trim() || row.original.reason?.trim()
          return (
            <div className="flex flex-col gap-0.5">
              <span className="typo-body-sm-medium text-content-dark-1 line-clamp-1">
                {name || '—'}
              </span>
              {reason && (
                <span className="typo-body-xs-regular text-content-dark-4 line-clamp-2">
                  {reason}
                </span>
              )}
            </div>
          )
        },
        meta: { className: 'min-w-[280px]' },
      },
      {
        id: 'scope',
        header: 'Phạm vi',
        cell: ({ row }) => (
          <div className="flex flex-col">
            {saCode && <span className="text-content-dark-2">{saCode}</span>}
            <span className="text-content-dark-3 text-sm">
              {row.original.deal_count ?? 0} giao dịch
            </span>
          </div>
        ),
        meta: { width: 'w-[200px]' },
      },
      {
        id: 'delta',
        header: 'Δ tổng phí',
        // delta_total_sum là decimal-string, BE chỉ lưu khi gửi duyệt/áp dụng — null khi nháp → '—'.
        cell: ({ row }) => <DeltaCell value={toNum(row.original.delta_total_sum)} />,
        meta: { width: 'w-[150px]' },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <LadBatchStatusBadge status={row.original.status} />,
        meta: { width: 'w-[150px]' },
      },
    ],
    [saCode]
  )

  const rowActions: TableAction<LadBatchList>[] = useMemo(() => {
    const actions: TableAction<LadBatchList>[] = [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) => onOpenBatch(record.id),
      },
    ]

    if (onSubmitBatch) {
      actions.push({
        label: 'Chuyển sang dự kiến',
        icon: <IconPaperplane size={16} />,
        show: (record) => record.status === LadBatchStatus.draft,
        onClick: (record) => onSubmitBatch(record.id),
      })
    }

    if (onEditBatch) {
      actions.push({
        label: 'Tiếp tục chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        show: (record) => record.status === LadBatchStatus.draft,
        onClick: (record) => onEditBatch(record.id),
      })
    }

    if (onApproveBatch) {
      actions.push({
        label: 'Áp dụng lô',
        icon: <IconCheckcircle size={16} />,
        show: (record) => record.status === LadBatchStatus.pending,
        onClick: (record) => onApproveBatch(record.id),
      })
    }

    if (onRejectBatch) {
      actions.push({
        label: 'Hủy áp dụng lô',
        icon: <IconXcircle size={16} />,
        show: (record) => record.status === LadBatchStatus.pending,
        onClick: (record) => onRejectBatch(record.id),
      })
    }

    if (onCloneBatch) {
      actions.push({
        label: 'Nhân bản lô',
        icon: <IconCopy size={16} />,
        show: (record) =>
          record.status === LadBatchStatus.applied || record.status === LadBatchStatus.rejected,
        onClick: (record) => onCloneBatch(record.id),
      })
    }

    if (onDeleteBatch) {
      actions.push({
        label: 'Xóa lô',
        icon: <IconTrash size={16} />,
        variant: 'danger',
        show: (record) => record.status === LadBatchStatus.draft,
        onClick: (record) => onDeleteBatch(record.id),
      })
    }

    return actions
  }, [
    onOpenBatch,
    onSubmitBatch,
    onEditBatch,
    onApproveBatch,
    onRejectBatch,
    onCloneBatch,
    onDeleteBatch,
  ])

  if (error) return <TableError />

  return (
    <Table
      columns={columns}
      data={data}
      isLoading={isLoading}
      totalRecords={totalRecords}
      pageSize={pageSize}
      pageCount={pageCount}
      manualPagination
      currentPageIndex={currentPageIndex}
      onPaginationChange={onPaginationChange}
      showActions
      rowActions={rowActions}
      disableInnerOverflow
      paginationPosition="static"
      className={'px-0'}
    />
  )
}

export default LadBatchListTable
