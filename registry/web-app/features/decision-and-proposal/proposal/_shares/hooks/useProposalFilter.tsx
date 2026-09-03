import { Button } from '@/components/ui'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { cn } from '@/utils'
import ProposalsFilterForm, {
  type ProposalsFilterFormRef,
} from '@/features/decision-and-proposal/proposal/_shares/components/ProposalsFilterForm.tsx'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { parseISO } from 'date-fns'
import { type GetProposalsUnpaidLeaveParams } from '@/features/decision-and-proposal/services/proposal-leave-service'

type ProposalFilterParams = Partial<GetProposalsUnpaidLeaveParams> & {
  date_range?: { from?: Date; to?: Date }
  status?: string[]
  verifier_status?: string[] // UI field
  verifiers__status?: any // API field
  verifiers__status__in?: string | string[] // API field - can be string or string[]
  proposal_type?: string[]
  branch_id?: number
  block_id?: number
  department_id?: number
  position_id?: number
  employee_id?: number
}

export const useProposalFilter = (
  onApplyFilter?: (filters: Record<string, any>) => void,
  options?: { showProposalType?: boolean }
) => {
  const refForm = useRef<ProposalsFilterFormRef>(null)
  const [filterParams, setFilterParams] = useState<ProposalFilterParams>({})
  const showProposalType = options?.showProposalType ?? false

  const { displayFormContent, displayClose } = useDialog()

  // Convert API params back to form values for initial values
  const initialFormValues = useMemo(() => {
    const formValues: Record<string, any> = {}

    if (!filterParams) return formValues

    // Convert proposal_date__gte and proposal_date__lte back to date_range
    if (filterParams.proposal_date__gte || filterParams.proposal_date__lte) {
      formValues.date_range = {
        from: filterParams.proposal_date__gte
          ? parseISO(filterParams.proposal_date__gte)
          : undefined,
        to: filterParams.proposal_date__lte ? parseISO(filterParams.proposal_date__lte) : undefined,
      }
    } else if (filterParams.date_range) {
      // Use date_range if it exists (UI field)
      formValues.date_range = filterParams.date_range
    }

    // Convert branch, block, department, position, employee back to IDs
    if (filterParams.branch_id) {
      formValues.branch_id = filterParams.branch_id
    }
    if (filterParams.block_id) {
      formValues.block_id = filterParams.block_id
    }
    if (filterParams.department_id) {
      formValues.department_id = filterParams.department_id
    }
    if (filterParams.position_id) {
      formValues.position_id = filterParams.position_id
    }
    if (filterParams.employee_id) {
      formValues.employee_id = filterParams.employee_id
    }

    // Convert status back to array
    if (filterParams.status !== undefined && filterParams.status !== null) {
      if (Array.isArray(filterParams.status)) {
        formValues.status = filterParams.status
      } else {
        formValues.status = [filterParams.status]
      }
    }

    // Convert proposal_type back to array
    if (filterParams.proposal_type !== undefined && filterParams.proposal_type !== null) {
      if (Array.isArray(filterParams.proposal_type)) {
        formValues.proposal_type = filterParams.proposal_type
      } else {
        formValues.proposal_type = [filterParams.proposal_type]
      }
    }

    // Convert verifier_status back to array from either verifier_status or verifiers__status
    if (filterParams.verifier_status !== undefined && filterParams.verifier_status !== null) {
      if (Array.isArray(filterParams.verifier_status)) {
        formValues.verifier_status = filterParams.verifier_status
      } else {
        formValues.verifier_status = [filterParams.verifier_status]
      }
    } else if (
      filterParams.verifiers__status !== undefined &&
      filterParams.verifiers__status !== null
    ) {
      // If verifiers__status exists (from API), convert it to verifier_status for UI
      if (Array.isArray(filterParams.verifiers__status)) {
        formValues.verifier_status = filterParams.verifiers__status
      } else {
        formValues.verifier_status = [filterParams.verifiers__status]
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
      // Build filter params - only add fields that have valid values
      const filteredParams: Record<string, unknown> = {}

      // Handle date_range - only add if from or to exists
      if (formData.date_range?.from) {
        filteredParams.proposal_date__gte = formatDateToApi(formData.date_range.from)
        filteredParams.date_range = formData.date_range
      }
      if (formData.date_range?.to) {
        filteredParams.proposal_date__lte = formatDateToApi(formData.date_range.to)
        if (!filteredParams.date_range) {
          filteredParams.date_range = formData.date_range
        }
      }

      // Handle branch_id - only add if value exists and is valid
      if (
        formData.branch_id !== undefined &&
        formData.branch_id !== null &&
        formData.branch_id > 0
      ) {
        filteredParams.branch_id = formData.branch_id
      }

      // Handle block_id - only add if value exists and is valid
      if (formData.block_id !== undefined && formData.block_id !== null && formData.block_id > 0) {
        filteredParams.block_id = formData.block_id
      }

      // Handle department_id - only add if value exists and is valid
      if (
        formData.department_id !== undefined &&
        formData.department_id !== null &&
        formData.department_id > 0
      ) {
        filteredParams.department_id = formData.department_id
      }

      // Handle position_id - only add if value exists and is valid
      if (
        formData.position_id !== undefined &&
        formData.position_id !== null &&
        formData.position_id > 0
      ) {
        filteredParams.position_id = formData.position_id
      }

      // Handle employee_id - only add if value exists and is valid
      if (
        formData.employee_id !== undefined &&
        formData.employee_id !== null &&
        formData.employee_id > 0
      ) {
        filteredParams.employee_id = formData.employee_id
      }

      // Handle status - only add if array has items
      if (formData.status && formData.status.length > 0) {
        filteredParams.status = formData.status
        // Keep proposal_status for backward compatibility; consumers can decide
        filteredParams.proposal_status =
          formData.status.length === 1 ? formData.status[0] : formData.status
      }

      // Handle proposal_type - only add if array has items
      if (formData.proposal_type && formData.proposal_type.length > 0) {
        filteredParams.proposal_type = formData.proposal_type
      }

      // Handle verifier_status - convert to API field verifiers__status / verifiers__status__in
      if (formData.verifier_status && formData.verifier_status.length > 0) {
        filteredParams.verifier_status = formData.verifier_status // Keep for UI state
        filteredParams.verifiers__status =
          formData.verifier_status.length === 1 ? formData.verifier_status[0] : undefined
        filteredParams.verifiers__status__in =
          formData.verifier_status.length > 1 ? formData.verifier_status : undefined
      }

      setFilterParams(filteredParams)
      onApplyFilter?.(filteredParams)
      displayClose()
    }
  }, [displayClose, onApplyFilter])

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
      content: (
        <ProposalsFilterForm
          ref={refForm}
          initialValues={initialFormValues}
          showProposalType={showProposalType}
        />
      ),
      leftFooterContent,
      confirmText: 'Áp dụng',
      onConfirm: onClickApply,
      confirmButtonClassName: 'min-w-[128px]',
    })
  }, [displayFormContent, onClickApply, initialFormValues, leftFooterContent, showProposalType])

  const clearFilter = useCallback(() => {
    setFilterParams({})
  }, [])

  // Calculate active filter count by checking each property
  const filterBadgeCount = useMemo(() => {
    if (!filterParams) return 0

    let count = 0

    // Check date_range
    if (
      (filterParams.proposal_date__gte !== undefined &&
        filterParams.proposal_date__gte !== null &&
        filterParams.proposal_date__gte !== '') ||
      (filterParams.proposal_date__lte !== undefined &&
        filterParams.proposal_date__lte !== null &&
        filterParams.proposal_date__lte !== '')
    ) {
      count++
    }

    // Check organization structure (count as 1 if any is selected)
    if (
      filterParams.branch_id !== undefined ||
      filterParams.block_id !== undefined ||
      filterParams.department_id !== undefined ||
      filterParams.position_id !== undefined ||
      filterParams.employee_id !== undefined
    ) {
      count++
    }

    // Check status
    if (
      filterParams.status !== undefined &&
      filterParams.status !== null &&
      filterParams.status.length > 0
    ) {
      count++
    }

    // Check proposal_type
    if (
      filterParams.proposal_type !== undefined &&
      filterParams.proposal_type !== null &&
      filterParams.proposal_type.length > 0
    ) {
      count++
    }

    // Check verifier_status
    if (
      filterParams.verifier_status !== undefined &&
      filterParams.verifier_status !== null &&
      filterParams.verifier_status.length > 0
    ) {
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
