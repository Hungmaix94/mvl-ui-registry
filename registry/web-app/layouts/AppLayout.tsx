import { Header } from '@/components/navigation'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar/sidebar.tsx'
import AppSidebar from '@/components/ui/sidebar/AppSidebar.tsx'
import { Outlet } from 'react-router-dom'
import { useConstantsActions } from '@/store'
import { useConstants } from '@/services'
import { useEffect } from 'react'
import { cn } from '@/utils'

import { useSidebarStore } from '@/store/sidebar-store'
import MenuSearchDialog from '@/components/menu-search/MenuSearchDialog.tsx'
import useCopyAuthToken from '@/hooks/useCopyAuthToken.tsx'
import useListUrlMemory from '@/hooks/useListUrlMemory.ts'

const AppLayout = () => {
  const { data } = useConstants()
  const { setConstants } = useConstantsActions()
  const { isOpen, setIsOpen } = useSidebarStore()

  useCopyAuthToken()
  useListUrlMemory()

  useEffect(() => {
    if (!data) return

    setConstants(data)
  }, [data])

  return (
    <>
      <div className={cn('bg-background-1', 'min-h-screen [--header-height:calc(--spacing(16))]')}>
        <Header />

        <SidebarProvider open={isOpen} onOpenChange={setIsOpen}>
          <AppSidebar />

          {/* Main content area */}
          <SidebarInset className="relative flex flex-col">
            <Outlet />
          </SidebarInset>

          <MenuSearchDialog />
        </SidebarProvider>
      </div>
    </>
  )
}

export default AppLayout
