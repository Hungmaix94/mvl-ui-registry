import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { apiClient } from '@/api/client'
import { ApiPaths } from '@/api/schema'
import { getFeeSupportRequestService } from './fee-support-request-service'

// Only the request wiring is under test, so React Query is stubbed out — importing the
// module must not drag in a provider.
vi.mock('@/hooks/useApiQuery', () => ({ useApiQuery: vi.fn(), useApiMutation: vi.fn() }))
// The real client pulls in middlewares → notification store → a service-class import
// cycle that leaves BaseApiService undefined at module init.
vi.mock('@/api/client', () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() },
  default: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() },
}))

const RECORD_ID = 39

// `apiClient.POST`/`PATCH` are generic over every path in the OpenAPI schema, so reading
// their call tuples through `vi.mocked` blows the type-instantiation budget (TS2589). The
// spies are plain mocks at runtime — take a loose handle for the assertions.
const postMock = apiClient.POST as unknown as Mock
const patchMock = apiClient.PATCH as unknown as Mock

/** Shape `extractApiData` accepts as a success payload. */
function okResponse() {
  return { data: { success: true, data: {} } }
}

/** The openapi-fetch payload (2nd arg) of the last `POST` call. */
function lastPostPayload() {
  const calls = postMock.mock.calls
  return calls[calls.length - 1][1] as { body?: unknown; params?: { path?: { id?: number } } }
}

describe('FeeSupportRequestService — path params on document-workflow POSTs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    postMock.mockResolvedValue(okResponse())
    patchMock.mockResolvedValue(okResponse())
  })

  // Regression (ClickUp 86eyhfy8b): the options object was passed in the `body` position,
  // so `params.path` was never built and the URL kept the literal `{id}` segment —
  // every "Duyệt hồ sơ" click hit `.../fee-support-requests/{id}/approve-documents/`.
  it('sends the real id as a path param when approving documents', async () => {
    await getFeeSupportRequestService().approveDocuments(RECORD_ID)

    expect(apiClient.POST).toHaveBeenCalledWith(
      ApiPaths.sales_fee_support_requests_approve_documents_create,
      { params: { path: { id: RECORD_ID } } }
    )
  })

  it('does not leak the path options into the request body', async () => {
    await getFeeSupportRequestService().approveDocuments(RECORD_ID)

    expect(lastPostPayload().body).toBeUndefined()
  })

  it.each([
    ['approve', () => getFeeSupportRequestService().approve(RECORD_ID)],
    ['reject', () => getFeeSupportRequestService().reject(RECORD_ID, { reason: 'x' })],
    ['withdraw', () => getFeeSupportRequestService().withdraw(RECORD_ID, { reason: 'x' })],
    [
      'rejectDocuments',
      () => getFeeSupportRequestService().rejectDocuments(RECORD_ID, { reason: 'x' }),
    ],
    ['releaseHoldFull', () => getFeeSupportRequestService().releaseHoldFull(RECORD_ID)],
    [
      'supplementDocuments',
      () => getFeeSupportRequestService().supplementDocuments(RECORD_ID, { attachments: [] }),
    ],
  ])('%s also interpolates the id', async (_name, call) => {
    await call()

    expect(lastPostPayload().params?.path?.id).toBe(RECORD_ID)
  })
})

// 86eyqf9m3 — web edit goes through PATCH, not POST like every other action here.
describe('FeeSupportRequestService.update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    patchMock.mockResolvedValue(okResponse())
  })

  it('PATCHes the real id as a path param with the edit payload as body', async () => {
    await getFeeSupportRequestService().update(RECORD_ID, { reason: 'sua lai' })

    expect(apiClient.PATCH).toHaveBeenCalledWith(
      ApiPaths.sales_fee_support_requests_partial_update,
      { body: { reason: 'sua lai' }, params: { path: { id: RECORD_ID }, query: undefined } }
    )
  })
})
