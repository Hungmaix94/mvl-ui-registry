import React from 'react'
import { Link } from 'react-router-dom'

import { APP_PATH } from '@/routes'
import { useAuth, useAuthOperations } from '@/hooks/useAuth'
import { useNavigation } from '@/hooks/useRouting'

type MainLayoutProperties = {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProperties) {
  const { isAuthenticated, user } = useAuth()
  // const { isAdmin } = useRoleAccess()
  const { navigateToLogin } = useNavigation()
  const { logout } = useAuthOperations()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="bg-background min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Link to={APP_PATH.HOME} className="hover:text-primary text-xl font-bold">
              Mai Viet Land
            </Link>

            <div className="flex items-center space-x-4">
              {/* Public Navigation */}
              <Link to={APP_PATH.HOME} className="hover:text-primary">
                Home
              </Link>
              <Link to={APP_PATH.ABOUT} className="hover:text-primary">
                About
              </Link>
              <Link to={APP_PATH.CONTACT} className="hover:text-primary">
                Contact
              </Link>

              {/* Auth Navigation */}
              {isAuthenticated ? (
                <>
                  <Link to={APP_PATH.DASHBOARD} className="hover:text-primary">
                    Dashboard
                  </Link>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{user?.full_name}</span>
                    <button
                      onClick={handleLogout}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={navigateToLogin}
                  className="bg-primary hover:bg-primary/90 rounded-md px-4 py-2 text-white"
                >
                  Login
                </button>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">{children}</main>

      <footer className="bg-muted/50 border-t">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Mai Viet Land. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
