import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import {
  getEmployeeService,
  type GetLeaderEmployeesExportParams,
} from '@/features/employee/services/employee-service'
import { ExportDelivery } from '@/constants/api-schema-aliases'

type LeaderEmployeeExportParams = NonNullable<GetLeaderEmployeesExportParams> & Record<string, any>

const DEFAULT_FILENAME = 'leadership-employees.xlsx'

export function useLeaderEmployeeExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } =
    useExport<LeaderEmployeeExportParams>({
      exportFunction: (params) => getEmployeeService().exportLeaderEmployees(params),
      defaultFilename: DEFAULT_FILENAME,
    })

  const openExportDialog = useCallback(
    async (params?: GetLeaderEmployeesExportParams) => {
      const exportParams: LeaderEmployeeExportParams = {
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
