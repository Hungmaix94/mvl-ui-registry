import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useDeleteContractAppendix,
  type ContractAppendixList,
} from '@/features/contract/services/contract-appendix-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'

export function useContractAppendixDelete() {
  const { displayConfirm, setLoading } = useDialog()
  const deleteContractAppendixMutation = useDeleteContractAppendix()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (contractAppendix: ContractAppendixList) => {
      displayConfirm({
        title: 'Xoá phụ lục hợp đồng',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá{' '}
            <b className="typo-body-lg-regular text-content-dark-2">
              {contractAppendix.code || contractAppendix.contract_number || '-'}
            </b>{' '}
            không?
            <br />
            Thao tác này không thể hoàn tác.
          </div>
        ),
        confirmText: 'Xoá',
        cancelText: 'Huỷ',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        size: 'xl',
        onConfirm: async () => {
          try {
            setLoading(true)
            await deleteContractAppendixMutation.mutateAsync(contractAppendix.id)

            // Invalidate contract appendices list queries
            await invalidateQueries.invalidateByPrefix('hrm/contract-appendices')

            toastService.success('Xoá phụ lục hợp đồng thành công')
          } catch {
            // Error toast is handled by service layer
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayConfirm, deleteContractAppendixMutation, invalidateQueries, setLoading]
  )

  return {
    openDeleteDialog,
  }
}
