import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock openapi-fetch client trước khi import service (deal-service → base-service → @/api/client).
const getMock = vi.fn()
vi.mock('@/api/client', () => ({
  apiClient: { GET: (...args: unknown[]) => getMock(...args) },
  default: { GET: (...args: unknown[]) => getMock(...args) },
}))

import { getDealService } from '../deal-service'

/**
 * ClickUp 86eya66m0 — nguồn F2 theo từng dòng phải đi hết đường từ API tới Mục 05.
 *
 * `getDealCommissionShares` KHÔNG trả nguyên dòng của BE: nó dựng lại từng dòng theo một DANH SÁCH
 * TRẮNG các field. Bẫy im lặng: BE trả `f2_source` đúng, `raw_data` giữ nguyên, nhưng
 * `commission_shares` — thứ mà `DealCommissionTab`/`DealSplitSection` thật sự render — lại rụng
 * mất field, nên dòng F2 rơi về mặc định `linked` và hiện "Nguồn sàn liên kết" cho MỌI giao dịch.
 * Đúng lỗi này đã lọt lên staging một lần, unit test của helper hiển thị vẫn xanh.
 */
const splitTableResponse = {
  success: true,
  data: {
    columns: [],
    totals: { amount: '158800000' },
    rows: [
      {
        recipient_kind: 'f2_exchange',
        employee: null,
        collaborator: null,
        exchange: { id: 1896, code: 'EX000001896', name: 'Sàn T123' },
        department: { id: 33, code: 'PB000000033', name: 'Sàn Liên Kết & Cộng Tác Viên' },
        position: null,
        f2_source: 'director',
        f2_source_director_detail: {
          id: 107,
          code: 'MV000000013',
          fullname: 'Nguyễn Việt Hùng',
        },
        is_customer_cut: false,
        commissions: {},
        totals: { amount: '157040000' },
      },
      {
        recipient_kind: 'mv_sale',
        employee: { id: 13711, code: 'MV000013711', fullname: 'Đỗ Hà My(N test)' },
        collaborator: null,
        exchange: null,
        department: { id: 517, code: 'PB000000517', name: 'Phòng Kinh Doanh 79_QN' },
        position: null,
        f2_source: null,
        f2_source_director_detail: null,
        is_customer_cut: false,
        commissions: {},
        totals: { amount: '251160000' },
      },
    ],
  },
}

describe('DealService.getDealCommissionShares — nguồn F2 theo từng dòng (86eya66m0)', () => {
  beforeEach(() => {
    getMock.mockReset()
  })

  it('giữ f2_source + tên Giám đốc của dòng F2 khi map sang commission_shares', async () => {
    getMock.mockResolvedValue({ data: splitTableResponse })

    const res = (await getDealService().getDealCommissionShares(2895, 'split')) as any
    const f2Row = res.commission_shares.find((s: any) => s.recipient_kind === 'f2_exchange')

    expect(f2Row.f2_source).toBe('director')
    expect(f2Row.f2_source_director_detail.fullname).toBe('Nguyễn Việt Hùng')
    // Phòng ban vẫn còn — cột "Phòng ban / Nguồn" hiện CẢ HAI.
    expect(f2Row.department.name).toBe('Sàn Liên Kết & Cộng Tác Viên')
  })

  it('dòng sale nội bộ không mang nguồn F2 nào', async () => {
    getMock.mockResolvedValue({ data: splitTableResponse })

    const res = (await getDealService().getDealCommissionShares(2895, 'split')) as any
    const mvRow = res.commission_shares.find((s: any) => s.recipient_kind === 'mv_sale')

    expect(mvRow.f2_source).toBeNull()
    expect(mvRow.f2_source_director_detail).toBeNull()
  })
})
