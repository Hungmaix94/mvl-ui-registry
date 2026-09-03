import { useMemo } from 'react'
import { ColumnDef, Table } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { KpiCommissionRule } from '@/features/accounting/manager-kpis/services/manager-kpi-service'

type KpiCommissionRuleTableProps = {
  data: KpiCommissionRule[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const KpiCommissionRuleTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onClearFilter,
  hasFilter,
}: KpiCommissionRuleTableProps) => {
  const columns: ColumnDef<KpiCommissionRule>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Diễn giải',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return <span className="font-medium text-neutral-900">{value || '-'}</span>
        },
        meta: { width: 'w-[200px]', rowSpan: 2 },
      },
      {
        accessorKey: 'operator',
        header: 'Điều kiện',
        cell: ({ getValue }) => {
          const val = getValue() as string
          if (val === 'GT') return '>'
          if (val === 'GTE') return '>='
          if (val === 'LT') return '<'
          if (val === 'LTE') return '<='
          if (val === 'EQ') return '='
          return val || '-'
        },
        meta: { width: 'w-[100px]', align: 'center', rowSpan: 2 },
      },
      {
        accessorKey: 'completion_pct',
        header: 'Chỉ tiêu (% DT)',
        cell: ({ getValue }) => {
          const val = getValue() as string
          return val ? `${Number(val)}%` : '-'
        },
        meta: { width: 'w-[120px]', align: 'right', rowSpan: 2 },
      },
      {
        header: 'Tỷ lệ thưởng theo cấp',
        meta: { align: 'center' },
        columns: [
          {
            accessorKey: 'pct_for_leader',
            header: 'Trưởng phòng',
            cell: ({ getValue }) => {
              const val = getValue() as string
              return val ? <span className="font-semibold text-blue-600">{Number(val)}%</span> : '-'
            },
            meta: { width: 'w-[140px]', align: 'right' },
          },
          {
            accessorKey: 'pct_for_director',
            header: 'Giám đốc',
            cell: ({ getValue }) => {
              const val = getValue() as string
              return val ? <span className="font-semibold text-sky-600">{Number(val)}%</span> : '-'
            },
            meta: { width: 'w-[140px]', align: 'right' },
          },
          {
            accessorKey: 'pct_for_ceo',
            header: 'Tổng giám đốc',
            cell: ({ getValue }) => {
              const val = getValue() as string
              return val ? (
                <span className="font-semibold text-purple-600">{Number(val)}%</span>
              ) : (
                '-'
              )
            },
            meta: { width: 'w-[140px]', align: 'right' },
          },
          {
            accessorKey: 'pct_for_sale_admin_lead',
            header: 'Trưởng phòng TKKD',
            cell: ({ getValue }) => {
              const val = getValue() as string
              return val ? (
                <span className="font-semibold text-emerald-600">{Number(val)}%</span>
              ) : (
                '-'
              )
            },
            meta: { width: 'w-[160px]', align: 'right' },
          },
        ],
      },
      {
        accessorKey: 'note',
        header: 'Ghi chú',
        cell: ({ getValue }) => {
          const val = getValue() as string
          return (
            <span className="block w-[200px] truncate text-neutral-600" title={val}>
              {val || '-'}
            </span>
          )
        },
        meta: { width: 'w-[200px]', rowSpan: 2 },
      },
    ],
    []
  )

  if (error) {
    return <TableError />
  }

  return (
    <Table
      columns={columns}
      data={data}
      isLoading={isLoading}
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      showSTT
      sttMeta={{ rowSpan: 2 }}
      manualPagination
      manualSorting
      disableInnerOverflow={true}
      paginationPosition="static"
      stickyHeader
      className="flex-1"
      bordered
    />
  )
}

export default KpiCommissionRuleTable
