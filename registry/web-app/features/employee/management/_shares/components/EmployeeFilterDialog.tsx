/**
 * @deprecated This component is no longer used. Use AppDialog with variant="filter" instead.
 * See EmployeeManagementPage.tsx for the new implementation.
 * This file is kept for reference and will be removed in a future cleanup PR.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx'
import { cn } from '@/lib/utils.ts'
import { useCallback, useRef } from 'react'
import EmployeeFilterForm, {
  EmployeeFilterFormData,
  EmployeeFilterFormRef,
} from '@/features/employee/management/_shares/components/EmployeeFilterForm.tsx'
import { DialogFooter } from '@/components/ui/dialog.tsx'
import { Button } from '@/components/ui'

/**
 * @deprecated Use AppDialog with variant="filter" instead
 */
const EmployeeFilterDialog = ({
  isOpen,
  setIsOpen,
  filters,
  onApply,
}: {
  isOpen: boolean
  setIsOpen: (v: boolean) => void
  filters: EmployeeFilterFormData
  onApply?: (v: EmployeeFilterFormData) => void
}) => {
  const formRef = useRef<EmployeeFilterFormRef>(null)

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open)
    },
    [setIsOpen]
  )

  const closeDialog = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  const handleEscapeKeyDown = useCallback(() => {
    closeDialog()
  }, [closeDialog])

  const handleInteractOutside = useCallback(() => {
    closeDialog()
  }, [closeDialog])

  const handleClear = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleApply = useCallback(() => {
    const values = formRef.current?.getValues()
    if (values && onApply) {
      onApply(values)
    }
    closeDialog()
  }, [onApply, closeDialog])

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            'DialogContent',
            'z-50',
            'flex flex-col',
            'w-full max-w-xl min-w-[732px]',
            'bg-content-light-1 border-border-1 border shadow-lg sm:rounded-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-in-95'
          )}
          onEscapeKeyDown={handleEscapeKeyDown}
          onInteractOutside={handleInteractOutside}
          aria-describedby={'employ filter'}
        >
          <div className={cn('flex-1', 'flex flex-col', 'min-h-0')}>
            {/* Header */}
            <DialogHeader
              className={cn(
                'flex !flex-row justify-between',
                'border-border-1',
                'border-b-[1px]',
                'flex-shrink-0',
                'px-6 pt-4 pb-[16px]'
              )}
            >
              <DialogTitle className={cn('typo-h6 text-content-dark-1')}>Bộ lọc</DialogTitle>
            </DialogHeader>

            {/* Scrollable Content */}
            <div className="p-6">
              <EmployeeFilterForm ref={formRef} initialValues={filters} />
            </div>

            {/* Footer */}
            <DialogFooter
              className={cn(
                'justify-between',
                'border-border-1 border-t-[1px]',
                'px-6 pt-4 pb-[20px]',
                'flex-shrink-0'
              )}
            >
              <Button
                variant={'text'}
                size={'small'}
                onClick={handleClear}
                className={cn(
                  'text-action-primary-red-default hover:text-action-primary-red-hover',
                  'p-0'
                )}
              >
                Xoá bộ lọc
              </Button>

              <Button
                onClick={handleApply}
                variant="primary"
                size={'small'}
                className={cn(
                  'w-[130px]',
                  'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white'
                )}
              >
                Áp dụng
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default EmployeeFilterDialog
