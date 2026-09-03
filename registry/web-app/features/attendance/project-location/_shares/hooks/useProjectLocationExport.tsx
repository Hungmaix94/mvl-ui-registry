import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import { getExportService } from '@/services/export-service.ts'
import { type GetAttendanceGeolocationsExportParams } from '@/features/attendance/services/attendance-geolocation-service'

const DEFAULT_FILENAME = 'project_locations.xlsx'
export function useProjectLocationExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport<
    NonNullable<GetAttendanceGeolocationsExportParams>
  >({
    exportFunction: (params) => getExportService().getHrmAttendanceGeolocationsExport(params),
    defaultFilename: DEFAULT_FILENAME,
  })

  const openExportDialog = useCallback(async () => {
    const exportParams: GetAttendanceGeolocationsExportParams = {
      async: true,
      // delivery: 'link', // Uncomment if backend supports delivery param for project locations
    }
    await baseOpenExportDialog(exportParams)
  }, [baseOpenExportDialog])

  return {
    openExportDialog,
    isExporting,
  }
}
