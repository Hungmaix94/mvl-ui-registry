import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import {
  getExportService,
  type GetHrmRecruitmentExpenseExportParams,
} from '@/services/export-service.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { ExportDelivery } from '@/constants/api-schema-aliases'

type RecruitmentExpenseFilterParams = {
  dateRange?: {
    from?: Date
    to?: Date
  } | null
  recruitmentSource?: string
  recruitmentChannel?: string
  branch?: number
  paymentStatuses?: string[]
}

export function useRecruitmentExpenseExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport<
    NonNullable<GetHrmRecruitmentExpenseExportParams>
  >({
    exportFunction: (params) => getExportService().getHrmRecruitmentExpenseExport(params),
    defaultFilename: 'recruitment-expenses.xlsx',
  })

  const openExportDialog = useCallback(
    async (_searchQuery: string, filterParams: RecruitmentExpenseFilterParams) => {
      const exportParams: GetHrmRecruitmentExpenseExportParams = {
        async: true,
        delivery: ExportDelivery.link,
      }

      // Map date range filter
      if (filterParams?.dateRange) {
        if (filterParams.dateRange.from) {
          exportParams.date__gte = formatDateToApi(filterParams.dateRange.from)
        }
        if (filterParams.dateRange.to) {
          exportParams.date__lte = formatDateToApi(filterParams.dateRange.to)
        }
      }

      // Map recruitment source filter
      if (filterParams?.recruitmentSource) {
        exportParams.recruitment_source = Number(filterParams.recruitmentSource)
      }

      // Map recruitment channel filter
      if (filterParams?.recruitmentChannel) {
        exportParams.recruitment_channel = Number(filterParams.recruitmentChannel)
      }

      if (filterParams?.branch) {
        exportParams.branch = Number(filterParams.branch)
      }

      if (filterParams?.paymentStatuses?.length) {
        exportParams.payment_statuses = filterParams.paymentStatuses as any
      }

      // Note: Export API doesn't support search query parameter
      // Search is typically handled by backend using other filter fields

      await baseOpenExportDialog(exportParams)
    },
    [baseOpenExportDialog]
  )

  return {
    openExportDialog,
    isExporting,
  }
}
