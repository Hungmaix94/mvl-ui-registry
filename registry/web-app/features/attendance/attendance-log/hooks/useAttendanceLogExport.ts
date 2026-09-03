import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport'
import {
  getAttendanceRecordService,
  type GetAttendanceRecordsExportParams,
} from '@/features/attendance/services/attendance-record-service'

type AttendanceRecordsExportParams = NonNullable<GetAttendanceRecordsExportParams> &
  Record<string, any>

const DEFAULT_FILENAME = 'attendance-records.xlsx'

export function useAttendanceLogExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } =
    useExport<AttendanceRecordsExportParams>({
      exportFunction: (params) => getAttendanceRecordService().exportAttendanceRecords(params),
      defaultFilename: DEFAULT_FILENAME,
    })

  const openExportDialog = useCallback(
    async (params?: Record<string, unknown> | GetAttendanceRecordsExportParams) => {
      const exportParams: AttendanceRecordsExportParams = {
        async: true,
        delivery: 'link' as NonNullable<GetAttendanceRecordsExportParams>['delivery'],
        ...((params as GetAttendanceRecordsExportParams) || {}),
      }

      await baseOpenExportDialog(exportParams)
    },
    [baseOpenExportDialog]
  )

  return {
    openExportDialog,
    isExporting,
  }
}
