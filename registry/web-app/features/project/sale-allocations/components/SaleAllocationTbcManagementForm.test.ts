import { describe, expect, it } from 'vitest'
import { TBCManagementRateCategory, TBCManagementRateRole } from '@/api/schema'
import { tbcManagementRateSchema } from './SaleAllocationTbcManagementForm'

type RawRate = {
  role: TBCManagementRateRole
  category: TBCManagementRateCategory
  pct: number | null
  amt: number | null
  pct_role_total: number | null
}

const rate = (over: Partial<RawRate> = {}): RawRate => ({
  role: TBCManagementRateRole.project_secretary,
  category: TBCManagementRateCategory.agency_fee,
  pct: 0.007,
  amt: null,
  pct_role_total: null,
  ...over,
})

const messagesFor = (input: RawRate, field: keyof RawRate): string[] => {
  const result = tbcManagementRateSchema.safeParse(input)
  if (result.success) return []
  return result.error.issues.filter((i) => i.path.join('.') === field).map((i) => i.message)
}

describe('tbcManagementRateSchema — tổng vị trí Thư ký Dự án (pct_role_total)', () => {
  // The carve used to be pinned to agency_fee. It follows the employee rate onto the
  // bonus categories now, so all three must validate.
  it.each([
    ['hoa hồng từ doanh thu', TBCManagementRateCategory.agency_fee],
    ['thưởng quản lý từ CĐT', TBCManagementRateCategory.investor_bonus],
    ['thưởng quản lý bổ sung', TBCManagementRateCategory.mv_bonus],
  ])('chấp nhận carve trên %s', (_label, category) => {
    const result = tbcManagementRateSchema.safeParse(
      rate({ category, pct: 0.007, pct_role_total: 0.01 })
    )
    expect(result.success).toBe(true)
  })

  it('từ chối carve khi vai trò không phải Thư ký Dự án', () => {
    expect(
      messagesFor(
        rate({ role: TBCManagementRateRole.sales_manager, pct_role_total: 0.01 }),
        'pct_role_total'
      )
    ).toContain('Tổng vị trí chỉ áp dụng cho Thư ký Dự án')
  })

  it('từ chối carve trên category thưởng nếu vai trò sai', () => {
    expect(
      messagesFor(
        rate({
          role: TBCManagementRateRole.project_director,
          category: TBCManagementRateCategory.investor_bonus,
          pct_role_total: 0.01,
        }),
        'pct_role_total'
      )
    ).toContain('Tổng vị trí chỉ áp dụng cho Thư ký Dự án')
  })

  it('từ chối carve khi chưa nhập tỉ lệ cá nhân', () => {
    expect(
      messagesFor(
        rate({
          category: TBCManagementRateCategory.investor_bonus,
          pct: null,
          pct_role_total: 0.01,
        }),
        'pct_role_total'
      )
    ).toContain('Cần nhập tỉ lệ cá nhân trước khi nhập tổng vị trí')
  })

  it('từ chối carve nhỏ hơn tỉ lệ cá nhân', () => {
    expect(
      messagesFor(
        rate({
          category: TBCManagementRateCategory.mv_bonus,
          pct: 0.01,
          pct_role_total: 0.007,
        }),
        'pct_role_total'
      )
    ).toContain('Tổng vị trí phải lớn hơn hoặc bằng tỉ lệ cá nhân')
  })

  it('cho phép bỏ trống carve ở vai trò và category bất kỳ', () => {
    const result = tbcManagementRateSchema.safeParse(
      rate({
        role: TBCManagementRateRole.sales_manager,
        category: TBCManagementRateCategory.mv_bonus,
        pct: 1,
        pct_role_total: null,
      })
    )
    expect(result.success).toBe(true)
  })
})
