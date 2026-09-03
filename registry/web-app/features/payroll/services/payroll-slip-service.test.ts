import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { apiClient } from '@/api/client'
import { ApiPaths } from '@/api/schema'
import { getPayrollSlipService } from './payroll-slip-service'

// Only the request wiring is under test — React Query and the export helper are stubbed so
// importing the module does not need a provider.
vi.mock('@/hooks/useApiQuery', () => ({ useApiQuery: vi.fn(), useApiMutation: vi.fn() }))
vi.mock('@/hooks/useExport', () => ({ useExport: vi.fn() }))
// The real client pulls in middlewares → notification store → a service-class import cycle
// that leaves BaseApiService undefined at module init.
vi.mock('@/api/client', () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn() },
  default: { GET: vi.fn(), POST: vi.fn() },
}))

const SLIP_ID = 7

// `apiClient.GET` is generic over every path in the schema, so reading its call tuples through
// `vi.mocked` blows the type-instantiation budget (TS2589).
const getMock = apiClient.GET as unknown as Mock

describe('PayrollSlipService.exportPayrollSlipDocument — blob delivery contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // The page feeds the result straight into `URL.createObjectURL`, so this endpoint must keep
  // using the default `delivery=direct` (206 file attachment) and parse the body as a blob.
  // The schema also describes a `delivery=link` branch returning JSON `ExportDocumentS3Response`;
  // switching to it silently breaks the PDF preview.
  it('requests the document as a blob', async () => {
    const blob = new Blob(['%PDF-1.7'], { type: 'application/pdf' })
    getMock.mockResolvedValue({ data: blob })

    await getPayrollSlipService().exportPayrollSlipDocument(SLIP_ID)

    expect(apiClient.GET).toHaveBeenCalledWith(
      ApiPaths.payroll_payroll_slips_export_document_retrieve,
      { params: { path: { id: SLIP_ID } }, parseAs: 'blob' }
    )
  })

  it('returns the blob untouched so the caller can object-URL it', async () => {
    const blob = new Blob(['%PDF-1.7'], { type: 'application/pdf' })
    getMock.mockResolvedValue({ data: blob })

    const result = await getPayrollSlipService().exportPayrollSlipDocument(SLIP_ID)

    expect(result).toBeInstanceOf(Blob)
    expect(result).toBe(blob)
  })

  it('throws the server message when the export fails', async () => {
    getMock.mockResolvedValue({ error: { message: 'Phiếu lương chưa sẵn sàng' } })

    await expect(getPayrollSlipService().exportPayrollSlipDocument(SLIP_ID)).rejects.toThrow(
      'Phiếu lương chưa sẵn sàng'
    )
  })
})
