import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import {
  getAttendanceExemptionService,
  type GetAttendanceExemptionsExportParams,
  type GetAttendanceExemptionsParams,
} from '@/features/attendance/services/attendance-exemption-service'

export const useAttendanceExemptionExport = () => {
  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport<
    NonNullable<GetAttendanceExemptionsExportParams>
  >({
    exportFunction: (params) => getAttendanceExemptionService().exportAttendanceExemptions(params),
    defaultFilename: 'attendance-exemptions.xlsx',
  })

  const openExportDialog = useCallback(
    async (searchQuery?: string, filterParams?: GetAttendanceExemptionsParams) => {
      const exportParams: GetAttendanceExemptionsExportParams = {
        async: true,
        ...(searchQuery && searchQuery.trim() !== '' ? { search: searchQuery.trim() } : {}),
        ...(filterParams?.branch ? { branch: filterParams.branch } : {}),
        ...(filterParams?.block ? { block: filterParams.block } : {}),
        ...(filterParams?.department ? { department: filterParams.department } : {}),
        ...(filterParams?.position ? { position: filterParams.position } : {}),
        ...(filterParams?.effective_date_from
          ? { effective_date_from: filterParams.effective_date_from }
          : {}),
        ...(filterParams?.effective_date_to
          ? { effective_date_to: filterParams.effective_date_to }
          : {}),
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
