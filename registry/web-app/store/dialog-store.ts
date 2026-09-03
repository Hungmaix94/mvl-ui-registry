import { create } from 'zustand'

import type { DialogConfig, DialogVariant } from '@/types/dialog.types'

type DialogState = {
  // State
  isOpen: boolean
  variant: DialogVariant
  config: DialogConfig | null
  closeTimeoutId: ReturnType<typeof setTimeout> | null

  // Actions
  openDialog: (config: DialogConfig, variant?: DialogVariant) => void
  closeDialog: () => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  updateConfig: (patch: Partial<DialogConfig>) => void
}

export const useDialogStore = create<DialogState>()((set, get) => ({
  // Initial state
  isOpen: false,
  variant: 'custom',
  config: null,
  closeTimeoutId: null,

  // Actions
  openDialog: (config: DialogConfig, variant: DialogVariant = 'custom') =>
    set((state) => {
      if (state.closeTimeoutId) {
        clearTimeout(state.closeTimeoutId)
      }
      return {
        isOpen: true,
        variant,
        config,
        closeTimeoutId: null,
      }
    }),

  closeDialog: () => {
    const { config } = get()
    config?.onClose?.()
    set((state) => {
      if (state.closeTimeoutId) {
        clearTimeout(state.closeTimeoutId)
      }
      const timeoutId = setTimeout(() => {
        set({
          isOpen: false,
          config: null,
          closeTimeoutId: null,
          variant: 'custom',
        })
      }, 200)

      return {
        isOpen: false,
        closeTimeoutId: timeoutId,
      }
    })
  },

  setLoading: (isLoading: boolean) => {
    const { config } = get()
    if (config) {
      set({
        config: {
          ...config,
          loading: isLoading,
        },
      })
    }
  },

  setError: (error: string | null) => {
    const { config } = get()
    if (config) {
      set({
        config: {
          ...config,
          error,
        },
      })
    }
  },

  updateConfig: (patch: Partial<DialogConfig>) => {
    const { config } = get()
    if (config) {
      set({
        config: {
          ...config,
          ...patch,
        },
      })
    }
  },
}))
