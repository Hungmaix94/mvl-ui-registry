import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { useLocation, useNavigate } from 'react-router-dom'
import EmployeeForm from '@/features/employee/management/create/EmployeeForm.tsx'
import { useMemo, useRef } from 'react'
import type { Employee } from '@/features/employee/services/employee-service'
import { PageTitleRef } from '@/components/ui/page-title/PageTitle.tsx'
import { APP_PATH } from '@/routes'

type LocationState = {
  copyFrom?: Employee
}

const EmployeeManagementCreatePage = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const refPageTitle = useRef<PageTitleRef>(null)

  const state = location.state as LocationState | null

  const isCopyMode = !!state?.copyFrom
  const copyFromEmployee = state?.copyFrom

  const pageTitle = useMemo(() => {
    if (isCopyMode && copyFromEmployee) {
      return `Sao chép ${copyFromEmployee.fullname || copyFromEmployee.code || ''}`
    }
    return undefined // Default title will be used
  }, [isCopyMode, copyFromEmployee])

  return (
    <>
      <PageTitle ref={refPageTitle} enableBackButton title={pageTitle} />
      <Flex className="flex-1 px-10 py-4">
        <EmployeeForm
          mode="create"
          employeeData={copyFromEmployee}
          employeeLoading={false}
          isCopyMode={isCopyMode}
          onSuccess={(id) =>
            navigate(APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', String(id)))
          }
        />
      </Flex>
    </>
  )
}

export default EmployeeManagementCreatePage
