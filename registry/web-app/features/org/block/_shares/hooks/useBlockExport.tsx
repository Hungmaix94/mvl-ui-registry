import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import { getBlockService, type GetBlocksExportParams } from '@/features/org/services/block-service'
import { ExportDelivery } from '@/constants/api-schema-aliases'

type BlockExportParams = NonNullable<GetBlocksExportParams> & Record<string, any>

const DEFAULT_FILENAME = 'blocks.xlsx'

export function useBlockExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport<BlockExportParams>({
    exportFunction: (params) => getBlockService().exportBlocks(params),
    defaultFilename: DEFAULT_FILENAME,
  })

  const openExportDialog = useCallback(
    async (params?: GetBlocksExportParams) => {
      const exportParams: BlockExportParams = {
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
