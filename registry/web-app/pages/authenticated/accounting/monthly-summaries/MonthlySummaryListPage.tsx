import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes/AppRoute.constant'

import { PageTitle, Button } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'

import {
  useMonthlySummaries,
  useAggregateMonthlySummary,
} from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import { IconCalculator } from '@/assets/icons/math-finance'
import toastService from '@/services/toast-service'
import MonthlySummaryTable from '@/features/accounting/monthly-summaries/components/MonthlySummaryTable'

import MonthlySummaryFilter, {
  type MonthlySummaryFilterRef,
} from '@/features/accounting/monthly-summaries/components/MonthlySummaryFilter'
import { useMonthlySummaryExport } from '@/features/accounting/monthly-summaries/_shares/hooks/useMonthlySummaryExport'
import { useMonthlySummaryImport } from '@/features/accounting/monthly-summaries/_shares/hooks/useMonthlySummaryImport'

const EMPTY_ARRAY: any[] = []

const MonthlySummaryListPage = () => {
  const { openExportDialog } = useMonthlySummaryExport()
  const { openImportDialog } = useMonthlySummaryImport()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const filterRef = useRef<MonthlySummaryFilterRef>(null)

  const { data: allPeriods } = useAllAccountingPeriods()
  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const periods = useMemo(() => {
    const list = allPeriods ? [...allPeriods] : []
    if (currentPeriod && !list.some((p) => p.id === currentPeriod.id)) {
      list.push(currentPeriod)
      list.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year
        return b.month - a.month
      })
    }
    return list
  }, [allPeriods, currentPeriod])

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const currentYear = parsePositiveInt(searchParams.get('year'))
  const currentMonth = parsePositiveInt(searchParams.get('month'))
  const currentStatus = searchParams.get('status') || ''

  const activePeriodId = useMemo(() => {
    if (currentYear && currentMonth) {
      return periods.find((p) => p.year === currentYear && p.month === currentMonth)?.id || null
    }
    return null
  }, [periods, currentYear, currentMonth])

  useEffect(() => {
    if (periods.length === 0 || isLoadingCurrent) return

    const hasPage = searchParams.has('page')
    const hasPageSize = searchParams.has('page_size')
    const hasYear = searchParams.has('year')
    const hasMonth = searchParams.has('month')

    if (!hasPage || !hasPageSize || !hasYear || !hasMonth) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(pageSize))
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
  }, [periods, currentPeriod, isLoadingCurrent, searchParams, setSearchParams, pageSize])

  const handlePeriodSelect = useCallback(
    (periodId: number) => {
      const period = periods.find((p) => p.id === periodId)
      if (period) {
        const newParams = new URLSearchParams(searchParams)
        newParams.set('page', '1')
        newParams.set('year', String(period.year))
        newParams.set('month', String(period.month))
        setSearchParams(newParams, { replace: true })
      }
    },
    [periods, searchParams, setSearchParams]
  )

  const currentFilters = useMemo(
    () => ({
      status: currentStatus ? currentStatus.split(',') : undefined,
      beneficiary_collaborator: searchParams.get('beneficiary_collaborator') ?? undefined,
      beneficiary_employee: searchParams.get('beneficiary_employee') ?? undefined,
      beneficiary_exchange: searchParams.get('beneficiary_exchange') ?? undefined,
    }),
    [currentStatus, searchParams]
  )

  const { mutate: aggregate, isPending: isAggregating } = useAggregateMonthlySummary()

  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    const params: Record<string, any> = {
      page: currentPage,
      page_size: pageSize,
      year: currentYear,
      month: currentMonth,
    }
    if (currentStatus) params.status = currentStatus.split(',')
    const beneficiaryCollaborator = searchParams.get('beneficiary_collaborator')
    if (beneficiaryCollaborator) params.beneficiary_collaborator = Number(beneficiaryCollaborator)
    const beneficiaryEmployee = searchParams.get('beneficiary_employee')
    if (beneficiaryEmployee) params.beneficiary_employee = Number(beneficiaryEmployee)
    const beneficiaryExchange = searchParams.get('beneficiary_exchange')
    if (beneficiaryExchange) params.beneficiary_exchange = Number(beneficiaryExchange)
    return params
  }, [isUrlReady, currentPage, pageSize, currentYear, currentMonth, currentStatus, searchParams])

  const handleAggregate = () => {
    setIsConfirmOpen(false)
    aggregate(
      {
        year: currentYear || new Date().getFullYear(),
        month: currentMonth || new Date().getMonth() + 1,
      },
      {
        onSuccess: (res: any) => {
          toastService.success(
            `Đã aggregate ${res?.data?.created + res?.data?.updated} người thụ hưởng`
          )
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.LIST(apiParams || {}),
          })
        },
        onError: (err: any) => {
          toastService.error(err?.message || 'Có lỗi xảy ra khi tính toán')
        },
      }
    )
  }

  const {
    data: listResponse,
    isLoading,
    error,
  } = useMonthlySummaries('employees', apiParams, { enabled: isUrlReady && !!apiParams })

  const handleRowClick = useCallback(
    (row: any) => {
      if (row._isPinned) return
      const roleMap: Record<string, string> = {
        EMPLOYEE: 'employees',
        COLLABORATOR: 'collaborators',
        EXCHANGE: 'f2',
      }
      const role = roleMap[row.beneficiary_type] || 'employees'
      navigate(
        `${APP_PATH.MONTHLY_COMMISSION_SUMMARY_DETAIL.replace(':id', String(row.id))}?role=${role}`
      )
    },
    [navigate]
  )

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const nextPage = pageIndex + 1
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(nextPage))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleApplyFilter = () => {
    const formData = filterRef.current?.getValues()
    if (!formData) return

    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    if (formData.status && formData.status.length > 0) {
      const statusValue = Array.isArray(formData.status)
        ? formData.status.join(',')
        : formData.status
      newParams.set('status', statusValue)
    } else {
      newParams.delete('status')
    }

    if (formData.beneficiary_collaborator) {
      newParams.set('beneficiary_collaborator', formData.beneficiary_collaborator)
    } else {
      newParams.delete('beneficiary_collaborator')
    }

    if (formData.beneficiary_employee) {
      newParams.set('beneficiary_employee', formData.beneficiary_employee)
    } else {
      newParams.delete('beneficiary_employee')
    }

    if (formData.beneficiary_exchange) {
      newParams.set('beneficiary_exchange', formData.beneficiary_exchange)
    } else {
      newParams.delete('beneficiary_exchange')
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }

  const totalRecords = listResponse?.count ?? 0
  const pageCount = pageSize ? Math.ceil(totalRecords / pageSize) : 0

  const activeFilterCount = useMemo(() => {
    const params = new URLSearchParams(searchParams)
    let count = 0
    if (params.has('status')) count++
    if (params.has('beneficiary_collaborator')) count++
    if (params.has('beneficiary_employee')) count++
    if (params.has('beneficiary_exchange')) count++
    return count
  }, [searchParams])

  // Calculate page totals
  /* const totals = useMemo(() => {
    const data = listResponse?.results || []
    return {
      sale_total: data.reduce((acc: number, row: any) => acc + Number(row.sale_total || 0), 0),
      mgmt_total: data.reduce((acc: number, row: any) => acc + Number(row.mgmt_total || 0), 0),
      slk_total: data.reduce((acc: number, row: any) => acc + Number(row.slk_total || 0), 0),
      pre_tax_total: data.reduce(
        (acc: number, row: any) => acc + Number(row.pre_tax_total || 0),
        0
      ),
      pit_amount: data.reduce((acc: number, row: any) => acc + Number(row.pit_amount || 0), 0),
      net_payable: data.reduce((acc: number, row: any) => acc + Number(row.net_payable || 0), 0),
    }
  }, [listResponse?.results]) */

  return (
    <>
      <AppDialog
        variant="alert"
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Xác nhận tính toán hoa hồng"
        titleDescription={`Hành động này sẽ tính toán lại toàn bộ hoa hồng cho tất cả người thụ hưởng trong tháng ${currentMonth}/${currentYear}. Việc này có thể mất một chút thời gian (khoảng 30 giây). Bạn có muốn tiếp tục?`}
        content={null}
        cancelText="Hủy"
        confirmText="Tiếp tục"
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleAggregate}
        loading={isAggregating}
      />
      <PageTitle
        title="Bảng chia hoa hồng theo tháng"
        handleFilter={() => setIsFilterDialogOpen(true)}
        filterBadgeCount={activeFilterCount}
        handleExportBtnFull={() => openExportDialog({ periodId: activePeriodId })}
        handleImportBtnFull={openImportDialog}
        handleImportExcel={openImportDialog}
        toolbarLeftContent={
          <AccountingPeriodSelect
            periods={periods}
            selectedPeriodId={activePeriodId}
            onSelect={handlePeriodSelect}
          />
        }
        customActions={
          <Button
            variant="primary"
            leftIcon={<IconCalculator />}
            onClick={() => setIsConfirmOpen(true)}
            loading={isAggregating}
            disabled={!isUrlReady}
          >
            Tính toán HH
          </Button>
        }
      />

      <div className="flex flex-grow flex-col gap-4 pt-4 pb-6">
        <MonthlySummaryTable
          data={listResponse?.results ?? EMPTY_ARRAY}
          isLoading={isLoading}
          error={error}
          totalRecords={totalRecords}
          pageSize={pageSize}
          pageCount={pageCount}
          currentPageIndex={currentPage - 1}
          onPaginationChange={handlePaginationChange}
          onRowClick={handleRowClick}
        />
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <MonthlySummaryFilter
            ref={filterRef}
            initialValues={currentFilters}
            isOpen={isFilterDialogOpen}
          />
        }
        onClearFilter={() => filterRef.current?.clearForm()}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />
    </>
  )
}

export default MonthlySummaryListPage
