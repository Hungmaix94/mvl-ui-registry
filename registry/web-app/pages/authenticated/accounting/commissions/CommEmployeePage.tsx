import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import { APP_PATH } from '@/routes'

import { useMonthlySummaries } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import { CommEmployeeTable } from '@/features/accounting/commissions/components/CommEmployeeTable'
import {
  CommEmployeeFilter,
  type CommEmployeeFilterFormData,
  type CommEmployeeFilterRef,
} from '@/features/accounting/commissions/components/CommEmployeeFilter'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { MonthlySummaryStatus as MonthlyStatus } from '@/constants/api-schema-aliases'

const CommEmployeePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const formRef = useRef<CommEmployeeFilterRef>(null)

  const { data: allPeriods } = useAllAccountingPeriods()
  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const periods = allPeriods ?? []

  const page = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const currentYear = parsePositiveInt(searchParams.get('year'))
  const currentMonth = parsePositiveInt(searchParams.get('month'))
  const status = (searchParams.get('status') as MonthlyStatus) || undefined
  const role = searchParams.get('role') || undefined
  const beneficiaryEmployee = searchParams.get('beneficiary_employee') || undefined
  const searchQuery = searchParams.get('q') || undefined

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

  const currentFilters = useMemo(() => {
    const filters: CommEmployeeFilterFormData = {}
    if (status) filters.status = status
    if (role) filters.role = role
    if (beneficiaryEmployee) filters.beneficiary_employee = beneficiaryEmployee
    return filters
  }, [status, role, beneficiaryEmployee])

  const {
    data: listResponse,
    isLoading,
    error,
  } = useMonthlySummaries(
    'employees',
    {
      page,
      page_size: pageSize,
      year: currentYear || 2000,
      month: currentMonth || 1,
      status: status || undefined,
      role: role || undefined,
      beneficiary_employee: beneficiaryEmployee ? Number(beneficiaryEmployee) : undefined,
      search: searchQuery || undefined,
    },
    { enabled: isUrlReady && !!currentYear && !!currentMonth }
  )

  const handleApplyFilter = () => {
    const formData = formRef.current?.getValues()
    if (!formData) return

    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))
    if (formData.status) newParams.set('status', formData.status)
    else newParams.delete('status')
    if (formData.role) newParams.set('role', formData.role)
    else newParams.delete('role')
    if (formData.beneficiary_employee)
      newParams.set('beneficiary_employee', formData.beneficiary_employee)
    else newParams.delete('beneficiary_employee')

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }

  const setPage = (pageIndex: number) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', String(pageIndex))
    setSearchParams(newParams, { replace: true })

    const mainEl = document.querySelector('main')
    if (mainEl) mainEl.scrollTop = 0
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const setPageSize = (newSize: number) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('page_size', String(newSize))
    setSearchParams(newParams, { replace: true })
  }

  const handleSearch = useCallback(
    (val: string) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', '1')
      if (val) newParams.set('q', val)
      else newParams.delete('q')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const filterCount = useMemo(() => {
    let count = 0
    if (searchParams.has('status')) count++
    if (searchParams.has('role')) count++
    if (searchParams.has('beneficiary_employee')) count++
    return count
  }, [searchParams])

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/monthly-summaries/employees/export/',
    'hoa-hong-nhan-vien.xlsx'
  )
  const handleExport = useCallback(() => {
    openExportDialog({
      year: currentYear || undefined,
      month: currentMonth || undefined,
      status: status || undefined,
      role: role || undefined,
      beneficiary_employee: beneficiaryEmployee ? Number(beneficiaryEmployee) : undefined,
      search: searchQuery || undefined,
    })
  }, [openExportDialog, currentYear, currentMonth, status, role, beneficiaryEmployee, searchQuery])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Tổng kết HH theo người"
        handleSearch={handleSearch}
        searchValue={searchQuery || ''}
        searchPlaceholder="Tìm theo mã NV, họ tên..."
        handleFilter={() => setIsFilterDialogOpen(true)}
        filterBadgeCount={filterCount}
        handleExportBtnFull={handleExport}
        titleExportBtnIcon="Xuất Excel"
        toolbarLeftContent={
          <AccountingPeriodSelect
            periods={periods}
            selectedPeriodId={activePeriodId}
            onSelect={handlePeriodSelect}
          />
        }
      />
      <div className="flex-1 overflow-x-auto overflow-y-auto pt-4 pb-10">
        <CommEmployeeTable
          data={listResponse?.results || []}
          isLoading={isLoading}
          error={error}
          totalRecords={listResponse?.count || 0}
          page={page - 1}
          pageSize={pageSize}
          onPageChange={(pageIndex) => setPage(pageIndex + 1)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize)
            setPage(1)
          }}
          onViewDetail={(id) =>
            navigate(
              `${APP_PATH.MONTHLY_COMMISSION_SUMMARY_DETAIL.replace(':id', String(id))}?role=employees`
            )
          }
          onRowClick={(record) =>
            navigate(
              `${APP_PATH.MONTHLY_COMMISSION_SUMMARY_DETAIL.replace(':id', String(record.id))}?role=employees`
            )
          }
        />
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <CommEmployeeFilter
            ref={formRef}
            initialValues={currentFilters}
            isOpen={isFilterDialogOpen}
          />
        }
        onClearFilter={() => formRef.current?.clearForm()}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />
    </div>
  )
}

export default CommEmployeePage
