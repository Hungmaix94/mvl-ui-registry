import React, { Suspense, lazy } from 'react'
import { FullScreenLoading } from '@/components/Loading.tsx'
import UnauthorizedPage from '@/pages/errors/UnauthorizedPage'
const NotFoundPage = lazy(() => import('@/pages/errors/NotFoundPage'))
import TableError from '../ui/table/TableError'

interface DetailStatusWrapperProps {
  isLoading: boolean
  isError?: boolean
  isNotFound?: boolean
  hasPermission: boolean
  children: React.ReactNode
  loadingComponent?: React.ReactNode
  unauthorizedComponent?: React.ReactNode
  notFoundComponent?: React.ReactNode
}

export const DetailPageWrapper: React.FC<DetailStatusWrapperProps> = ({
  isLoading,
  isNotFound,
  isError,
  hasPermission,
  children,
  loadingComponent,
  unauthorizedComponent,
  notFoundComponent,
}) => {
  if (isLoading) {
    return loadingComponent || <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
  }

  if (isNotFound) {
    return (
      notFoundComponent || (
        <Suspense fallback={null}>
          <NotFoundPage />
        </Suspense>
      )
    )
  }

  if (isError) {
    return <TableError />
  }

  if (!hasPermission) {
    return unauthorizedComponent || <UnauthorizedPage />
  }

  return <>{children}</>
}
