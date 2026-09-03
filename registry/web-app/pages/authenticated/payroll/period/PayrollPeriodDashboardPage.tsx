import { PageTitle, Button } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { useParams, useNavigate } from 'react-router-dom'
import { Flex, Text } from '@radix-ui/themes'
import PayrollSummarySection from '@/features/payroll/period/view-details/PayrollSummarySection'
import { IconSalary, IconPencilsimple } from '@/assets/icons'
import Chip from '@/components/ui/chip/Chip'
import { ColoredValueVariant, SalaryPeriodStatus } from '@/api/schema'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { useSalaryPeriod } from '@/features/payroll/services/salary-period-service'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { useAbility, parsePermissionCode } from '@/lib/ability'
import { DetailRow } from '@/components'
import { withRememberedSearch } from '@/utils/list-url-memory'

const PayrollPeriodDashboardPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const ability = useAbility()

  // Fetch salary period data from API
  const { data: period, isLoading } = useSalaryPeriod(Number(id), { enabled: !!id })
  const isNotFound = !period && !isLoading

  // Check permission
  const hasPermission = (() => {
    const parsed = parsePermissionCode('salary_period.retrieve')
    return parsed ? ability.can(parsed.action, parsed.subject) : false
  })()

  // Get status constants
  const { keysMap } = useAppConstant({
    module: 'payroll',
    keys: [APP_CONSTANT_KEY.PAYROLL.SALARY_PERIOD_STATUS],
  })

  const statusMap = keysMap.get(APP_CONSTANT_KEY.PAYROLL.SALARY_PERIOD_STATUS) as Record<
    string,
    string
  >

  const handleBack = () => {
    navigate(withRememberedSearch(APP_PATH.PAYROLL_PERIOD))
  }

  const handleViewPayslips = () => {
    navigate(APP_PATH.PAYROLL_PERIOD_PAYSLIPS.replace(':id', id as string))
  }

  const handleEdit = () => {
    navigate(APP_PATH.PAYROLL_PERIOD_EDIT.replace(':id', id as string))
  }

  const handleShowHistory = () => {
    navigate(APP_PATH.PAYROLL_PERIOD_HISTORY.replace(':id', id as string))
  }

  const breadcrumb = [
    { label: 'Tính lương', href: '/payroll' },
    { label: 'Kỳ lương', href: '/payroll/period' },
    { label: period?.month || 'Chi tiết', isCurrentPage: true },
  ]

  const totalEmployees = period?.total_employees || 0
  const summaryData = {
    total_records: totalEmployees || 0,
    arrears_count: `${period?.employees_need_recovery || 0}/${totalEmployees}`,
    penalty_count: `${period?.employees_with_penalties || 0}/${totalEmployees}`,
    paid_penalty_count: `${period?.employees_paid_penalties || 0}/${period?.employees_with_penalties || 0}`,
    travel_expense_count: `${period?.employees_with_travel || 0}/${totalEmployees}`,
    emailed_count: `${totalEmployees - (period?.employees_need_email || 0)}/${totalEmployees}`,
  }

  return (
    <DetailPageWrapper isNotFound={isNotFound} hasPermission={hasPermission} isLoading={isLoading}>
      {period && (
        <>
          <PageTitle
            title={period.month || ''}
            breadcrumb={breadcrumb}
            enableBackButton
            handleBackButton={handleBack}
            handleShowHistory={handleShowHistory}
            customActions={
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  leftIcon={<IconSalary size={18} />}
                  onClick={handleViewPayslips}
                  className="px-3"
                >
                  Xem bảng lương
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<IconPencilsimple size={18} />}
                  onClick={handleEdit}
                >
                  Chỉnh sửa
                </Button>
              </div>
            }
          />

          <div className="flex flex-col gap-8 px-10 py-8">
            {/* General Info */}
            <Flex direction="column" gap="1">
              <Text className="typo-body-xl-semibold text-content-dark-1 mb-3">
                Thông tin chung
              </Text>
              <div className="flex flex-col">
                <DetailRow label="Kỳ lương" value={period.month} />
                <DetailRow
                  label="Số ngày làm việc tối thiểu để được hưởng bảo hiểm"
                  value={period.min_working_days_for_insurance ?? '-'}
                />
                <DetailRow
                  label="Thời gian ngừng nhận đề xuất"
                  value={period.proposal_deadline || '-'}
                />
                <DetailRow
                  label="Thời gian ngừng đánh giá KPI"
                  value={period.kpi_assessment_deadline || '-'}
                />
                <DetailRow
                  label="Trạng thái"
                  value={
                    <Chip
                      label={statusMap?.[period.status] || period.status}
                      variant={
                        period.status === SalaryPeriodStatus.COMPLETED
                          ? ColoredValueVariant.GREEN
                          : ColoredValueVariant.BLUE
                      }
                      type="outlined"
                      size="small"
                    />
                  }
                />
              </div>
            </Flex>
            <PayrollSummarySection title="Bảng lương" data={summaryData} />
          </div>
        </>
      )}
    </DetailPageWrapper>
  )
}

export default PayrollPeriodDashboardPage
