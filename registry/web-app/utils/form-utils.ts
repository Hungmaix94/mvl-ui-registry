import { FieldErrors, FieldValues } from 'react-hook-form'

/**
 * Form utility functions for enhanced user experience
 *
 * This file contains reusable form utilities that can be used across
 * different forms in the application.
 */

/**
 * Scrolls to the first field with validation error and focuses it
 *
 * @param errors - Field errors object from react-hook-form
 *
 * This function:
 * 1. Finds the first field with an error
 * 2. Scrolls smoothly to that field
 * 3. Focuses the field after scrolling
 *
 * Used for improving UX when form validation fails
 */
export function scrollToFirstError<T extends FieldValues>(errors: FieldErrors<T>): void {
  const firstErrorField = Object.keys(errors)[0]
  if (firstErrorField) {
    // Find element by name attribute or id
    const element = (document.querySelector(`[name="${firstErrorField}"]`) ||
      document.getElementById(firstErrorField)) as HTMLElement

    if (element) {
      // Smooth scroll to element
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      })

      // Focus the element after scrolling (if focusable)
      setTimeout(() => {
        if (typeof element.focus === 'function') {
          element.focus()
        }
      }, 300)
    }
  }
}
