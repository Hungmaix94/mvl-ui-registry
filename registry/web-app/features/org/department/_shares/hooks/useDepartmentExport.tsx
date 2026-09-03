import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import {
  getDepartmentService,
  type GetDepartmentsExportParams,
} from '@/features/org/services/department-service'
import { ExportDelivery } from '@/constants/api-schema-aliases'

type DepartmentExportParams = NonNullable<GetDepartmentsExportParams> & Record<string, any>

const DEFAULT_FILENAME = 'departments.xlsx'

export function useDepartmentExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport<DepartmentExportParams>(
    {
      exportFunction: (params) => getDepartmentService().exportDepartments(params),
      defaultFilename: DEFAULT_FILENAME,
    }
  )

  const openExportDialog = useCallback(
    async (params?: GetDepartmentsExportParams) => {
      const exportParams: DepartmentExportParams = {
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
