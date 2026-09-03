/**
 * Validation utilities for form validation
 *
 * This file contains reusable validation functions for various input types
 * including Vietnamese phone number validation with support for multiple numbers.
 */

import { z } from 'zod'

/**
 * Validates Vietnamese phone numbers
 * Supports both single and multiple phone numbers separated by "-"
 *
 * @param phone - Phone number string to validate
 * @returns true if valid, error message string if invalid
 *
 * Valid formats:
 * - Mobile: 03x, 05x, 07x, 08x, 09x (10 digits)
 * - Fixed: 02x (8-9 digits after 02, max 11 total)
 * - International: +84 format
 * - Multiple: separated by "-"
 *
 * Examples:
 * - "0987654321" ✅ Mobile
 * - "02838448444" ✅ Fixed (TPHCM)
 * - "024 786 8686" ✅ Fixed with spaces
 * - "0987654321-0909123456" ✅ Multiple
 * - "+84987654321" ✅ International
 */
export function validateVietnamesePhone(phone: string): boolean | string {
  if (!phone || phone.trim() === '') return true // Optional field

  // Trim the entire string first before splitting
  const trimmedPhone = phone.trim()

  // Split by "-" for multiple numbers
  const numbers = trimmedPhone.split('-').map((n) => n.trim().replace(/\s/g, ''))

  for (const num of numbers) {
    // Skip empty strings
    if (!num) continue

    // Mobile: 10 digits, starts with 03x, 05x, 07x, 08x, 09x
    const mobileRegex = /^(03|05|07|08|09)\d{8}$/

    // Fixed: starts with 02, 8-9 digits after 02 (max 11 total)
    const fixedRegex = /^02\d{8,9}$/

    // International format: +84...
    const intlMobileRegex = /^\+84(3|5|7|8|9)\d{8}$/
    const intlFixedRegex = /^\+842\d{8,9}$/

    if (
      !mobileRegex.test(num) &&
      !fixedRegex.test(num) &&
      !intlMobileRegex.test(num) &&
      !intlFixedRegex.test(num)
    ) {
      return 'Số điện thoại không hợp lệ'
    }
  }

  return true
}

export const looseOptional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value: unknown) =>
      value === undefined || value === null || (typeof value === 'string' && value === '')
        ? null
        : value,
    schema
  )

export const numberInput = (requiredMsg?: string) => {
  const numberSchema = z.number({
    ...(requiredMsg ? { required_error: requiredMsg } : {}),
    invalid_type_error: 'Must be a number',
  })

  return z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return undefined
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }, numberSchema) as z.ZodType<number | undefined>
}

/**
 * Gets plain text content from an HTML string
 * @param html - HTML string to extract text from
 * @returns Plain text content
 */
export const getTextContent = (html: string): string => {
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '') // Fallback for environments without DOM
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

/**
 * Zod refinement for validating HTML content length based on plain text
 * @param maxLength - Maximum allowed characters in plain text
 * @param message - Error message if validation fails
 */
export const htmlMaxLength = (maxLength: number, message: string) => {
  return z.string().refine(
    (val) => {
      if (!val) return true
      const textContent = getTextContent(val)
      return textContent.length <= maxLength
    },
    { message }
  )
}
