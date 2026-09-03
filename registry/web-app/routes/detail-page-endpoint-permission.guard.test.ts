import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Guard cho luật: **`hasPermission` của một màn chi tiết phải là mã quyền của endpoint GET-by-id
 * mà chính màn đó gọi để lấy dữ liệu render** — KHÔNG phải `permission:` của route.
 *
 * Vì sao cần guard riêng, không gộp vào `detail-page-permission.guard.test.ts`: guard kia chỉ chặn
 * `hasPermission={true}`. Vòng 1 của ClickUp 86eync7g0 đã vượt qua nó trọn vẹn mà vẫn sai, vì tôi
 * chép mã từ `permission:` của route. Hai hệ quả, cả hai đều lặng lẽ:
 *   - route và endpoint TRÙNG mã ⇒ tầng phòng thủ thứ hai lặp lại tầng thứ nhất, **không thêm gì**;
 *   - route và endpoint LỆCH mã ⇒ người dùng qua cả hai cổng rồi **ăn 403 ở lượt tải dữ liệu**,
 *     màn hiện lỗi kỹ thuật thay vì hiện "Không có quyền truy cập".
 *
 * ⚠️ Guard kiểu "mã có tồn tại trong schema.ts không" KHÔNG bắt được lớp lỗi này. Đã đo: cả 6 mã
 * sai của vòng 1 (`project.retrieve`, `project.update`, `commissionhold.list`,
 * `attendance_geolocation.update`, `booking_refund.create`, `proposal_verifier.history_detail`)
 * đều TỒN TẠI THẬT — chỉ là mã của endpoint KHÁC. Nên guard này neo cả ba vế:
 * **trang ↔ đường dẫn API ↔ mã quyền GET của chính đường dẫn đó trong `schema.ts`**.
 *
 * Muốn sửa `hasPermission` của một trang ⇒ buộc phải sửa bảng dưới ⇒ buộc phải nói ra trang đó gọi
 * endpoint nào. Đó chính là bước mà vòng 1 đã bỏ qua.
 */

const ROOT = process.cwd()
const SCHEMA = fs.readFileSync(path.join(ROOT, 'src/api/schema.ts'), 'utf8')
const SCHEMA_LINES = SCHEMA.split('\n')

type PageContract = {
  /** đường dẫn file, tính từ `src/` */
  file: string
  /** các endpoint GET-by-id mà trang LUÔN gọi để render. Fetch có điều kiện (clone theo
   *  `?cloneId=`) KHÔNG tính — nó không phải điều kiện vào màn. */
  endpoints: string[]
  /** mã quyền kỳ vọng, đúng thứ tự không quan trọng; phải khớp `**Require permission:**` của
   *  method GET ở từng endpoint trên. */
  codes: string[]
}

const PAGES: PageContract[] = [
  // ─── Hoa hồng / Kế toán ────────────────────────────────────────────────────────────────────
  {
    file: 'pages/authenticated/accounting/commissions/CommCtvMonthlyDetailPage.tsx',
    endpoints: ['/api/accounting/monthly-summaries/collaborators/{id}/'],
    codes: ['collaboratormonthlycommissionsummary.retrieve'],
  },
  {
    file: 'pages/authenticated/accounting/commissions/CommF2MonthlyDetailPage.tsx',
    endpoints: ['/api/accounting/monthly-summaries/f2/{id}/'],
    codes: ['f2monthlycommissionsummary.retrieve'],
  },
  {
    file: 'pages/authenticated/accounting/commissions/CommMgrDetailPage.tsx',
    endpoints: ['/api/accounting/monthly-summaries/management/{id}/'],
    codes: ['managementmonthlycommissionsummary.retrieve'],
  },
  {
    file: 'pages/authenticated/accounting/commissions/CommSaleMonthlyDetailPage.tsx',
    endpoints: ['/api/accounting/monthly-summaries/sales/{id}/'],
    codes: ['salesmonthlycommissionsummary.retrieve'],
  },
  {
    file: 'pages/authenticated/accounting/commissions/CommSlkMonthlyDetailPage.tsx',
    endpoints: ['/api/accounting/linked-exchange-monthly-commissions/{id}/'],
    codes: ['linkedexchangemonthlycommission.retrieve'],
  },
  {
    file: 'pages/authenticated/accounting/commissions/CommSlkMonthlyPoolDetailPage.tsx',
    endpoints: ['/api/accounting/linked-exchange-monthly-commissions/{id}/'],
    codes: ['linkedexchangemonthlycommission.retrieve'],
  },
  {
    file: 'pages/authenticated/accounting/commissions/CommissionByRevenueDetailPage.tsx',
    endpoints: ['/api/accounting/department-monthly-kpi/{id}/'],
    codes: ['departmentmonthlykpi.retrieve'],
  },
  {
    // Không có endpoint retrieve cho group — trang đọc lại danh sách gộp rồi lấy phần tử duy nhất.
    // BE khai HAI mã riêng cho `/commission-holds/` và `/commission-holds/grouped/`.
    file: 'pages/authenticated/accounting/commissions/CommissionHoldDetailPage.tsx',
    endpoints: ['/api/accounting/commission-holds/grouped/'],
    codes: ['commissionhold.grouped'],
  },
  {
    file: 'pages/authenticated/accounting/commissions/DepartmentMonthlyKpiDetailPage.tsx',
    endpoints: ['/api/accounting/department-commission-pools/{id}/'],
    codes: ['departmentcommissionpool.retrieve'],
  },
  {
    file: 'pages/authenticated/accounting/commissions/DepartmentMonthlyKpiHistoryPage.tsx',
    endpoints: ['/api/accounting/department-commission-pools/{id}/'],
    codes: ['departmentcommissionpool.retrieve'],
  },
  {
    file: 'pages/authenticated/accounting/employee-payout-batches/EmployeePayoutBatchDetailPage.tsx',
    endpoints: ['/api/accounting/employee-payout-batches/{id}/'],
    codes: ['employeepayoutbatch.retrieve'],
  },
  {
    file: 'pages/authenticated/accounting/imported-bonuses/ImportedBonusBatchDetailPage.tsx',
    endpoints: ['/api/accounting/imported-bonus-batches/{id}/'],
    codes: ['imported_bonus_batch.retrieve'],
  },
  {
    file: 'pages/authenticated/accounting/input-invoices/InputInvoiceDetailPage.tsx',
    endpoints: ['/api/accounting/input-invoices/{id}/'],
    codes: ['inputinvoice.retrieve'],
  },
  {
    file: 'pages/authenticated/accounting/receipt-vouchers/ReceiptVoucherDetailPage.tsx',
    endpoints: ['/api/accounting/receipt-vouchers/{id}/'],
    codes: ['receiptvoucher.retrieve'],
  },
  {
    file: 'pages/authenticated/accounting/sales-invoices/SalesInvoiceDetailPage.tsx',
    endpoints: ['/api/accounting/sales-invoices/{id}/'],
    codes: ['salesinvoice.retrieve'],
  },

  // ─── Chấm công ─────────────────────────────────────────────────────────────────────────────
  {
    // Màn Sửa: route đã chặn `attendance_geolocation.update`, nên gate trong trang phải là mã của
    // lượt ĐỌC dựng form, không phải chép lại mã ghi.
    file: 'pages/authenticated/attendance/project-location/ProjectLocationEditPage.tsx',
    endpoints: ['/api/hrm/attendance-geolocations/{id}/'],
    codes: ['attendance_geolocation.retrieve'],
  },

  // ─── Đề xuất & Quyết định ──────────────────────────────────────────────────────────────────
  {
    file: 'pages/authenticated/decision-and-proposal/proposal/ProposalAssetAllocationDetailPage.tsx',
    endpoints: ['/api/hrm/proposals/asset-allocation/{id}/'],
    codes: ['proposal_asset_allocation.retrieve'],
  },
  {
    file: 'pages/authenticated/decision-and-proposal/proposal/ProposalBulkJobTransferDetailPage.tsx',
    endpoints: ['/api/hrm/proposals/bulk-job-transfer/{id}/'],
    codes: ['proposal_bulk_job_transfer.retrieve'],
  },
  {
    file: 'pages/authenticated/decision-and-proposal/proposal/ProposalDeviceChangeDetailPage.tsx',
    endpoints: ['/api/hrm/proposals/device-change/{id}/'],
    codes: ['proposal_device_change.retrieve'],
  },
  {
    file: 'pages/authenticated/decision-and-proposal/proposal/ProposalJobTransferDetailPage.tsx',
    endpoints: ['/api/hrm/proposals/job-transfer/{id}/'],
    codes: ['proposal_job_transfer.retrieve'],
  },
  {
    file: 'pages/authenticated/decision-and-proposal/proposal/ProposalLateExemptionDetailPage.tsx',
    endpoints: ['/api/hrm/proposals/late-exemption/{id}/'],
    codes: ['proposal_late_exemption.retrieve'],
  },
  {
    file: 'pages/authenticated/decision-and-proposal/proposal/ProposalMaternityLeaveDetailPage.tsx',
    endpoints: ['/api/hrm/proposals/maternity-leave/{id}/'],
    codes: ['proposal_maternity_leave.retrieve'],
  },
  {
    file: 'pages/authenticated/decision-and-proposal/proposal/ProposalOvertimeWorkDetailPage.tsx',
    endpoints: ['/api/hrm/proposals/overtime-work/{id}/'],
    codes: ['proposal_overtime_work.retrieve'],
  },
  {
    file: 'pages/authenticated/decision-and-proposal/proposal/ProposalPaidLeaveDetailPage.tsx',
    endpoints: ['/api/hrm/proposals/paid-leave/{id}/'],
    codes: ['proposal_paid_leave.retrieve'],
  },
  {
    file: 'pages/authenticated/decision-and-proposal/proposal/ProposalPostMaternityBenefitDetailPage.tsx',
    endpoints: ['/api/hrm/proposals/post-maternity-benefits/{id}/'],
    codes: ['proposal_post_maternity_benefits.retrieve'],
  },
  {
    file: 'pages/authenticated/decision-and-proposal/proposal/ProposalReturnToWorkDetailPage.tsx',
    endpoints: ['/api/hrm/proposals/return-to-work/{id}/'],
    codes: ['proposal_return_to_work.retrieve'],
  },
  {
    // Bẫy tên: ProposalType là `statutory_paid_leave` nhưng subject quyền là
    // `proposal_statutory_leave` (KHÔNG có `paid`).
    file: 'pages/authenticated/decision-and-proposal/proposal/ProposalStatutoryLeaveDetailPage.tsx',
    endpoints: ['/api/hrm/proposals/statutory-leave/{id}/'],
    codes: ['proposal_statutory_leave.retrieve'],
  },
  {
    file: 'pages/authenticated/decision-and-proposal/proposal/ProposalUnpaidLeaveDetailPage.tsx',
    endpoints: ['/api/hrm/proposals/unpaid-leave/{id}/'],
    codes: ['proposal_unpaid_leave.retrieve'],
  },
  {
    file: 'pages/authenticated/decision-and-proposal/proposal/ProposalVerifierDetailPage.tsx',
    endpoints: ['/api/hrm/proposal-verifiers/{id}/'],
    codes: ['proposal_verifier.retrieve'],
  },

  // ─── Đặt chỗ / Hoàn cọc ────────────────────────────────────────────────────────────────────
  {
    file: 'pages/authenticated/project/booking-contract/BookingContractDetailPage.tsx',
    endpoints: ['/api/sales/bookings/{id}/'],
    codes: ['booking.retrieve'],
  },
  {
    // Màn đề xuất hoàn tiền: route chặn `booking_refund.create`, còn trang dựng form từ hợp đồng.
    file: 'pages/authenticated/project/booking-contract/BookingContractRefundPage.tsx',
    endpoints: ['/api/sales/bookings/{id}/'],
    codes: ['booking.retrieve'],
  },
  {
    // Render chỉ cần `detailData`; lượt `useBooking` bị chặn bởi `!!bookingId` nên không tính.
    file: 'pages/authenticated/project/refund-booking/RefundBookingDetailPage.tsx',
    endpoints: ['/api/sales/booking-refunds/{id}/'],
    codes: ['booking_refund.retrieve'],
  },
  {
    // Form chỉ render khi có ĐỦ `detailData && bookingData` ⇒ hai mã.
    file: 'pages/authenticated/project/refund-booking/RefundBookingEditPage.tsx',
    endpoints: ['/api/sales/booking-refunds/{id}/', '/api/sales/bookings/{id}/'],
    codes: ['booking_refund.retrieve', 'booking.retrieve'],
  },

  // ─── Bất động sản (product inventory) ──────────────────────────────────────────────────────
  // Tiền lệ ProductInventoryTable (86eynyqfh): `project` và `product_inventory` là HAI subject
  // khác nhau vì `parsePermissionCode` cắt ở dấu chấm CUỐI. Route khai `project.*` là chuyện của
  // route; trang gọi endpoint `product_inventory.*`.
  {
    file: 'pages/authenticated/project/product-inventories/ProjectProductInventoryDetailPage.tsx',
    endpoints: ['/api/realestate/product-inventories/{id}/'],
    codes: ['product_inventory.retrieve'],
  },
  {
    file: 'pages/authenticated/project/product-inventories/ProjectProductInventoryTbcCommissionCreatePage.tsx',
    endpoints: ['/api/realestate/product-inventories/{id}/'],
    codes: ['product_inventory.retrieve'],
  },
  {
    file: 'pages/authenticated/project/product-inventories/ProjectProductInventoryTbcF2CreatePage.tsx',
    endpoints: ['/api/realestate/product-inventories/{id}/'],
    codes: ['product_inventory.retrieve'],
  },
  {
    file: 'pages/authenticated/project/product-inventories/ProjectProductInventoryTbcManagementCreatePage.tsx',
    endpoints: ['/api/realestate/product-inventories/{id}/'],
    codes: ['product_inventory.retrieve'],
  },
  {
    file: 'pages/authenticated/project/product-inventories/ProjectProductInventoryTbcCommissionEditPage.tsx',
    endpoints: [
      '/api/realestate/product-inventories/{pi_pk}/tbc-commissions/{id}/',
      '/api/realestate/product-inventories/{id}/',
    ],
    codes: ['pi_tbc.retrieve', 'product_inventory.retrieve'],
  },
  {
    file: 'pages/authenticated/project/product-inventories/ProjectProductInventoryTbcF2EditPage.tsx',
    endpoints: [
      '/api/realestate/product-inventories/{pi_pk}/tbc-f2s/{id}/',
      '/api/realestate/product-inventories/{id}/',
    ],
    codes: ['pi_tbc_f2.retrieve', 'product_inventory.retrieve'],
  },
  {
    file: 'pages/authenticated/project/product-inventories/ProjectProductInventoryTbcManagementEditPage.tsx',
    endpoints: [
      '/api/realestate/product-inventories/{pi_pk}/tbc-management/{id}/',
      '/api/realestate/product-inventories/{id}/',
    ],
    codes: ['pi_tbc_management.retrieve', 'product_inventory.retrieve'],
  },

  // ─── Phân bổ bán hàng (sales allocation) ───────────────────────────────────────────────────
  {
    file: 'pages/authenticated/project/sale-allocations/SaleAllocationDetailPage.tsx',
    endpoints: ['/api/realestate/sales-allocations/{id}/'],
    codes: ['sales_allocation.retrieve'],
  },
  {
    file: 'pages/authenticated/project/sale-allocations/SaleAllocationTbcCommissionCreatePage.tsx',
    endpoints: ['/api/realestate/sales-allocations/{id}/'],
    codes: ['sales_allocation.retrieve'],
  },
  {
    file: 'pages/authenticated/project/sale-allocations/SaleAllocationTbcF2CreatePage.tsx',
    endpoints: ['/api/realestate/sales-allocations/{id}/'],
    codes: ['sales_allocation.retrieve'],
  },
  {
    file: 'pages/authenticated/project/sale-allocations/SaleAllocationTbcManagementCreatePage.tsx',
    endpoints: ['/api/realestate/sales-allocations/{id}/'],
    codes: ['sales_allocation.retrieve'],
  },
  {
    file: 'pages/authenticated/project/sale-allocations/SaleAllocationTbcCommissionDetailPage.tsx',
    endpoints: [
      '/api/realestate/sales-allocations/{sa_pk}/tbc-commissions/{id}/',
      '/api/realestate/sales-allocations/{id}/',
    ],
    codes: ['sa_tbc.retrieve', 'sales_allocation.retrieve'],
  },
  {
    file: 'pages/authenticated/project/sale-allocations/SaleAllocationTbcCommissionEditPage.tsx',
    endpoints: [
      '/api/realestate/sales-allocations/{sa_pk}/tbc-commissions/{id}/',
      '/api/realestate/sales-allocations/{id}/',
    ],
    codes: ['sa_tbc.retrieve', 'sales_allocation.retrieve'],
  },
  {
    file: 'pages/authenticated/project/sale-allocations/SaleAllocationTbcF2EditPage.tsx',
    endpoints: [
      '/api/realestate/sales-allocations/{sa_pk}/tbc-f2s/{id}/',
      '/api/realestate/sales-allocations/{id}/',
    ],
    codes: ['sa_tbc_f2.retrieve', 'sales_allocation.retrieve'],
  },
  {
    file: 'pages/authenticated/project/sale-allocations/SaleAllocationTbcManagementEditPage.tsx',
    endpoints: [
      '/api/realestate/sales-allocations/{sa_pk}/tbc-management/{id}/',
      '/api/realestate/sales-allocations/{id}/',
    ],
    codes: ['sa_tbc_management.retrieve', 'sales_allocation.retrieve'],
  },
]

/**
 * `ProposalHistoryDetailPage` KHÔNG nằm trong bảng trên: nó dùng chung cho 13 loại đề xuất và tra
 * mã lúc chạy qua `getProposalPermissionSubject(proposalType)`. Ràng buộc của nó nằm ở test cuối
 * cùng trong file này.
 */
const DYNAMIC_PAGE =
  'pages/authenticated/decision-and-proposal/proposal/ProposalHistoryDetailPage.tsx'

// ── đọc `**Require permission:**` của method GET cho một đường dẫn, ngay trong schema.ts ──────
function getPermissionOf(apiPath: string): string | null {
  const head = `  '${apiPath}': {`
  const start = SCHEMA_LINES.indexOf(head)
  if (start < 0) return null

  let doc: string[] = []
  for (let i = start + 1; i < SCHEMA_LINES.length; i++) {
    const line = SCHEMA_LINES[i]
    if (/^  '\/api\//.test(line)) break
    const method = /^\s{4}(get|put|post|delete|options|head|patch|trace)\??:/.exec(line)
    if (method) {
      if (method[1] !== 'get') {
        doc = []
        continue
      }
      const found = /\*\*Require permission:\*\*\s*`([^`]+)`/.exec(doc.join('\n'))
      return found ? found[1] : null
    }
    if (/^\s*\/\*\*/.test(line)) doc = [line]
    else if (doc.length) doc.push(line)
  }
  return null
}

/** Cắt trọn biểu thức trong `hasPermission={...}` (có thể xuống nhiều dòng). */
function hasPermissionExpr(src: string): string | null {
  const at = src.indexOf('hasPermission={')
  if (at < 0) return null
  const open = src.indexOf('{', at)
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') {
      depth--
      if (depth === 0) return src.slice(open + 1, i)
    }
  }
  return null
}

function canCallsIn(expr: string): string[] {
  return [...expr.matchAll(/can\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g)].map((m) => `${m[2]}.${m[1]}`)
}

describe('hasPermission của màn chi tiết = mã quyền của endpoint GET-by-id màn đó gọi', () => {
  it('phép đo có thật: đọc được schema và bảng không rỗng', () => {
    // Tiền đề. Nếu `getPermissionOf` hỏng và trả null cho tất cả, mọi so sánh dưới sẽ so
    // `null === null` và test xanh trong khi không kiểm gì — đúng loại test rỗng cần chặn.
    expect(PAGES.length).toBeGreaterThanOrEqual(45)
    expect(getPermissionOf('/api/sales/bookings/{id}/')).toBe('booking.retrieve')
    expect(getPermissionOf('/api/realestate/product-inventories/{id}/')).toBe(
      'product_inventory.retrieve'
    )
    // Và một đường dẫn không tồn tại phải ra null, không phải ra bừa một mã.
    expect(getPermissionOf('/api/khong-ton-tai/{id}/')).toBeNull()
  })

  it.each(PAGES)('$file', ({ file, endpoints, codes }) => {
    const abs = path.join(ROOT, 'src', file)
    expect(fs.existsSync(abs), `bảng trỏ vào file không tồn tại: ${file}`).toBe(true)

    // Vế 1 — mã khai trong bảng phải đúng là mã GET của endpoint đã khai.
    const fromSchema = endpoints.map((e) => {
      const perm = getPermissionOf(e)
      expect(perm, `schema.ts không khai quyền GET cho "${e}"`).not.toBeNull()
      return perm as string
    })
    expect([...fromSchema].sort(), `mã trong bảng lệch với schema.ts cho ${file}`).toEqual(
      [...codes].sort()
    )

    // Vế 2 — trang phải thật sự gate bằng đúng bộ mã đó.
    const expr = hasPermissionExpr(fs.readFileSync(abs, 'utf8'))
    expect(expr, `${file} không có hasPermission={...}`).not.toBeNull()
    expect(
      [...new Set(canCallsIn(expr as string))].sort(),
      `hasPermission của ${file} không khớp endpoint nó gọi`
    ).toEqual([...codes].sort())
  })

  it('ProposalHistoryDetailPage tra mã theo loại đề xuất, không ghi cứng một mã', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src', DYNAMIC_PAGE), 'utf8')
    const expr = hasPermissionExpr(src)

    // Phải đi qua bảng tra, và KHÔNG được có mã ghi cứng nào trong biểu thức gate.
    expect(src).toContain('getProposalPermissionSubject')
    expect(expr).toContain('permissionSubject')
    expect(
      canCallsIn(expr as string),
      'gate của màn lịch sử đề xuất đang ghi cứng mã — 13 loại có 13 mã khác nhau'
    ).toEqual([])

    // Và mọi mã mà bảng tra sinh ra phải có thật ở đúng endpoint lịch sử của loại đó.
    // Đường dẫn là `/history/{log_id}/` (SỐ ÍT) — `/histories/` là endpoint DANH SÁCH lịch sử,
    // khác hẳn. Bản đầu của test này đoán nhầm thành `/histories/` và bị chính nó bắt.
    const pairs: Array<[string, string]> = [
      ['/api/hrm/proposals/paid-leave/{id}/history/{log_id}/', 'proposal_paid_leave'],
      ['/api/hrm/proposals/unpaid-leave/{id}/history/{log_id}/', 'proposal_unpaid_leave'],
      ['/api/hrm/proposals/statutory-leave/{id}/history/{log_id}/', 'proposal_statutory_leave'],
      ['/api/hrm/proposals/device-change/{id}/history/{log_id}/', 'proposal_device_change'],
    ]
    for (const [endpoint, subject] of pairs) {
      expect(getPermissionOf(endpoint), `mã history_detail của ${subject} lệch`).toBe(
        `${subject}.history_detail`
      )
    }
  })
})
