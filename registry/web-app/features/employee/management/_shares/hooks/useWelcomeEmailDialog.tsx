import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDialog } from '@/hooks/useDialog.ts'
import { useToast } from '@/hooks/useToast.ts'
import { useSendWelcomeEmail } from '@/features/employee/services/employee-email-service'
import WelcomeEmailDialog from '@/features/employee/management/_shares/components/WelcomeEmailDialog.tsx'
import WelcomeEmailDialogFooter from '@/features/employee/management/_shares/components/WelcomeEmailDialogFooter.tsx'
import type { Employee } from '@/features/employee/services/employee-service'
import { handleApiError } from '@/utils/error-utils.ts'
import { APP_PATH } from '@/routes'
import { PAGE_SIZE } from '@/constants/table.ts'
import { EMPLOYEE_FILTER_YES_NO_VALUES } from '@/constants/employee-filter.ts'
import { EmployeeStatus } from '@/constants/api-schema-aliases'
/**
 * Danh sách nhân viên với bộ lọc mặc định + trạng thái Onboarding.
 * Giữ đồng bộ với default filter của EmployeeManagementPage (chỉ đổi statuses sang Onboarding).
 */
function buildOnboardingListUrl(): string {
  const params = new URLSearchParams()
  params.set('page', '1')
  params.set('page_size', String(PAGE_SIZE))
  params.append('statuses', EmployeeStatus.Onboarding)
  params.set('is_os_code_type', EMPLOYEE_FILTER_YES_NO_VALUES.NO)
  params.set('include_report_excluded_positions', EMPLOYEE_FILTER_YES_NO_VALUES.NO)
  return `${APP_PATH.EMPLOYEE_MANAGEMENT}?${params.toString()}`
}

export function useWelcomeEmailDialog() {
  const { displayCustom, displayClose } = useDialog()
  const { success: showSuccessToast } = useToast()
  const sendMutation = useSendWelcomeEmail()
  const navigate = useNavigate()

  const openWelcomeEmailDialog = useCallback(
    (employee: Employee) => {
      const sendEmail = async () => {
        try {
          await sendMutation.mutateAsync({ id: employee.id })
          showSuccessToast('Gửi email hội nhập thành công')
        } catch (error: any) {
          handleApiError(error)
          throw error
        }
      }

      const handleSend = async () => {
        await sendEmail()
        displayClose()
      }

      const handleSendAndBackToOnboarding = async () => {
        await sendEmail()
        displayClose()
        navigate(buildOnboardingListUrl())
      }

      displayCustom({
        size: 'xl',
        title: 'Gửi email hội nhập',
        scrollable: true,
        content: <WelcomeEmailDialog employee={employee} />,
        footer: (
          <WelcomeEmailDialogFooter
            onSend={handleSend}
            onSendAndBackToOnboarding={handleSendAndBackToOnboarding}
            onCancel={displayClose}
          />
        ),
        dialogContentClassName: 'p-0',
      })
    },
    [displayCustom, displayClose, sendMutation, showSuccessToast, navigate]
  )

  return {
    openWelcomeEmailDialog,
  }
}
