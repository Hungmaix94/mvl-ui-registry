import { useCallback, useRef, useState, useMemo } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { Button } from '@/components/ui'
import { cn } from '@/utils'
import ContractAppendixFilterForm, {
  type ContractAppendixFilterFormRef,
} from '../components/ContractAppendixFilterForm.tsx'
import { parseISO } from 'date-fns'
import { formatDateToApi } from '@/utils/date-utils.ts'

export const useContractAppendixFilter = () => {
  const refForm = useRef<ContractAppendixFilterFormRef>(null)
  const [filterParams, setFilterParams] = useState<Record<string, any>>({})

  const { displayFormContent, displayClose } = useDialog()

  // Convert API params back to form values for initial values
  const initialFormValues = useMemo(() => {
    const formValues: Record<string, any> = {}

    if (!filterParams || Object.keys(filterParams).length === 0) {
      return formValues
    }

    // Convert effective_date_from and effective_date_to back to effective_date_range
    // Note: filterParams uses effective_date_from/effective_date_to (not effective_date__gte/effective_date__lte)
    if (filterParams.effective_date_from || filterParams.effective_date_to) {
      formValues.effective_date_range = {
        from: filterParams.effective_date_from
          ? parseISO(filterParams.effective_date_from)
          : undefined,
        to: filterParams.effective_date_to ? parseISO(filterParams.effective_date_to) : undefined,
      }
    }

    // Convert branch_id, block_id, department_id, employee_id (already in correct format)
    if (filterParams.branch_id !== undefined && filterParams.branch_id !== null) {
      formValues.branch_id = filterParams.branch_id
    }
    if (filterParams.block_id !== undefined && filterParams.block_id !== null) {
      formValues.block_id = filterParams.block_id
    }
    if (filterParams.department_id !== undefined && filterParams.department_id !== null) {
      formValues.department_id = filterParams.department_id
    }
    if (filterParams.employee_id !== undefined && filterParams.employee_id !== null) {
      formValues.employee_id = filterParams.employee_id
    }

    // Convert status back to array
    // Check if status is stored as array (for multiple selections) or single value
    if (filterParams.status !== undefined && filterParams.status !== null) {
      if (Array.isArray(filterParams.status)) {
        formValues.status = filterParams.status
      } else {
        formValues.status = [filterParams.status]
      }
    }

    return formValues
  }, [filterParams])

  const onClickClearFilter = useCallback(() => {
    // Only clear form, don't apply filter yet
    refForm.current?.clearForm()
  }, [])

  const onClickApply = useCallback(() => {
    const formData = refForm.current?.getRawValues?.()
    if (formData) {
      // Filter out empty values and convert to API params
      const filteredParams: Record<string, any> = {}

      if (formData.effective_date_range?.from) {
        filteredParams.effective_date_from = formatDateToApi(formData.effective_date_range.from)
      }
      if (formData.effective_date_range?.to) {
        filteredParams.effective_date_to = formatDateToApi(formData.effective_date_range.to)
      }

      if (formData.branch_id) {
        filteredParams.branch_id = formData.branch_id
      }
      if (formData.block_id) {
        filteredParams.block_id = formData.block_id
      }
      if (formData.department_id) {
        filteredParams.department_id = formData.department_id
      }

      if (formData.employee_id) {
        filteredParams.employee_id = formData.employee_id
      }

      if (formData.status && formData.status.length > 0) {
        // Store all statuses as array to preserve multiple selections
        if (formData.status.length === 1) {
          filteredParams.status = formData.status[0]
        } else {
          // For multiple statuses, store as array
          filteredParams.status = formData.status
        }
      }

      setFilterParams(filteredParams)
      displayClose()
    }
  }, [displayClose])

  const leftFooterContent = (
    <Button
      variant={'text'}
      size={'small'}
      onClick={onClickClearFilter}
      className={cn('text-action-primary-red-default hover:text-action-primary-red-hover p-0')}
    >
      Xoá bộ lọc
    </Button>
  )

  const openDialog = useCallback(() => {
    displayFormContent({
      title: 'Bộ lọc',
      content: <ContractAppendixFilterForm ref={refForm} initialValues={initialFormValues} />,
      leftFooterContent,
      confirmText: 'Áp dụng',
      onConfirm: onClickApply,
      confirmButtonClassName: 'min-w-[128px]',
    })
  }, [displayFormContent, onClickApply, initialFormValues, leftFooterContent])

  const clearFilter = useCallback(() => {
    setFilterParams({})
  }, [])

  // Calculate active filter count by checking each property
  const filterBadgeCount = useMemo(() => {
    if (!filterParams) return 0

    let count = 0

    // Check effective_date_from or effective_date_to
    if (
      (filterParams.effective_date_from !== undefined &&
        filterParams.effective_date_from !== null &&
        filterParams.effective_date_from !== '') ||
      (filterParams.effective_date_to !== undefined &&
        filterParams.effective_date_to !== null &&
        filterParams.effective_date_to !== '')
    ) {
      count++
    }

    // Check branch
    if (filterParams.branch_id !== undefined && filterParams.branch_id !== null) {
      count++
    }

    // Check block
    if (filterParams.block_id !== undefined && filterParams.block_id !== null) {
      count++
    }

    // Check department
    if (filterParams.department_id !== undefined && filterParams.department_id !== null) {
      count++
    }

    // Check employee
    if (filterParams.employee_id !== undefined && filterParams.employee_id !== null) {
      count++
    }

    // Check status
    if (filterParams.status !== undefined && filterParams.status !== null) {
      count++
    }

    return count
  }, [filterParams])

  return {
    openDialog,
    filterParams,
    clearFilter,
    filterBadgeCount,
  }
}
