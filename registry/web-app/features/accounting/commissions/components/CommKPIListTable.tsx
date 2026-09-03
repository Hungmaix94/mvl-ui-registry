import { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Table, type TableAction } from '@/components/ui'
import { KpiCommissionStructure } from '@/features/accounting/kpi-commission-structures/services/kpi-commission-structure-service'
import { IconPencil, IconEye } from '@/assets/icons'

type Props = {
  data: KpiCommissionStructure[]
  isLoading?: boolean
  onEdit?: (item: KpiCommissionStructure) => void
  onDetail?: (item: KpiCommissionStructure) => void
}

export const CommKPIListTable = ({ data, isLoading, onEdit, onDetail }: Props) => {
  const columns = useMemo<ColumnDef<KpiCommissionStructure>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã cấu trúc',
      },
      {
        accessorKey: 'name',
        header: 'Tên cấu trúc',
      },
      {
        accessorKey: 'target_role',
        header: 'Chức danh',
      },
      {
        accessorKey: 'effective_from',
        header: 'Hiệu lực từ',
      },
      {
        accessorKey: 'effective_to',
        header: 'Hiệu lực đến',
        cell: (info) => info.getValue() || '-',
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: (info) => {
          const value = info.getValue() as string
          return <span className={`status-badge status-${value?.toLowerCase()}`}>{value}</span>
        },
      },
    ],
    []
  )

  /**
   * CỐ Ý không gate bằng `ability.can` (ClickUp 86eync7g0).
   *
   * Hai mục này không gọi API và không điều hướng: `onDetail` mở dialog cục bộ với chính bản ghi
   * đang nằm sẵn trên bảng, `onEdit` cũng vậy. Không có endpoint nào phía sau ⇒ không có mã quyền
   * nào để gate — gắn một mã "cho chắc" là khoá nhầm người đã vào được màn này (route đã chặn
   * bằng `kpicommissionstructure.list`). Nối API thật thì lấy mã ở chính endpoint đó rồi mới gate.
   *
   * Lưu ý: hôm nay trang cha `CommKPI.tsx` chỉ truyền `onDetail`, nên "Chỉnh sửa" chưa bao giờ
   * render — giữ nhánh `if (onEdit)` nguyên trạng, không tự ý xoá.
   */
  const rowActions = useMemo<TableAction<KpiCommissionStructure>[]>(() => {
    const actions: TableAction<KpiCommissionStructure>[] = []

    if (onDetail) {
      actions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: onDetail,
      })
    }

    if (onEdit) {
      actions.push({
        label: 'Chỉnh sửa',
        icon: <IconPencil size={16} />,
        onClick: onEdit,
      })
    }

    return actions
  }, [onDetail, onEdit])

  return (
    <Table
      data={data}
      columns={columns}
      isLoading={isLoading}
      rowActions={rowActions}
      showActions={rowActions.length > 0}
      enablePagination={false}
    />
  )
}
