import createClient from 'openapi-fetch'
import type { paths } from '@/api/schema.ts'

/**
 * Create an openapi-fetch client with the given base URL
 */
export function createApiClient(baseUrl: string) {
  return createClient<paths>({
    baseUrl,
    querySerializer: {
      array: {
        style: 'form', // "form" (default) | "spaceDelimited" | "pipeDelimited"
        explode: false,
      },
    },
  })
}
