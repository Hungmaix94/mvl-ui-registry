import { useCallback, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Tabs } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import LadDebtByDealTable from '@/features/report/accounting/lad-debt/LadDebtByDealTable'
import LadDebtByProjectTable from '@/features/report/accounting/lad-debt/LadDebtByProjectTable'
import LadDebtFilterForm, {
  type LadDebtFilterFormRef,
} from '@/features/report/accounting/lad-debt/LadDebtFilterForm'
import {
  buildLadDebtFilterParams,
  countActiveLadDebtFilters,
  parseLadDebtFilters,
} from '@/features/report/accounting/lad-debt/lad-debt-filters'
import {
  useInvestorDebtByLadReport,
  type LadDebtReportResponse,
  type LadDebtProjectReportResponse,
} from '@/features/accounting/reports/services/report-service'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { LadDebtReportView } from '@/constants/api-schema-aliases'

export default function LadDebtReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)
  const filterFormRef = useRef<LadDebtFilterFormRef>(null)

  const activeTab = searchParams.get('tab') === 'project' ? 'project' : 'deal'

  // Khoá theo chuỗi query: `searchParams` là instance mới mỗi render nên memo theo chính nó
  // không bao giờ hit.
  const searchQueryKey = searchParams.toString()

  const filterValues = useMemo(
    () => parseLadDebtFilters(new URLSearchParams(searchQueryKey)),
    [searchQueryKey]
  )

  const baseParams = useMemo(
    () => ({
      project_id: filterValues.projectId ?? undefined,
      investor_id: filterValues.investorId ?? undefined,
      deal_id: filterValues.dealId ?? undefined,
      rate_source: filterValues.rateSource ?? undefined,
      has_outstanding: filterValues.hasOutstanding || undefined,
    }),
    [filterValues]
  )

  const dealParams = useMemo(() => ({ ...baseParams, view: LadDebtReportView.deal }), [baseParams])
  const projectParams = useMemo(
    () => ({ ...baseParams, view: LadDebtReportView.project }),
    [baseParams]
  )

  const { data: dealData, isLoading: isLoadingDeal } =
    useInvestorDebtByLadReport<LadDebtReportResponse>(dealParams, {
      enabled: activeTab === 'deal',
    })
  const { data: projectData, isLoading: isLoadingProject } =
    useInvestorDebtByLadReport<LadDebtProjectReportResponse>(projectParams, {
      enabled: activeTab === 'project',
    })

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/reports/investor-debt-by-lad/',
    'cong-no-cdt-theo-lad.xlsx'
  )

  const handleExport = useCallback(() => {
    openExportDialog(activeTab === 'project' ? projectParams : dealParams)
  }, [activeTab, dealParams, projectParams, openExportDialog])

  const handleTabChange = useCallback(
    (value: string) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('tab', value)
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const activeFilterCount = useMemo(
    () => countActiveLadDebtFilters(new URLSearchParams(searchQueryKey)),
    [searchQueryKey]
  )

  const handleOpenFilterDialog = useCallback(() => {
    setFilterDialogOpenKey((key) => key + 1)
    setIsFilterDialogOpen(true)
  }, [])

  const handleClearFilter = useCallback(() => {
    filterFormRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData) return
    setSearchParams(buildLadDebtFilterParams(searchParams, formData), { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="21.5 Báo cáo công nợ CĐT theo Lô áp dụng"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleExportBtnIcon={handleExport}
      />
      <div className="flex flex-grow flex-col gap-4 overflow-hidden pt-4 pb-6">
        <Tabs.Root
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex flex-grow flex-col overflow-hidden"
        >
          <Tabs.List className="mb-4 px-7">
            <Tabs.Trigger value="deal">Theo giao dịch</Tabs.Trigger>
            <Tabs.Trigger value="project">Tổng theo dự án</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="deal" className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-0">
              <LadDebtByDealTable data={dealData} isLoading={isLoadingDeal} />
            </div>
          </Tabs.Content>
          <Tabs.Content value="project" className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-0">
              <LadDebtByProjectTable data={projectData} isLoading={isLoadingProject} />
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <LadDebtFilterForm
            key={String(filterDialogOpenKey)}
            ref={filterFormRef}
            initialValues={filterValues}
          />
        }
        onClearFilter={handleClearFilter}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />
    </div>
  )
}
