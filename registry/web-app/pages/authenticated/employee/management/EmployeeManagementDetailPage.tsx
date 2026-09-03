import { PageTitle } from '@/components/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx'
import {
  CertificateTab,
  ContractTab,
  DependentTab,
  GeneralInfoTab,
  LeaveHistoryTab,
  RelationTab,
} from '@/features/employee/management/view-details'
import { useNavigate, useParams } from 'react-router-dom'
import { useEmployee } from '@/services'
import { APP_PATH } from '@/routes'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import { useDialog } from '@/hooks/useDialog.ts'
import { useDeleteEmployee } from '@/features/employee/services/employee-service'
import EmployeeActions from '@/features/employee/management/_shares/components/EmployeeActions.tsx'
import { useCallback, useMemo, useState } from 'react'
import { isNotFoundError } from '@/utils/error-utils'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

import { useAbility } from '@/lib/ability.ts'

const EmployeeManagementDetailPage = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const employeeId = id ? parseInt(id, 10) : 0
  const { data: employee, isLoading, error } = useEmployee(employeeId)
  const invalidateQueries = useInvalidateQueries()
  const { displayConfirm, setLoading } = useDialog()
  const deleteEmployeeMutation = useDeleteEmployee()
  const ability = useAbility()

  const [activeTab, setActiveTab] = useState<string>('general')

  // Determine if employee was not found (404 error or no data)
  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !employee
  }, [isLoading, error, employee])

  // Determine if there's a non-404 error
  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const tabItems = [
    {
      value: 'general',
      label: 'Thông tin chung',
      component: GeneralInfoTab,
    },
    {
      value: 'certificate',
      label: 'Bằng cấp/Chứng chỉ môi giới',
      component: CertificateTab,
    },
    {
      value: 'relation',
      label: 'Quan hệ nhân thân',
      component: RelationTab,
    },
    {
      value: 'dependent',
      label: 'Người phụ thuộc',
      component: DependentTab,
    },
    {
      value: 'contract',
      label: 'Hợp đồng',
      component: ContractTab,
    },
    {
      value: 'leave-history',
      label: 'Lịch sử công tác',
      component: LeaveHistoryTab,
    },
  ]

  const handleEdit = () => {
    if (employee) {
      navigate(`${APP_PATH.EMPLOYEE_MANAGEMENT_EDIT.replace(':id', String(employee.id))}`)
    }
  }

  const handleCopy = useCallback(() => {
    if (!employee) {
      return
    }

    // Navigate to create page with initial data for copying
    navigate(APP_PATH.EMPLOYEE_MANAGEMENT_CREATE, {
      state: {
        copyFrom: employee,
      },
    })
  }, [employee, navigate])

  const handleDelete = () => {
    if (employee) {
      displayConfirm({
        title: 'Xoá nhân viên',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá{' '}
            <b className="typo-body-lg-regular text-content-dark-2">
              {employee.fullname || employee.code}
            </b>{' '}
            không?
            <br />
            Thao tác này không thể hoàn tác.
          </div>
        ),
        confirmText: 'Xoá',
        cancelText: 'Huỷ',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        size: 'xl',
        onConfirm: async () => {
          try {
            setLoading(true)
            await deleteEmployeeMutation.mutateAsync(employee.id)

            // Invalidate employee list queries
            await invalidateQueries.invalidateByPrefix('hrm/employees')

            toastService.success('Xoá nhân viên thành công')

            // Navigate back to employee list after successful deletion
            navigate(APP_PATH.EMPLOYEE_MANAGEMENT)
          } catch (error) {
            console.error('Lỗi khi xoá nhân viên:', error)
            toastService.error('Có lỗi xảy ra khi xoá nhân viên')
          } finally {
            setLoading(false)
          }
        },
      })
    }
  }

  const handleShowHistory = useCallback(() => {
    if (id) {
      const path = APP_PATH.EMPLOYEE_MANAGEMENT_HISTORY.replace(':id', id.toString())
      navigate(path)
    }
  }, [navigate, id])

  return (
    <>
      <PageTitle
        title={employee ? `${employee.code} - ${employee.fullname}` : undefined}
        idLabel={employee?.fullname}
        enableBackButton
        handleCopy={ability.can('create', 'employee') ? handleCopy : undefined}
        handleDelete={ability.can('destroy', 'employee') ? handleDelete : undefined}
        handleEdit={ability.can('update', 'employee') ? handleEdit : undefined}
        btnEditVariant={'primary'}
        handleShowHistory={ability.can('histories', 'employee') ? handleShowHistory : undefined}
        customActions={employee ? <EmployeeActions employee={employee} /> : undefined}
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'employee')}
      >
        {employee && (
          <div className="flex flex-col gap-6 px-10 pt-6">
            <Tabs value={activeTab}>
              <TabsList>
                {tabItems.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {tabItems.map((tab) => {
                const TabComponent = tab.component
                return (
                  <TabsContent key={tab.value} value={tab.value} className="mt-6">
                    <TabComponent employee={employee} />
                  </TabsContent>
                )
              })}
            </Tabs>
          </div>
        )}
      </DetailPageWrapper>
    </>
  )
}

export default EmployeeManagementDetailPage
