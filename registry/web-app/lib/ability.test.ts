import { describe, expect, it } from 'vitest'

import { defineAbilitiesFor, parsePermissionCode } from './ability'

/**
 * Nhóm 0 / PR 0.3 — khoá lại hành vi HÔM NAY của `defineAbilitiesFor` trước khi backend đổi sang
 * trả về quyền gộp từ nhiều role (xem `srs/docs/plans/plan_auth_permission_rollout_20260819.md`).
 * Test này KHÔNG đổi product code, chỉ dựng lưới an toàn hồi quy.
 */
describe('defineAbilitiesFor', () => {
  describe('isSuperuser: true', () => {
    it('sinh đúng một rule {action: "manage", subject: "all"}', () => {
      const ability = defineAbilitiesFor([], true)

      expect(ability.rules).toEqual([{ action: 'manage', subject: 'all' }])
    })

    it('can() trả về true với bất kỳ action/subject nào', () => {
      const ability = defineAbilitiesFor(undefined, true)

      expect(ability.can('list', 'deal')).toBe(true)
      expect(ability.can('retrieve', 'employee')).toBe(true)
      expect(ability.can('bat-ky-action-nao', 'bat-ky-subject-nao')).toBe(true)
    })

    it('cờ isSuperuser thắng permissions truyền kèm — permissions bị bỏ qua', () => {
      const ability = defineAbilitiesFor([{ code: 'deal.list' }], true)

      expect(ability.rules).toEqual([{ action: 'manage', subject: 'all' }])
    })
  })

  describe('permissions thường (không phải superuser)', () => {
    it('parsePermissionCode cắt đúng action/subject ở dấu "." cuối cùng', () => {
      // Mã quyền thật dùng trong route (xem src/routes/AppRoute.tsx: permission: 'deal.list').
      expect(parsePermissionCode('deal.list')).toEqual({ action: 'list', subject: 'deal' })
      // Subject có thể chứa dấu chấm — vẫn phải cắt ở dấu "." CUỐI.
      expect(parsePermissionCode('payroll.salary_config.retrieve')).toEqual({
        action: 'retrieve',
        subject: 'payroll.salary_config',
      })
      expect(parsePermissionCode('khong-co-dau-cham')).toBeNull()
    })

    it('một mã quyền "deal.list" → can("list", "deal") true, các action/subject khác false', () => {
      const ability = defineAbilitiesFor([{ code: 'deal.list' }], false)

      expect(ability.can('list', 'deal')).toBe(true)
      expect(ability.can('retrieve', 'deal')).toBe(false)
      expect(ability.can('list', 'employee')).toBe(false)
    })

    it('nhiều mã quyền → can() đúng cho từng cặp action/subject tương ứng', () => {
      const ability = defineAbilitiesFor(
        [{ code: 'deal.list' }, { code: 'deal.retrieve' }, { code: 'employee.list' }],
        false
      )

      expect(ability.can('list', 'deal')).toBe(true)
      expect(ability.can('retrieve', 'deal')).toBe(true)
      expect(ability.can('list', 'employee')).toBe(true)
      expect(ability.can('retrieve', 'employee')).toBe(false)
    })

    it('permissions rỗng hoặc undefined → không rule nào, can() luôn false', () => {
      expect(defineAbilitiesFor([], false).can('list', 'deal')).toBe(false)
      expect(defineAbilitiesFor(undefined, false).can('list', 'deal')).toBe(false)
    })
  })

  /**
   * `defineAbilitiesFor` hôm nay chỉ nhận MỘT mảng permissions đã được gộp phẳng — việc gộp
   * (nếu có) xảy ra ở tầng gọi phía trên, không phải bên trong hàm này (xem chữ ký hàm ở
   * src/lib/ability.ts dòng 29-51: `permissions: Permission[] | undefined`, không phải mảng-của-mảng).
   *
   * Test dưới đây MÔ PHỎNG TRƯỚC tình huống backend tương lai trả về quyền từ ≥2 role, bằng cách
   * tự nối 2 mảng "nguồn" lại thành một mảng phẳng rồi truyền vào — đúng như tầng gọi phía trên
   * sẽ phải làm khi đó. Đây là regression test mang tính dự phòng: hôm nay backend vẫn chỉ trả
   * về một danh sách quyền phẳng duy nhất, nhưng nếu sau này có 2 nguồn quyền trùng/lặp mã,
   * `defineAbilitiesFor` không được crash và `can()` vẫn phải cho kết quả đúng.
   */
  describe('mô phỏng quyền gộp từ ≥2 nguồn (forward-looking, chưa xảy ra ở BE hôm nay)', () => {
    it('mã trùng lặp giữa 2 nguồn không làm sai kết quả can() và không crash', () => {
      const sourceRoleA = [{ code: 'deal.list' }, { code: 'deal.retrieve' }]
      // Trùng "deal.retrieve" với nguồn A, cộng thêm một quyền mới.
      const sourceRoleB = [{ code: 'deal.retrieve' }, { code: 'employee.list' }]

      const mergedPermissions = [...sourceRoleA, ...sourceRoleB]

      expect(() => defineAbilitiesFor(mergedPermissions, false)).not.toThrow()

      const ability = defineAbilitiesFor(mergedPermissions, false)

      expect(ability.can('list', 'deal')).toBe(true)
      expect(ability.can('retrieve', 'deal')).toBe(true)
      expect(ability.can('list', 'employee')).toBe(true)
      // Quyền không nằm trong bất kỳ nguồn nào vẫn phải bị từ chối.
      expect(ability.can('retrieve', 'employee')).toBe(false)
    })
  })
})
