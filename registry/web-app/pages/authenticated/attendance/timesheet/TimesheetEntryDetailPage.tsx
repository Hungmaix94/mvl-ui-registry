import { useMemo, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Flex, Separator } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { useTimesheetEntry } from '@/features/attendance/services/timesheet-service'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import {
  useProposals,
  type GetProposalsParams,
} from '@/features/decision-and-proposal/services/proposal-base-service'
import { useProposalsTimesheetEntryComplaint } from '@/features/decision-and-proposal/services/proposal-misc-service'
import TimesheetEntryEmployeeSection from '@/features/attendance/timesheet/view-details/TimesheetEntryEmployeeSection'
import TimesheetEntryInfoSection from '@/features/attendance/timesheet/view-details/TimesheetEntryInfoSection'
import TimesheetEntryProposalTable from '@/features/attendance/timesheet/view-details/TimesheetEntryProposalTable'
import TimesheetEntryComplaintTable from '@/features/attendance/timesheet/view-details/TimesheetEntryComplaintTable'
import TimesheetEntryCheckinTable from '@/features/attendance/timesheet/view-details/TimesheetEntryCheckinTable.tsx'
import { format, parseISO } from 'date-fns'
import { DATE_FORMAT, DATE_SERVER_FORMAT } from '@/constants/date-format'
import { PAGE_SIZE } from '@/constants/table.ts'
import { ProposalType } from '@/constants/api-schema-aliases'

const TimesheetEntryDetailPage = () => {
  const navigate = useNavigate()
  const ability = useAbility()
  const { entryId } = useParams<{ entryId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const timesheetEntryId = Number(entryId)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  const {
    data: timesheetEntry,
    isLoading: isEntryLoading,
    error: entryError,
  } = useTimesheetEntry(timesheetEntryId)

  // Only fetch related data when entry exists and is valid
  const shouldFetchRelations =
    Number.isFinite(timesheetEntryId) && !isEntryLoading && !entryError && !!timesheetEntry

  // Set date to URL search params if not present and timesheetEntry has date
  useEffect(() => {
    if (timesheetEntry?.date && !searchParams.get('date')) {
      const formattedDate = format(parseISO(timesheetEntry.date), DATE_SERVER_FORMAT)
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.set('date', formattedDate)
      setSearchParams(newSearchParams, { replace: true })
    }
  }, [timesheetEntry?.date, searchParams, setSearchParams])

  const proposalParams = useMemo((): GetProposalsParams => {
    if (shouldFetchRelations && timesheetEntry?.employee?.id && timesheetEntry?.date) {
      return {
        created_by: timesheetEntry.employee.id,
        timesheet_entry: timesheetEntryId,
        page_size: PAGE_SIZE,
        exclude_proposal_type: [ProposalType.timesheet_entry_complaint],
      }
    }
    return undefined
  }, [shouldFetchRelations, timesheetEntry])

  const { data: proposalResponse, isLoading: isProposalLoading } = useProposals(proposalParams, {
    enabled: shouldFetchRelations,
  })

  const complaintParams = useMemo(
    () =>
      shouldFetchRelations
        ? {
            timesheet_entry: timesheetEntryId,
            page_size: 5,
          }
        : undefined,
    [shouldFetchRelations, timesheetEntryId]
  )

  const { data: complaintResponse, isLoading: isComplaintLoading } =
    useProposalsTimesheetEntryComplaint(complaintParams, { enabled: shouldFetchRelations })

  const title = useMemo(() => {
    if (!timesheetEntry) {
      return 'Chi tiết ngày công'
    }
    const dateLabel = timesheetEntry.date ? format(parseISO(timesheetEntry.date), DATE_FORMAT) : '-'
    const employeeName = timesheetEntry.employee?.fullname || '-'
    return `Ngày công ${employeeName} - ${dateLabel}`
  }, [timesheetEntry])

  // Helper function to check if error is a 404/not_found error
  const isNotFoundError = (error: unknown): boolean => {
    if (!error) return false
    // Check for HTTP status 404
    const errorStatus = (error as { status?: number })?.status
    const errorResponse = (error as { response?: { status?: number } })?.response?.status
    if (errorStatus === 404 || errorResponse === 404) return true
    // Check for API error with code "not_found"
    const apiError = error as { errors?: Array<{ code?: string }> }
    if (apiError?.errors?.some((e) => e.code === 'not_found')) return true
    return false
  }

  // Check if entry is not found (404 error or no data after loading)
  const isNotFound = useMemo(() => {
    if (isEntryLoading) return false
    // Check for 404/not_found error from API
    if (entryError && isNotFoundError(entryError)) return true
    // No data after loading completed
    return !timesheetEntry
  }, [isEntryLoading, entryError, timesheetEntry])

  // Check for other errors (non-404)
  const isError = useMemo(() => {
    if (isEntryLoading || !entryError) return false
    // Return true for errors that are not 404/not_found
    return !isNotFoundError(entryError)
  }, [isEntryLoading, entryError])

  const hasPermission = true
  //   ability.can('retrieve', 'attendance_timesheet') || ability.can('manage', 'all')

  const handleShowHistory = useCallback(() => {
    if (timesheetEntryId) {
      navigate(APP_PATH.ATTENDANCE_TIMESHEET_HISTORY.replace(':id', String(timesheetEntryId)))
    }
  }, [navigate, timesheetEntryId])

  return (
    <>
      <PageTitle
        title={title}
        enableBackButton
        handleShowHistory={ability.can('histories', 'timesheet') ? handleShowHistory : undefined}
      />
      <Flex direction="column" gap="4" className="px-10 py-8">
        <DetailPageWrapper
          isLoading={isEntryLoading}
          isNotFound={isNotFound}
          isError={isError}
          hasPermission={hasPermission}
        >
          <Flex direction="column" gap="6">
            <div className="grid gap-5 md:grid-cols-2">
              <TimesheetEntryEmployeeSection employee={timesheetEntry?.employee} />
              <TimesheetEntryInfoSection entry={timesheetEntry} />
            </div>

            <Separator orientation={'horizontal'} className={'!w-full'} />

            <TimesheetEntryProposalTable
              proposals={proposalResponse?.results || undefined}
              isLoading={isProposalLoading}
            />

            <Separator orientation={'horizontal'} className={'!w-full'} />

            <TimesheetEntryComplaintTable
              complaints={complaintResponse?.results}
              isLoading={isComplaintLoading}
              employeeName={timesheetEntry?.employee?.fullname}
            />

            <Separator orientation={'horizontal'} className={'!w-full'} />

            <TimesheetEntryCheckinTable
              employeeId={timesheetEntry?.employee?.id}
              date={timesheetEntry?.date}
            />
          </Flex>
        </DetailPageWrapper>
      </Flex>
    </>
  )
}

export default TimesheetEntryDetailPage
