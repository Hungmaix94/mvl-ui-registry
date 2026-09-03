import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getMonthlySummaryLines, getMonthlySummaryService } from './monthly-summary-service'
import { apiClient } from '@/api/client'

vi.mock('@/api/client', () => {
  return {
    apiClient: {
      GET: vi.fn(),
      POST: vi.fn(),
      PATCH: vi.fn(),
    },
    default: {
      GET: vi.fn(),
      POST: vi.fn(),
      PATCH: vi.fn(),
    },
  }
})

describe('getSalesAdvanceRecoveryBreakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('correctly parses and returns raw array responses', async () => {
    const mockBreakdown = [
      {
        advance_id: 23,
        advance_code: 'ADV000000023',
        advance_created_at: '2026-07-10T15:00:07.729581+07:00',
        request_reason: 'Test reason',
        advance_status: 'PAID',
        recovered_amount: '3853537',
        outstanding_before: '20000000',
      },
    ]

    // Mock apiClient.GET to return the raw array wrapped in the api envelope
    ;(apiClient.GET as any).mockResolvedValue({
      data: {
        success: true,
        data: mockBreakdown,
        error: null,
      },
    })

    const service = getMonthlySummaryService()
    const result = await service.getSalesAdvanceRecoveryBreakdown(188)

    expect(apiClient.GET).toHaveBeenCalledTimes(1)
    expect(result).toEqual(mockBreakdown)
  })

  it('correctly parses and returns paginated list responses', async () => {
    const mockBreakdownResults = [
      {
        advance_id: 23,
        advance_code: 'ADV000000023',
        advance_created_at: '2026-07-10T15:00:07.729581+07:00',
        request_reason: 'Test reason 2',
        advance_status: 'PAID',
        recovered_amount: '3853537',
        outstanding_before: '20000000',
      },
    ]

    // Mock apiClient.GET to return the paginated shape wrapped in the api envelope
    ;(apiClient.GET as any).mockResolvedValue({
      data: {
        success: true,
        data: {
          count: 1,
          results: mockBreakdownResults,
        },
        error: null,
      },
    })

    const service = getMonthlySummaryService()
    const result = await service.getSalesAdvanceRecoveryBreakdown(188)

    expect(apiClient.GET).toHaveBeenCalledTimes(1)
    expect(result).toEqual(mockBreakdownResults)
  })

  it('returns empty array when data is null or empty', async () => {
    ;(apiClient.GET as any).mockResolvedValue({
      data: {
        success: true,
        data: null,
        error: null,
      },
    })

    const service = getMonthlySummaryService()
    const result = await service.getSalesAdvanceRecoveryBreakdown(188)

    expect(result).toEqual([])
  })
})

describe('reopenMonthlySummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts to the sales reopen path with the summary id and the reason body', async () => {
    ;(apiClient.POST as any).mockResolvedValue({
      data: { success: true, data: { id: 200, status: 'DRAFT' }, error: null },
    })

    const service = getMonthlySummaryService()
    const result = await service.reopenMonthlySummary('sales', 200, {
      reason: 'chia lại thực nhận',
    })

    expect(apiClient.POST).toHaveBeenCalledTimes(1)
    const [path, payload] = (apiClient.POST as any).mock.calls[0]
    expect(path).toContain('monthly-summaries/sales/{id}/reopen')
    expect(payload.params.path).toEqual({ id: 200 })
    expect(payload.body).toEqual({ reason: 'chia lại thực nhận' })
    expect(result).toEqual({ id: 200, status: 'DRAFT' })
  })

  it('omits the body when no reason is provided', async () => {
    ;(apiClient.POST as any).mockResolvedValue({
      data: { success: true, data: { id: 5, status: 'DRAFT' }, error: null },
    })

    const service = getMonthlySummaryService()
    await service.reopenMonthlySummary('collaborators', 5)

    const [path, payload] = (apiClient.POST as any).mock.calls[0]
    expect(path).toContain('monthly-summaries/collaborators/{id}/reopen')
    expect(payload.body).toBeUndefined()
  })

  it('surfaces the BE 409 conflict (unsafe reopen) instead of swallowing it', async () => {
    ;(apiClient.POST as any).mockResolvedValue({
      data: undefined,
      error: { detail: 'A wave of this summary has already been paid; cannot reopen.' },
    })

    const service = getMonthlySummaryService()
    await expect(service.reopenMonthlySummary('sales', 200)).rejects.toMatchObject({
      detail: 'A wave of this summary has already been paid; cannot reopen.',
    })
  })
})

describe('commission income emails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('previewCommissionEmail posts to the detail-preview path with use_real=1', async () => {
    ;(apiClient.POST as any).mockResolvedValue({
      data: { success: true, data: { html: '<p>x</p>', subject: 'S' }, error: null },
    })

    const service = getMonthlySummaryService()
    const result = await service.previewCommissionEmail('sales', 'detail', 12)

    expect(apiClient.POST).toHaveBeenCalledTimes(1)
    const [path, payload] = (apiClient.POST as any).mock.calls[0]
    expect(path).toContain('send-commission-detail-email/preview')
    expect(payload.params.path).toEqual({ id: 12 })
    expect(payload.params.query).toEqual({ use_real: '1' })
    expect(result).toEqual({ html: '<p>x</p>', subject: 'S' })
  })

  it('previewCommissionEmail targets the after-tax path for the after_tax kind', async () => {
    ;(apiClient.POST as any).mockResolvedValue({
      data: { success: true, data: { html: '<p>y</p>' }, error: null },
    })

    const service = getMonthlySummaryService()
    await service.previewCommissionEmail('collaborators', 'after_tax', 5)

    const [path] = (apiClient.POST as any).mock.calls[0]
    expect(path).toContain('send-commission-after-tax-email/preview')
  })

  it('sendCommissionEmail posts to the send path for the payee', async () => {
    ;(apiClient.POST as any).mockResolvedValue({
      data: { success: true, data: {}, error: null },
    })

    const service = getMonthlySummaryService()
    await service.sendCommissionEmail('management', 'detail', 7)

    const [path, payload] = (apiClient.POST as any).mock.calls[0]
    expect(path).toContain('send-commission-detail-email/send')
    expect(payload.params.path).toEqual({ id: 7 })
    expect(payload.body).toBeUndefined()
  })

  // CR STT33 / ClickUp 86eyexcr3 — per-deal send/resend for the CTV role (`dealId` optional).
  it('sendCommissionEmail includes deal_id in the body when scoping to one deal', async () => {
    ;(apiClient.POST as any).mockResolvedValue({
      data: { success: true, data: {}, error: null },
    })

    const service = getMonthlySummaryService()
    await service.sendCommissionEmail('collaborators', 'detail', 42, 501)

    const [path, payload] = (apiClient.POST as any).mock.calls[0]
    expect(path).toContain('send-commission-detail-email/send')
    expect(payload.params.path).toEqual({ id: 42 })
    expect(payload.body).toEqual({ deal_id: 501 })
  })

  it('bulkSendCommissionEmail posts ids and returns the skipped report', async () => {
    const bulkResult = {
      job_id: 'job-1',
      total_recipients: 2,
      skipped: [{ summary_id: 9, payee: 'Nguyen Van A', reason: 'No email' }],
    }
    ;(apiClient.POST as any).mockResolvedValue({
      data: { success: true, data: bulkResult, error: null },
    })

    const service = getMonthlySummaryService()
    const result = await service.bulkSendCommissionEmail('sales', 'detail', { ids: [9, 10, 11] })

    const [path, payload] = (apiClient.POST as any).mock.calls[0]
    expect(path).toContain('bulk-send-commission-detail-email')
    expect(payload.body).toEqual({ ids: [9, 10, 11] })
    expect(result).toEqual(bulkResult)
  })
})

describe('HHQL management statement email (Email 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('bulkSendHhqlEmail posts ids to the management bulk path', async () => {
    const bulkResult = {
      job_id: 'job-2',
      total_recipients: 3,
      skipped: [{ summary_id: 4, payee: 'Le Thi Thuy', reason: 'Thiếu email' }],
    }
    ;(apiClient.POST as any).mockResolvedValue({
      data: { success: true, data: bulkResult, error: null },
    })

    const service = getMonthlySummaryService()
    const result = await service.bulkSendHhqlEmail({ ids: [4, 5, 6] })

    const [path, payload] = (apiClient.POST as any).mock.calls[0]
    expect(path).toContain('management/bulk-send-hhql-email')
    expect(payload.body).toEqual({ ids: [4, 5, 6] })
    expect(result).toEqual(bulkResult)
  })

  it('bulkSendHhqlEmail sends a single manager through the same bulk path', async () => {
    ;(apiClient.POST as any).mockResolvedValue({
      data: {
        success: true,
        data: { job_id: null, total_recipients: 1, skipped: [] },
        error: null,
      },
    })

    const service = getMonthlySummaryService()
    await service.bulkSendHhqlEmail({ ids: [42] })

    const [path, payload] = (apiClient.POST as any).mock.calls[0]
    expect(path).toContain('management/bulk-send-hhql-email')
    expect(payload.body).toEqual({ ids: [42] })
  })

  it('downloadHhqlEmailPreview fetches the workbook as a blob and saves it', async () => {
    const blob = new Blob(['xlsx-bytes'])
    ;(apiClient.GET as any).mockResolvedValue({ data: blob, error: null })

    const createObjectURL = vi.fn().mockReturnValue('blob:preview')
    const revokeObjectURL = vi.fn()
    window.URL.createObjectURL = createObjectURL
    window.URL.revokeObjectURL = revokeObjectURL
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)

    const service = getMonthlySummaryService()
    await service.downloadHhqlEmailPreview(42, 'Bang-ke-HHQL-Le-Thi-Thuy.xlsx')

    const [path, options] = (apiClient.GET as any).mock.calls[0]
    expect(path).toContain('management/{id}/hhql-email-preview')
    expect(options.params.path).toEqual({ id: 42 })
    expect(options.parseAs).toBe('blob')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview')

    clickSpy.mockRestore()
  })

  it('downloadHhqlEmailPreview surfaces the API error instead of saving an empty file', async () => {
    ;(apiClient.GET as any).mockResolvedValue({
      data: undefined,
      error: { detail: 'Không có quyền' },
    })

    const service = getMonthlySummaryService()
    await expect(service.downloadHhqlEmailPreview(42, 'x.xlsx')).rejects.toEqual({
      detail: 'Không có quyền',
    })
  })
})

// CR STT33 / ClickUp 86eyexcr3 — per-deal mail recipient override for the CTV monthly detail.
// Separate model/endpoint from Sale's `updateDealRecipients` (CR STT31) above.
describe('updateCtvDealMailRecipient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('patches the per-deal mail-recipient endpoint with both path params', async () => {
    const updated = {
      recipient_employee_id: 12,
      recipient_employee_code: 'NV0012',
      recipient_employee_name: 'Nguyen Van A',
      recipient_email: 'a.nguyenvan@company.com',
      recipient_sent_at: null,
    }
    ;(apiClient.PATCH as any).mockResolvedValue({
      data: { success: true, data: updated, error: null },
    })

    const service = getMonthlySummaryService()
    const result = await service.updateCtvDealMailRecipient(98, 501, {
      recipient_employee_id: 12,
      email: 'a.nguyenvan@company.com',
    })

    const [path, options] = (apiClient.PATCH as any).mock.calls[0]
    expect(path).toContain('mail-recipient')
    expect(options.params.path).toEqual({ id: 98, deal_id: 501 })
    expect(options.body).toEqual({ recipient_employee_id: 12, email: 'a.nguyenvan@company.com' })
    expect(result).toEqual(updated)
  })

  it('surfaces the API error when the deal does not belong to this summary', async () => {
    ;(apiClient.PATCH as any).mockResolvedValue({
      data: undefined,
      error: { detail: 'This deal is not part of this commission summary.' },
    })

    const service = getMonthlySummaryService()
    await expect(
      service.updateCtvDealMailRecipient(98, 999999, { email: 'x@example.com' })
    ).rejects.toMatchObject({
      detail: 'This deal is not part of this commission summary.',
    })
  })
})

describe('getMonthlySummaryLines — bucket Backoffice (CR 86eykq956)', () => {
  const split = {
    line_id: 102929,
    pool_line_id: 1,
    pool_id: 11,
    employee_id: 226,
    amount: '809407',
    pct_of_pool: '89.0038',
    status: 'CONFIRMED',
    department: { id: 29, code: 'PB000000029', name: 'Phòng Kế toán' },
    position: { id: 40, name: 'Kế Toán Trưởng' },
  }

  it('làm phẳng sources.backoffice.splits thành dòng BACKOFFICE', () => {
    const lines = getMonthlySummaryLines({
      sources: { backoffice: { subtotal: '809407', items: [], splits: [split] } },
    })

    const backoffice = lines.filter((l) => l.source_role === 'BACKOFFICE')
    expect(backoffice).toHaveLength(1)
    expect(backoffice[0].amount).toBe('809407')
    expect(backoffice[0].source_info).toEqual(split)
    expect(backoffice[0].department.name).toBe('Phòng Kế toán')
  })

  it('làm phẳng cả nhánh items (nguồn payable rời)', () => {
    const item = { line_id: 7, payable_id: 42, amount: '123456', status: 'UNPAID' }
    const lines = getMonthlySummaryLines({
      sources: { backoffice: { subtotal: '123456', items: [item], splits: [] } },
    })

    const backoffice = lines.filter((l) => l.source_role === 'BACKOFFICE')
    expect(backoffice).toHaveLength(1)
    expect(backoffice[0].payable_id).toBe(42)
  })

  it('tổng dòng BACKOFFICE khớp subtotal của bucket — số ở tab phải giải thích được', () => {
    const lines = getMonthlySummaryLines({
      sources: {
        backoffice: {
          subtotal: '829407',
          items: [],
          splits: [
            split,
            { ...split, line_id: 2, pool_line_id: 2, employee_id: 227, amount: '20000' },
          ],
        },
      },
    })

    const total = lines
      .filter((l) => l.source_role === 'BACKOFFICE')
      .reduce((s, l) => s + Number(l.amount), 0)
    expect(total).toBe(829407)
  })

  it('không sinh dòng nào khi bucket rỗng', () => {
    const lines = getMonthlySummaryLines({
      sources: { backoffice: { subtotal: '0', items: [], splits: [] } },
    })
    expect(lines.filter((l) => l.source_role === 'BACKOFFICE')).toHaveLength(0)
  })
})
