import { Button } from '@/components/ui'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { cn } from '@/utils'
import RecruitmentRequestFilterForm, {
  type RecruitmentRequestFilterFormRef,
} from './RecruitmentRequestFilterForm.tsx'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { parseISO } from 'date-fns'

export const useRecruitmentRequestFilter = (
  onApplyFilter?: (filters: Record<string, any>) => void
) => {
  const refForm = useRef<RecruitmentRequestFilterFormRef & { getValues?: () => any }>(null)
  const [filterParams, setFilterParams] = useState<Record<string, any>>({})
  const [formValues, setFormValues] = useState<Record<string, any>>({})

  const { displayFormContent, displayClose } = useDialog()

  const initialFormValues = useMemo(() => {
    // Step 1: Transform filterParams (API params) back to form values
    const transformedFromParams: Record<string, any> = {}

    // Convert certificate_types (comma-separated string) back to array

    if (filterParams.from_date || filterParams.to_date) {
      transformedFromParams.date_range = {
        from: filterParams.from_date ? parseISO(filterParams.from_date) : undefined,
        to: filterParams.to_date ? parseISO(filterParams.to_date) : undefined,
      }
    }

    // Step 2: Merge with persisted formValues (raw form values - highest priority for UI fields)
    // formValues contains branch_id, block_id, department_id, etc. from last form submission
    const finalInitials = {
      ...transformedFromParams,
      ...formValues, // Override with persisted raw form values (includes UI-only fields)
    }

    return finalInitials
  }, [filterParams, formValues])

  const onClickClearFilter = useCallback(() => {
    refForm.current?.clearForm()
  }, [])

  const onClickApply = useCallback(() => {
    const formData = refForm.current?.getValues?.()
    const rawValues = refForm.current?.getRawValues?.()
    if (formData && rawValues) {
      // Filter API params (excludes UI-only fields)
      const filteredParams = Object.fromEntries(
        Object.entries(formData).filter(([_, value]) => {
          if (value === undefined || value === null) return false
          if (typeof value === 'string' && value === '') return false
          if (Array.isArray(value) && value.length === 0) return false
          return true
        })
      )

      // Add UI-only fields (branch_id, block_id, department_id) to filterParams for badge counting
      // These fields are preserved but not sent to API (only employee is sent)
      const finalFilterParams: Record<string, any> = {
        ...filteredParams,
      }

      // Add organization structure fields if they exist in rawValues
      if (rawValues.branch_id) {
        finalFilterParams.branch_id = rawValues.branch_id
      }
      if (rawValues.block_id) {
        finalFilterParams.block_id = rawValues.block_id
      }
      if (rawValues.department_id) {
        finalFilterParams.department_id = rawValues.department_id
      }

      if (rawValues.date_range?.from) {
        finalFilterParams.from_date = formatDateToApi(rawValues.date_range.from)
        finalFilterParams.date_range = rawValues.date_range
      }
      if (rawValues.date_range?.to) {
        finalFilterParams.to_date = formatDateToApi(rawValues.date_range.to)
        if (!finalFilterParams.date_range) {
          finalFilterParams.date_range = rawValues.date_range
        }
      }

      // Persist raw form values (for UI restoration)
      setFormValues(rawValues)

      // Store both API params and UI fields for badge counting
      setFilterParams(finalFilterParams)

      // Only send API params to parent (for actual filtering)
      onApplyFilter?.(filteredParams)
      displayClose()
    }
  }, [displayClose, onApplyFilter])

  const leftFooterContent = (
    <Button variant="text" size="small" onClick={onClickClearFilter} className={cn('p-0')}>
      Xoá bộ lọc
    </Button>
  )

  const openDialog = useCallback(() => {
    displayFormContent({
      title: 'Bộ lọc',
      content: <RecruitmentRequestFilterForm ref={refForm} initialValues={initialFormValues} />,
      leftFooterContent,
      confirmText: 'Áp dụng',
      onConfirm: onClickApply,
      confirmButtonClassName: 'min-w-[128px]',
    })
  }, [displayFormContent, onClickApply, initialFormValues])

  const clearFilter = useCallback(() => {
    setFilterParams({})
  }, [])

  return {
    openDialog,
    filterParams,
    clearFilter,
  }
}
