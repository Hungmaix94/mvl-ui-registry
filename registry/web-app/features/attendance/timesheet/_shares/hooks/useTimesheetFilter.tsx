import { useCallback, useRef, useState } from 'react'
import { startOfMonth } from 'date-fns'
import { useDialog } from '@/hooks/useDialog.ts'
import TimesheetFilterForm, {
  type TimesheetFilterFormRef,
  type TimesheetFilterFormValues,
} from '@/features/attendance/timesheet/_shares/components/TimesheetFilterForm.tsx'
import { Button } from '@/components/ui'
import { formatMonthForApi } from '@/features/attendance/timesheet/_shares/utils/timesheet-utils.ts'

export const useTimesheetFilter = (onApplyFilter: (filterParams: Record<string, any>) => void) => {
  const refForm = useRef<TimesheetFilterFormRef>(null)
  const defaultMonth = startOfMonth(new Date())
  const [filterParams, setFilterParams] = useState<Record<string, any>>({
    month: formatMonthForApi(defaultMonth),
  })
  const [formInitialValues, setFormInitialValues] = useState<TimesheetFilterFormValues>({
    month: defaultMonth,
  })
  const { displayFormContent, displayClose, updateConfig } = useDialog()

  const onClickClearFilter = useCallback(() => {
    refForm.current?.clearForm()
    setFilterParams({})
    setFormInitialValues({
      month: defaultMonth,
    })
    onApplyFilter({})
  }, [onApplyFilter, defaultMonth])

  const onClickApply = useCallback(async () => {
    // Trigger form validation
    const isValid = await refForm.current?.trigger()
    if (!isValid) {
      // Form validation errors will be displayed automatically
      return
    }

    // Additional check: ensure month is selected
    const formData = refForm.current?.getRawValues()
    if (!formData?.month) {
      return
    }

    const apiParams = refForm.current?.getValues()
    const rawValues = refForm.current?.getRawValues()
    if (apiParams && rawValues) {
      onApplyFilter(apiParams)
      setFilterParams(apiParams)
      setFormInitialValues(rawValues)
      displayClose()
    }
  }, [onApplyFilter, displayClose])

  const leftFooterContent = (
    <Button
      variant="text"
      size="small"
      onClick={onClickClearFilter}
      className="text-action-primary-red-default hover:text-action-primary-red-hover p-0"
    >
      Xóa bộ lọc
    </Button>
  )

  const openDialog = useCallback(() => {
    displayFormContent({
      title: 'Bộ lọc',
      content: (
        <TimesheetFilterForm
          ref={refForm}
          initialValues={formInitialValues}
          onValidationChange={(isValid) => {
            updateConfig({ disableConfirm: !isValid })
          }}
        />
      ),
      leftFooterContent,
      confirmText: 'Áp dụng',
      onConfirm: onClickApply,
      disableConfirm: !formInitialValues?.month,
    })
  }, [displayFormContent, onClickApply, formInitialValues, updateConfig])

  return {
    openDialog,
    filterParams,
    onClickClearFilter,
  }
}
