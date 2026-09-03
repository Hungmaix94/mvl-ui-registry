import { useCallback, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Table as RadixTable } from '@radix-ui/themes'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/date-range-picker/DateRangePicker'
import { IconDownloadsimple } from '@/assets/icons'
import { LoadingWrapper } from '@/components'
import DashboardTablePagination from '@/features/dashboard/components/table/DashboardTablePagination.tsx'
import { useAbility } from '@/lib/ability'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import {
  getAccountantDashboardService,
  useAccountantDashboardPartnerTable,
  type GetAccountantDashboardPartnerTableParams,
} from '@/features/accounting/accountant-dashboard/services/accountant-dashboard-service'
import { formatCurrencyVND } from '@/utils/common'
import { formatDateToApi } from '@/utils/date-utils'
import toastService from '@/services/toast-service'
import { PAGE_SIZE } from '@/constants/table'
import {
  ACCOUNTANT_DASHBOARD_ACTIONS,
  ACCOUNTANT_DASHBOARD_SUBJECT,
} from './accountant-dashboard-constants'

const DEFAULT_PAGE_SIZE = 10

function PartnerProjectTable() {
  const ability = useAbility()
  const canExport = ability.can(ACCOUNTANT_DASHBOARD_ACTIONS.EXPORT, ACCOUNTANT_DASHBOARD_SUBJECT)

  const [project, setProject] = useState<number | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | null>(null)
  const [page, setPage] = useState(1)
  const [isExporting, setIsExporting] = useState(false)

  const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()

  const filterParams = useMemo(() => {
    const params: Omit<NonNullable<GetAccountantDashboardPartnerTableParams>, 'page'> = {}
    if (project) params.project = project
    if (dateRange?.from) params.from = formatDateToApi(dateRange.from) ?? undefined
    if (dateRange?.to) params.to = formatDateToApi(dateRange.to) ?? undefined
    return params
  }, [project, dateRange])

  const { data, isLoading } = useAccountantDashboardPartnerTable({ ...filterParams, page })

  const rows = data?.results ?? []
  const pageSize = data?.page_size ?? DEFAULT_PAGE_SIZE
  const totalCount = data?.count ?? 0

  const handleProjectChange = useCallback((next: string | number | (string | number)[] | null) => {
    setProject(typeof next === 'number' ? next : null)
    setPage(1)
  }, [])

  const handleDateRangeChange = useCallback((range: DateRange | undefined | null) => {
    setDateRange(range ?? null)
    setPage(1)
  }, [])

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      await getAccountantDashboardService().exportPartnerTable(filterParams)
    } catch {
      toastService.error('Xuất Excel thất bại. Vui lòng thử lại.')
    } finally {
      setIsExporting(false)
    }
  }, [filterParams])

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="typo-body-large-semibold text-content-dark-1">Đối tác theo dự án</h2>

        {canExport && (
          <Button
            variant="secondary-border"
            size="small"
            onClick={handleExport}
            disabled={isExporting}
          >
            <span className="flex items-center gap-2">
              <IconDownloadsimple size={16} />
              {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
            </span>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          placeholder="Tất cả dự án"
          value={project}
          onChange={handleProjectChange}
          loadOptions={loadProjectOptions}
          loadInitialOptions={loadInitialProjectOptions}
          pageSize={PAGE_SIZE}
          enableSearch
          clearable
          wrapperClassName="w-[260px]"
        />
        <div className="w-[330px]">
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
        </div>
      </div>

      <LoadingWrapper isLoading={isLoading} containerHeight={300}>
        <RadixTable.Root size="2" variant="surface">
          <RadixTable.Header>
            <RadixTable.Row>
              <RadixTable.ColumnHeaderCell>Dự án</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell>Loại hình SP</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell align="center">
                Số lần đối chiếu
              </RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell align="center">HĐ đã xuất</RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell align="right">
                Phải thu (VND)
              </RadixTable.ColumnHeaderCell>
              <RadixTable.ColumnHeaderCell align="right">Đã thu (VND)</RadixTable.ColumnHeaderCell>
            </RadixTable.Row>
          </RadixTable.Header>
          <RadixTable.Body>
            {rows.length === 0 ? (
              <RadixTable.Row>
                <RadixTable.Cell colSpan={6}>
                  <p className="text-content-dark-3 py-6 text-center text-sm">Không có dữ liệu</p>
                </RadixTable.Cell>
              </RadixTable.Row>
            ) : (
              rows.map((row) => (
                <RadixTable.Row key={row.project.id}>
                  <RadixTable.Cell className="font-medium">{row.project.name}</RadixTable.Cell>
                  <RadixTable.Cell>{row.product_types || '—'}</RadixTable.Cell>
                  <RadixTable.Cell align="center">{row.reconciliation_count}</RadixTable.Cell>
                  <RadixTable.Cell align="center">{row.issued_invoice_count}</RadixTable.Cell>
                  <RadixTable.Cell align="right">
                    {formatCurrencyVND(row.receivable_amount)}
                  </RadixTable.Cell>
                  <RadixTable.Cell align="right">
                    {formatCurrencyVND(row.collected_amount)}
                  </RadixTable.Cell>
                </RadixTable.Row>
              ))
            )}
          </RadixTable.Body>
        </RadixTable.Root>
      </LoadingWrapper>

      <DashboardTablePagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        unitLabel="dự án"
        onPageChange={setPage}
      />
    </div>
  )
}

export default PartnerProjectTable
