import type { ApiResponse } from './base-service'

/**
 * Type-safe response handler for API responses
 * Handles the standard API response format: { success: boolean, data?: T, error?: ... }
 */
export function handleApiResponse<T>(response: any): ApiResponse<T> {
  if (response.error) {
    throw new Error(response.error.message || 'Request failed')
  }

  if (!response.success) {
    throw new Error('Request failed')
  }

  if (response.data === undefined) {
    throw new Error('No data received')
  }

  return {
    data: response.data as T,
    success: true,
  }
}

/**
 * Type guard to check if response has the expected structure
 */
export function isValidApiResponse(
  response: any
): response is { success: boolean; data?: any; error?: any } {
  return typeof response === 'object' && response !== null && typeof response.success === 'boolean'
}

/**
 * Extract data from API response with proper type checking
 */
export function extractApiData<T>(response: any): T {
  // Handle both success and error cases
  let payload: any
  if (response?.data) {
    // Success case: response.data contains the API response
    payload = response.data
  } else if (response?.error) {
    // Error case: response.error contains the API response
    payload = response.error
  } else {
    throw new Error('Invalid API response format')
  }

  if (!isValidApiResponse(payload)) {
    throw new Error('Invalid API response format')
  }

  if (payload.error) {
    // Preserve server error details for caller
    const err = new Error(payload.error?.message || 'Request failed') as any
    err.server = payload.error
    err.response = { data: { error: payload.error } } // For backward compatibility
    throw err
  }

  if (payload.success !== true) {
    const err = new Error('Request failed') as any
    err.server = payload.error || { message: 'Request failed' }
    err.response = { data: { error: payload.error } } // For backward compatibility
    throw err
  }

  if (payload.data === undefined) {
    throw new Error('No data received')
  }

  return payload.data as T
}
