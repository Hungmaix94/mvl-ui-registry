import { useCallback, useEffect } from 'react'
import { FieldErrors } from 'react-hook-form'

interface UseScrollToErrorOptions {
  /**
   * Auto-scroll when errors change. Default: true
   */
  autoScroll?: boolean
  /**
   * Delay before scrolling (ms). Default: 100
   */
  scrollDelay?: number
  /**
   * Delay before focusing the field after scroll (ms). Default: 300
   */
  focusDelay?: number
}

/**
 * Hook to automatically scroll to the first error field in a form
 * @param errors - Form errors object from react-hook-form
 * @param options - Configuration options
 * @returns Manual scrollToFirstError function
 */
export const useScrollToError = <TFieldValues extends Record<string, any>>(
  errors: FieldErrors<TFieldValues>,
  options: UseScrollToErrorOptions = {}
) => {
  const { autoScroll = true, scrollDelay = 100, focusDelay = 300 } = options

  const scrollToFirstError = useCallback(() => {
    const firstErrorField = Object.keys(errors)[0]
    if (!firstErrorField) return

    setTimeout(() => {
      // Try multiple selectors to find the field
      const selectors = [
        `[data-field-name="${firstErrorField}"]`, // FormController container
        `[name="${firstErrorField}"]`, // Standard input fields
        `[data-field="${firstErrorField}"]`, // Custom data attribute
        `[id*="${firstErrorField}"]`, // ID containing field name
      ]

      let fieldElement: Element | null = null
      for (const selector of selectors) {
        fieldElement = document.querySelector(selector)
        if (fieldElement) break
      }

      if (fieldElement) {
        fieldElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        })

        // Focus the field after scroll completes
        setTimeout(() => {
          // Find focusable element within the field container
          const focusableSelectors = [
            'input:not([disabled])',
            'textarea:not([disabled])',
            'select:not([disabled])',
            'button:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
          ]

          let focusableElement: HTMLElement | null = null

          // If it's a container with data-field-name, find focusable element inside
          if (fieldElement.hasAttribute('data-field-name')) {
            focusableElement = fieldElement.querySelector(
              focusableSelectors.join(', ')
            ) as HTMLElement
          } else if (fieldElement instanceof HTMLElement) {
            focusableElement = fieldElement
          }

          if (focusableElement) {
            // Click buttons, focus other elements
            if (focusableElement.tagName === 'BUTTON') {
              focusableElement.click()
            } else {
              focusableElement.focus()
            }
          }
        }, focusDelay)
      }
    }, scrollDelay)
  }, [errors, scrollDelay, focusDelay])

  // Auto-scroll when errors change
  useEffect(() => {
    if (autoScroll && Object.keys(errors).length > 0) {
      scrollToFirstError()
    }
  }, [autoScroll, errors, scrollToFirstError])

  return scrollToFirstError
}
