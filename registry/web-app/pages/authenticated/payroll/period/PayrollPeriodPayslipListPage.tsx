import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PayrollPeriodDetail from '@/features/payroll/period/view-details/PayrollPeriodDetail'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { PageTitle, Button, DotLoader } from '@/components/ui'
import {
  IconCaretdown,
  IconCheck,
  IconDownloadsimple,
  IconEnvelopesimple,
  IconEye,
} from '@/assets/icons'
import { IconCalculator } from '@/assets/icons/math-finance'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
  usePositionForFilter,
} from '@/hooks/useFilterEntityValidation'
import {
  useReadyPayrollSlips,
  useNotReadyPayrollSlips,
  type PayrollSlip,
  type PaginatedPayrollSlipList,
} from '@/features/payroll/services/payroll-slip-service'
import {
  useSalaryPeriod,
  useCompleteSalaryPeriod,
  useUncompleteSalaryPeriod,
} from '@/features/payroll/services/salary-period-service'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { useDebounceValue } from 'usehooks-ts'
import { useAuth } from '@/hooks/useAuth'
import { hasPermission } from '@/utils/auth'
import { extractErrorMessage } from '@/utils/error-utils'
import { PayrollSlipData } from '@/features/payroll/period/components/PayslipTable'
import PayslipFilterForm, {
  PayslipFilterFormData,
  PayslipFilterFormRef,
} from '@/features/payroll/period/components/PayslipFilterForm'
import { usePayrollPayslipExport } from '@/features/payroll/period/hooks/usePayrollPayslipExport'
import { useRecalculatePayslip } from '@/features/payroll/period/hooks/useRecalculatePayslip'
import { useSendSalaryPeriodEmailsAsync } from '@/features/payroll/period/hooks/useSendSalaryPeriodEmailsAsync'
import AppDialog from '@/components/dialog/AppDialog'
import { parsePositiveInt } from '@/utils/common'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@radix-ui/themes'
import { SalaryPeriodStatus } from '@/api/schema.ts'
import toastService from '@/services/toast-service'

const ActionButton = ({
  label,
  onClick,
  leftIcon,
  disabled = false,
}: {
  label: string
  onClick: () => void
  leftIcon: React.ReactNode
  disabled?: boolean
}) => (
  <Button
    variant="text"
    className="hover:bg-background-3 flex w-full cursor-pointer items-center gap-2 px-3 py-[17.5px] text-left transition-colors"
    onClick={onClick}
    leftIcon={leftIcon}
    disabled={disabled}
  >
    <span className="typo-body-base text-content-dark-1">{label}</span>
  </Button>
)

/**
 * Parse filter params from URL search params
 */
function parseFilterParamsFromUrl(searchParams: URLSearchParams): PayslipFilterFormData {
  const params: PayslipFilterFormData = {}

  const branchId = parsePositiveInt(searchParams.get('branch'))
  if (branchId) params.branch_id = branchId

  const blockId = parsePositiveInt(searchParams.get('block'))
  if (blockId) params.block_id = blockId

  const departmentId = parsePositiveInt(searchParams.get('department'))
  if (departmentId) params.department_id = departmentId

  const positionId = parsePositiveInt(searchParams.get('position'))
  if (positionId) params.position = positionId

  const employeeId = parsePositiveInt(searchParams.get('employee'))
  if (employeeId) params.employee_id = employeeId

  const needResendEmail = searchParams.get('need_resend_email')
  if (needResendEmail) params.need_resend_email = needResendEmail.split(',').filter(Boolean)

  const payslipStatus = searchParams.get('payslip_status')
  if (payslipStatus) params.payslip_status = payslipStatus.split(',').filter(Boolean)

  return params
}

/**
 * Serialize filter form values to URL search params
 */
function serializeFiltersToUrl(
  values: PayslipFilterFormData,
  baseParams: URLSearchParams
): URLSearchParams {
  const newParams = new URLSearchParams(baseParams)

  // Reset to page 1 when filter changes
  newParams.set('page', '1')

  if (values.branch_id) newParams.set('branch', String(values.branch_id))
  else newParams.delete('branch')

  if (values.block_id) newParams.set('block', String(values.block_id))
  else newParams.delete('block')

  if (values.department_id) newParams.set('department', String(values.department_id))
  else newParams.delete('department')

  if (values.position) newParams.set('position', String(values.position))
  else newParams.delete('position')

  if (values.employee_id) newParams.set('employee', String(values.employee_id))
  else newParams.delete('employee')

  if (values.need_resend_email && values.need_resend_email.length > 0)
    newParams.set('need_resend_email', values.need_resend_email.join(','))
  else newParams.delete('need_resend_email')

  if (values.payslip_status && values.payslip_status.length > 0)
    newParams.set('payslip_status', values.payslip_status.join(','))
  else newParams.delete('payslip_status')

  return newParams
}

const PayrollPeriodPayslipListPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<PayslipFilterFormRef>(null)

  const { user } = useAuth()
  const hasViewPermission = hasPermission(user?.permissions || [], 'salary_period.retrieve')

  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchQuery, setSearchQuery] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchQuery, 500)

  // Track if URL has been initialized
  const [isUrlReady, setIsUrlReady] = useState(false)

  // ===== Validate cascade selects (top-down) =====
  const branchIdFromUrl = parsePositiveInt(searchParams.get('branch'))
  const blockIdFromUrl = parsePositiveInt(searchParams.get('block'))
  const departmentIdFromUrl = parsePositiveInt(searchParams.get('department'))
  const positionIdFromUrl = parsePositiveInt(searchParams.get('position'))
  const employeeIdFromUrl = parsePositiveInt(searchParams.get('employee'))

  const branchQuery = useBranchForFilter(branchIdFromUrl ?? 0)
  const isBranchValid = !!branchQuery.data

  const blockQuery = useBlockForFilter(blockIdFromUrl ?? 0, branchIdFromUrl)
  const isBlockValid =
    isBranchValid && !!blockQuery.data && blockQuery.data.branch === branchIdFromUrl

  const departmentQuery = useDepartmentForFilter(
    departmentIdFromUrl ?? 0,
    branchIdFromUrl,
    blockIdFromUrl
  )
  const isDepartmentValid = isBlockValid && !!departmentQuery.data

  const positionQuery = usePositionForFilter(positionIdFromUrl ?? 0)
  const isPositionValid = !!positionQuery.data

  const validatedOrgFilterParams = useMemo((): Pick<
    PayslipFilterFormData,
    'branch_id' | 'block_id' | 'department_id' | 'position' | 'employee_id'
  > => {
    return {
      branch_id: isBranchValid ? branchIdFromUrl : undefined,
      block_id: isBlockValid ? blockIdFromUrl : undefined,
      department_id: isDepartmentValid ? departmentIdFromUrl : undefined,
      position: isPositionValid ? positionIdFromUrl : undefined,
      employee_id: employeeIdFromUrl,
    }
  }, [
    blockIdFromUrl,
    branchIdFromUrl,
    departmentIdFromUrl,
    employeeIdFromUrl,
    isBlockValid,
    isBranchValid,
    isDepartmentValid,
    isPositionValid,
    positionIdFromUrl,
  ])

  const isOrgValidationLoading = useMemo(() => {
    const isBranchLoading = !!branchIdFromUrl && branchQuery.isLoading
    const isBlockLoading = !!blockIdFromUrl && isBranchValid && blockQuery.isLoading
    const isDepartmentLoading = !!departmentIdFromUrl && isBlockValid && departmentQuery.isLoading
    const isPositionLoading = !!positionIdFromUrl && positionQuery.isLoading

    return isBranchLoading || isBlockLoading || isDepartmentLoading || isPositionLoading
  }, [
    blockIdFromUrl,
    blockQuery.isLoading,
    branchIdFromUrl,
    branchQuery.isLoading,
    departmentIdFromUrl,
    departmentQuery.isLoading,
    isBlockValid,
    isBranchValid,
    positionIdFromUrl,
    positionQuery.isLoading,
  ])

  // Initialize URL with query params
  useEffect(() => {
    setIsUrlReady(true)
  }, [])

  // Update URL when debounced search changes
  useEffect(() => {
    if (!isUrlReady) return

    const currentSearchTerm = searchParams.get('search') || ''
    if (debouncedSearch !== currentSearchTerm) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) {
        newParams.set('search', debouncedSearch)
      } else {
        newParams.delete('search')
      }
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  const page = parsePositiveInt(searchParams.get('page')) || 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const currentFilterParams = useMemo(() => {
    return parseFilterParamsFromUrl(searchParams)
  }, [searchParams])

  // Determine active tab from URL or default to 'eligible'
  const activeTab = searchParams.get('tab') || 'eligible'

  const handleTabChange = useCallback(
    (tab: string) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('tab', tab)
      newParams.set('page', '1') // Reset to page 1

      setSearchParams(newParams)
    },
    [searchParams, setSearchParams]
  )

  // Fetch payroll slips with filters
  const commonQueryParams = {
    search: debouncedSearch,
    page,
    page_size: pageSize,
    branch: validatedOrgFilterParams.branch_id,
    block: validatedOrgFilterParams.block_id,
    department: validatedOrgFilterParams.department_id,
    position: validatedOrgFilterParams.position,
    employee: validatedOrgFilterParams.employee_id,
    need_resend_email: (() => {
      const hasTrue = currentFilterParams.need_resend_email?.includes('true')
      const hasFalse = currentFilterParams.need_resend_email?.includes('false')
      if (hasTrue && hasFalse) return undefined
      if (hasTrue) return true
      if (hasFalse) return false
      return undefined
    })(),
    status__in: currentFilterParams.payslip_status?.join(','),
  }

  const {
    data: readySlipsData,
    isLoading: isLoadingReady,
    refetch: refetchReadySlips,
  } = useReadyPayrollSlips(Number(id), commonQueryParams, {
    enabled: !!id && isUrlReady && !isOrgValidationLoading && activeTab === 'eligible',
  })

  const {
    data: notReadySlipsData,
    isLoading: isLoadingNotReady,
    refetch: refetchNotReadySlips,
  } = useNotReadyPayrollSlips(Number(id), commonQueryParams, {
    enabled: !!id && isUrlReady && !isOrgValidationLoading && activeTab !== 'eligible',
  })

  const slipsData = (activeTab === 'eligible' ? readySlipsData : notReadySlipsData) as
    | PaginatedPayrollSlipList
    | undefined
  const isLoadingSlips = activeTab === 'eligible' ? isLoadingReady : isLoadingNotReady

  const { data: periodData, isLoading: isLoadingPeriod } = useSalaryPeriod(Number(id), {
    enabled: !!id,
  })

  const mapToPayrollSlipData = (item: PayrollSlip): PayrollSlipData => {
    return {
      ...item,
      // Map required fields for PayrollSlipData that are missing in PayrollSlipList
      // Defaulting to 0 or empty for fields not in list view
      name: item.employee_name,
      department: item.department_name,
      position: item.position_name,

      // UI helper fields
      mail_status: item.need_resend_email ? 'Cần gửi lại mail' : 'Đã gửi mail',
      payslip_status: item.status,
      contract_status: item.employment_status,
      email: item.employee_email,

      // Ensure compatible types for extended interface
      id: item.id,
      code: item.code,

      employee: {
        id: item.employee?.id || 0,
        code: item.employee_code,
        fullname: item.employee_name,
        // Avatar not available in list API
        avatar: undefined,
        department: { name: item.department_name },
      },
    } as unknown as PayrollSlipData
  }

  const eligibleEmployees = useMemo(() => {
    if (activeTab === 'eligible') {
      return (slipsData?.results || []).map(mapToPayrollSlipData)
    }
    return []
  }, [slipsData, activeTab])

  const ineligibleEmployees = useMemo(() => {
    if (activeTab === 'ineligible') {
      return (slipsData?.results || []).map(mapToPayrollSlipData)
    }
    return []
  }, [slipsData, activeTab])

  const isNotFound = !isLoadingPeriod && !periodData

  // Mutations
  const { recalculate, isRecalculating } = useRecalculatePayslip()
  const { sendEmails, isSendingEmails } = useSendSalaryPeriodEmailsAsync()
  const { mutate: completeSalaryPeriod, isPending: isCompleting } = useCompleteSalaryPeriod()
  const { mutate: uncompleteSalaryPeriod, isPending: isCompletingUncomplete } =
    useUncompleteSalaryPeriod()

  const { openExportDialog, isExporting } = usePayrollPayslipExport()

  const handleSearch = (value: string) => {
    setSearchQuery(value)
  }

  const handleBack = () => {
    navigate(APP_PATH.PAYROLL_PERIOD_DETAIL.replace(':id', id as string))
  }

  // const handleCopy = () => {
  //   console.log('Copy')
  // }

  const handleMail = () => {
    if (!id) return
    sendEmails(Number(id), {})
  }

  const handleShowHistory = () => {
    if (!id) return
    navigate(APP_PATH.PAYROLL_PERIOD_HISTORY.replace(':id', String(id)))
  }

  const handleRecalculate = () => {
    if (!id) return
    recalculate(Number(id))
  }

  const handleComplete = useCallback(() => {
    if (!id) return

    switch (periodData?.status) {
      case SalaryPeriodStatus.ONGOING:
        completeSalaryPeriod(
          { id: Number(id), data: {} as any },
          {
            onSuccess: () => {
              toastService.success('Đã chốt kỳ lương thành công')
            },
            onError: (error: unknown) => {
              toastService.error(
                extractErrorMessage(error, 'Không thể chốt kỳ lương. Vui lòng thử lại.')
              )
            },
          }
        )
        break

      case SalaryPeriodStatus.COMPLETED:
        uncompleteSalaryPeriod(Number(id), {
          onSuccess: () => {
            toastService.success('Đã mở kỳ lương thành công')
          },
          onError: (error: unknown) => {
            toastService.error(
              extractErrorMessage(error, 'Không thể mở kỳ lương. Vui lòng thử lại.')
            )
          },
        })
        break

      default:
        break
    }
  }, [id, periodData?.status, completeSalaryPeriod, uncompleteSalaryPeriod])

  const handleDownloadList = () => {
    if (!id) return
    openExportDialog(Number(id))
  }

  const handleRefresh = useCallback(() => {
    if (activeTab === 'eligible') {
      refetchReadySlips()
    } else {
      refetchNotReadySlips()
    }
  }, [activeTab, refetchReadySlips, refetchNotReadySlips])

  const handleViewPeriodDetail = () => {
    navigate(APP_PATH.PAYROLL_PERIOD_DETAIL.replace(':id', id as string))
  }

  // Filter handlers
  const handleOpenFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(true)
  }, [])

  const handleCloseFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false)
  }, [])

  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return

    const newParams = serializeFiltersToUrl(formData, searchParams)
    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (validatedOrgFilterParams.branch_id) count++
    if (validatedOrgFilterParams.block_id) count++
    if (validatedOrgFilterParams.department_id) count++
    if (validatedOrgFilterParams.position) count++
    if (validatedOrgFilterParams.employee_id) count++
    if (currentFilterParams.need_resend_email?.length) count++
    if (currentFilterParams.payslip_status?.length) count++
    return count
  }, [validatedOrgFilterParams, currentFilterParams])

  const breadcrumb = [
    { label: 'Tính lương', href: '/payroll' },
    { label: 'Kỳ lương', href: '/payroll/period' },
    {
      label: periodData?.month ? `Tháng ${periodData.month}` : 'Chi tiết',
      href: APP_PATH.PAYROLL_PERIOD_DETAIL.replace(':id', id as string),
    },
    { label: 'Danh sách phiếu lương', isCurrentPage: true },
  ]

  return (
    <DetailPageWrapper
      isLoading={isLoadingPeriod}
      isNotFound={isNotFound}
      hasPermission={hasViewPermission}
    >
      {periodData && (
        <>
          <PageTitle
            title="Danh sách phiếu lương"
            breadcrumb={breadcrumb}
            enableBackButton
            handleBackButton={handleBack}
            handleShowHistory={handleShowHistory}
            customActions={
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="secondary"
                      size="medium"
                      rightIcon={<IconCaretdown size={18} />}
                    >
                      Thao tác
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    side="bottom"
                    className="rounded-[3px] border-none bg-white p-4 shadow-lg"
                  >
                    <div className="flex flex-col gap-2">
                      {periodData.status === SalaryPeriodStatus.ONGOING && (
                        <ActionButton
                          label="Tính lại lương"
                          onClick={handleRecalculate}
                          leftIcon={
                            isRecalculating ? (
                              <DotLoader size="sm" />
                            ) : (
                              <IconCalculator className="text-content-dark-2 h-[18px] w-[18px]" />
                            )
                          }
                          disabled={isRecalculating}
                        />
                      )}

                      <ActionButton
                        label="Tải xuống toàn bộ"
                        onClick={handleDownloadList}
                        disabled={isExporting}
                        leftIcon={
                          isExporting ? (
                            <DotLoader size="sm" />
                          ) : (
                            <IconDownloadsimple className="text-content-dark-2 h-[18px] w-[18px]" />
                          )
                        }
                      />
                      <ActionButton
                        label="Xem Chi tiết kì lương"
                        onClick={handleViewPeriodDetail}
                        leftIcon={<IconEye className="text-content-dark-2 h-[18px] w-[18px]" />}
                      />
                    </div>
                  </PopoverContent>
                </Popover>

                <Separator orientation="vertical" size="2" />
                <Button
                  variant="primary"
                  leftIcon={<IconEnvelopesimple size={18} />}
                  onClick={handleMail}
                  className="px-3"
                  loading={isSendingEmails}
                >
                  Gửi mail lương
                </Button>
                <Separator orientation="vertical" size="2" />
                <Button
                  variant="secondary"
                  leftIcon={<IconCheck size={18} />}
                  onClick={handleComplete}
                  className="px-3"
                  loading={isCompleting || isCompletingUncomplete}
                  disabled={isCompleting || isCompletingUncomplete}
                >
                  {periodData.status === SalaryPeriodStatus.ONGOING
                    ? 'Chốt kỳ'
                    : periodData.status === SalaryPeriodStatus.COMPLETED
                      ? 'Mở kỳ'
                      : 'Kỳ'}
                </Button>
              </div>
            }
            handleSearch={handleSearch}
            searchValue={searchQuery}
            searchPlaceholder="Tìm kiếm nhân viên..."
            searchClassName="!w-[350px]"
            handleFilter={handleOpenFilterDialog}
            filterBadgeCount={activeFilterCount}
          />
          <PayrollPeriodDetail
            period={periodData}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            eligibleEmployees={eligibleEmployees}
            ineligibleEmployees={ineligibleEmployees}
            onCalculate={handleRecalculate}
            isLoading={isLoadingSlips}
            pagination={{
              page,
              pageSize,
              totalRecords: slipsData?.count || 0,
              onPageChange: (newPage) => {
                const newParams = new URLSearchParams(searchParams)
                newParams.set('page', String(newPage))
                setSearchParams(newParams)
              },
              onPageSizeChange: (size) => {
                const newParams = new URLSearchParams(searchParams)
                newParams.set('page_size', String(size))
                newParams.set('page', '1')
                setSearchParams(newParams)
              },
            }}
            onActionSuccess={handleRefresh}
          />

          <AppDialog
            variant="filter"
            open={isFilterDialogOpen}
            onOpenChange={setIsFilterDialogOpen}
            content={<PayslipFilterForm ref={formRef} initialValues={currentFilterParams} />}
            onClearFilter={handleClearFilterInDialog}
            onConfirm={handleApplyFilter}
            onCancel={handleCloseFilterDialog}
          />
        </>
      )}
    </DetailPageWrapper>
  )
}

export default PayrollPeriodPayslipListPage
