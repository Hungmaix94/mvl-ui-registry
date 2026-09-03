import { useEffect } from 'react'
import toastService from '@/services/toast-service.tsx'
import { isDevelopment } from '@/config/environment.ts'

const useCopyAuthToken = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const isCmdK = isMac && event.metaKey && event.key === '0'
      const isAltK = !isMac && event.altKey && event.key === '0'

      if (isCmdK || isAltK) {
        event.preventDefault()
        // Copy auth token to clipboard
        const authToken = localStorage.getItem('auth_token') || ''
        navigator.clipboard.writeText(authToken)
        console.log(authToken)
        toastService.success('Copied to clipboard')
      }
    }

    if (isDevelopment()) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return null
}

export default useCopyAuthToken
