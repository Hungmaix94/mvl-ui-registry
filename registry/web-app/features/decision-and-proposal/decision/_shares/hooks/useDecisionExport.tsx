import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import {
  getDecisionService,
  type GetDecisionsExportParams,
} from '@/features/decision-and-proposal/services/decision-service'
import { ExportDelivery } from '@/constants/api-schema-aliases'

export function useDecisionExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport<
    NonNullable<GetDecisionsExportParams>
  >({
    exportFunction: (params) => getDecisionService().exportDecisions(params),
    defaultFilename: 'decisions.xlsx',
  })

  const openExportDialog = useCallback(
    async (searchQuery: string, filterParams: Record<string, any>) => {
      const exportParams: GetDecisionsExportParams = {
        async: true,
        delivery: ExportDelivery.link,
      }

      // Use search parameter to match list API behavior
      if (searchQuery && searchQuery.trim() !== '') {
        exportParams.search = searchQuery.trim()
      }

      // Map effective date filters (filterParams contains effective_date_from and effective_date_to from API format)
      if (filterParams?.effective_date_from) {
        exportParams.effective_date_from = filterParams.effective_date_from
      }
      if (filterParams?.effective_date_to) {
        exportParams.effective_date_to = filterParams.effective_date_to
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
