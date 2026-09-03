import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SidebarState = {
  openCollapsibles: string[]
  setOpenCollapsibles: (paths: string[]) => void
  toggleCollapsible: (path: string) => void
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  toggleSidebar: () => void
  openMobile: boolean
  setOpenMobile: (value: boolean | ((prev: boolean) => boolean)) => void
  toggleMobileSidebar: () => void
  username: string | null
  setUsername: (username: string | null) => void
  sidebarWidth: number
  setSidebarWidth: (width: number) => void
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      openCollapsibles: [],
      setOpenCollapsibles: (paths) => set({ openCollapsibles: paths }),
      toggleCollapsible: (path) =>
        set((state) => {
          const newPaths = new Set(state.openCollapsibles)
          if (newPaths.has(path)) {
            newPaths.delete(path)
          } else {
            newPaths.add(path)
          }
          return { openCollapsibles: Array.from(newPaths) }
        }),
      isOpen: true,
      setIsOpen: (isOpen) => set({ isOpen }),
      toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),
      openMobile: false,
      setOpenMobile: (value) =>
        set((state) => ({
          openMobile: typeof value === 'function' ? value(state.openMobile) : value,
        })),
      toggleMobileSidebar: () => set((state) => ({ openMobile: !state.openMobile })),
      username: null,
      setUsername: (username) => set({ username }),
      sidebarWidth: 256,
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
    }),
    {
      name: 'sidebar-storage',
    }
  )
)
