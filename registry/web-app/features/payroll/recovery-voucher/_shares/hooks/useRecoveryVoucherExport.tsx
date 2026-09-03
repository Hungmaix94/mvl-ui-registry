import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import { useExportRecoveryVouchers } from '@/features/payroll/services/recovery-voucher-service'
import { format } from 'date-fns'
import type { RecoveryVoucherFilterForm } from '../components/RecoveryVoucherFilterForm.tsx'
import { RecoveryVoucherStatus, RecoveryVoucherType } from '@/constants/api-schema-aliases'
export function useRecoveryVoucherExport() {
  const exportMutation = useExportRecoveryVouchers()

  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport({
    exportFunction: async (params) => {
      const result = await exportMutation.mutateAsync(params)
      return result
    },
    defaultFilename: 'recovery-vouchers.xlsx',
  })

  const openExportDialog = useCallback(
    async (_searchQuery: string, filterParams: RecoveryVoucherFilterForm) => {
      const exportParams: {
        async?: boolean
        delivery?: 'link' | 'direct'
        fields?: string
        [key: string]: any
      } = {
        async: true,
        delivery: 'link',
      }

      if (filterParams?.month) {
        exportParams.month = format(filterParams.month, 'MM/yyyy')
      }

      if (filterParams?.branch_id) {
        exportParams.branch = filterParams.branch_id
      }

      if (filterParams?.block_id) {
        exportParams.block = filterParams.block_id
      }

      if (filterParams?.department_id) {
        exportParams.department = filterParams.department_id
      }

      const voucherTypes = filterParams?.voucher_types || []
      if (
        voucherTypes.length === 1 &&
        Object.values(RecoveryVoucherType).includes(voucherTypes[0])
      ) {
        exportParams.voucher_type = voucherTypes[0]
      }

      const statuses = filterParams?.statuses || []
      if (statuses.length > 0) {
        const validStatuses = statuses.filter((status) =>
          Object.values(RecoveryVoucherStatus).includes(status)
        )

        if (validStatuses.length === 1) {
          exportParams.status = validStatuses[0]
        } else if (validStatuses.length > 1) {
          exportParams.statuses = validStatuses
        }
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
