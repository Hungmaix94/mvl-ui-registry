import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import PageTitle from '@/components/ui/page-title/PageTitle'
import AppDialog from '@/components/dialog/AppDialog'
import { Button } from '@/components/ui/button'
import { Table } from '@/components/ui'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import { useHhqlByProjectReport } from '@/features/accounting/reports/services/report-service'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import HhqlByProjectFilter, {
  type HhqlByProjectFilterFormData,
  type HhqlByProjectFilterRef,
} from '@/features/report/accounting/hhql-by-project/HhqlByProjectFilter'
import HhqlByProjectSummaryCards from '@/features/report/accounting/hhql-by-project/HhqlByProjectSummaryCards'
import {
  buildHhqlByProjectParams,
  parseProjectIds,
  serializeProjectIds,
} from '@/features/report/accounting/hhql-by-project/hhql-by-project-filter-params'
import { formatCurrencyVND } from '@/utils'
import { formatSummaryCurrency } from '@/utils/table/summary'
import { parsePositiveInt } from '@/utils/common'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { IconDownload } from '@/assets/icons'
import { APP_PATH } from '@/routes'

export default function HhqlByProjectReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)

  const formRef = useRef<HhqlByProjectFilterRef>(null)

  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const { data: allPeriods } = useAllAccountingPeriods()
  const periods = useMemo(() => allPeriods ?? [], [allPeriods])

  const month = parsePositiveInt(searchParams.get('month'))
  const year = parsePositiveInt(searchParams.get('year'))
  // Khoá theo CHUỖI THÔ của tham số, không theo `searchParams`: react-router trả một đối tượng
  // mới mỗi lần render, nên phụ thuộc thẳng vào nó là `filters` đổi tham chiếu vô cớ và query
  // tự chạy lại sau mỗi lần render.
  const projectParam = searchParams.get('project')
  const projectIds = useMemo(() => parseProjectIds(projectParam), [projectParam])

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const activePeriodId = useMemo(() => {
    if (year && month) {
      return periods.find((p) => p.year === year && p.month === month)?.id || null
    }
    return null
  }, [periods, year, month])

  // Sync year and month query parameters on mount
  useEffect(() => {
    if (periods.length === 0 || isLoadingCurrent) return

    const actualUrlParams = new URLSearchParams(window.location.search)
    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')
    const hasYear = searchParams.has('year') || actualUrlParams.has('year')
    const hasMonth = searchParams.has('month') || actualUrlParams.has('month')

    if (!hasPage || !hasPageSize || !hasYear || !hasMonth) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      if (!hasYear || !hasMonth) {
        const defaultPeriod = currentPeriod ?? periods[0]
        if (defaultPeriod) {
          newParams.set('year', String(defaultPeriod.year))
          newParams.set('month', String(defaultPeriod.month))
        }
      }
      setSearchParams(newParams, { replace: true })
    } else {
      setIsUrlReady(true)
    }
  }, [periods, currentPeriod, isLoadingCurrent, searchParams, setSearchParams])

  /**
   * Tham số gửi lên API — dùng cho cả bảng lẫn Xuất Excel, nên file Excel luôn khớp đúng những
   * gì đang hiện trên màn hình.
   *
   * `project__in` nhận nhiều id (BE mở cùng task này, theo đúng pattern `_parse_id_list` mà
   * dashboard đã dùng). Đừng quay lại cách "tải hết rồi lọc tại chỗ": bảng thì lọc được nhưng
   * file Excel do BE dựng sẽ gồm toàn bộ dự án mà không có gì trên màn hình nói ra điều đó.
   */
  const filters = useMemo(
    () => buildHhqlByProjectParams({ year, month, projectIds }),
    [year, month, projectIds]
  )

  const { data, isLoading } = useHhqlByProjectReport(filters, {
    enabled: isUrlReady && !!filters.year && !!filters.month,
  })

  const { openExportDialog, isExporting } = useAccountingListExport(
    '/api/accounting/reports/hhql-by-project/',
    'hhql-theo-du-an.xlsx'
  )

  const handleExport = useCallback(() => {
    openExportDialog(filters)
  }, [filters, openExportDialog])

  const rows = useMemo(() => data?.by_project || [], [data])

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [rows, currentPage, pageSize])

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row: any) => {
        acc.truong_phong += Number(row.truong_phong || 0)
        acc.giam_doc += Number(row.giam_doc || 0)
        acc.tong_giam_doc += Number(row.tong_giam_doc || 0)
        acc.gd_du_an += Number(row.gd_du_an || 0)
        acc.thuong_gd_du_an += Number(row.thuong_gd_du_an || 0)
        acc.total_mgmt += Number(row.total_mgmt || 0)
        acc.promotion += Number(row.promotion || 0)
        acc.back_office += Number(row.back_office || 0)
        acc.slk += Number(row.slk || 0)
        acc.phong_chien_luoc += Number(row.phong_chien_luoc || 0)
        acc.phong_dau_tu_xuc_tien += Number(row.phong_dau_tu_xuc_tien || 0)
        acc.phong_dau_tu_phat_trien += Number(row.phong_dau_tu_phat_trien || 0)
        acc.grand_total += Number(row.grand_total || 0)
        return acc
      },
      {
        truong_phong: 0,
        giam_doc: 0,
        tong_giam_doc: 0,
        gd_du_an: 0,
        thuong_gd_du_an: 0,
        total_mgmt: 0,
        promotion: 0,
        back_office: 0,
        slk: 0,
        phong_chien_luoc: 0,
        phong_dau_tu_xuc_tien: 0,
        phong_dau_tu_phat_trien: 0,
        grand_total: 0,
      }
    )
  }, [rows])

  /** `Table` gọi kèm cả `pageSize` — đổi số bản ghi/trang cũng về đây, không cần handler thứ hai. */
  const handlePaginationChange = useCallback(
    (nextPageIndex: number, nextPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(nextPageIndex + 1))
      newParams.set('page_size', String(nextPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'project_name',
        header: 'Tên Dự Án',
        cell: ({ row }) => {
          const projectId = row.original.project_id
          const name = row.original.project_name
          return projectId ? (
            <Link
              to={APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', String(projectId))}
              className="text-action-primary-default font-medium hover:underline"
            >
              {name}
            </Link>
          ) : (
            name
          )
        },
        // Đông cứng cùng cột STT: bảng rộng ~2300px, kéo tới cột tiền cuối mà mất tên dự án thì
        // không còn biết đang đọc dòng nào. Bề rộng phải khai tường minh — `calculateFrozenOffsets`
        // cộng `column.size` để ra `left`, cột không khai sẽ nhận 150px mặc định và lệch offset.
        meta: { sortable: false, frozen: true, width: 'w-[300px]' },
      },
      {
        accessorKey: 'promotion',
        header: 'HH Đầu tư của Sếp',
        cell: ({ row }) => <span>{formatCurrencyVND(Number(row.original.promotion || 0))}</span>,
        footer: () => formatSummaryCurrency(totals.promotion),
        meta: { sortable: false, align: 'right', width: 'w-[150px]' },
      },
      {
        accessorKey: 'slk',
        header: 'SLK',
        cell: ({ row }) => <span>{formatCurrencyVND(Number(row.original.slk || 0))}</span>,
        footer: () => formatSummaryCurrency(totals.slk),
        meta: { sortable: false, align: 'right', width: 'w-[150px]' },
      },
      {
        accessorKey: 'phong_chien_luoc',
        header: 'Phòng Chiến lược kinh doanh',
        cell: ({ row }) => (
          <span>{formatCurrencyVND(Number(row.original.phong_chien_luoc || 0))}</span>
        ),
        footer: () => formatSummaryCurrency(totals.phong_chien_luoc),
        meta: { sortable: false, align: 'right', width: 'w-[170px]' },
      },
      {
        accessorKey: 'phong_dau_tu_xuc_tien',
        header: 'Phòng Đầu tư xúc tiến Dự án',
        cell: ({ row }) => (
          <span>{formatCurrencyVND(Number(row.original.phong_dau_tu_xuc_tien || 0))}</span>
        ),
        footer: () => formatSummaryCurrency(totals.phong_dau_tu_xuc_tien),
        meta: { sortable: false, align: 'right', width: 'w-[170px]' },
      },
      {
        accessorKey: 'phong_dau_tu_phat_trien',
        header: 'Phòng Đầu tư & phát triển dự án',
        cell: ({ row }) => (
          <span>{formatCurrencyVND(Number(row.original.phong_dau_tu_phat_trien || 0))}</span>
        ),
        footer: () => formatSummaryCurrency(totals.phong_dau_tu_phat_trien),
        meta: { sortable: false, align: 'right', width: 'w-[170px]' },
      },
      {
        accessorKey: 'back_office',
        header: 'Khối BACK',
        cell: ({ row }) => <span>{formatCurrencyVND(Number(row.original.back_office || 0))}</span>,
        footer: () => formatSummaryCurrency(totals.back_office),
        meta: { sortable: false, align: 'right', width: 'w-[150px]' },
      },
      {
        accessorKey: 'truong_phong',
        header: 'Trưởng Phòng (khối kinh doanh)',
        cell: ({ row }) => <span>{formatCurrencyVND(Number(row.original.truong_phong || 0))}</span>,
        footer: () => formatSummaryCurrency(totals.truong_phong),
        meta: { sortable: false, align: 'right', width: 'w-[170px]' },
      },
      {
        accessorKey: 'giam_doc',
        header: 'Giám Đốc',
        cell: ({ row }) => <span>{formatCurrencyVND(Number(row.original.giam_doc || 0))}</span>,
        footer: () => formatSummaryCurrency(totals.giam_doc),
        meta: { sortable: false, align: 'right', width: 'w-[150px]' },
      },
      {
        accessorKey: 'tong_giam_doc',
        header: 'Tổng Giám Đốc',
        cell: ({ row }) => (
          <span>{formatCurrencyVND(Number(row.original.tong_giam_doc || 0))}</span>
        ),
        footer: () => formatSummaryCurrency(totals.tong_giam_doc),
        meta: { sortable: false, align: 'right', width: 'w-[150px]' },
      },
      {
        accessorKey: 'gd_du_an',
        header: 'HH Giám Đốc Dự Án',
        cell: ({ row }) => <span>{formatCurrencyVND(Number(row.original.gd_du_an || 0))}</span>,
        footer: () => formatSummaryCurrency(totals.gd_du_an),
        meta: { sortable: false, align: 'right', width: 'w-[160px]' },
      },
      {
        accessorKey: 'thuong_gd_du_an',
        header: 'Thưởng HHGĐ Dự Án',
        cell: ({ row }) => (
          <span>{formatCurrencyVND(Number(row.original.thuong_gd_du_an || 0))}</span>
        ),
        footer: () => formatSummaryCurrency(totals.thuong_gd_du_an),
        meta: { sortable: false, align: 'right', width: 'w-[160px]' },
      },
      {
        accessorKey: 'grand_total',
        header: 'Tổng cộng',
        cell: ({ row }) => (
          <span className="text-content-dark-1 font-semibold">
            {formatCurrencyVND(Number(row.original.grand_total || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.grand_total),
        // Cột trả lời của cả báo cáo: ghim mép phải để đọc được ở mọi vị trí kéo ngang, khỏi
        // phải cuộn hết 12 cột tiền mới thấy tổng của dòng.
        meta: { sortable: false, align: 'right', frozenRight: true, width: 'w-[170px]' },
      },
    ],
    [totals]
  )

  const activeFilterCount = useMemo(() => (projectIds.length > 0 ? 1 : 0), [projectIds])

  const currentFilters: HhqlByProjectFilterFormData = useMemo(
    () => ({ project: projectIds }),
    [projectIds]
  )

  const handleOpenFilterDialog = useCallback(() => {
    setFilterDialogOpenKey((k) => k + 1)
    setIsFilterDialogOpen(true)
  }, [])

  const handleCloseFilterDialog = useCallback(() => setIsFilterDialogOpen(false), [])

  const handleClearFilter = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues()
    if (!formData) return

    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', '1')

    const selected = serializeProjectIds(formData.project)
    if (selected) newParams.set('project', selected)
    else newParams.delete('project')

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="21.13 Báo cáo HHQL theo dự án"
        toolbarLeftContent={
          <AccountingPeriodSelect
            periods={periods}
            selectedPeriodId={activePeriodId}
            onSelect={(periodId) => {
              const period = periods.find((p) => p.id === periodId)
              if (period) {
                const newParams = new URLSearchParams(searchParams)
                newParams.set('year', String(period.year))
                newParams.set('month', String(period.month))
                newParams.set('page', '1')
                setSearchParams(newParams, { replace: true })
              }
            }}
          />
        }
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        customActions={
          <Button
            variant="secondary"
            size="small"
            leftIcon={<IconDownload />}
            onClick={handleExport}
            disabled={isLoading || isExporting || !rows.length}
            loading={isExporting}
          >
            Xuất Excel
          </Button>
        }
      />

      <div className="flex flex-grow flex-col gap-4 overflow-hidden pt-4 pb-6">
        <div className="px-7">
          <HhqlByProjectSummaryCards
            totalMgmt={totals.total_mgmt}
            grandTotal={totals.grand_total}
            backOffice={totals.back_office}
            projectCount={rows.length}
            isLoading={isLoading}
          />
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-0">
          <Table
            data={paginatedRows}
            columns={columns}
            isLoading={isLoading}
            // Cột STT dựng sẵn đánh số theo `pageIndex * pageSize` nên trang 2 bắt đầu từ 26 —
            // cột tự chế trước đây dùng `row.index + 1` nên trang nào cũng đếm lại từ 1.
            // `sttFrozen` mặc định bật ⇒ STT đông cứng cùng cột tên dự án, và rộng w-12 (48px).
            showSTT
            enablePagination
            manualPagination
            pageCount={pageCount}
            pageSize={pageSize}
            currentPageIndex={currentPage - 1}
            totalRecords={rows.length}
            onPaginationChange={handlePaginationChange}
            emptyMessage="Không có dữ liệu cho kỳ báo cáo này"
            bordered
            showSummaryRow
            summaryRowCount={rows.length}
            // Bộ ba `static` + `disableInnerOverflow` + `stickyHeader` luôn đi cùng nhau
            // (`docs/ai/conventions.md` §9): `static` dựng khối đáy cố định gồm thanh kéo ngang
            // rồi mới tới phân trang; `disableInnerOverflow` chặn thanh cuộn ngang thứ hai;
            // `stickyHeader` chặn chiều cao viewport nên hàng tiêu đề đứng yên và dòng TỔNG CỘNG
            // chuyển sang `sticky bottom-0` thật.
            //
            // Phân trang phải là phân trang CỦA `Table`, không phải `SimplePagination` tự dựng:
            // `SimplePagination position="fixed"` cũng là `fixed bottom-0 z-20` nên nó nằm ĐÈ lên
            // khối đáy 8px của bảng — thanh kéo ngang bị che, và `bottomChromeHeight` chỉ đo được
            // 8px nên dòng TỔNG CỘNG sticky cũng khuất sau thanh phân trang.
            paginationPosition="static"
            disableInnerOverflow
            stickyHeader
          />
        </div>
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <HhqlByProjectFilter
            key={`${filterDialogOpenKey}`}
            ref={formRef}
            initialValues={currentFilters}
          />
        }
        onClearFilter={handleClearFilter}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </div>
  )
}
