import { forwardRef, useState } from 'react'
import { useAuth } from '@/store/auth-store'
import { getNavigationConfig } from '@/constants/navigation'
import { IconBell } from '@/assets/icons'
import Logogram from './Logogram'
import Avatar from '../ui/avatar/Avatar.tsx'
import { cn } from '@/utils'
import headerBackground from '@/assets/images/header background.png'
import NotificationItems from '@/components/navigation/notification/NotificationItems.tsx'
import { SidebarHamburgerTrigger } from '@/components/ui/sidebar/sidebar.tsx'

const Header = forwardRef<HTMLDivElement>((_, ref) => {
  const { user } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Get navigation config based on user role
  const navigationConfig = getNavigationConfig('admin')

  // Logogram component
  const LOGO = (
    <div className="relative h-10 w-12 shrink-0" data-name="Logogram">
      <div className="absolute inset-0" data-name="Isolation_Mode">
        <Logogram />
      </div>
    </div>
  )

  // Main title
  const MAIN_TITLE = (
    <div className="font-montserrat text-content-light-1 relative shrink-0 text-lg font-extrabold">
      <p className="leading-tight text-nowrap whitespace-pre">MAI VIET LAND NEXTGEN ERP</p>
    </div>
  )

  return (
    <div
      ref={ref}
      className={cn(
        'sticky top-0 z-50 print:hidden',
        'flex flex-col content-stretch items-start gap-2',
        'px-3 py-3 sm:px-6',
        'w-full',
        'box-border'
      )}
      style={{
        background: `linear-gradient(270deg, #7D0000 -19.17%, #E62A2A 61.57%), url('${headerBackground}') lightgray 50% / cover no-repeat`,
        backgroundBlendMode: 'multiply, normal',
      }}
      data-name="Header"
      data-node-id="43286:16569"
    >
      <div
        className="relative flex w-full shrink-0 content-stretch items-center justify-between"
        data-node-id="43286:16640"
      >
        <div
          className="relative flex shrink-0 content-stretch items-end gap-2 sm:gap-3"
          data-node-id="43286:16065"
        >
          {LOGO}
          <div
            className="relative hidden shrink-0 flex-col content-stretch items-start justify-center leading-none text-nowrap md:flex"
            data-node-id="43286:16067"
          >
            {MAIN_TITLE}
            <div
              className="text-red-10 typo-body-sm-medium relative shrink-0 sm:text-sm"
              data-node-id="43286:16082"
            >
              <p className="leading-tight text-nowrap whitespace-pre">
                {navigationConfig.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Desktop view */}
        <div className="hidden flex-1 md:block">
          <NotificationItems />
        </div>

        {/* Mobile view */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center gap-2"
          >
            <div className="relative size-8 shrink-0 rounded-full" data-name="Avatar">
              <Avatar size={32} />
            </div>
            <div
              className="bg-action-primary-red-default relative box-border flex size-8 shrink-0 content-stretch items-center justify-center gap-2 rounded p-2"
              data-name="Buttons"
            >
              <div className="relative size-4 shrink-0" data-name="Icon/Bell">
                <IconBell size={16} color="white" />
              </div>
            </div>
          </button>
          <SidebarHamburgerTrigger />
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {isMobileMenuOpen && (
        <div className="bg-background-1 border-border-1 absolute top-full right-0 left-0 border-t shadow-lg sm:hidden">
          <div className="px-4 py-2">
            <div className="flex items-center gap-3 py-2">
              <Avatar size={40} />
              <div>
                <p className="text-content-dark-1 font-medium">{user?.full_name}</p>
                <p className="text-content-dark-3 text-sm">{user?.email}</p>
              </div>
            </div>
            <div className="border-border-1 mt-2 border-t pt-2">
              <p className="text-content-dark-3 text-sm">{navigationConfig.subtitle}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

Header.displayName = 'Header'

export default Header
