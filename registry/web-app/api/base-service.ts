// Base service types
import { apiClient } from './client'
import { operations, paths } from '@/api/schema.ts'
import { extractApiData } from '@/api/response-handler.ts'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'

// ======================================================
// Request options type with showErrorToast support
type RequestOptions = {
  path?: Record<string, unknown>
  query?: Record<string, unknown>
  showErrorToast?: boolean
}

export type TPaginatedData<T> = {
  count: number
  next?: string | null
  previous?: string | null
  results?: Array<T>
}

export type ApiResponse<T> = {
  data: T
  message?: string
  success: boolean
}

export type PaginationParams = {
  pageIndex?: number
  pageSize?: number
}

export type ApiError = {
  code: string
  message: string
  details?: Record<string, unknown>
}

// ======================================================
// Helper type to extract operation key from path and method
type GetOperationKey<
  Path extends keyof paths,
  Method extends keyof paths[Path],
> = paths[Path][Method] extends { responses: any }
  ? {
      [K in keyof operations]: operations[K] extends paths[Path][Method] ? K : never
    }[keyof operations]
  : never

type ExtractRequestBody<T> = T extends {
  requestBody?: {
    content: {
      'application/json': infer Body
    }
  }
}
  ? Body
  : Record<string, never>

// ======================================================

type TPathGet = {
  [K in keyof paths]: paths[K] extends { get: infer G } ? (G extends never ? never : K) : never
}[keyof paths]

// GET Operations - Extract directly from paths (same pattern as POST/PUT/PATCH/DELETE)
type GetResponseData<P extends TPathGet> = paths[P] extends { get: infer Op }
  ? Op extends { responses: { 200: { content: { 'application/json': { data?: infer D } } } } }
    ? D
    : never
  : never

// ======================================================

type GetListOperationKeys = Extract<
  keyof operations,
  `${string}_list` | `${string}_histories_retrieve`
>
type TPathGetList = {
  [K in keyof paths]: paths[K] extends { get: any }
    ? paths[K]['get'] extends never
      ? never
      : paths[K]['get'] extends operations[GetListOperationKeys]
        ? K
        : never
    : never
}[keyof paths]
type GetListResponseData<T extends GetListOperationKeys> = operations[T] extends {
  responses: { 200: { content: { 'application/json': { data?: infer D } } } }
}
  ? D
  : never

// ======================================================

type TPathPost = {
  [K in keyof paths]: paths[K] extends { post: infer G } ? (G extends never ? never : K) : never
}[keyof paths]

// POST Operations - Extract directly from paths
type PostResponseData<P extends TPathPost> = paths[P] extends { post: infer Op }
  ? Op extends { responses: { 200: { content: { 'application/json': { data?: infer D } } } } }
    ? D
    : Op extends { responses: { 201: { content: { 'application/json': { data?: infer D } } } } }
      ? D
      : Op extends { responses: { 202: { content: { 'application/json': { data?: infer D } } } } }
        ? D
        : never
  : never

type PostRequestBody<P extends TPathPost> = paths[P] extends { post: infer Op }
  ? ExtractRequestBody<Op>
  : never

// ======================================================

type TPathPut = {
  [K in keyof paths]: paths[K] extends { put: infer G } ? (G extends never ? never : K) : never
}[keyof paths]

// ======================================================

type TPathPatch = {
  [K in keyof paths]: paths[K] extends { patch: infer G } ? (G extends never ? never : K) : never
}[keyof paths]

// ======================================================

type TPathDelete = {
  [K in keyof paths]: paths[K] extends { delete: infer G } ? (G extends never ? never : K) : never
}[keyof paths]

// ======================================================
// PUT Operations - Extract directly from paths
type PutResponseData<P extends TPathPut> = paths[P] extends { put: infer Op }
  ? Op extends { responses: { 200: { content: { 'application/json': { data?: infer D } } } } }
    ? D
    : never
  : never

type PutRequestBody<P extends TPathPut> = paths[P] extends { put: infer Op }
  ? ExtractRequestBody<Op>
  : never

// ======================================================
// PATCH Operations - Extract directly from paths
type PatchResponseData<P extends TPathPatch> = paths[P] extends { patch: infer Op }
  ? Op extends { responses: { 200: { content: { 'application/json': { data?: infer D } } } } }
    ? D
    : never
  : never

type PatchRequestBody<P extends TPathPatch> = paths[P] extends { patch: infer Op }
  ? ExtractRequestBody<Op>
  : never

// ======================================================
// DELETE Operations - Extract directly from paths
type DeleteResponseData<P extends TPathDelete> = paths[P] extends { delete: infer Op }
  ? Op extends { responses: { 204: any } }
    ? void
    : Op extends { responses: { 200: { content: { 'application/json': { data?: infer D } } } } }
      ? D
      : void
  : void

// ======================================================

// Helper type: Get LIST operation key for a path
type GetListOperation<Path extends keyof paths> =
  GetOperationKey<Path, 'get'> extends `${string}_list` ? GetOperationKey<Path, 'get'> : never

/**
 * Generic base service class for API operations
 * Provides common CRUD operations that can be extended by specific services
 */
export abstract class BaseApiService {
  protected get client() {
    return apiClient
  }

  /**
   * Handle error with optional toast notification
   * Shows toast if showErrorToast is true, then throws the error
   */
  private handleError(error: unknown, showErrorToast?: boolean): never {
    if (showErrorToast) {
      toastService.error(extractErrorMessage(error))
    }
    throw error
  }

  /**
   * Attach the HTTP status to the thrown API error so callers can branch on it
   * (e.g. isNotFoundError → 404, isConflictError → 409). The error body itself
   * carries no status, so we copy it from the raw Response.
   */
  protected withStatus(response: { error?: unknown; response?: Response }): unknown {
    const err = response?.error
    const status = response?.response?.status
    if (err && typeof err === 'object' && typeof status === 'number') {
      try {
        ;(err as { status?: number }).status = status
      } catch {
        // Error body is frozen — leave it as-is.
      }
    }
    return err
  }

  /**
   * Generic GET request
   */
  protected async get<P extends TPathGet>(
    path: P,
    options?: {
      path?: Record<string, unknown>
      query?: Record<string, unknown>
    }
  ): Promise<GetResponseData<P>> {
    const response = await this.client.GET(path as any, {
      params: {
        path: options?.path,
        query: options?.query,
      },
    })

    if (response.error) {
      throw this.withStatus(response)
    }

    return extractApiData(response)
  }

  /**
   * Generic method for paginated requests
   */
  protected async getPaginated<P extends TPathGetList>(
    path: P,
    parameters?: operations[GetListOperationKeys]['parameters']['query'],
    pathParams?: Record<string, unknown>
  ): Promise<GetListResponseData<GetListOperation<P>>> {
    // TODO: Remove trim when backend supports
    if (parameters && 'search' in parameters && typeof parameters.search === 'string') {
      parameters.search = parameters.search?.trim()
    }
    const response = await this.client.GET(path as any, {
      params: { query: parameters, path: pathParams },
    })

    if (response.error) {
      throw this.withStatus(response)
    }

    return extractApiData(response)
  }

  // ==========================================================

  /**
   * Generic POST request with auto-inferred types from path
   */
  protected async post<P extends TPathPost>(
    path: P,
    body: PostRequestBody<P>,
    options?: {
      path?: Record<string, unknown>
      query?: Record<string, unknown>
      signal?: AbortSignal
    }
  ): Promise<PostResponseData<P>> {
    const payload: any = {}
    if (body) payload.body = body
    if (options?.path || options?.query) {
      payload.params = {}
      if (options.path) payload.params.path = options.path
      if (options.query) payload.params.query = options.query
    }
    if (options?.signal) payload.signal = options.signal

    const response = await this.client.POST(path as any, payload)

    if (response.error) {
      throw this.withStatus(response)
    }

    return extractApiData(response)
  }

  // ==========================================================

  /**
   * Generic PUT request with auto-inferred types from path
   */
  protected async put<P extends TPathPut>(
    path: P,
    body: PutRequestBody<P>,
    options?: {
      path?: Record<string, unknown>
      query?: Record<string, unknown>
    }
  ): Promise<PutResponseData<P>> {
    const response = await this.client.PUT(path as any, {
      body: body as any,
      params: {
        path: options?.path,
        query: options?.query,
      },
    })

    if (response.error) {
      throw this.withStatus(response)
    }

    return extractApiData(response)
  }

  // ==========================================================

  /**
   * Generic PATCH request with auto-inferred types from path
   */
  protected async patch<P extends TPathPatch>(
    path: P,
    body: PatchRequestBody<P>,
    options?: {
      path?: Record<string, unknown>
      query?: Record<string, unknown>
    }
  ): Promise<PatchResponseData<P>> {
    const response = await this.client.PATCH(path as any, {
      body: body as any,
      params: {
        path: options?.path,
        query: options?.query,
      },
    })

    if (response.error) {
      throw this.withStatus(response)
    }

    return extractApiData(response)
  }

  // ==========================================================

  /**
   * Generic DELETE request with auto-inferred types from path
   * @param options.showErrorToast - Shows toast error message before throwing (default: true)
   */
  protected async delete<P extends TPathDelete>(
    path: P,
    options?: RequestOptions
  ): Promise<DeleteResponseData<P>> {
    const response = await this.client.DELETE(path as any, {
      params: {
        path: options?.path,
        query: options?.query,
      },
    })

    if (response.error) {
      this.handleError(this.withStatus(response), options?.showErrorToast ?? true)
    }

    // Handle 204 No Content response - no body to extract
    if (!response.data) {
      return undefined as DeleteResponseData<P>
    }

    return extractApiData(response)
  }

  // ==========================================================
}
