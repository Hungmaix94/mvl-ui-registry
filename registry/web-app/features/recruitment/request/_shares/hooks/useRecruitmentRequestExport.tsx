import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import {
  getRecruitmentRequestService,
  type GetRecruitmentRequestExportDocumentParams,
} from '@/features/recruitment/services/recruitment-request-service'

type ExportParams = NonNullable<GetRecruitmentRequestExportDocumentParams> & Record<string, any>

const DEFAULT_FILENAME = 'recruitment-request-document.pdf'

type UseRecruitmentRequestExportArgs = {
  requestId: number | null
  defaultFilename?: string
}

export function useRecruitmentRequestExport({
  requestId,
  defaultFilename = DEFAULT_FILENAME,
}: UseRecruitmentRequestExportArgs) {
  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport<ExportParams>({
    exportFunction: (params) => {
      if (!requestId) {
        throw new Error('Không tìm thấy yêu cầu tuyển dụng')
      }
      return getRecruitmentRequestService().exportRecruitmentRequestDocument(requestId, params)
    },
    defaultFilename,
  })

  const openExportDialog = useCallback(
    async (params?: GetRecruitmentRequestExportDocumentParams) => {
      if (!requestId) {
        throw new Error('Không tìm thấy yêu cầu tuyển dụng')
      }

      await baseOpenExportDialog({
        delivery: 'link',
        ...(params || {}),
      } as ExportParams)
    },
    [baseOpenExportDialog, requestId]
  )

  return {
    openExportDialog,
    isExporting,
  }
}
