import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import {
  getPositionService,
  type GetPositionsExportParams,
} from '@/features/org/services/position-service'
import { ExportDelivery } from '@/constants/api-schema-aliases'

type PositionExportParams = NonNullable<GetPositionsExportParams> & Record<string, any>

const DEFAULT_FILENAME = 'positions.xlsx'

export function usePositionExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport<PositionExportParams>({
    exportFunction: (params) => getPositionService().exportPositions(params),
    defaultFilename: DEFAULT_FILENAME,
  })

  const openExportDialog = useCallback(
    async (params?: GetPositionsExportParams) => {
      const exportParams: PositionExportParams = {
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
