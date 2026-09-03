import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import {
  getExportService,
  type GetHrmEmployeeRelationshipsExportParams,
} from '@/services/export-service.ts'
import { ExportDelivery } from '@/constants/api-schema-aliases'

export function useEmployeeRelationshipExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport<
    NonNullable<GetHrmEmployeeRelationshipsExportParams>
  >({
    exportFunction: (params) => getExportService().getHrmEmployeeRelationshipsExport(params),
    defaultFilename: 'employee-relationships.xlsx',
  })

  const openExportDialog = useCallback(
    async (searchQuery: string) => {
      const exportParams: GetHrmEmployeeRelationshipsExportParams = {
        async: true,
        delivery: ExportDelivery.link,
      }

      // Map search query if exists
      if (searchQuery && searchQuery.trim() !== '') {
        exportParams.search = searchQuery.trim()
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
