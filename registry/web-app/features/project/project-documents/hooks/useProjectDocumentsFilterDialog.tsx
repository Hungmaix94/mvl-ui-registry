import { useCallback, useRef } from 'react'
import { Button } from '@/components/ui'
import { useDialog } from '@/hooks/useDialog'
import ProjectDocumentFilterForm, {
  type ProjectDocumentFilterFormRef,
} from '../components/form/ProjectDocumentFilterForm'
import { type ElibraryVisibility } from '@/constants/api-schema-aliases'

type UseProjectDocumentsFilterDialogParams = {
  visibilityFromUrl: ElibraryVisibility | null
  categoryFromUrl: number | null
  searchParams: URLSearchParams
  setSearchParams: (nextInit: URLSearchParams, navigateOpts?: { replace?: boolean }) => void
  setPage: (page: number | ((prev: number) => number)) => void
  setSearchInput: (value: string) => void
  clearSelection: () => void
  fixedVisibility?: ElibraryVisibility
  hideVisibilityFilter?: boolean
  visibilityConstantConfig?: {
    module: 'files' | 'elibrary'
    key: string
  }
}

export function useProjectDocumentsFilterDialog({
  visibilityFromUrl,
  categoryFromUrl,
  searchParams,
  setSearchParams,
  setPage,
  setSearchInput,
  clearSelection,
  fixedVisibility,
  hideVisibilityFilter = false,
  visibilityConstantConfig,
}: UseProjectDocumentsFilterDialogParams) {
  const { displayCustom, displayClose } = useDialog()
  const filterFormRef = useRef<ProjectDocumentFilterFormRef>(null)

  const handleClearFilter = useCallback(() => {
    setSearchInput('')
    setPage(1)
    clearSelection()
    const newParams = new URLSearchParams(searchParams)
    if (fixedVisibility) {
      newParams.set('visibility', fixedVisibility)
    } else {
      newParams.delete('visibility')
    }
    newParams.delete('category')
    setSearchParams(newParams, { replace: true })
  }, [clearSelection, fixedVisibility, setPage, setSearchInput, searchParams, setSearchParams])

  const handleClearFilterInDialog = useCallback(() => {
    filterFormRef.current?.reset()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const values = filterFormRef.current?.getValues()

    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', '1')
    if (values?.visibility) {
      newParams.set('visibility', values.visibility)
    } else {
      newParams.delete('visibility')
    }
    if (fixedVisibility) {
      newParams.set('visibility', fixedVisibility)
    }

    if (values?.category != null) {
      newParams.set('category', String(values.category))
    } else {
      newParams.delete('category')
    }

    setSearchParams(newParams, { replace: true })
    setPage(1)
  }, [fixedVisibility, searchParams, setSearchParams, setPage])

  const handleOpenFilterDialog = useCallback(() => {
    displayCustom({
      size: 'lg',
      title: 'Bộ lọc',
      content: (
        <ProjectDocumentFilterForm
          ref={filterFormRef}
          initialValues={{
            visibility: fixedVisibility ?? visibilityFromUrl ?? null,
            category: categoryFromUrl ?? null,
          }}
          hideVisibilityField={hideVisibilityFilter}
          visibilityConstantConfig={visibilityConstantConfig}
        />
      ),
      leftFooterContent: (
        <Button variant="text" onClick={handleClearFilterInDialog}>
          Xoá bộ lọc
        </Button>
      ),
      confirmText: 'Áp dụng',
      cancelText: 'Huỷ',
      onConfirm: handleApplyFilter,
      onCancel: displayClose,
      footerFlexJustify: 'end',
    })
  }, [
    displayCustom,
    displayClose,
    fixedVisibility,
    visibilityFromUrl,
    categoryFromUrl,
    handleApplyFilter,
    handleClearFilterInDialog,
    hideVisibilityFilter,
    visibilityConstantConfig,
  ])

  return {
    handleOpenFilterDialog,
    handleClearFilter,
  }
}
