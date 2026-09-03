import { useCallback, useRef, useState, useMemo } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { Button } from '@/components/ui'
import { cn } from '@/utils'
import ContractFilterForm, {
  type ContractFilterFormRef,
} from '../components/ContractFilterForm.tsx'
import { parseISO } from 'date-fns'
import { type GetContractsParams } from '@/features/contract/services/contract-service'

export const useContractFilter = () => {
  const refForm = useRef<ContractFilterFormRef>(null)
  const [filterParams, setFilterParams] = useState<Partial<GetContractsParams>>({})

  const { displayFormContent, displayClose } = useDialog()

  // Convert API params back to form values for initial values
  const initialFormValues = useMemo(() => {
    const formValues: Record<string, any> = {}

    if (!filterParams) return formValues

    // Convert effective_date_from and effective_date_to back to effective_date_range
    if (filterParams.effective_date_from || filterParams.effective_date_to) {
      formValues.effective_date_range = {
        from: filterParams.effective_date_from
          ? parseISO(filterParams.effective_date_from)
          : undefined,
        to: filterParams.effective_date_to ? parseISO(filterParams.effective_date_to) : undefined,
      }
    }

    // Convert contract_type back to contract_type_id
    if (filterParams.contract_type) {
      formValues.contract_type_id = filterParams.contract_type
    }

    // Convert branch, block, department back to branch_id, block_id, department_id
    if (filterParams.branch) {
      formValues.branch_id = filterParams.branch
    }
    if (filterParams.block) {
      formValues.block_id = filterParams.block
    }
    if (filterParams.department) {
      formValues.department_id = filterParams.department
    }
    if (filterParams.employee) {
      formValues.employee_id = filterParams.employee
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
    const formData = refForm.current?.getValues?.()

    // Debug log
    console.log('[useContractFilter] onClickApply - formData:', formData)
    console.log('[useContractFilter] onClickApply - current filterParams:', filterParams)

    if (formData) {
      // Filter out empty values and convert to GetContractsParams
      const filteredParams: Partial<GetContractsParams> = {}

      // Handle date range - only add if from or to exists
      if (formData.effective_date_range?.from) {
        filteredParams.effective_date_from = formData.effective_date_range.from
          .toISOString()
          .split('T')[0]
      }
      if (formData.effective_date_range?.to) {
        filteredParams.effective_date_to = formData.effective_date_range.to
          .toISOString()
          .split('T')[0]
      }

      // Handle contract_type_id - only add if value exists and is valid
      if (
        formData.contract_type_id !== undefined &&
        formData.contract_type_id !== null &&
        formData.contract_type_id > 0
      ) {
        filteredParams.contract_type = formData.contract_type_id
      }

      // Handle branch_id - only add if value exists and is valid
      // If user cleared it, formData.branch_id will be undefined/null/0, so we don't add it
      if (
        formData.branch_id !== undefined &&
        formData.branch_id !== null &&
        formData.branch_id > 0
      ) {
        filteredParams.branch = formData.branch_id
      }

      // Handle block_id - only add if value exists and is valid
      if (formData.block_id !== undefined && formData.block_id !== null && formData.block_id > 0) {
        filteredParams.block = formData.block_id
      }

      // Handle department_id - only add if value exists and is valid
      if (
        formData.department_id !== undefined &&
        formData.department_id !== null &&
        formData.department_id > 0
      ) {
        filteredParams.department = formData.department_id
      }

      // Handle employee_id - only add if value exists and is valid
      if (
        formData.employee_id !== undefined &&
        formData.employee_id !== null &&
        formData.employee_id > 0
      ) {
        filteredParams.employee = formData.employee_id
      }

      // Handle status - only add if array has items
      if (formData.status && formData.status.length > 0) {
        // Store all statuses as array to preserve multiple selections
        // API may accept array format even if schema shows single value
        // We'll store as array to preserve all selections
        if (formData.status.length === 1) {
          filteredParams.status = formData.status[0] as any
        } else {
          // For multiple statuses, store as array
          // The API query builder should handle this
          ;(filteredParams as any).status = formData.status
        }
      }

      // Debug log
      console.log('[useContractFilter] onClickApply - new filteredParams:', filteredParams)

      setFilterParams(filteredParams)
      displayClose()
    }
  }, [displayClose, filterParams])

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
      content: <ContractFilterForm ref={refForm} initialValues={initialFormValues} />,
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

    // Check effective_date_from
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

    // Check contract_type
    if (filterParams.contract_type !== undefined && filterParams.contract_type !== null) {
      count++
    }

    // Check branch
    if (filterParams.branch !== undefined && filterParams.branch !== null) {
      count++
    }

    // Check block
    if (filterParams.block !== undefined && filterParams.block !== null) {
      count++
    }

    // Check department
    if (filterParams.department !== undefined && filterParams.department !== null) {
      count++
    }

    // Check employee
    if (filterParams.employee !== undefined && filterParams.employee !== null) {
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
