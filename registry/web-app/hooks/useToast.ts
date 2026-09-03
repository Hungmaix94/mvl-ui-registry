import { useCallback } from 'react'
import toastService from '@/services/toast-service'

export function useToast() {
  const success = useCallback((message: string) => {
    toastService.success(message)
  }, [])

  const error = useCallback((message: string) => {
    toastService.error(message)
  }, [])

  const warning = useCallback((message: string) => {
    toastService.warning(message)
  }, [])

  return {
    success,
    error,
    warning,
  }
}
