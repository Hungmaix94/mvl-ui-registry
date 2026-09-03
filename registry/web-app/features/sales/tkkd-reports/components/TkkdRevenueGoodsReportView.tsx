import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table as RadixTable } from '@radix-ui/themes'
import PageTitle from '@/components/ui/page-title/PageTitle'
import AppDialog from '@/components/dialog/AppDialog'
import { Button } from '@/components/ui/button'
import { LoadingWrapper } from '@/components'
import { IconDownloadsimple } from '@/assets/icons'
import { useAbility } from '@/lib/ability'
import { useApiQuery } from '@/hooks/useApiQuery'
import { QUERY_KEYS } from '@/constants'
import { useTkkdReportFilters } from '@/features/sales/tkkd-reports/hooks/useTkkdReportFilters'
import TkkdReportPeriodSelector from '@/features/sales/tkkd-reports/components/TkkdReportPeriodSelector'
import TkkdReportFilterForm, {
  type TkkdReportFilterFormRef,
} from '@/features/sales/tkkd-reports/components/TkkdReportFilterForm'
import type {
  TkkdRevenueGoodsResponse,
  TkkdRevenueGoodsRow,
} from '@/features/sales/tkkd-reports/services/tkkd-report-service'
import type { TkkdRevenueGoodsReportConfig } from '@/features/sales/tkkd-reports/constants'
import { formatCurrencyVND, formatNumber } from '@/utils/common'
import toastService from '@/services/toast-service'

const QUANTITY_FORMAT: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}

function getQueryKey(
  dimension: TkkdRevenueGoodsReportConfig['dimension'],
  params: Record<string, unknown>
) {
  switch (dimension) {
    case 'project':
      return QUERY_KEYS.SALES.TKKD_REPORTS.BY_PROJECT(params)
    case 'branch':
      return QUERY_KEYS.SALES.TKKD_REPORTS.BY_BRANCH(params)
    case 'block':
      return QUERY_KEYS.SALES.TKKD_REPORTS.BY_BLOCK(params)
    case 'department':
      return QUERY_KEYS.SALES.TKKD_REPORTS.BY_DEPARTMENT(params)
  }
}

type TkkdRevenueGoodsReportViewProps = {
  config: TkkdRevenueGoodsReportConfig
}

export default function TkkdRevenueGoodsReportView({ config }: TkkdRevenueGoodsReportViewProps) {
  const {
    title,
    dimensionLabel,
    permission,
    exportFilename,
    dimension,
    detailBasePath,
    fetchReport,
    exportReport,
  } = config

  const ability = useAbility()
  const canExport = ability.can('get', permission)
  const isProject = dimension === 'project'
  const navigate = useNavigate()
  const [isExporting, setIsExporting] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)
  const formRef = useRef<TkkdReportFilterFormRef>(null)

  const filters = useTkkdReportFilters()
  const { params, isUrlReady, searchParams, applyFilters, filterFormValues, activeFilterCount } =
    filters

  const { data, isLoading, error } = useApiQuery<TkkdRevenueGoodsResponse>(
    getQueryKey(dimension, (params ?? {}) as Record<string, unknown>),
    () => fetchReport(params!) as Promise<TkkdRevenueGoodsResponse>,
    { enabled: isUrlReady && !!params, staleTime: 1000 * 60 * 5 }
  )

  const rows = data?.rows ?? []
  const total = data?.total

  const handleRowClick = useCallback(
    (unitId: number | null) => {
      if (unitId == null || !detailBasePath) return
      const query = new URLSearchParams()
      if (searchParams) {
        searchParams.forEach((val: string, key: string) => query.set(key, val))
      }
      navigate(`${detailBasePath}/${unitId}?${query.toString()}`)
    },
    [navigate, detailBasePath, searchParams]
  )
  const handleExport = useCallback(async () => {
    if (!params) return
    setIsExporting(true)
    try {
      await exportReport(params, exportFilename)
      toastService.success('Xuất Excel thành công.')
    } catch {
      toastService.error('Xuất Excel thất bại. Vui lòng thử lại.')
    } finally {
      setIsExporting(false)
    }
  }, [params, exportReport, exportFilename])

  const handleOpenFilterDialog = useCallback(() => {
    setFilterDialogOpenKey((key) => key + 1)
    setIsFilterDialogOpen(true)
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues()
    if (!formData) return
    applyFilters(formData)
    setIsFilterDialogOpen(false)
  }, [applyFilters])

  return (
    <div className="bg-neutral-2 flex h-full flex-col">
      <PageTitle
        title={title}
        toolbarLeftContent={<TkkdReportPeriodSelector filters={filters} />}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        customActions={
          canExport ? (
            <Button
              variant="secondary-border"
              size="small"
              onClick={handleExport}
              disabled={isExporting || isLoading || !params}
            >
              <span className="flex items-center gap-2">
                <IconDownloadsimple size={16} />
                {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
              </span>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-6">
        {error ? (
          <div className="border-border-1 bg-content-light-1 flex flex-1 items-center justify-center rounded-md border p-6 text-red-500">
            Có lỗi xảy ra khi tải dữ liệu: {(error as Error)?.message || 'Unknown error'}
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <LoadingWrapper isLoading={isLoading} containerHeight={300}>
              <RadixTable.Root size="2" variant="surface">
                <RadixTable.Header>
                  <RadixTable.Row>
                    <RadixTable.ColumnHeaderCell className="w-16">STT</RadixTable.ColumnHeaderCell>
                    <RadixTable.ColumnHeaderCell>{dimensionLabel}</RadixTable.ColumnHeaderCell>
                    <RadixTable.ColumnHeaderCell align="right">
                      Số lượng{isProject ? ' (deal)' : ''}
                    </RadixTable.ColumnHeaderCell>
                    {isProject && (
                      <RadixTable.ColumnHeaderCell align="right">
                        Số lượng quy đổi
                      </RadixTable.ColumnHeaderCell>
                    )}
                    <RadixTable.ColumnHeaderCell align="right">
                      Doanh thu
                    </RadixTable.ColumnHeaderCell>
                    <RadixTable.ColumnHeaderCell align="right">
                      Tiền hàng
                    </RadixTable.ColumnHeaderCell>
                    <RadixTable.ColumnHeaderCell align="right">
                      Đối chiếu
                    </RadixTable.ColumnHeaderCell>
                    <RadixTable.ColumnHeaderCell align="right">Còn lại</RadixTable.ColumnHeaderCell>
                  </RadixTable.Row>
                </RadixTable.Header>
                <RadixTable.Body>
                  {rows.length === 0 ? (
                    <RadixTable.Row>
                      <RadixTable.Cell colSpan={isProject ? 8 : 7}>
                        <p className="text-content-dark-3 py-6 text-center text-sm">
                          Không có dữ liệu
                        </p>
                      </RadixTable.Cell>
                    </RadixTable.Row>
                  ) : (
                    <>
                      {rows.map((row: TkkdRevenueGoodsRow, index: number) => {
                        const rowKey = row.id ?? row.name
                        const displayTitle =
                          row.code && row.name ? `${row.name} • ${row.code}` : row.name

                        const clickable = row.id != null
                        return (
                          <RadixTable.Row
                            key={rowKey}
                            onClick={clickable ? () => handleRowClick(row.id) : undefined}
                            className={clickable ? 'hover:bg-neutral-3 cursor-pointer' : undefined}
                          >
                            <RadixTable.Cell className="text-content-dark-3">
                              {index + 1}
                            </RadixTable.Cell>
                            <RadixTable.Cell className="font-medium" title={displayTitle}>
                              {row.name}
                            </RadixTable.Cell>
                            <RadixTable.Cell align="right" className="">
                              {isProject
                                ? formatNumber(Number(row.quantity))
                                : formatNumber(Number(row.quantity), QUANTITY_FORMAT)}
                            </RadixTable.Cell>
                            {isProject && (
                              <RadixTable.Cell align="right" className="">
                                {formatNumber(Number(row.quantity_weighted ?? 0), QUANTITY_FORMAT)}
                              </RadixTable.Cell>
                            )}
                            <RadixTable.Cell align="right" className="">
                              {formatCurrencyVND(Number(row.revenue))}
                            </RadixTable.Cell>
                            <RadixTable.Cell align="right" className="">
                              {formatCurrencyVND(Number(row.goods_value))}
                            </RadixTable.Cell>
                            <RadixTable.Cell align="right" className="">
                              {formatCurrencyVND(Number(row.reconciliation ?? 0))}
                            </RadixTable.Cell>
                            <RadixTable.Cell align="right" className="">
                              {formatCurrencyVND(Number(row.remaining ?? 0))}
                            </RadixTable.Cell>
                          </RadixTable.Row>
                        )
                      })}
                      {total && (
                        <RadixTable.Row className="bg-neutral-10 border-neutral-60 border-t border-double font-bold">
                          <RadixTable.Cell colSpan={2}>Tổng cộng</RadixTable.Cell>
                          <RadixTable.Cell align="right" className="">
                            {isProject
                              ? formatNumber(Number(total.quantity))
                              : formatNumber(Number(total.quantity), QUANTITY_FORMAT)}
                          </RadixTable.Cell>
                          {isProject && (
                            <RadixTable.Cell align="right" className="">
                              {formatNumber(Number(total.quantity_weighted ?? 0), QUANTITY_FORMAT)}
                            </RadixTable.Cell>
                          )}
                          <RadixTable.Cell align="right" className="">
                            {formatCurrencyVND(Number(total.revenue))}
                          </RadixTable.Cell>
                          <RadixTable.Cell align="right" className="">
                            {formatCurrencyVND(Number(total.goods_value))}
                          </RadixTable.Cell>
                          <RadixTable.Cell align="right" className="">
                            {formatCurrencyVND(Number(total.reconciliation ?? 0))}
                          </RadixTable.Cell>
                          <RadixTable.Cell align="right" className="">
                            {formatCurrencyVND(Number(total.remaining ?? 0))}
                          </RadixTable.Cell>
                        </RadixTable.Row>
                      )}
                    </>
                  )}
                </RadixTable.Body>
              </RadixTable.Root>
            </LoadingWrapper>
          </div>
        )}
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <TkkdReportFilterForm
            key={String(filterDialogOpenKey)}
            ref={formRef}
            initialValues={filterFormValues}
          />
        }
        onClearFilter={() => formRef.current?.clearForm()}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />
    </div>
  )
}
