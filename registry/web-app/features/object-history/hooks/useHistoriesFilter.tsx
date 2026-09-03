import { Button } from '@/components/ui'
import { useCallback, useRef, useState } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { cn } from '@/utils'
import HistoriesFilterForm, { HistoriesFilterFormRef } from './useHistoryFilterForm.tsx'

export const useHistoriesFilter = () => {
  const refForm = useRef<HistoriesFilterFormRef & { getValues?: () => any }>(null)
  const [filterParams, setFilterParams] = useState<Record<string, any>>({})

  const { displayFormContent, displayClose } = useDialog()

  const onClickClearFilter = useCallback(() => {
    refForm.current?.clearForm()
  }, [])

  const onClickApply = useCallback(() => {
    const formData = refForm.current?.getValues?.()
    if (formData) {
      // Filter out empty values
      const filteredParams = Object.fromEntries(
        Object.entries(formData).filter(([_, value]) => {
          if (value === undefined || value === null) return false
          if (typeof value === 'string' && value === '') return false
          if (Array.isArray(value) && value.length === 0) return false
          return true
        })
      )
      setFilterParams(filteredParams)
      displayClose()
    }
  }, [displayClose])

  const leftFooterContent = (
    <>
      <Button variant={'text'} size={'small'} onClick={onClickClearFilter} className={cn('p-0')}>
        Xoá bộ lọc
      </Button>
    </>
  )

  const openDialog = useCallback(() => {
    displayFormContent({
      title: 'Bộ lọc lịch sử',
      content: <HistoriesFilterForm ref={refForm} initialValues={filterParams} />,
      leftFooterContent,
      confirmText: 'Áp dụng',
      onConfirm: onClickApply,
      confirmButtonClassName: 'min-w-[128px]',
    })
  }, [displayFormContent, onClickApply, filterParams])

  const clearFilter = useCallback(() => {
    setFilterParams({})
  }, [])

  return {
    openDialog,
    filterParams,
    clearFilter,
  }
}
