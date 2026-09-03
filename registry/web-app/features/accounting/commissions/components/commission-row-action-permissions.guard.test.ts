import { describe, it, expect } from 'vitest'

import { defineAbilitiesFor } from '@/lib/ability'
import { MonthlySummaryStatus as MonthlyStatus } from '@/constants/api-schema-aliases'
import type { MonthlyBeneficiaryCommissionSummary } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { getCommSaleMonthlyActions } from './CommSaleMonthlyTable'
import { getCommCtvMonthlyActions } from './CommCtvMonthlyTable'
import { getCommMgrMonthlyActions } from './CommMgrMonthlyTable'
import { ADVANCE_REQUEST_ACTION_LABEL } from './CommMonthlySummaryAdvanceDialog'

/**
 * Ba bảng kê theo tháng dùng chung bộ nhãn nhưng đọc ba ViewSet khác nhau ở BE. Bộ test này ghim
 * đúng một điều: **mỗi mục hiện lên đúng khi có quyền mà chính nó gọi tới, và biến mất khi thiếu**
 * (`docs/ai/conventions.md` § "Gate một hành động bằng đúng quyền mà hành động đó GỌI TỚI").
 *
 * Mã quyền viết bằng chuỗi literal ở đây, KHÔNG nội suy từ `MONTHLY_SUMMARY_SUBJECT`: so một hằng
 * số với chính nó thì luôn đúng, và sẽ vẫn xanh sau khi ai đó gộp cả ba bảng về một subject —
 * đúng thứ cần chặn. Việc các mã này có thật ở BE do
 * `constants/commission-permissions.guard.test.ts` lo.
 */

const ability = (codes: string[]) =>
  defineAbilitiesFor(
    codes.map((code) => ({ code })),
    false
  )

const noop = () => {}
const record = (status: string) =>
  ({ id: 1, status }) as unknown as MonthlyBeneficiaryCommissionSummary

/** Nhãn thật sự hiện lên với một bản ghi ở trạng thái `status`. */
const visible = (
  actions: ReturnType<typeof getCommSaleMonthlyActions>,
  status: string
): string[] => {
  const row = record(status)
  return actions.filter((a) => (a.show ? a.show(row) : true)).map((a) => a.label)
}

const saleActions = (codes: string[]) =>
  getCommSaleMonthlyActions({
    navigate: noop,
    ability: ability(codes),
    handleConfirm: noop,
    handleCreatePaymentVoucher: noop,
    openEmailDialog: noop,
    setHoldRecord: noop,
  })

const ctvActions = (codes: string[]) =>
  getCommCtvMonthlyActions({
    navigate: noop,
    ability: ability(codes),
    handleConfirm: noop,
    handleCreatePaymentVoucher: noop,
    openEmailDialog: noop,
    setHoldRecord: noop,
  })

const mgrActions = (codes: string[]) =>
  getCommMgrMonthlyActions({
    navigate: noop,
    ability: ability(codes),
    handleConfirm: noop,
    openEmailDialog: noop,
    setHoldRecord: noop,
    setAdvanceRecord: noop,
  })

describe('bảng kê HH theo tháng — mỗi mục gate bằng quyền nó gọi tới', () => {
  describe('Sale', () => {
    it('không có quyền nào thì menu trống, kể cả khi trạng thái cho phép', () => {
      expect(visible(saleActions([]), MonthlyStatus.DRAFT)).toEqual([])
      expect(visible(saleActions([]), MonthlyStatus.CONFIRMED)).toEqual([])
    })

    it('"Duyệt bảng kê" cần salesmonthlycommissionsummary.confirm', () => {
      expect(
        visible(saleActions(['salesmonthlycommissionsummary.confirm']), MonthlyStatus.DRAFT)
      ).toContain('Duyệt bảng kê')
      expect(
        visible(saleActions(['salesmonthlycommissionsummary.retrieve']), MonthlyStatus.DRAFT)
      ).not.toContain('Duyệt bảng kê')
    })

    /**
     * Vế đắt nhất của cả bộ: "Tạo phiếu chi" đứng trên bảng kê hoa hồng nhưng điều hướng sang màn
     * phiếu chi. Toàn quyền trên bảng kê mà thiếu `paymentvoucher.create` thì vẫn KHÔNG được thấy
     * nút — gộp nó về subject của bảng kê là tạo ra lỗi 403 cho người dùng.
     */
    it('"Tạo phiếu chi" cần paymentvoucher.create, không phải quyền của bảng kê', () => {
      const full = [
        'salesmonthlycommissionsummary.retrieve',
        'salesmonthlycommissionsummary.confirm',
        'salesmonthlycommissionsummary.hold',
        'salesmonthlycommissionsummary.send_commission_detail_email_preview',
      ]
      expect(visible(saleActions(full), MonthlyStatus.CONFIRMED)).not.toContain('Tạo phiếu chi')
      expect(
        visible(saleActions([...full, 'paymentvoucher.create']), MonthlyStatus.CONFIRMED)
      ).toContain('Tạo phiếu chi')
    })

    it('quyền đúng nhưng trạng thái sai thì vẫn ẩn — quyền KHÔNG thay thế điều kiện nghiệp vụ', () => {
      const codes = ['salesmonthlycommissionsummary.confirm']
      expect(visible(saleActions(codes), MonthlyStatus.DRAFT)).toContain('Duyệt bảng kê')
      expect(visible(saleActions(codes), MonthlyStatus.PAID)).not.toContain('Duyệt bảng kê')
    })

    it('"Sửa tạm giữ HH" cần .hold, "Gửi email đối chiếu" cần .send_commission_detail_email_preview', () => {
      expect(
        visible(saleActions(['salesmonthlycommissionsummary.hold']), MonthlyStatus.DRAFT)
      ).toContain('Sửa tạm giữ HH')
      expect(
        visible(
          saleActions(['salesmonthlycommissionsummary.send_commission_detail_email_preview']),
          MonthlyStatus.CONFIRMED
        )
      ).toContain('Gửi email đối chiếu')
      expect(
        visible(saleActions(['salesmonthlycommissionsummary.hold']), MonthlyStatus.CONFIRMED)
      ).not.toContain('Gửi email đối chiếu')
    })
  })

  /**
   * Chốt chặn cho lỗi "đồng bộ cả menu về một subject cho gọn": quyền của bảng Sale KHÔNG được mở
   * bất cứ mục nào trên bảng CTV, và ngược lại. Không có test này thì một lần gộp subject vẫn xanh.
   */
  describe('subject không được lẫn giữa các bảng', () => {
    const saleFull = [
      'salesmonthlycommissionsummary.retrieve',
      'salesmonthlycommissionsummary.confirm',
      'salesmonthlycommissionsummary.hold',
      'salesmonthlycommissionsummary.send_commission_detail_email_preview',
      'salesmonthlycommissionsummary.request_advance',
    ]

    it('toàn quyền bảng Sale không mở được mục nào của bảng CTV', () => {
      expect(visible(ctvActions(saleFull), MonthlyStatus.DRAFT)).toEqual([])
    })

    it('toàn quyền bảng Sale không mở được mục nào của bảng Quản lý (trừ mục chưa nối API)', () => {
      // "Xuất bảng kê (PDF)" cố ý không gate: nó mới chỉ bắn toast "đang phát triển".
      expect(visible(mgrActions(saleFull), MonthlyStatus.DRAFT)).toEqual(['Xuất bảng kê (PDF)'])
    })

    it('quyền của bảng CTV mở đúng mục của bảng CTV', () => {
      expect(
        visible(ctvActions(['collaboratormonthlycommissionsummary.confirm']), MonthlyStatus.DRAFT)
      ).toContain('Duyệt bảng kê')
    })
  })

  describe('Quản lý', () => {
    /**
     * Dialog mở ra gọi `POST .../management/{id}/request-advance/`, KHÔNG phải
     * `POST /commission-advances/` — nên `commissionadvance.create` không được mở nút này.
     */
    it(`"${ADVANCE_REQUEST_ACTION_LABEL}" cần …summary.request_advance, không phải commissionadvance.create`, () => {
      expect(visible(mgrActions(['commissionadvance.create']), MonthlyStatus.DRAFT)).not.toContain(
        ADVANCE_REQUEST_ACTION_LABEL
      )
      expect(
        visible(
          mgrActions(['managementmonthlycommissionsummary.request_advance']),
          MonthlyStatus.DRAFT
        )
      ).toContain(ADVANCE_REQUEST_ACTION_LABEL)
    })

    it('"Xuất bảng kê (PDF)" luôn hiện — chưa gọi API nào nên không có quyền để gate', () => {
      expect(visible(mgrActions([]), MonthlyStatus.DRAFT)).toContain('Xuất bảng kê (PDF)')
    })
  })
})
