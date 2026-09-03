import { FC, useMemo, useLayoutEffect } from 'react'
import { cn } from '@/utils'
import { Table, Chip } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { ReferenceCode } from '@/components/commons'
import { ColumnDef } from '@tanstack/react-table'
import { TableAction } from '@/types/table'
import { ColoredValueVariant } from '@/api/schema'
import { IconEye, IconCaretright } from '@/assets/icons'
import { useNavigate, Link } from 'react-router-dom'
import type { Row } from '@tanstack/react-table'
import { Deal, DealListSummary } from '@/features/sales/deals/services/deal-service'
import DealSalesParticipantRows from '@/features/sales/deals/components/DealSalesParticipantRows'
import { formatSalesParticipantsSummary } from '@/features/sales/deals/utils/sales-participants-summary'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { APP_PATH } from '@/routes'
import { formatDate } from '@/utils/date-utils'
import { useAbility } from '@/lib/ability'
import { formatCurrencyVND, formatPctFloor, formatPercent } from '@/utils/common'
import { formatSummaryCurrency } from '@/utils/table/summary'

interface DealTableProps {
  data: Deal[]
  isLoading?: boolean
  onPageChange?: (page: number, pageSize?: number) => void
  onSortingChange?: (field: string, direction: 'asc' | 'desc' | null) => void
  pageCount?: number
  currentPage?: number
  pageSize?: number
  totalRecords?: number
  error?: unknown
  className?: string
  /**
   * Column totals for the sticky "TỔNG CỘNG" row, straight from the list response.
   *
   * Read from the API, NEVER summed off `data`: `data` is one page, so summing it here
   * would put a page total under a column whose header says the whole filtered set — and
   * it would disagree with the cards at the top of the screen, which already read this
   * same block.
   */
  summary?: DealListSummary
  /** Deals behind `summary`, shown next to the label. Excludes cancelled/abandoned. */
  summaryRowCount?: number | null
}

const getStatusVariant = (status: string): ColoredValueVariant => {
  switch (status) {
    case 'open':
    case 'active':
      return ColoredValueVariant.BLUE
    case 'completed':
      return ColoredValueVariant.GREEN
    case 'cancelled':
      return ColoredValueVariant.RED
    default:
      return ColoredValueVariant.GREY
  }
}

const formatMonthYear = (dateStr?: string | null) => {
  if (!dateStr) return '-'
  return formatDate(dateStr, 'MM/yyyy')
}

const DealTable: FC<DealTableProps> = ({
  data,
  isLoading,
  onPageChange,
  onSortingChange,
  pageCount = 1,
  currentPage = 1,
  pageSize,
  totalRecords,
  error,
  className,
  summary,
  summaryRowCount,
}: DealTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { keysMapOptions } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.DEAL.STATUS_CHOICES],
  })

  const statusOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.SALES.DEAL.STATUS_CHOICES) || [],
    [keysMapOptions]
  )

  const columns: ColumnDef<Deal>[] = [
    {
      header: 'Tên dự án',
      accessorKey: 'project',
      size: 320,
      meta: { align: 'left', width: 'w-[250px]', frozen: true },
      cell: ({ row }) => {
        const name = row.original.project?.name || '-'
        return row.original.project?.id ? (
          <Link
            to={APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', String(row.original.project.id))}
            className="text-action-primary-default font-medium hover:underline"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {name}
          </Link>
        ) : (
          <span>{name}</span>
        )
      },
    },
    {
      header: 'Mã căn',
      accessorKey: 'product_inventory',
      size: 160,
      // CR STT25: KT sale dò bảng theo mã căn, nên cột này phải đứng yên khi kéo ngang như
      // "Tên dự án" — offset trái do `calculateFrozenOffsets` tự cộng dồn. Đây là cột ghim
      // cuối cùng: mọi cột sau nó KHÔNG được đặt `frozen`, nếu không offset sẽ hở/chồng.
      meta: { align: 'left', width: 'w-[160px]', frozen: true },
      cell: ({ row }) => {
        const prod = row.original.product_inventory
        if (!prod?.unit_number) return '-'
        return (
          <Link
            to={APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(':id', String(prod.id))}
            className="text-action-primary-default font-medium hover:underline"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {prod.unit_number}
          </Link>
        )
      },
    },
    {
      // CR STT28: bỏ ghim "Mã GD" và đưa xuống ngay sau "Mã căn" — Thu dò bảng theo mã căn,
      // mã GD chỉ cần đọc khi ở đầu bảng nên không đáng chiếm chỗ vùng ghim.
      header: 'Mã GD',
      accessorKey: 'code',
      size: 210,
      meta: { sortable: true, align: 'left', width: 'w-[210px]' },
      cell: ({ row }) => {
        const isExpanded = row.getIsExpanded()
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                row.toggleExpanded()
              }}
              aria-label={isExpanded ? 'Thu gọn' : 'Xem đối tượng tham gia'}
              className={cn(
                'text-content-dark-3 hover:bg-neutral-3 hover:text-content-dark-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded transition-colors',
                isExpanded && 'text-content-dark-1'
              )}
            >
              <IconCaretright
                size={12}
                className={cn('transition-transform duration-200', isExpanded && 'rotate-90')}
              />
            </button>
            <ReferenceCode
              code={row.original.code || `DEAL-${row.original.id}`}
              linkTo={APP_PATH.DEAL_DETAIL.replace(':id', String(row.original.id))}
            />
          </div>
        )
      },
    },
    {
      header: 'Tháng cọc',
      id: 'deposit_month',
      size: 140,
      meta: { align: 'center', width: 'w-[140px]' },
      cell: ({ row }) => formatMonthYear(row.original.deposit_contract?.contract_date),
    },
    {
      header: 'Ngày cọc',
      id: 'deposit_date',
      size: 140,
      meta: { align: 'center', width: 'w-[140px]' },
      cell: ({ row }) => {
        const date = row.original.deposit_contract?.contract_date
        return date ? formatDate(date) : '-'
      },
    },
    {
      header: 'Tình trạng',
      accessorKey: 'status',
      size: 180,
      meta: { align: 'center', width: 'w-[180px]' },
      cell: ({ row }) => {
        const status = row.original.status
        const label = String(
          statusOptions.find((o) => o.value === status)?.label || status || 'Không xác định'
        )
        return <Chip label={label} variant={getStatusVariant(status)} size="small" />
      },
    },
    {
      header: 'Tháng làm TTGD',
      id: 'transaction_month',
      size: 180,
      meta: { align: 'center', width: 'w-[180px]' },
      cell: ({ row }) => formatMonthYear(row.original.rate_determination_date),
    },
    {
      header: 'Tiền hàng',
      accessorKey: 'listed_price',
      size: 200,
      meta: { align: 'right', width: 'w-[200px]' },
      cell: ({ row }) => {
        const val = row.original.listed_price
        return val ? (
          <span className="whitespace-nowrap">{formatCurrencyVND(Number(val))}</span>
        ) : (
          '-'
        )
      },
      footer: () => formatSummaryCurrency(summary?.listed_price),
    },
    {
      header: 'Giá trị tính phí tạm tính (chưa VAT)',
      id: 'provisional_fee',
      size: 280,
      meta: { align: 'right', width: 'w-[280px]' },
      cell: ({ row }) => {
        const val = row.original.fee_calculation_price
        return val != null ? (
          <span className="whitespace-nowrap">{formatCurrencyVND(Number(val))}</span>
        ) : (
          '-'
        )
      },
      footer: () => formatSummaryCurrency(summary?.fee_calculation_price),
    },
    {
      header: 'Tỷ lệ doanh thu',
      id: 'pct_revenue',
      size: 160,
      meta: { align: 'right', width: 'w-[160px]' },
      cell: ({ row }) => {
        const val = row.original.pct_revenue
        // pct_revenue là numeric(14,10) — giữ đủ 10 chữ số thập phân, đừng cắt còn 3.
        return val != null ? formatPercent(val, false, 10) : '-'
      },
    },
    {
      header: 'Thành tiền doanh thu',
      id: 'amt_revenue',
      size: 200,
      meta: { align: 'right', width: 'w-[200px]' },
      cell: ({ row }) => {
        const val = row.original.revenue_amount
        return val != null ? (
          <span className="whitespace-nowrap">{formatCurrencyVND(Number(val))}</span>
        ) : (
          '-'
        )
      },
      footer: () => formatSummaryCurrency(summary?.revenue_amount),
    },
    // THAY cho cột "Đại lý" cũ (chỉ hiện `f2_exchange.name`): cột này liệt kê MỌI sale tham gia
    // kèm tỷ lệ, và với deal F2 thì phần tử chính là tên sàn — nên nó là tập cha của cột cũ.
    {
      header: 'Họ và tên sale tổng hợp',
      id: 'sales_participants_summary',
      size: 320,
      meta: { align: 'left', width: 'w-[320px]' },
      cell: ({ row }) => {
        const text = formatSalesParticipantsSummary(row.original.sales_participants_summary)
        return text ? <span className="whitespace-pre-wrap">{text}</span> : '-'
      },
    },
    {
      // [QA]: Đã revert lại tên cột 'Phí đại lý' theo yêu cầu QA
      header: 'Phí đại lý',
      id: 'agency_fee_rate',
      size: 140,
      meta: { align: 'right', width: 'w-[140px]' },
      cell: ({ row }) => {
        const val = row.original.agency_fee_rate
        // `agency_fee_rate` = `pct_agency_fee` khi có, không thì `amt_agency_fee`. Vế tỷ lệ là
        // numeric(14,10) nên giữ đủ 10 chữ số thập phân, đừng cắt còn 3.
        return val != null ? formatPercent(val, false, 10) : '-'
      },
    },
    {
      // [QA]: Đã revert lại tên cột 'Thành tiền phí' theo yêu cầu QA
      header: 'Thành tiền phí',
      id: 'agency_fee_amount',
      size: 200,
      meta: { align: 'right', width: 'w-[200px]' },
      cell: ({ row }) => {
        const val = row.original.agency_fee_amount
        return val != null ? (
          <span className="whitespace-nowrap">{formatCurrencyVND(Number(val))}</span>
        ) : (
          '-'
        )
      },
      footer: () => formatSummaryCurrency(summary?.agency_fee_amount),
    },
    {
      header: 'Tổng phí & thưởng',
      id: 'total_amount',
      size: 200,
      meta: { align: 'right', width: 'w-[200px]' },
      cell: ({ row }) => {
        const val = row.original.total_amount
        return val != null ? (
          <span className="whitespace-nowrap">{formatCurrencyVND(Number(val))}</span>
        ) : (
          '-'
        )
      },
      footer: () => formatSummaryCurrency(summary?.total_amount),
    },
    {
      header: 'Tổng tiền trả sale',
      id: 'total_sales_fee',
      size: 200,
      meta: { align: 'right', width: 'w-[200px]' },
      cell: ({ row }) => {
        const val = row.original.total_sales_fee
        return val != null ? (
          <span className="whitespace-nowrap">{formatCurrencyVND(Number(val))}</span>
        ) : (
          '-'
        )
      },
      footer: () => formatSummaryCurrency(summary?.total_sales_fee),
    },
    // Tỷ lệ, KHÔNG phải tỷ lệ của cột tiền ngay trên: cột tiền chỉ cộng sale nội bộ,
    // cột này cộng tỷ lệ của MỌI bên phân chia (MV + CTV + F2) để khớp dòng Tổng
    // section 5 màn chi tiết. Không chia cột nọ cho cột kia.
    //
    // Không có `footer`: `summary` của BE cố ý không có khoá % nào — cộng một cột
    // phần trăm qua nhiều deal thì ra số vô nghĩa.
    {
      header: 'Tổng phí HH trả sale',
      id: 'total_sales_fee_pct',
      size: 200,
      meta: { align: 'right', width: 'w-[200px]' },
      cell: ({ row }) => formatPercent(row.original.total_sales_fee_pct),
    },
    {
      header: '% đối chiếu',
      id: 'reconciliation_rate',
      size: 160,
      meta: { align: 'right', width: 'w-[160px]' },
      cell: ({ row }) => {
        const val = row.original.reconciliation_rate
        return val != null ? formatPercent(val) : '-'
      },
    },
    {
      header: 'Tổng tiền đã đối chiếu',
      id: 'total_advanced_amount',
      size: 200,
      meta: { align: 'right', width: 'w-[200px]' },
      cell: ({ row }) => {
        const val = row.original.total_advanced_amount
        return val != null ? (
          <span className="whitespace-nowrap">{formatCurrencyVND(Number(val))}</span>
        ) : (
          '-'
        )
      },
      footer: () => formatSummaryCurrency(summary?.total_advanced_amount),
    },
    // ── Đối chiếu theo hoá đơn bán ra đã ghi sổ ────────────────────────────────
    // Khác 2 cột ngay trên (neo theo tiến độ HD04). Lệch nhau là hợp lệ: mỗi khi có phiếu
    // đối chiếu đã confirm nhưng chưa xuất hoá đơn. Cùng số với báo cáo 21.6 nên dùng đúng
    // formatter của báo cáo đó (formatPctFloor, không phải formatPercent).
    {
      header: 'Phần trăm đối chiếu (theo HĐ)',
      id: 'invoiced_reconciliation_pct',
      size: 220,
      meta: { align: 'right', width: 'w-[220px]', sortable: false },
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {formatPctFloor(row.original.invoiced_reconciliation_pct)}
        </span>
      ),
    },
    {
      header: 'Thành tiền đối chiếu (theo HĐ)',
      id: 'invoiced_net_amount',
      size: 220,
      meta: { align: 'right', width: 'w-[220px]', sortable: false },
      cell: ({ row }) => {
        const val = row.original.invoiced_net_amount
        return val != null ? (
          <span className="whitespace-nowrap">{formatCurrencyVND(Number(val))}</span>
        ) : (
          '-'
        )
      },
      footer: () => formatSummaryCurrency(summary?.invoiced_net_amount),
    },
    {
      header: 'Thưởng',
      id: 'bonus_amount',
      size: 180,
      meta: { align: 'right', width: 'w-[180px]', sortable: false },
      cell: ({ row }) => {
        const val = row.original.bonus_amount
        return val != null ? (
          <span className="whitespace-nowrap">{formatCurrencyVND(Number(val))}</span>
        ) : (
          '-'
        )
      },
      footer: () => formatSummaryCurrency(summary?.bonus_amount),
    },
    {
      header: 'Còn lại',
      id: 'remaining_amount',
      size: 180,
      meta: { align: 'right', width: 'w-[180px]', sortable: false },
      cell: ({ row }) => {
        const val = row.original.remaining_amount
        if (val == null) return '-'
        const remaining = Number(val)
        return (
          <span
            className={cn(
              'font-medium whitespace-nowrap',
              remaining === 0 ? 'text-content-dark-1' : 'text-action-primary-red-default'
            )}
          >
            {formatCurrencyVND(remaining)}
          </span>
        )
      },
      footer: () => formatSummaryCurrency(summary?.remaining_amount),
    },
    {
      header: 'Phần trăm đối chiếu còn lại (theo HĐ)',
      id: 'remaining_reconciliation_pct',
      size: 260,
      meta: { align: 'right', width: 'w-[260px]', sortable: false },
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {formatPctFloor(row.original.remaining_reconciliation_pct)}
        </span>
      ),
    },
    {
      header: 'Ghi chú',
      id: 'note',
      size: 200,
      meta: { align: 'left', width: 'w-[200px]' },
      cell: ({ row }) => {
        const val = row.original.note
        return val ? <span className="whitespace-pre-wrap">{val}</span> : '-'
      },
    },
  ]

  const actions: TableAction<Deal>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        show: () => ability.can('retrieve', 'deal'),
        onClick: (item) => navigate(APP_PATH.DEAL_DETAIL.replace(':id', String(item.id))),
      },
    ],
    [navigate, ability]
  )

  const renderRowSubComponent = (row: Row<Deal>) => (
    <DealSalesParticipantRows dealId={row.original.id} />
  )

  if (error) return <TableError />

  useLayoutEffect(() => {
    const tableRoot = document.querySelector('.js-deal-table') as HTMLElement | null
    if (!tableRoot) return

    const table = tableRoot.querySelector('table') as HTMLElement | null
    if (!table) return

    const scrollContainer = table.closest(
      '[class*="overflow-x-auto"][class*="overflow-y-auto"]'
    ) as HTMLElement | null
    if (!scrollContainer) return

    const thead = table.querySelector('thead') as HTMLElement | null
    const navBar = document.querySelector('[data-name="Header"]') as HTMLElement | null
    if (!thead || !navBar) return

    let frameId: number | null = null
    let lastTranslateOffset = -1

    const applyStickyTop = () => {
      frameId = null
      const navBarBottom = Math.round(navBar.getBoundingClientRect().bottom)
      const scrollContainerTop = Math.round(scrollContainer.getBoundingClientRect().top)
      const nextTranslateOffset =
        scrollContainerTop < navBarBottom ? Math.max(0, navBarBottom - scrollContainerTop) : 0

      if (nextTranslateOffset === lastTranslateOffset) return
      lastTranslateOffset = nextTranslateOffset
      thead.style.transform =
        nextTranslateOffset > 0 ? `translateY(${nextTranslateOffset}px)` : 'translateY(0px)'
    }

    const requestStickyTopUpdate = () => {
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(applyStickyTop)
    }

    requestStickyTopUpdate()
    thead.style.willChange = 'transform'
    window.addEventListener('resize', requestStickyTopUpdate)
    window.addEventListener('scroll', requestStickyTopUpdate, { passive: true })
    scrollContainer.addEventListener('scroll', requestStickyTopUpdate, { passive: true })

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', requestStickyTopUpdate)
      window.removeEventListener('scroll', requestStickyTopUpdate)
      scrollContainer.removeEventListener('scroll', requestStickyTopUpdate)
      thead.style.transform = 'translateY(0px)'
      thead.style.willChange = ''
    }
  }, [data])

  return (
    <Table<Deal>
      className={cn('js-deal-table', className)}
      disableInnerOverflow={true}
      paginationPosition="static"
      stickyHeader
      bordered={false}
      columns={columns}
      data={data}
      isLoading={isLoading}
      showActions
      rowActions={actions}
      manualPagination
      pageCount={pageCount}
      currentPageIndex={(currentPage || 1) - 1}
      pageSize={pageSize}
      onPaginationChange={(index: number, size?: number) => onPageChange?.(index + 1, size)}
      enableSorting
      manualSorting
      onSortingChange={onSortingChange}
      totalRecords={totalRecords}
      renderRowSubComponent={renderRowSubComponent}
      showSummaryRow={!!summary}
      summaryRowCount={summaryRowCount}
    />
  )
}

export default DealTable
