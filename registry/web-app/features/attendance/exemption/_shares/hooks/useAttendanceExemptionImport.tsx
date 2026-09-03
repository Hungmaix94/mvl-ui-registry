import { useCallback } from 'react'

import { useInvalidateQueries } from '@/hooks/useApiQuery'
import { useEmployeeImportProgressDialog } from '@/features/employee/management/_shares/hooks/useEmployeeImportProgressDialog.tsx'
import { useEmployeeImportResultDialog } from '@/features/employee/management/_shares/hooks/useEmployeeImportResultDialog.tsx'
import { useAttendanceExemptionImportUploadDialog } from './useAttendanceExemptionImportUploadDialog.tsx'

function useAttendanceExemptionImport() {
  const { invalidateByPrefix } = useInvalidateQueries()
  const { openUploadDialog } = useAttendanceExemptionImportUploadDialog()
  const { openProgressDialog } = useEmployeeImportProgressDialog()
  const { openResultDialog } = useEmployeeImportResultDialog()

  const openImportDialog = useCallback(
    async (initialMonth?: Date) => {
      try {
        const jobId = await openUploadDialog(initialMonth)
        const finalJob = await openProgressDialog(jobId)
        await openResultDialog(finalJob, { csvFormat: 'attendance_exemption' })
        invalidateByPrefix('hrm/attendance-exemptions')
      } catch (error) {
        if (error instanceof Error && error.message.endsWith('_cancelled')) {
          return
        }

        console.error('Attendance exemption import flow encountered an error:', error)
      }
    },
    [invalidateByPrefix, openProgressDialog, openResultDialog, openUploadDialog]
  )

  return { openImportDialog }
}

export default useAttendanceExemptionImport
