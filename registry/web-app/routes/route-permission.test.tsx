import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AbilityContext, defineAbilitiesFor } from '@/lib/ability'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { PermissionGuard } from '@/routes/PermissionGuard'

/**
 * ClickUp 86eyg6p32 — ba màn hình chỉ bị ẩn ở menu chứ không kiểm quyền ở tầng route, gõ thẳng
 * URL là vào được. Test khoá lại hai điều:
 *
 *  1. Route khai đúng mã quyền BE thật sự sinh ra (mã cũ bị chú thích lại là `payroll_period.retrieve`
 *     — KHÔNG có ở cả `src/api/schema.ts` lẫn `docs/srs/.../handover/permissions-matrix.html`,
 *     bật lên sẽ chặn nhầm cả người có quyền).
 *  2. Thiếu quyền thì `PermissionGuard` đẩy sang trang "Truy cập bị từ chối".
 */

/** Mã quyền lấy từ dòng `**Require permission:**` của chính endpoint mà màn hình gọi. */
const ROUTE_PERMISSIONS = [
  {
    label: 'Cấu hình lương',
    constantName: 'PAYROLL_CONFIGURATION',
    path: APP_PATH.PAYROLL_CONFIGURATION,
    // GET /api/payroll/salary-config/
    permission: 'payroll.view_salary_config',
  },
  {
    label: 'Phiếu lương của một nhân viên',
    constantName: 'PAYROLL_PERIOD_DETAIL_EMPLOYEE',
    path: APP_PATH.PAYROLL_PERIOD_DETAIL_EMPLOYEE,
    // GET /api/payroll/payroll-slips/{id}/
    permission: 'payroll_slip.retrieve',
  },
] as const

function renderGuardedRoute(
  permission: string | string[],
  grantedCodes: string[],
  isSuperuser = false
) {
  return render(
    <AbilityContext.Provider
      value={defineAbilitiesFor(
        grantedCodes.map((code) => ({ code })),
        isSuperuser
      )}
    >
      <MemoryRouter initialEntries={['/man-hinh-can-bao-ve']}>
        <Routes>
          <Route
            path="/man-hinh-can-bao-ve"
            element={
              <PermissionGuard permissions={permission}>
                <div>Nội dung màn hình</div>
              </PermissionGuard>
            }
          />
          <Route path={APP_PATH.UNAUTHORIZED} element={<div>Truy cập bị từ chối</div>} />
        </Routes>
      </MemoryRouter>
    </AbilityContext.Provider>
  )
}

describe('Phân quyền tầng route của ba màn hình trong ClickUp 86eyg6p32', () => {
  describe.each(ROUTE_PERMISSIONS)('$label ($path)', ({ permission }) => {
    it('tài khoản thiếu quyền bị đẩy sang trang "Truy cập bị từ chối"', () => {
      // Có quyền khác nhưng không có đúng mã của màn này.
      renderGuardedRoute(permission, ['employee.list'])

      expect(screen.getByText('Truy cập bị từ chối')).toBeInTheDocument()
      expect(screen.queryByText('Nội dung màn hình')).not.toBeInTheDocument()
    })

    it('tài khoản có đúng mã quyền thì vào được', () => {
      renderGuardedRoute(permission, [permission])

      expect(screen.getByText('Nội dung màn hình')).toBeInTheDocument()
    })

    it('superuser luôn vào được', () => {
      renderGuardedRoute(permission, [], true)

      expect(screen.getByText('Nội dung màn hình')).toBeInTheDocument()
    })
  })

  it('mã quyền không tồn tại chặn luôn cả người dùng thường — lý do không được tự bịa mã', () => {
    // `payroll_period.retrieve` không có trong danh mục quyền BE sinh ra, nên không role nào
    // được cấp; bật lên là khoá màn hình với mọi tài khoản thường.
    renderGuardedRoute('payroll_period.retrieve', [
      'payroll_slip.retrieve',
      'salary_period.retrieve',
    ])

    expect(screen.getByText('Truy cập bị từ chối')).toBeInTheDocument()
  })
})

/**
 * Khoá lại cấu hình thật trong `AppRoute.tsx`. Đọc thẳng mã nguồn thay vì `import` cây route —
 * `AppRoute.tsx` kéo theo cả `schema.ts` (~5MB) nên nạp module trong test là quá chậm.
 */
describe('Cấu hình route trong AppRoute.tsx', () => {
  // Môi trường jsdom không cho `import.meta.url` ra file URL, nên đi từ gốc project của vitest.
  const appRouteSource = readFileSync(resolve(process.cwd(), 'src/routes/AppRoute.tsx'), 'utf8')

  /**
   * Cắt đúng object khai báo route: lùi về `{` mở object rồi tiến tới `}` khớp cặp.
   * Cắt "tới `path:` kế tiếp" thì dễ vơ nhầm `permission` của route đứng sau.
   */
  const readRouteBlock = (constantName: string) => {
    const marker = `path: APP_PATH.${constantName},`
    const start = appRouteSource.indexOf(marker)
    expect(start, `không tìm thấy route APP_PATH.${constantName}`).toBeGreaterThan(-1)
    expect(
      appRouteSource.indexOf(marker, start + 1),
      `APP_PATH.${constantName} được khai ở nhiều route — ca test này chỉ đọc được route đầu tiên`
    ).toBe(-1)

    const open = appRouteSource.lastIndexOf('{', start)
    let depth = 0
    for (let i = open; i < appRouteSource.length; i += 1) {
      if (appRouteSource[i] === '{') depth += 1
      else if (appRouteSource[i] === '}') {
        depth -= 1
        if (depth === 0) {
          const block = appRouteSource.slice(open, i + 1)
          // Có `children` thì `permission` bắt được có thể là của route con — phải sửa lại ca test.
          expect(block, `route APP_PATH.${constantName} nay có route con`).not.toContain(
            'children:'
          )
          return block
        }
      }
    }

    throw new Error(`không cắt được object của route APP_PATH.${constantName}`)
  }

  /** Bỏ qua dòng đã bị chú thích lại — đó chính là kiểu bug mà ticket này sửa. */
  const readDeclaredPermission = (constantName: string) =>
    readRouteBlock(constantName).match(/^\s*permission: '([^']+)'/m)?.[1]

  it.each(ROUTE_PERMISSIONS)('$label khai quyền $permission', ({ constantName, permission }) => {
    expect(readDeclaredPermission(constantName)).toBe(permission)
  })

  it('màn phiếu lương không còn ghi cứng hasPermission={true} mà hỏi đúng ability', () => {
    // `payroll_slip.retrieve` → parsePermissionCode: action `retrieve`, subject `payroll_slip`.
    const pageSource = readFileSync(
      resolve(
        process.cwd(),
        'src/pages/authenticated/payroll/period/PayrollPeriodEmployeeDetailPage.tsx'
      ),
      'utf8'
    )

    expect(pageSource).toContain("hasPermission={ability.can('retrieve', 'payroll_slip')}")
    expect(pageSource).not.toContain('hasPermission={true}')
  })

  it('Lịch làm việc CỐ Ý không khai quyền — chỉ cần đã đăng nhập là xem được', () => {
    // Dữ liệu tra cứu chung. BE cũng không khai `permission_prefix` cho `WorkScheduleViewSet`
    // nên không có mã quyền nào tồn tại (FSD 6.4 §3.3). Ca này chặn việc "tiện tay" thêm một mã
    // tự đặt vào route — làm vậy sẽ khoá màn hình với mọi tài khoản trừ superuser.
    expect(readDeclaredPermission('ATTENDANCE_WORKING_SCHEDULE')).toBeUndefined()
  })

  /**
   * "Giao dịch tiền về đợt này" và "Chia HH theo tháng" từng dùng CHUNG cặp quyền
   * `dealperiodworksheet.list` / `.retrieve`. Cấp quyền để ai đó xem màn thứ nhất là mở luôn
   * màn thứ hai — thứ họ không được xem. Màn thứ nhất nay đi theo `.admin_preview`.
   */
  describe('Hai màn dùng chung DealPeriodWorksheet phải khác cổng quyền', () => {
    /** Cắt object route theo APP_PATH kể cả khi route đó có `children`. */
    const readBlockWithChildren = (constantName: string) => {
      const marker = `path: APP_PATH.${constantName},`
      const start = appRouteSource.indexOf(marker)
      expect(start, `không tìm thấy route APP_PATH.${constantName}`).toBeGreaterThan(-1)
      const open = appRouteSource.lastIndexOf('{', start)
      let depth = 0
      for (let i = open; i < appRouteSource.length; i += 1) {
        if (appRouteSource[i] === '{') depth += 1
        else if (appRouteSource[i] === '}') {
          depth -= 1
          if (depth === 0) return appRouteSource.slice(open, i + 1)
        }
      }
      throw new Error(`không cắt được object của route APP_PATH.${constantName}`)
    }

    const allocationBlock = () => readBlockWithChildren('DEAL_PERIOD_ALLOCATION')
    const splitSheetBlock = () => readBlockWithChildren('MONTHLY_COMMISSION_SPLIT_SHEET')

    it('màn Giao dịch tiền về đợt này gác bằng admin_preview', () => {
      const block = allocationBlock()

      // Cả route index lẫn route chi tiết — để không có nhánh nào rơi lại về quyền dùng chung.
      const declared = block.match(/permission: 'dealperiodworksheet\.[a-z_]+'/g) ?? []
      expect(declared.length).toBeGreaterThanOrEqual(2)
      declared.forEach((line) =>
        expect(line).toBe("permission: 'dealperiodworksheet.admin_preview'")
      )
    })

    it('màn Giao dịch tiền về đợt này KHÔNG còn gác bằng list/retrieve dùng chung', () => {
      const block = allocationBlock()

      expect(block).not.toContain("permission: 'dealperiodworksheet.list'")
      expect(block).not.toContain("permission: 'dealperiodworksheet.retrieve'")
    })

    it('màn Chia HH theo tháng vẫn giữ list/retrieve — hai màn không còn chung cổng', () => {
      const block = splitSheetBlock()

      expect(block).toContain("permission: 'dealperiodworksheet.list'")
      expect(block).toContain("permission: 'dealperiodworksheet.retrieve'")
      expect(block).not.toContain("permission: 'dealperiodworksheet.admin_preview'")
    })

    it('mục menu khai đúng quyền của route — lệch là màn hiện trong menu rồi chặn ở route', () => {
      const menuSource = readFileSync(resolve(process.cwd(), 'src/constants/menu-items.ts'), 'utf8')
      const idx = menuSource.indexOf('url: APP_PATH.DEAL_PERIOD_ALLOCATION,')
      expect(idx, 'không tìm thấy mục menu Giao dịch tiền về đợt này').toBeGreaterThan(-1)

      const entry = menuSource.slice(idx, menuSource.indexOf('}', idx))
      expect(entry).toContain("permission: 'dealperiodworksheet.admin_preview'")
    })

    it('trang chi tiết hỏi ability admin_preview, không phải retrieve', () => {
      const pageSource = readFileSync(
        resolve(
          process.cwd(),
          'src/pages/authenticated/accounting/deal-period-allocations/DealPeriodAllocationDetailPage.tsx'
        ),
        'utf8'
      )

      expect(pageSource).toContain("ability.can('admin_preview', 'dealperiodworksheet')")
      expect(pageSource).not.toContain("ability.can('retrieve', 'dealperiodworksheet')")
    })
  })

  /**
   * "Hoa hồng theo doanh thu" đọc `accounting_department_monthly_kpi_*` nhưng từng bị gác bằng
   * `departmentcommissionpool.*` — quyền của một resource khác hẳn mà màn không hề gọi. Cấp
   * đúng quyền của endpoint thì vẫn bị chặn; muốn vào phải cấp quyền của pool, tức là mở nhầm
   * một resource khác.
   */
  describe('Hoa hồng theo doanh thu gác đúng resource nó đọc', () => {
    it('route khai departmentmonthlykpi, không phải departmentcommissionpool', () => {
      const block = readRouteBlock('COMMISSION_BY_REVENUE_DETAIL')

      expect(block).toContain("permission: 'departmentmonthlykpi.retrieve'")
      expect(block).not.toContain('departmentcommissionpool')
    })

    it('mục menu khai cùng mã với route', () => {
      const menuSource = readFileSync(resolve(process.cwd(), 'src/constants/menu-items.ts'), 'utf8')
      const idx = menuSource.indexOf('url: APP_PATH.COMMISSION_BY_REVENUE,')
      expect(idx, 'không tìm thấy mục menu Hoa hồng theo doanh thu').toBeGreaterThan(-1)

      const entry = menuSource.slice(idx, menuSource.indexOf('}', idx))
      expect(entry).toContain("permission: 'departmentmonthlykpi.list'")
    })

    it('màn "HH theo tháng — Phòng ban" GIỮ NGUYÊN departmentcommissionpool', () => {
      // Ca đối chứng: tên trang (DepartmentMonthlyKpi*) gây hiểu nhầm, nhưng ba trang đó thật sự
      // đọc `useDepartmentCommissionPool*`. Đổi theo cho "nhất quán tên gọi" là khoá nhầm màn.
      const block = readRouteBlock('DEPARTMENT_MONTHLY_KPI_DETAIL')

      expect(block).toContain("permission: 'departmentcommissionpool.retrieve'")
    })
  })
})

/**
 * Nhóm 0 / PR 0.3 — hôm nay backend chỉ trả về MỘT danh sách quyền phẳng (không phải từ nhiều
 * role gộp lại). Nhóm test dưới đây MÔ PHỎNG TRƯỚC tình huống `grantedCodes` được gộp từ ≥2
 * nguồn (vd 2 role cùng gán cho một tài khoản ở phase sau của
 * `srs/docs/plans/plan_auth_permission_rollout_20260819.md`), gồm cả mã trùng lặp và mã
 * rộng/hẹp cùng tồn tại — để khoá lại rằng `PermissionGuard` vẫn phân giải quyền nhất quán khi
 * đó xảy ra thật, không crash và không "cộng dồn" sai thành cấp thừa quyền.
 */
describe('Mô phỏng PermissionGuard với quyền gộp từ ≥2 nguồn (forward-looking)', () => {
  it('mã quyền trùng lặp giữa 2 nguồn (vd role A và role B cùng có "deal.list") vẫn vào được', () => {
    const sourceRoleA = ['deal.list', 'deal.retrieve']
    const sourceRoleB = ['deal.list', 'employee.list'] // "deal.list" trùng với nguồn A.
    const mergedGrantedCodes = [...sourceRoleA, ...sourceRoleB]

    renderGuardedRoute('deal.list', mergedGrantedCodes)

    expect(screen.getByText('Nội dung màn hình')).toBeInTheDocument()
  })

  it('yêu cầu nhiều mã quyền cùng lúc — mỗi mã do một nguồn khác nhau cấp — vẫn vào được', () => {
    // Route yêu cầu CẢ hai mã (PermissionGuard.permissions là mảng, kiểm .every()). Mô phỏng
    // trường hợp không nguồn nào riêng lẻ đủ quyền, chỉ khi gộp cả 2 nguồn mới đủ.
    const sourceRoleA = ['deal.list']
    const sourceRoleB = ['deal.retrieve']
    const mergedGrantedCodes = [...sourceRoleA, ...sourceRoleB]

    renderGuardedRoute(['deal.list', 'deal.retrieve'], mergedGrantedCodes)

    expect(screen.getByText('Nội dung màn hình')).toBeInTheDocument()
  })

  it('gộp quyền RỘNG (deal.list) từ 2 nguồn không làm mất quyền HẸP (deal.retrieve)', () => {
    // Quyền rộng và hẹp là hai action khác nhau trên cùng subject — gộp lại không được để
    // action nào "đè" mất action kia.
    const mergedGrantedCodes = ['deal.list', 'deal.retrieve']

    renderGuardedRoute('deal.list', mergedGrantedCodes)
    expect(screen.getByText('Nội dung màn hình')).toBeInTheDocument()
  })

  it('gộp quyền HẸP (deal.retrieve) từ 2 nguồn vẫn xét đúng khi route đòi quyền hẹp', () => {
    const mergedGrantedCodes = ['deal.list', 'deal.retrieve']

    renderGuardedRoute('deal.retrieve', mergedGrantedCodes)
    expect(screen.getByText('Nội dung màn hình')).toBeInTheDocument()
  })

  it('gộp 2 nguồn nhưng vẫn thiếu đúng mã cần → vẫn bị chặn, không tự "cộng dồn" thành đủ quyền', () => {
    const sourceRoleA = ['deal.list']
    const sourceRoleB = ['employee.list'] // Không nguồn nào cấp "deal.retrieve".
    const mergedGrantedCodes = [...sourceRoleA, ...sourceRoleB]

    renderGuardedRoute('deal.retrieve', mergedGrantedCodes)

    expect(screen.getByText('Truy cập bị từ chối')).toBeInTheDocument()
  })
})
