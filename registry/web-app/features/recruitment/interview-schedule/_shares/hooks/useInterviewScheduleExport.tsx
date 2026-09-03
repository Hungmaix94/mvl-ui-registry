import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import {
  getInterviewService,
  type GetInterviewScheduleExportParams,
} from '@/features/recruitment/services/interview-service'
import { ExportDelivery } from '@/constants/api-schema-aliases'

type InterviewScheduleExportParams = NonNullable<GetInterviewScheduleExportParams> &
  Record<string, any>

const DEFAULT_FILENAME = 'interview-schedules.xlsx'

export function useInterviewScheduleExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } =
    useExport<InterviewScheduleExportParams>({
      exportFunction: (params) => getInterviewService().exportInterviewSchedules(params),
      defaultFilename: DEFAULT_FILENAME,
    })

  const openExportDialog = useCallback(
    async (params?: GetInterviewScheduleExportParams) => {
      const exportParams: InterviewScheduleExportParams = {
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
