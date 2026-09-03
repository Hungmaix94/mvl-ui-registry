import { useCallback, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui'
import { cn } from '@/utils'
import { useDialog } from '@/hooks/useDialog'
import { useInvalidateQueries } from '@/hooks/useApiQuery'
import { formatDateToApi } from '@/utils/date-utils'
import { DATE_FORMAT } from '@/constants/date-format'
import type { GetAttendanceByProjectOrganizationReportParams } from '@/features/report/services/attendance-report-service'
import AttendanceProjectOrgFilterForm, {
  AttendanceProjectOrgFilterFormRef,
  type AttendanceProjectOrgFilterFormValues,
} from '@/features/report/attendance/project-org/components/AttendanceProjectOrgFilterForm'

type AttendanceProjectFilters = NonNullable<GetAttendanceByProjectOrganizationReportParams>

export type UseAttendanceProjectOrgFilterResult = {
  filters: AttendanceProjectFilters
  openFilterModal: () => void
  filterBadgeCount: number
  projectName?: string
}

const todayApi = formatDateToApi(new Date())

const useAttendanceProjectOrgFilter = (): UseAttendanceProjectOrgFilterResult => {
  const formRef = useRef<AttendanceProjectOrgFilterFormRef>(null)
  const { displayFormContent, displayClose, updateConfig } = useDialog()
  const invalidateQueries = useInvalidateQueries()

  const [filters, setFilters] = useState<AttendanceProjectFilters>({
    attendance_date: todayApi,
  })
  const [projectName, setProjectName] = useState<string>()

  const filterBadgeCount = useMemo(() => {
    let count = 0
    if (filters.attendance_date) count += 1
    if (filters.project) count += 1
    return count
  }, [filters.attendance_date, filters.project])

  const handleApply = useCallback(async () => {
    const formValues = formRef.current?.getValues()

    if (!formValues?.attendanceDate) {
      return
    }

    const attendance_date = formatDateToApi(formValues.attendanceDate)
    if (!attendance_date) {
      return
    }

    const nextFilters: AttendanceProjectFilters = {
      attendance_date,
    }

    if (formValues.project) {
      nextFilters.project = formValues.project
    }

    setFilters(nextFilters)
    setProjectName(formValues.projectName)

    displayClose()
    await invalidateQueries.invalidateByPrefix('hrm')
  }, [displayClose, invalidateQueries])

  const handleClear = useCallback(() => {
    formRef.current?.clearForm('')
    updateConfig({ disableConfirm: true })
  }, [updateConfig])

  const openFilterModal = useCallback(() => {
    const attendanceDateString = filters.attendance_date
      ? format(new Date(filters.attendance_date), DATE_FORMAT)
      : ''

    const initialFormValues: AttendanceProjectOrgFilterFormValues = {
      attendanceDate: attendanceDateString,
      project: filters.project,
      projectName: projectName,
    }

    const hasInitialDate = Boolean(attendanceDateString)

    displayFormContent({
      title: 'Bộ lọc',
      confirmText: 'Áp dụng',
      onConfirm: handleApply,
      content: (
        <AttendanceProjectOrgFilterForm
          ref={formRef}
          initialValues={initialFormValues}
          onValidationChange={(isValid) => updateConfig({ disableConfirm: !isValid })}
        />
      ),
      leftFooterContent: (
        <Button
          variant="text"
          size="small"
          onClick={handleClear}
          className={cn('text-action-primary-red-default hover:text-action-primary-red-hover p-0')}
        >
          Xoá bộ lọc
        </Button>
      ),
      disableConfirm: !hasInitialDate,
      confirmButtonClassName:
        'bg-action-primary-red-default hover:bg-action-primary-red-hover text-content-light-1 min-w-[128px]',
    })
  }, [
    displayFormContent,
    handleApply,
    handleClear,
    filters.attendance_date,
    filters.project,
    projectName,
    updateConfig,
  ])

  return {
    filters,
    openFilterModal,
    filterBadgeCount,
    projectName,
  }
}

export default useAttendanceProjectOrgFilter
