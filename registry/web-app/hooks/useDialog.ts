import { useDialogStore } from '@/store/dialog-store'
import type { DialogConfig } from '@/types/dialog.types'

export function useDialog() {
  const openDialog = useDialogStore((state) => state.openDialog)
  const closeDialog = useDialogStore((state) => state.closeDialog)
  const setLoading = useDialogStore((state) => state.setLoading)
  const setError = useDialogStore((state) => state.setError)
  const updateConfig = useDialogStore((state) => state.updateConfig)

  return {
    alert: (config: Omit<DialogConfig, 'variant'>) => openDialog({ ...config }, 'alert'),

    displayConfirm: (config: Omit<DialogConfig, 'variant'>) => openDialog({ ...config }, 'confirm'),

    displayCustom: (config: Omit<DialogConfig, 'variant'>) => openDialog({ ...config }, 'custom'),

    displayFormContent: (config: Omit<DialogConfig, 'variant'>) =>
      openDialog(
        {
          size: 'lg',
          scrollable: true,
          destroyOnClose: true,
          ...config,
        },
        'form'
      ),

    displayFilter: (config: Omit<DialogConfig, 'variant'>) =>
      openDialog(
        {
          size: 'lg',
          scrollable: true,
          destroyOnClose: true,
          ...config,
        },
        'filter'
      ),

    displayClose: closeDialog,

    setLoading,
    setError,
    updateConfig,
  }
}
