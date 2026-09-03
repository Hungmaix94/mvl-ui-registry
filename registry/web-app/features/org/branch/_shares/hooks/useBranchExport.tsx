import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import {
  getBranchService,
  type GetBranchesExportParams,
} from '@/features/org/services/branch-service'
import { ExportDelivery } from '@/constants/api-schema-aliases'

type BranchExportParams = NonNullable<GetBranchesExportParams> & Record<string, any>

const DEFAULT_FILENAME = 'branches.xlsx'

export function useBranchExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport<BranchExportParams>({
    exportFunction: (params) => getBranchService().exportBranches(params),
    defaultFilename: DEFAULT_FILENAME,
  })

  const openExportDialog = useCallback(
    async (params?: GetBranchesExportParams) => {
      const exportParams: BranchExportParams = {
        async: true,
        delivery: ExportDelivery.link,
        ...(params || {}),
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
