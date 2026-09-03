import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import {
  type GetAttendanceWifiDevicesExportParams,
  getAttendanceWifiService,
} from '@/features/attendance/services/attendance-wifi-service'

const DEFAULT_FILENAME = 'wifi-attendance-devices.xlsx'

export default function useWifiAttendanceDeviceExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport<
    NonNullable<GetAttendanceWifiDevicesExportParams>
  >({
    exportFunction: (params) =>
      getAttendanceWifiService().exportAttendanceWifiDevices(params as any),
    defaultFilename: DEFAULT_FILENAME,
  })

  const openExportDialog = useCallback(async () => {
    const exportParams: NonNullable<GetAttendanceWifiDevicesExportParams> = {
      async: true,
    }
    await baseOpenExportDialog(exportParams)
  }, [baseOpenExportDialog])

  return {
    openExportDialog,
    isExporting,
  }
}
