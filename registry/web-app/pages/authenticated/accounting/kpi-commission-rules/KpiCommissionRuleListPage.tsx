import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import { PageTitle } from '@/components/ui'
import { useAbility } from '@/lib/ability.ts'
import { APP_PATH } from '@/routes'
import { IconInfo } from '@/assets/icons'
import KpiCommissionRuleTable from '@/features/accounting/kpi-commission-rules/view/KpiCommissionRuleTable'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import {
  type GetKpiCommissionRulesParams,
  type KpiCommissionRule,
  useManagerKpiRules,
} from '@/features/accounting/manager-kpis/services/manager-kpi-service'

function buildApiParamsFromUrl(searchParams: URLSearchParams): GetKpiCommissionRulesParams {
  const params: GetKpiCommissionRulesParams = {}

  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  const ordering = searchParams.get('ordering')
  if (ordering) params.ordering = ordering

  return params
}

export default function KpiCommissionRuleListPage() {
  const navigate = useNavigate()
  const ability = useAbility()
  const [searchParams, setSearchParams] = useSearchParams()

  const [isUrlReady, setIsUrlReady] = useState(false)

  // Initialize URL defaults
  useEffect(() => {
    const actualUrlParams = new URLSearchParams(window.location.search)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''
    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    if (isUrlEmpty) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    } else if (!hasPage || !hasPageSize) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    }
    setIsUrlReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(searchParams)
  }, [searchParams, isUrlReady])

  const { data, isLoading, error, isFetching, isRefetching } = useManagerKpiRules(apiParams, {
    enabled: isUrlReady && !!apiParams,
  })

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const mockRules = useMemo<KpiCommissionRule[]>(() => {
    return [
      {
        id: 1,
        name: 'Mức chỉ tiêu cơ bản',
        operator: 'GTE',
        completion_pct: '80',
        pct_for_leader: '4.00',
        pct_for_director: '1.00',
        pct_for_ceo: '0.50',
        pct_for_sale_admin_lead: '0.50',
        note: 'Áp dụng khi đạt từ 80% chỉ tiêu',
      },
      {
        id: 2,
        name: 'Mức chỉ tiêu trung bình',
        operator: 'GTE',
        completion_pct: '100',
        pct_for_leader: '5.00',
        pct_for_director: '1.50',
        pct_for_ceo: '0.75',
        pct_for_sale_admin_lead: '0.75',
        note: 'Áp dụng khi đạt từ 100% chỉ tiêu',
      },
      {
        id: 3,
        name: 'Mức chỉ tiêu cao',
        operator: 'GTE',
        completion_pct: '121',
        pct_for_leader: '7.00',
        pct_for_director: '2.50',
        pct_for_ceo: '1.25',
        pct_for_sale_admin_lead: '1.00',
        note: 'Áp dụng khi đạt từ 121% chỉ tiêu',
      },
      {
        id: 4,
        name: 'Mức chỉ tiêu xuất sắc',
        operator: 'GTE',
        completion_pct: '171',
        pct_for_leader: '9.00',
        pct_for_director: '3.00',
        pct_for_ceo: '1.50',
        pct_for_sale_admin_lead: '1.25',
        note: 'Áp dụng khi đạt từ 171% chỉ tiêu',
      },
    ] as unknown as KpiCommissionRule[]
  }, [])

  const { tableData, pageCount, totalRecords, effectiveError } = useMemo(() => {
    const results = data?.results ?? []
    const count = data?.count ?? 0
    if (error || results.length === 0) {
      return {
        tableData: mockRules,
        pageCount: 1,
        totalRecords: mockRules.length,
        effectiveError: null,
      }
    }
    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
      effectiveError: error as Error | null,
    }
  }, [data, error, pageSize, mockRules])

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/kpi-commission-rules/export/',
    'quy-tac-hh-theo-kpi.xlsx'
  )
  const handleExport = useCallback(() => {
    if (!apiParams) return
    const { page: _page, page_size: _pageSize, ...filters } = apiParams as Record<string, unknown>
    openExportDialog(filters)
  }, [apiParams, openExportDialog])

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.KPI_COMMISSION_RULE_CREATE)
  }, [navigate])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleClearAll = useCallback(() => {
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const isTableLoading = isLoading || isFetching || isRefetching

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Quy định hoa hồng theo KPI"
        handleCreateNew={
          ability.can('create', 'kpicommissionstructure') ? handleCreateNew : undefined
        }
        titleCreateNew="Cập nhật quy định"
        handleExportBtnFull={handleExport}
        titleExportBtnIcon="Xuất Excel"
        topSlot={
          <div className="flex items-start gap-2.5 rounded-lg border border-[#FCD34D] bg-[#FFFBEB] p-3.5 text-[#92400E]">
            <IconInfo size={16} className="mt-0.5 shrink-0" />
            <div className="text-sm leading-relaxed">
              <span className="font-semibold">Cách áp dụng:</span> Tỷ lệ HH = % thưởng × doanh thu
              thực hiện của khối/phòng. <span className="font-semibold">Chỉ tiêu</span> là ngưỡng %
              doanh thu để đạt mức thưởng tương ứng. Ví dụ: phòng đạt{' '}
              <span className="font-semibold">125%</span> doanh thu → áp dòng <i>121% – 170%</i>: TP
              nhận <span className="font-semibold">7,0%</span>, GĐ nhận{' '}
              <span className="font-semibold">2,5%</span>, TGĐ nhận{' '}
              <span className="font-semibold">1,25%</span> trên doanh thu thực hiện.
            </div>
          </div>
        }
      />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto pt-4 pb-6">
        <KpiCommissionRuleTable
          data={tableData}
          isLoading={isTableLoading}
          error={effectiveError}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
          onClearFilter={handleClearAll}
        />
      </div>
    </div>
  )
}
