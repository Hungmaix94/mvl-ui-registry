import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Màn "Giao dịch tiền về đợt này" được gác bằng `dealperiodworksheet.admin_preview`
 * (xem `src/routes/route-permission.test.tsx`). Chi tiết của màn PHẢI đọc qua endpoint
 * `/api/accounting/deal-period-worksheets/{pk}/admin-preview/` — endpoint duy nhất mà quyền
 * đó mở. Gọi `..._retrieve` là đòi `dealperiodworksheet.retrieve`, quyền thuộc màn
 * "Chia HH theo tháng" và KHÔNG được cấp cho người xem màn này ⇒ API trả 403.
 *
 * Đọc thẳng mã nguồn thay vì `import` module: service kéo theo `schema.ts` (~5MB),
 * nạp trong test là quá chậm.
 */
const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8')

const DETAIL_PAGE =
  'src/pages/authenticated/accounting/deal-period-allocations/DealPeriodAllocationDetailPage.tsx'
const ALLOCATION_SERVICE =
  'src/features/accounting/deal-period-allocations/services/deal-period-allocation-service.ts'
const SPLIT_SHEET_PAGE =
  'src/pages/authenticated/accounting/commission-splits/CommissionSplitDetailPage.tsx'

describe('Chi tiết "Giao dịch tiền về đợt này" đọc qua admin-preview', () => {
  it('trang chi tiết dùng hook admin-preview, không dùng hook retrieve', () => {
    const source = readSource(DETAIL_PAGE)

    expect(source).toContain('useCommissionSplitAdminPreview')
    expect(source).not.toContain('useCommissionSplitDetail')
  })

  it('mọi query đọc chi tiết trên trang đều đi qua admin-preview', () => {
    const source = readSource(DETAIL_PAGE)

    // Trang gọi hook chi tiết nhiều lần (bản ghi kỳ đang xem + kỳ hiện hành).
    // Sót một lần dùng hook retrieve là màn 403 đúng một nửa — khó thấy hơn hỏng hẳn.
    const detailHookCalls = source.match(/useCommissionSplit[A-Za-z]*\(/g) ?? []
    expect(detailHookCalls.length).toBeGreaterThanOrEqual(2)
    detailHookCalls.forEach((call) => expect(call).toBe('useCommissionSplitAdminPreview('))
  })

  it('service của màn không gọi endpoint retrieve của worksheet', () => {
    const source = readSource(ALLOCATION_SERVICE)

    expect(source).not.toContain('accounting_deal_period_worksheets_retrieve')
  })

  it('màn "Chia HH theo tháng" vẫn giữ endpoint retrieve của nó', () => {
    // Ca đối chứng: bản vá không được lan sang màn kia — hai màn đọc hai endpoint khác nhau
    // vì chúng dựng cho hai nhóm người xem khác nhau.
    const source = readSource(SPLIT_SHEET_PAGE)

    expect(source).toContain('useCommissionSplitDetail')
    expect(source).not.toContain('useCommissionSplitAdminPreview')
  })
})
