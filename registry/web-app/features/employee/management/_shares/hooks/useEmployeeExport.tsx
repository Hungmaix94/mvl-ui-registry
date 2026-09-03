import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import {
  getEmployeeService,
  type GetEmployeesExportParams,
} from '@/features/employee/services/employee-service'
import { ExportDelivery } from '@/constants/api-schema-aliases'

type EmployeeExportParams = NonNullable<GetEmployeesExportParams> & Record<string, any>

const DEFAULT_FILENAME = 'employees.xlsx'

export function useEmployeeExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport<EmployeeExportParams>({
    exportFunction: (params) => getEmployeeService().exportEmployees(params),
    defaultFilename: DEFAULT_FILENAME,
  })

  const openExportDialog = useCallback(
    async (params?: GetEmployeesExportParams) => {
      const exportParams: EmployeeExportParams = {
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
