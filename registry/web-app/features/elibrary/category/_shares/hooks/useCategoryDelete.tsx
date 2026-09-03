import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useDeleteElibraryCategory, LibraryCategoryRead } from '@/services/elibrary-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import { QUERY_KEYS } from '@/constants'

export const useCategoryDelete = (onSuccessDelete?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const deleteMutation = useDeleteElibraryCategory()
  const invalidateQueries = useInvalidateQueries()

  const refreshList = useCallback(() => {
    invalidateQueries.invalidateByKey(QUERY_KEYS.ELIBRARY.CATEGORIES.LIST({}))
  }, [invalidateQueries])

  const openDeleteDialog = useCallback(
    (category: LibraryCategoryRead) => {
      displayConfirm({
        title: 'Xoá danh mục',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá danh mục{' '}
            <b className="typo-body-lg-regular text-content-dark-2">{category.name}</b> không?
            <br />
            Thao tác này không thể hoàn tác.
          </div>
        ),
        confirmText: 'Xoá',
        cancelText: 'Huỷ',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        size: 'md',
        onConfirm: async () => {
          try {
            setLoading(true)
            await deleteMutation.mutateAsync(category.id)
            refreshList()
            if (onSuccessDelete) {
              onSuccessDelete()
            }
            toastService.success('Xoá danh mục thành công')
          } catch {
            // Error handling is likely done by the mutation or interceptor
            toastService.error('Có lỗi xảy ra khi xoá danh mục')
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayConfirm, deleteMutation, refreshList, setLoading, onSuccessDelete]
  )

  return { openDeleteDialog, refreshList }
}
