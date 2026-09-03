import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useDeleteContractType } from '@/features/contract/services/contract-type-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import type { components } from '@/api/schema.ts'

type ContractTypeListItem = components['schemas']['ContractTypeList']

export const useContractTypeDelete = (onSuccessfullyDelete?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const deleteContractTypeMutation = useDeleteContractType()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (contractType: ContractTypeListItem) => {
      displayConfirm({
        title: 'Xoá loại hợp đồng',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá{' '}
            <b className="typo-body-lg-regular text-content-dark-2">
              {contractType.name || contractType.code}
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
            await deleteContractTypeMutation.mutateAsync(contractType.id)

            // Invalidate all contract types queries to refresh the list
            await invalidateQueries.invalidateByPrefix('hrm')

            toastService.success('Xoá loại hợp đồng thành công')

            if (typeof onSuccessfullyDelete === 'function' && onSuccessfullyDelete) {
              onSuccessfullyDelete()
            }
          } catch {
            // Error toast is handled by service layer
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [
      displayConfirm,
      deleteContractTypeMutation,
      invalidateQueries,
      onSuccessfullyDelete,
      setLoading,
    ]
  )

  return { openDeleteDialog }
}
