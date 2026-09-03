import PermissionManagementFilterForm, {
  type PermissionManagementFilterFormRef,
} from '@/features/permissions/permission-management/PermissionManagementFilterForm.tsx'
import { useCallback, useRef, useState } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { Button } from '@/components/ui'
import { cn } from '@/utils'

export default function usePermissionManagementFilter() {
  const refForm = useRef<PermissionManagementFilterFormRef>(null)
  const [filterParams, setFilterParams] = useState<Record<string, any>>({})

  const { displayFormContent, displayClose } = useDialog()

  const onClickClearFilter = useCallback(() => {
    // Only clear form, don't apply filter yet
    refForm.current?.clearForm()
  }, [])

  const onClickApply = useCallback(() => {
    const formData = refForm.current?.getFormData()
    if (formData) {
      // Filter out empty values
      const filteredParams = Object.fromEntries(
        Object.entries(formData).filter(
          ([_, value]) => value !== undefined && value !== '' && value !== null
        )
      )
      setFilterParams(filteredParams)
      displayClose()
    }
  }, [displayClose])

  const leftFooterContent = (
    <>
      <Button variant={'text'} size={'small'} onClick={onClickClearFilter} className={cn('p-0')}>
        Xoá bộ lọc
      </Button>
    </>
  )

  const openDialog = useCallback(() => {
    displayFormContent({
      title: 'Bộ lọc',
      content: (
        <>
          <PermissionManagementFilterForm ref={refForm} initialValues={filterParams} />
        </>
      ),
      leftFooterContent,
      confirmText: 'Áp dụng',
      onConfirm: onClickApply,
      confirmButtonClassName: 'min-w-[128px]',
    })
  }, [displayFormContent, onClickApply, filterParams])

  const clearFilter = useCallback(() => {
    setFilterParams({})
  }, [])

  return {
    openDialog,
    filterParams,
    clearFilter,
  }
}
