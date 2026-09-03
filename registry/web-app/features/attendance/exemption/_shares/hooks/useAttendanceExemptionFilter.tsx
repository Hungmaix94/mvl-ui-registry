import { Button } from '@/components/ui'
import { useCallback, useRef, useState } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { cn } from '@/utils'
import AttendanceExemptionFilterForm, {
  type AttendanceExemptionFilterFormRef,
  type AttendanceExemptionFilterForm as AttendanceExemptionFilterFormValues,
} from '../components/AttendanceExemptionFilterForm.tsx'
import { cleanObject } from '@/utils/common.ts'

export const useAttendanceExemptionFilter = (
  onApplyFilter?: (filters: AttendanceExemptionFilterFormValues) => void
) => {
  const refForm = useRef<AttendanceExemptionFilterFormRef>(null)
  const [filterParams, setFilterParams] = useState<AttendanceExemptionFilterFormValues>({})
  const { displayFormContent, displayClose } = useDialog()

  const onClickClearFilter = useCallback(() => {
    // Only clear form, don't apply filter yet - wait for user to click "Áp dụng"
    refForm.current?.clearForm()
  }, [])

  const onClickApply = useCallback(() => {
    const formData = refForm.current?.getValues?.()

    if (formData) {
      // Filter out empty values
      const filteredParams = cleanObject(formData)

      // Apply filter to parent component
      onApplyFilter?.(filteredParams)

      // Update filter params
      setFilterParams(filteredParams)

      // Close dialog
      displayClose()
    }
  }, [displayClose, onApplyFilter])

  const leftFooterContent = (
    <Button variant="text" size="small" onClick={onClickClearFilter} className={cn('p-0')}>
      Xoá bộ lọc
    </Button>
  )

  const openFilterModal = useCallback(() => {
    displayFormContent({
      title: 'Bộ lọc',
      content: <AttendanceExemptionFilterForm ref={refForm} initialValues={filterParams} />,
      leftFooterContent,
      confirmText: 'Áp dụng',
      onConfirm: onClickApply,
      confirmButtonClassName: 'min-w-[128px]',
    })
  }, [displayFormContent, onClickApply, filterParams, leftFooterContent])

  // Clear filters function for external use (e.g., from page) - applies immediately
  const clearFilters = useCallback(() => {
    setFilterParams({})
    onApplyFilter?.({})
  }, [onApplyFilter])

  return {
    openFilterModal,
    filterParams,
    setFilterParams,
    clearFilters,
  }
}
