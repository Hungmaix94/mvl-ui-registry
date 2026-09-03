import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import { getExportService } from '@/services/export-service.ts'

export type MonthlySummaryExportParams = Record<string, any>

export function useMonthlySummaryExport() {
  const { openExportDialog: triggerExport, isExporting } = useExport<MonthlySummaryExportParams>({
    exportFunction: async (params) => {
      return getExportService().getExportStatus(params.task_id || '')
    },
    defaultFilename: 'bang-chia-hoa-hong-theo-thang.xlsx',
  })

  const openExportDialog = useCallback(
    async (queryParams: Record<string, any>) => {
      const exportParams: MonthlySummaryExportParams = {
        async: true,
        delivery: 'link',
        ...queryParams,
      }
      await triggerExport(exportParams)
    },
    [triggerExport]
  )

  return { openExportDialog, isExporting }
}
