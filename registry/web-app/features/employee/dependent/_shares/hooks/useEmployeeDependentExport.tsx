import { useCallback } from 'react'

import { useExport } from '@/hooks/useExport.tsx'
import {
  getEmployeeDependentService,
  type GetEmployeeDependentsExportParams,
} from '@/features/employee/services/employee-dependent-service'
import { ExportDelivery } from '@/constants/api-schema-aliases'

type EmployeeDependentExportParams = NonNullable<GetEmployeeDependentsExportParams> &
  Record<string, any>

const DEFAULT_FILENAME = 'employee-dependents.xlsx'

export function useEmployeeDependentExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } =
    useExport<EmployeeDependentExportParams>({
      exportFunction: (params) => getEmployeeDependentService().exportEmployeeDependents(params),
      defaultFilename: DEFAULT_FILENAME,
    })

  const openExportDialog = useCallback(
    async (params?: GetEmployeeDependentsExportParams) => {
      const exportParams: EmployeeDependentExportParams = {
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

export default useEmployeeDependentExport
