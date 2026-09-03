import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { cn } from '@/utils'
import StaffFiltersForm, {
  StaffTurnoverFiltersFormRef,
  StaffTurnoverFiltersFormValues,
} from '@/features/report/staff/components/StaffFiltersForm.tsx'
import { useDialog } from '@/hooks/useDialog.ts'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { OrgFilter } from '@/components/commons/filters/type.ts'
import type { GetEmployeeResignedReasonSummaryReportParams } from '@/services'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { startOfMonth } from 'date-fns'
import { BlockType } from '@/constants/api-schema-aliases'

type ResignedReasonFilterParams = NonNullable<GetEmployeeResignedReasonSummaryReportParams>

const getDefaultDateParams = (): ResignedReasonFilterParams => {
  const today = new Date()
  return {
    from_date: formatDateToApi(startOfMonth(today)),
    to_date: formatDateToApi(today),
  }
}

type UseStaffResignedReasonFilterResult = {
  filterParams: ResignedReasonFilterParams
  openFilterModal: () => void
  resetFilters: () => void
  filterBadgeCount: number
  orgFilter: OrgFilter
  selectedBlockTypeLabels: string[]
  formInitialValues: StaffTurnoverFiltersFormValues
}

const buildInitialDateRange = (from?: string, to?: string) =>
  from || to
    ? {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      }
    : undefined

const buildFormInitialValues = ({
  params,
  orgFilter,
  blockTypes,
}: {
  params: ResignedReasonFilterParams
  orgFilter: OrgFilter
  blockTypes: string[]
}): StaffTurnoverFiltersFormValues => ({
  dateRange: buildInitialDateRange(params.from_date, params.to_date),
  branch: params.branch,
  block: params.block,
  department: params.department,
  branchName: orgFilter.branch?.name,
  blockName: orgFilter.block?.name,
  departmentName: orgFilter.department?.name,
  block_types: blockTypes,
})

const useStaffResignedReasonFilter = (): UseStaffResignedReasonFilterResult => {
  const formRef = useRef<StaffTurnoverFiltersFormRef>(null)
  const { displayFormContent, displayClose } = useDialog()
  const invalidateQueries = useInvalidateQueries()
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.BLOCK.TYPE],
  })

  const blockTypeOptions = useMemo(() => {
    return keysMapOptions.get(APP_CONSTANT_KEY.BLOCK.TYPE) || []
  }, [keysMapOptions])

  const [filterParams, setFilterParams] = useState<ResignedReasonFilterParams>(() =>
    getDefaultDateParams()
  )
  const [orgFilter, setOrgFilter] = useState<OrgFilter>({})
  const [selectedBlockTypes, setSelectedBlockTypes] = useState<string[]>([])
  const [formInitialValues, setFormInitialValues] = useState<StaffTurnoverFiltersFormValues>(() =>
    buildFormInitialValues({
      params: getDefaultDateParams(),
      orgFilter: {},
      blockTypes: [],
    })
  )

  const selectedBlockTypeLabels = useMemo(() => {
    if (!selectedBlockTypes.length || !blockTypeOptions.length) {
      return []
    }

    const optionMap = new Map(
      blockTypeOptions.map((option) => [String(option.value), option.label] as const)
    )

    return selectedBlockTypes
      .map((value) => optionMap.get(String(value)))
      .filter((label): label is string => Boolean(label))
  }, [blockTypeOptions, selectedBlockTypes])

  const resetFilters = useCallback(() => {
    setOrgFilter({})
    setSelectedBlockTypes([])
    const defaultParams = getDefaultDateParams()
    setFilterParams(defaultParams)
    setFormInitialValues(
      buildFormInitialValues({
        params: defaultParams,
        orgFilter: {},
        blockTypes: [],
      })
    )
  }, [])

  const clearFormValues = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleApplyFilters = useCallback(
    async (values?: StaffTurnoverFiltersFormValues) => {
      const formValues = values ?? formRef.current?.getValues?.()
      if (!formValues) {
        return
      }

      const from_date = formValues.dateRange?.from
        ? formatDateToApi(formValues.dateRange.from)
        : undefined
      const to_date = formValues.dateRange?.to
        ? formatDateToApi(formValues.dateRange.to)
        : undefined

      const branch = formValues.branch || undefined
      const block = formValues.block || undefined
      const department = formValues.department || undefined

      const blockTypes = formValues.block_types || []
      const block_type = blockTypes.length === 1 ? (blockTypes[0] as BlockType) : undefined

      const nextParams: ResignedReasonFilterParams = {
        from_date,
        to_date,
        branch,
        block,
        department,
        block_type,
      }

      setFilterParams(nextParams)

      const nextOrgFilter: OrgFilter = { ...orgFilter }

      if (branch && formValues.branchName) {
        nextOrgFilter.branch = { id: branch, name: formValues.branchName }
      } else if (!branch && nextOrgFilter.branch) {
        delete nextOrgFilter.branch
      }

      if (block && formValues.blockName) {
        nextOrgFilter.block = { id: block, name: formValues.blockName }
      } else if (!block && nextOrgFilter.block) {
        delete nextOrgFilter.block
      }

      if (department && formValues.departmentName) {
        nextOrgFilter.department = { id: department, name: formValues.departmentName }
      } else if (!department && nextOrgFilter.department) {
        delete nextOrgFilter.department
      }

      setOrgFilter(nextOrgFilter)
      setSelectedBlockTypes(blockTypes)
      setFormInitialValues(
        buildFormInitialValues({
          params: nextParams,
          orgFilter: nextOrgFilter,
          blockTypes,
        })
      )

      displayClose()
      await invalidateQueries.invalidateByPrefix('reports')
    },
    [displayClose, invalidateQueries, orgFilter]
  )

  useEffect(() => {
    setFormInitialValues(
      buildFormInitialValues({
        params: filterParams,
        orgFilter,
        blockTypes: selectedBlockTypes,
      })
    )
  }, [filterParams, orgFilter, selectedBlockTypes])

  const openFilterModal = useCallback(() => {
    displayFormContent({
      title: 'Bộ lọc',
      confirmText: 'Áp dụng',
      onConfirm: () => handleApplyFilters(),
      content: (
        <Flex direction="column" gap="5">
          <StaffFiltersForm
            ref={formRef}
            initialValues={formInitialValues}
            onApply={handleApplyFilters}
          />
        </Flex>
      ),
      leftFooterContent: (
        <Button
          variant="text"
          size="small"
          onClick={clearFormValues}
          className={cn('text-action-primary-red-default hover:text-action-primary-red-hover p-0')}
        >
          Xoá bộ lọc
        </Button>
      ),
      confirmButtonClassName:
        'bg-action-primary-red-default hover:bg-action-primary-red-hover text-content-light-1 min-w-[128px]',
    })
  }, [displayFormContent, formInitialValues, handleApplyFilters, clearFormValues])

  const filterBadgeCount = useMemo(() => {
    let count = 0
    if (filterParams.from_date || filterParams.to_date) {
      count += 1
    }
    if (filterParams.branch) {
      count += 1
    }
    if (filterParams.block) {
      count += 1
    }
    if (filterParams.department) {
      count += 1
    }
    if (selectedBlockTypes.length) {
      count += 1
    }
    return count
  }, [
    filterParams.block,
    filterParams.branch,
    filterParams.department,
    filterParams.from_date,
    filterParams.to_date,
    selectedBlockTypes.length,
  ])

  return {
    filterParams,
    openFilterModal,
    resetFilters,
    filterBadgeCount,
    orgFilter,
    selectedBlockTypeLabels,
    formInitialValues,
  }
}

export default useStaffResignedReasonFilter
