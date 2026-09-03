import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import {
  getEmployeeBankAccountService,
  type GetEmployeeBankAccountsExportParams,
} from '@/features/employee/services/employee-bank-account-service'
import { ExportDelivery } from '@/constants/api-schema-aliases'

type EmployeeBankAccountExportParams = NonNullable<GetEmployeeBankAccountsExportParams> &
  Record<string, any>

const DEFAULT_FILENAME = 'employee-bank-accounts.xlsx'

export function useEmployeeBankAccountExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } =
    useExport<EmployeeBankAccountExportParams>({
      exportFunction: (params) =>
        getEmployeeBankAccountService().exportEmployeeBankAccounts(params),
      defaultFilename: DEFAULT_FILENAME,
    })

  const openExportDialog = useCallback(
    async (params?: GetEmployeeBankAccountsExportParams) => {
      const exportParams: EmployeeBankAccountExportParams = {
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
