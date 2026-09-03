import React, { useRef } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { Button } from '@/components/ui/button'
import EmployeeRoleFilterForm from '../components/EmployeeRoleFilterForm.tsx'
import type { EmployeeRoleFilters, EmployeeRoleFilterFormRef } from '../types.ts'

function FilterFooter({
  onClear,
  onApply,
}: {
  formRef: React.RefObject<EmployeeRoleFilterFormRef | null>
  onClear: () => void
  onApply: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <Button variant="text" onClick={onClear} size="small">
        Xoá bộ lọc
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={onApply} className="min-w-[128px]">
          Áp dụng
        </Button>
      </div>
    </div>
  )
}

export function useEmployeeRoleFilter(initialFilters?: EmployeeRoleFilters) {
  const { displayFormContent, displayClose } = useDialog()
  const formRef = useRef<EmployeeRoleFilterFormRef>(null)

  const openFilterDialog = (onApply: (filters: EmployeeRoleFilters) => void) => {
    displayFormContent({
      title: 'Bộ lọc',
      content: <EmployeeRoleFilterForm ref={formRef} initialFilters={initialFilters} />,
      footer: (
        <FilterFooter
          formRef={formRef}
          onClear={() => formRef.current?.clearForm()}
          onApply={() => {
            const filters = formRef.current?.getValues()
            if (filters) {
              onApply(filters)
              displayClose()
            }
          }}
          onCancel={displayClose}
        />
      ),
    })
  }

  const clearFilters = () => {
    formRef.current?.clearForm()
  }

  return {
    openFilterDialog,
    clearFilters,
  }
}
