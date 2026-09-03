import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

type ConstantsState = {
  // State
  constants: Record<string, any> | null
  isLoading: boolean
  error: string | null

  // Actions
  setConstants: (constants: Record<string, any>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearConstants: () => void
  getConstants: () => Record<string, any> | null
}

export const useConstantsStore = create<ConstantsState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        constants: null,
        isLoading: false,
        error: null,

        // Actions
        setConstants: (constants) => set({ constants, error: null }, false, 'setConstants'),

        setLoading: (isLoading) => set({ isLoading }, false, 'setLoading'),

        setError: (error) => set({ error }, false, 'setError'),

        clearConstants: () =>
          set(
            {
              constants: null,
              error: null,
            },
            false,
            'clearConstants'
          ),

        getConstants: () => get().constants,
      }),
      {
        name: 'constants-storage',
        partialize: (state) => ({
          constants: state.constants,
        }),
      }
    ),
    {
      name: 'constants-store',
    }
  )
)

// Selectors for better performance
export const useConstants = () =>
  useConstantsStore((state) => ({
    constants: state.constants,
    isLoading: state.isLoading,
    error: state.error,
  }))

export const useConstantsActions = () =>
  useConstantsStore((state) => ({
    setConstants: state.setConstants,
    setLoading: state.setLoading,
    setError: state.setError,
    clearConstants: state.clearConstants,
    getConstants: state.getConstants,
  }))

// Helper hook to get specific constant category
export const useConstantCategory = (category: string) =>
  useConstantsStore((state) => state.constants?.[category] || null)
