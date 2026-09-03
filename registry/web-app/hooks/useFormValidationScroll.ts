import { useEffect } from 'react'
import { FieldErrors } from 'react-hook-form'

export function useFormValidationScroll(errors: FieldErrors, submitCount: number) {
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      // Wait for rendering to finish before scrolling
      const timeoutId = setTimeout(() => {
        const errorElement = document.querySelector(
          '[data-invalid="true"], [aria-invalid="true"], .text-data-red-default'
        )
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [errors, submitCount])
}
