import { useCallback, useMemo, useRef, useState } from 'react'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import WorkScheduleTable from '@/features/attendance/work-schedule/WorkScheduleTable.tsx'
import WorkScheduleFilterForm, {
  type WorkScheduleFilterFormRef,
  type WorkScheduleFilterValues,
} from '@/features/attendance/work-schedule/WorkScheduleFilterForm.tsx'
import { type WorkSchedule, useWorkSchedules } from '@/services/common-service'
import type { SelectOption } from '@/components/ui/select/Select'

const DEFAULT_FILTERS: WorkScheduleFilterValues = { scope: null, branch: null }

export const WorkSchedulePage = () => {
  const { data, isLoading, error } = useWorkSchedules()
  const workSchedules = useMemo(() => (data as WorkSchedule[]) || [], [data])

  const [filters, setFilters] = useState<WorkScheduleFilterValues>(DEFAULT_FILTERS)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const formRef = useRef<WorkScheduleFilterFormRef>(null)

  // Branch options derived from the loaded data (client-side filtering)
  const branchOptions: SelectOption[] = useMemo(() => {
    const branchMap = new Map<number, string>()
    workSchedules.forEach((ws) => {
      if (ws.branch != null) {
        branchMap.set(ws.branch, ws.branch_name || `Chi nhánh #${ws.branch}`)
      }
    })
    return Array.from(branchMap, ([value, label]) => ({ value, label }))
  }, [workSchedules])

  const filteredWorkSchedules = useMemo(() => {
    return workSchedules.filter((ws) => {
      if (filters.scope === 'global' && ws.branch != null) return false
      if (filters.scope === 'branch' && ws.branch == null) return false
      if (filters.branch != null && ws.branch !== filters.branch) return false
      return true
    })
  }, [workSchedules, filters])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.scope) count++
    if (filters.branch != null) count++
    return count
  }, [filters])

  const handleApplyFilter = useCallback(() => {
    const values = formRef.current?.getValues()
    if (values) {
      setFilters({
        scope: values.scope,
        // A global scope ignores any selected branch
        branch: values.scope === 'global' ? null : values.branch,
      })
    }
    setIsFilterOpen(false)
  }, [])

  return (
    <>
      <PageTitle
        title="Lịch làm việc"
        handleFilter={() => setIsFilterOpen(true)}
        filterBadgeCount={activeFilterCount}
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'py-5'}>
        <WorkScheduleTable data={filteredWorkSchedules} isLoading={isLoading} error={error} />
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        title="Bộ lọc"
        content={
          <WorkScheduleFilterForm
            key={isFilterOpen ? 'open' : 'closed'}
            ref={formRef}
            initialValues={filters}
            branchOptions={branchOptions}
          />
        }
        onClearFilter={() => formRef.current?.clearForm()}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterOpen(false)}
      />
    </>
  )
}

export default WorkSchedulePage
