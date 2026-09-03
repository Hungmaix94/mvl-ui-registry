import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

import {
  COMMISSION_ACTION_PERMISSION,
  MONTHLY_SUMMARY_ACTION,
  MONTHLY_SUMMARY_SUBJECT,
} from './commission-permissions'

/**
 * Guard cho `docs/ai/conventions.md` § "Mã quyền khai ở route phải là mã BE thật sự sinh ra".
 *
 * Một mã gõ sai KHÔNG gây lỗi ở đâu cả: `defineAbilitiesFor` chỉ dựng rule từ danh sách BE trả
 * về, nên mã không tồn tại đơn giản là không khớp gì ⇒ `ability.can` luôn false ⇒ **nút biến mất
 * với mọi tài khoản trừ superuser**. Không crash, không cảnh báo, và bấm thử bằng tài khoản test
 * (superuser) cũng không lộ. Chỉ có phép đối chiếu với schema mới bắt được.
 */

const SCHEMA = fs.readFileSync(path.join(process.cwd(), 'src/api/schema.ts'), 'utf8')

/** Mọi mã quyền BE tự khai trong JSDoc của schema — nguồn đối chiếu. */
const DOCUMENTED = new Set(
  [...SCHEMA.matchAll(/\*\*Require permission:\*\*\s*`([^`]+)`/g)].map((m) => m[1])
)

describe('commission-permissions — mọi mã phải là mã BE thật sự sinh ra', () => {
  it('schema.ts đọc được và có đủ mã để đối chiếu', () => {
    // Tiền đề: phép so "mã X nằm trong tập rỗng" luôn sai, còn phép so ngược lại luôn đúng —
    // không khẳng định tiền đề thì guard này vô nghĩa dù xanh hay đỏ.
    expect(DOCUMENTED.size).toBeGreaterThan(500)
    expect(DOCUMENTED.has('salesmonthlycommissionsummary.retrieve')).toBe(true)
  })

  const monthlyCodes = Object.values(MONTHLY_SUMMARY_SUBJECT).flatMap((subject) =>
    Object.values(MONTHLY_SUMMARY_ACTION).map((action) => `${subject}.${action}`)
  )

  it.each(monthlyCodes)('bảng kê theo tháng: %s tồn tại ở BE', (code) => {
    expect(DOCUMENTED.has(code)).toBe(true)
  })

  const externalCodes = Object.entries(COMMISSION_ACTION_PERMISSION).map(
    ([name, { action, subject }]) => [name, `${subject}.${action}`] as const
  )

  it.each(externalCodes)('%s → %s tồn tại ở BE', (_name, code) => {
    expect(DOCUMENTED.has(code)).toBe(true)
  })

  /**
   * Ghim luôn chiều ngược lại: `parsePermissionCode` cắt subject ở dấu chấm CUỐI, nên hai subject
   * chỉ khác nhau ở tiền tố (`salesmonthly…` vs `employeemonthly…`) là hai subject hoàn toàn khác.
   * Trùng subject giữa các role nghĩa là ai đó vừa "đồng bộ cho gọn" — đúng lỗi cần chặn.
   */
  it('năm role có năm subject khác nhau', () => {
    const subjects = Object.values(MONTHLY_SUMMARY_SUBJECT)
    expect(new Set(subjects).size).toBe(subjects.length)
  })
})
