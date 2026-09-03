import { useCallback, useRef, useState, useMemo } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { Button } from '@/components/ui'
import { cn } from '@/utils'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import ContractTypeFilterForm, {
  type ContractTypeFilterFormHandle,
  type ContractTypeFilterFormValues,
} from '../components/ContractTypeFilterForm.tsx'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { DateRange } from 'react-day-picker'

export const useContractTypeFilter = (onApplyFilter?: (filters: Record<string, any>) => void) => {
  const refForm = useRef<ContractTypeFilterFormHandle>(null)
  const [filterParams, setFilterParams] = useState<Record<string, any>>({})
  const { displayFormContent, displayClose } = useDialog()
  const invalidateQueries = useInvalidateQueries()

  // Convert API params back to form values (DateRange) for initial values
  const initialFormValues = useMemo(() => {
    const formValues: ContractTypeFilterFormValues = {}

    // Convert created_at_from and created_at_to back to DateRange
    if (filterParams.created_at_from || filterParams.created_at_to) {
      const fromDate = filterParams.created_at_from
        ? new Date(filterParams.created_at_from)
        : undefined
      const toDate = filterParams.created_at_to ? new Date(filterParams.created_at_to) : undefined

      if (fromDate || toDate) {
        formValues.dateRange = {
          from: fromDate,
          to: toDate,
        } as DateRange
      }
    }

    if (filterParams.is_active === 'true' || filterParams.is_active === 'false') {
      formValues.is_active = filterParams.is_active
    }

    return formValues
  }, [filterParams])

  const onClickClearFilter = useCallback(() => {
    refForm.current?.clearForm()
  }, [])

  const onClickApply = useCallback(async () => {
    const formData = refForm.current?.getValues?.()
    if (formData) {
      try {
        // Filter out empty values and convert DateRange to API params
        const apiParams: Record<string, any> = {}

        // Convert DateRange to created_at_from and created_at_to
        if (formData.dateRange) {
          const { from, to } = formData.dateRange
          if (from) {
            apiParams.created_at_from = formatDateToApi(from)
          }
          if (to) {
            apiParams.created_at_to = formatDateToApi(to)
          }
        }

        if (formData.is_active === 'true' || formData.is_active === 'false') {
          apiParams.is_active = formData.is_active
        }

        // Apply filter to parent component
        onApplyFilter?.(apiParams)

        // Update filter params
        setFilterParams(apiParams)

        // Close dialog first
        displayClose()

        // Then invalidate queries to refresh the data with new filter
        await invalidateQueries.invalidateByPrefix('hrm/contract-types')
      } catch (error) {
        console.error('Error applying filter:', error)
        displayClose()
      }
    }
  }, [onApplyFilter, displayClose, invalidateQueries])

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

  const openFilterModal = useCallback(() => {
    displayFormContent({
      title: 'Bộ lọc',
      content: (
        <>
          <ContractTypeFilterForm ref={refForm} initialValues={initialFormValues} />
        </>
      ),
      leftFooterContent,
      confirmText: 'Áp dụng',
      onConfirm: onClickApply,
      confirmButtonClassName:
        'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white min-w-[128px]',
    })
  }, [displayFormContent, onClickApply, initialFormValues, leftFooterContent])

  const clearFilter = useCallback(() => {
    setFilterParams({})
    onApplyFilter?.({})
  }, [onApplyFilter])

  // Calculate filter badge count
  const filterBadgeCount = useMemo(() => {
    let count = 0
    if (filterParams.created_at_from || filterParams.created_at_to) {
      count++
    }
    if (filterParams.is_active === 'true' || filterParams.is_active === 'false') {
      count++
    }
    return count
  }, [filterParams])

  return {
    openFilterModal,
    filterParams,
    clearFilter,
    filterBadgeCount,
  }
}
