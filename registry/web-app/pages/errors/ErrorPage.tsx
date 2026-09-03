import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

import { APP_PATH } from '@/routes'

export function ErrorPage() {
  const error = useRouteError()

  let errorMessage: string
  let errorStatus: number | undefined

  if (isRouteErrorResponse(error)) {
    errorMessage = error.data?.message || error.statusText
    errorStatus = error.status
  } else if (error instanceof Error) {
    errorMessage = error.message
  } else if (typeof error === 'string') {
    errorMessage = error
  } else {
    errorMessage = 'Unknown error'
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          {errorStatus && <h1 className="text-9xl font-bold text-gray-300">{errorStatus}</h1>}
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            {errorStatus ? 'Page Not Found' : 'Something went wrong'}
          </h2>
          <p className="mt-2 text-gray-600">{errorMessage}</p>
        </div>

        <div className="space-y-4">
          <Link
            to={APP_PATH.HOME}
            className="bg-primary hover:bg-primary/90 inline-block rounded-md px-6 py-3 font-medium text-white transition-colors"
          >
            Go Home
          </Link>

          <div>
            <button
              onClick={() => window.location.reload()}
              className="text-primary hover:text-primary/80 font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
