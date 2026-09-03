import { useCallback } from 'react'

import { useExport } from '@/hooks/useExport.tsx'
import {
  getEmployeeCertificateService,
  type GetEmployeeCertificatesExportParams,
} from '@/features/employee/services/employee-certificate-service'
import { ExportDelivery } from '@/constants/api-schema-aliases'

type EmployeeCertificateExportParams = NonNullable<GetEmployeeCertificatesExportParams> &
  Record<string, any>

const DEFAULT_FILENAME = 'employee-certificates.xlsx'

export function useEmployeeCertificateExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } =
    useExport<EmployeeCertificateExportParams>({
      exportFunction: (params) =>
        getEmployeeCertificateService().exportEmployeeCertificates(params),
      defaultFilename: DEFAULT_FILENAME,
    })

  const openExportDialog = useCallback(
    async (params?: GetEmployeeCertificatesExportParams) => {
      const exportParams: EmployeeCertificateExportParams = {
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

export default useEmployeeCertificateExport
