import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { Button } from '@/components/ui'
import { cn } from '@/utils'
import { useDialog } from '@/hooks/useDialog.ts'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { OrgFilter } from '@/components/commons/filters/type.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import type { GetEmployeeSeniorityReportParams } from '@/services'
import EmployeeSeniorityFilterForm, {
  type EmployeeSeniorityFilterFormRef,
  type EmployeeSeniorityFilterFormValues,
} from '@/features/report/staff/seniority/EmployeeSeniorityFilterForm.tsx'

type UseEmployeeSeniorityFilterResult = {
  filterParams: GetEmployeeSeniorityReportParams | undefined
  openFilterModal: () => void
  resetFilters: () => void
  filterBadgeCount: number
  orgFilter: OrgFilter
  selectedBlockTypeLabels: string[]
  formInitialValues: EmployeeSeniorityFilterFormValues
}

const buildFormInitialValues = ({
  params,
  orgFilter,
  blockTypes,
}: {
  params?: GetEmployeeSeniorityReportParams
  orgFilter: OrgFilter
  blockTypes: string[]
}): EmployeeSeniorityFilterFormValues => ({
  branch: params?.branch_id,
  block: params?.block_id,
  department: params?.department_id,
  branchName: orgFilter.branch?.name,
  blockName: orgFilter.block?.name,
  departmentName: orgFilter.department?.name,
  block_types: blockTypes,
})

const useEmployeeSeniorityFilter = (): UseEmployeeSeniorityFilterResult => {
  const formRef = useRef<EmployeeSeniorityFilterFormRef>(null)
  const { displayFormContent, displayClose } = useDialog()
  const invalidateQueries = useInvalidateQueries()

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.BLOCK.TYPE],
  })

  const blockTypeOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.BLOCK.TYPE) || [],
    [keysMapOptions]
  )

  const [filterParams, setFilterParams] = useState<GetEmployeeSeniorityReportParams | undefined>(
    undefined
  )

  const [orgFilter, setOrgFilter] = useState<OrgFilter>({})
  const [selectedBlockTypes, setSelectedBlockTypes] = useState<string[]>([])
  const [formInitialValues, setFormInitialValues] = useState<EmployeeSeniorityFilterFormValues>(
    () =>
      buildFormInitialValues({
        params: undefined,
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
    setFilterParams(undefined)
    setFormInitialValues(
      buildFormInitialValues({
        params: undefined,
        orgFilter: {},
        blockTypes: [],
      })
    )
  }, [])

  const clearFormValues = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleApplyFilters = useCallback(
    async (values?: EmployeeSeniorityFilterFormValues) => {
      const formValues = values ?? formRef.current?.getValues?.()
      if (!formValues) return

      const branch_id = formValues.branch || undefined
      const block_id = formValues.block || undefined
      const department_id = formValues.department || undefined

      const blockTypes = formValues.block_types || []
      const function_block = blockTypes.length === 1 ? blockTypes[0] : undefined

      const nextParams: GetEmployeeSeniorityReportParams = {
        branch_id,
        block_id,
        department_id,
        function_block,
      }

      setFilterParams(nextParams)

      const nextOrgFilter: OrgFilter = { ...orgFilter }

      if (branch_id && formValues.branchName) {
        nextOrgFilter.branch = { id: branch_id, name: formValues.branchName }
      } else if (!branch_id && nextOrgFilter.branch) {
        delete nextOrgFilter.branch
      }

      if (block_id && formValues.blockName) {
        nextOrgFilter.block = { id: block_id, name: formValues.blockName }
      } else if (!block_id && nextOrgFilter.block) {
        delete nextOrgFilter.block
      }

      if (department_id && formValues.departmentName) {
        nextOrgFilter.department = { id: department_id, name: formValues.departmentName }
      } else if (!department_id && nextOrgFilter.department) {
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

  const openFilterModal = useCallback(() => {
    displayFormContent({
      title: 'Bộ lọc',
      confirmText: 'Áp dụng',
      onConfirm: () => handleApplyFilters(),
      content: (
        <Flex direction="column" gap="5">
          <EmployeeSeniorityFilterForm
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
    if (filterParams?.branch_id) count += 1
    if (filterParams?.block_id) count += 1
    if (filterParams?.department_id) count += 1
    if (selectedBlockTypes.length) count += 1
    return count
  }, [
    filterParams?.branch_id,
    filterParams?.block_id,
    filterParams?.department_id,
    selectedBlockTypes.length,
  ])

  useEffect(() => {
    setFormInitialValues(
      buildFormInitialValues({
        params: filterParams,
        orgFilter,
        blockTypes: selectedBlockTypes,
      })
    )
  }, [filterParams, orgFilter, selectedBlockTypes])

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

export default useEmployeeSeniorityFilter
