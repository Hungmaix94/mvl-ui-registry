import { useCallback, useMemo, useRef, useState } from 'react'
import { Table as RadixTable } from '@radix-ui/themes'
import PageTitle from '@/components/ui/page-title/PageTitle'
import AppDialog from '@/components/dialog/AppDialog'
import { Button } from '@/components/ui/button'
import { LoadingWrapper } from '@/components'
import { IconDownloadsimple } from '@/assets/icons'
import { useAbility } from '@/lib/ability'
import { useTkkdReportFilters } from '@/features/sales/tkkd-reports/hooks/useTkkdReportFilters'
import TkkdReportPeriodSelector from '@/features/sales/tkkd-reports/components/TkkdReportPeriodSelector'
import TkkdReportFilterForm, {
  type TkkdReportFilterFormRef,
} from '@/features/sales/tkkd-reports/components/TkkdReportFilterForm'
import {
  useTkkdProjectBlockMatrix,
  getTkkdReportService,
} from '@/features/sales/tkkd-reports/services/tkkd-report-service'
import { formatNumber } from '@/utils/common'
import toastService from '@/services/toast-service'

const QUANTITY_FORMAT: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}

export default function ReportSalesMatrixPage() {
  const ability = useAbility()
  const canExport = ability.can('get', 'reports.tkkdprojectblockmatrix')
  const [isExporting, setIsExporting] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)
  const formRef = useRef<TkkdReportFilterFormRef>(null)

  const filters = useTkkdReportFilters()
  const { params, isUrlReady, applyFilters, filterFormValues, activeFilterCount } = filters

  const { data, isLoading, error } = useTkkdProjectBlockMatrix(isUrlReady ? params : undefined, {
    enabled: isUrlReady && !!params,
  })

  const matrixData = data?.data ?? {}
  const blocks = data?.blocks ?? []
  const projectKeys = useMemo(
    () => Object.keys(matrixData).filter((key) => key !== 'project_summary'),
    [matrixData]
  )
  const summaryRow = matrixData['project_summary']

  const handleExport = useCallback(async () => {
    if (!params) return
    setIsExporting(true)
    try {
      await getTkkdReportService().exportProjectBlockMatrix(
        params,
        'tkkd-project-block-matrix.xlsx'
      )
      toastService.success('Xuất Excel thành công.')
    } catch {
      toastService.error('Xuất Excel thất bại. Vui lòng thử lại.')
    } finally {
      setIsExporting(false)
    }
  }, [params])

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
        title="Ma trận Dự án x Khối kinh doanh"
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
                    <RadixTable.ColumnHeaderCell>Tên dự án / Khối KD</RadixTable.ColumnHeaderCell>
                    {blocks.map((block) => (
                      <RadixTable.ColumnHeaderCell key={block} align="right">
                        {block}
                      </RadixTable.ColumnHeaderCell>
                    ))}
                    <RadixTable.ColumnHeaderCell align="right">
                      Tổng cộng
                    </RadixTable.ColumnHeaderCell>
                  </RadixTable.Row>
                </RadixTable.Header>
                <RadixTable.Body>
                  {projectKeys.length === 0 ? (
                    <RadixTable.Row>
                      <RadixTable.Cell colSpan={blocks.length + 3}>
                        <p className="text-content-dark-3 py-6 text-center text-sm">
                          Không có dữ liệu
                        </p>
                      </RadixTable.Cell>
                    </RadixTable.Row>
                  ) : (
                    <>
                      {projectKeys.map((project, index) => {
                        const rowData = matrixData[project] || {}
                        return (
                          <RadixTable.Row key={project}>
                            <RadixTable.Cell className="text-content-dark-3">
                              {index + 1}
                            </RadixTable.Cell>
                            <RadixTable.Cell className="font-medium">{project}</RadixTable.Cell>
                            {blocks.map((block) => {
                              const val = rowData[block]
                              return (
                                <RadixTable.Cell key={block} align="right" className="">
                                  {val != null && val !== ''
                                    ? formatNumber(Number(val), QUANTITY_FORMAT)
                                    : '0.00'}
                                </RadixTable.Cell>
                              )
                            })}
                            <RadixTable.Cell align="right" className="font-semibold">
                              {rowData.total != null && rowData.total !== ''
                                ? formatNumber(Number(rowData.total), QUANTITY_FORMAT)
                                : '0.00'}
                            </RadixTable.Cell>
                          </RadixTable.Row>
                        )
                      })}
                      {summaryRow && (
                        <RadixTable.Row className="bg-neutral-10 border-neutral-60 border-t border-double font-bold">
                          <RadixTable.Cell colSpan={2}>Tổng cộng</RadixTable.Cell>
                          {blocks.map((block) => {
                            const val = summaryRow[block]
                            return (
                              <RadixTable.Cell key={block} align="right" className="">
                                {val != null && val !== ''
                                  ? formatNumber(Number(val), QUANTITY_FORMAT)
                                  : '0.00'}
                              </RadixTable.Cell>
                            )
                          })}
                          <RadixTable.Cell align="right" className="">
                            {summaryRow.total != null && summaryRow.total !== ''
                              ? formatNumber(Number(summaryRow.total), QUANTITY_FORMAT)
                              : '0.00'}
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
