import React, { useMemo, useRef } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useBulkUpdateEmployeeRoles } from '@/features/employee/services/employee-role-service'
import { useToast } from '@/hooks/useToast.ts'
import { Button } from '@/components/ui/button'
import BulkRoleSelectionContent, {
  type BulkRoleSelectionContentRef,
} from '../components/BulkRoleSelectionContent.tsx'
import type { EmployeeRole } from '../types.ts'
import { useRoles } from '@/services/role-service.ts'

function BulkRoleSelectionFooter({
  contentRef,
  onSubmit,
  onCancel,
}: {
  contentRef: React.RefObject<BulkRoleSelectionContentRef | null>
  onSubmit: () => void
  onCancel: () => void
}) {
  const [canSubmit, setCanSubmit] = React.useState(false)

  React.useEffect(() => {
    const interval = setInterval(() => {
      const isValid = contentRef.current?.hasValidSelection() ?? false
      setCanSubmit(isValid)
    }, 100)
    return () => clearInterval(interval)
  }, [contentRef])

  return (
    <div className="flex items-center justify-end gap-2 px-6 py-4">
      <Button variant="secondary" onClick={onCancel} className="min-w-[128px]">
        Huỷ
      </Button>
      <Button variant="primary" disabled={!canSubmit} onClick={onSubmit} className="min-w-[128px]">
        Chỉnh sửa
      </Button>
    </div>
  )
}

export function useBulkRoleSelection() {
  const { displayFormContent, displayConfirm, displayClose, setLoading } = useDialog()
  const { success, error } = useToast()
  const bulkUpdateMutation = useBulkUpdateEmployeeRoles()
  const contentRef = useRef<BulkRoleSelectionContentRef>(null)
  const { data } = useRoles()
  const roles = useMemo(() => data?.results || [], [data?.results])

  const openBulkRoleSelection = (selectedEmployees: EmployeeRole[], onSuccess?: () => void) => {
    displayFormContent({
      title: 'Chọn vai trò',
      content: <BulkRoleSelectionContent ref={contentRef} selectedEmployees={selectedEmployees} />,
      size: 'full',
      footer: (
        <BulkRoleSelectionFooter
          contentRef={contentRef}
          onCancel={displayClose}
          onSubmit={() => {
            const newRoleId = contentRef.current?.getSelectedRoleId()
            if (!newRoleId) {
              error('Vui lòng chọn vai trò')
              return
            }
            handleBulkUpdate(selectedEmployees, newRoleId, onSuccess)
          }}
        />
      ),
    })
  }

  const handleBulkUpdate = async (
    employees: EmployeeRole[],
    newRoleId: string,
    onSuccess?: () => void
  ) => {
    const employeeIds = employees.map((emp) => emp.id)
    const selectedRole = roles.find((role) => role.id.toString() === newRoleId)
    const roleName = selectedRole?.name || ''

    displayConfirm({
      title: 'Chỉnh sửa vai trò hàng loạt',
      content: (
        <div className="flex flex-col gap-2 text-center">
          <p className="typo-body-lg text-content-dark-2">
            Bạn có chắc muốn thay đổi vai trò của{' '}
            <span className="font-semibold">{employees.length} nhân viên</span> thành{' '}
            <span className="font-semibold">{roleName}</span> không?
          </p>
          <p className="typo-body-lg text-content-dark-2">Thao tác này không thể hoàn tác.</p>
        </div>
      ),
      size: 'lg',
      confirmText: 'Xác nhận',
      onConfirm: async () => {
        try {
          setLoading(true)

          await bulkUpdateMutation.mutateAsync({
            employee_ids: employeeIds,
            new_role_id: parseInt(newRoleId),
          })

          success(`Đã cập nhật vai trò thành công cho ${employees.length} nhân viên`)
          displayClose()
          onSuccess?.()
        } catch (err) {
          error('Có lỗi xảy ra khi cập nhật vai trò')
        } finally {
          setLoading(false)
        }
      },
    })
  }

  return {
    openBulkRoleSelection,
  }
}
