import { UseFormSetValue } from 'react-hook-form'

type SetValue = UseFormSetValue<any>
const RATE_TYPE = { PCT: 'pct', AMT: 'amt' } as const
const VALIDATE = { shouldValidate: true } as const
/**
 * Reset do HỆ THỐNG chạy thì KHÔNG validate — xem `clearBookingAutofill`.
 */
const NO_VALIDATE = { shouldValidate: false } as const

/** Các field HĐ cọc được đổ từ HĐ đặt chỗ liên quan — KHÔNG gồm `customer`, xem hàm dưới. */
type BookingAutofillInitialValues = {
  investor?: number | null
  project?: number | null
  product_inventory?: number | null
  listed_price?: number | null
  fee_calculation_price?: number | null
  registration_amount?: number | null
  supplementary_amount?: number | null
}

/**
 * Gỡ autofill khi user bỏ HẾT "Hợp đồng đặt chỗ liên quan" (ClickUp 86eyqr9e0).
 *
 * Hai luật, cả hai đều là nội dung của bug đã sửa — đừng gỡ mà không đọc test đi kèm:
 *
 * 1. **KHÔNG đụng `customer`.** Khách hàng không phải "con" của HĐ đặt chỗ: SRS 18.2
 *    (`fsd.md` §1313) cho phép khách của HĐ cọc khác khách của booking, chỉ cần đính kèm giấy tờ
 *    chứng minh quan hệ. Reset nó về `initialValues` là xoá lựa chọn user vừa nhập tay ở màn Tạo
 *    mới, và lặng lẽ revert thay đổi của user ở màn Sửa.
 *
 * 2. **KHÔNG `shouldValidate`.** Form HĐ cọc chạy `mode: 'onSubmit'` (mặc định của RHF), nên lỗi
 *    bắn ra trước lần submit đầu sẽ KẸT: user chọn lại giá trị nhưng `field.onChange` không
 *    re-validate, lỗi cũ vẫn hiển thị. Đó chính là màn "đã chọn khách hàng mà vẫn báo chưa chọn".
 *    Validate lúc submit không đổi — thiếu field bắt buộc vẫn bị chặn.
 */
export function clearBookingAutofill(
  setValue: SetValue,
  initialValues?: BookingAutofillInitialValues | null
): void {
  setValue('investor', initialValues?.investor ?? null, NO_VALIDATE)
  setValue('project', initialValues?.project ?? null, NO_VALIDATE)
  setValue('product_inventory', initialValues?.product_inventory ?? null, NO_VALIDATE)
  setValue('listed_price', initialValues?.listed_price ?? undefined, NO_VALIDATE)
  setValue('fee_calculation_price', initialValues?.fee_calculation_price ?? undefined, NO_VALIDATE)
  setValue('registration_amount', initialValues?.registration_amount || undefined, NO_VALIDATE)
  setValue('supplementary_amount', initialValues?.supplementary_amount ?? 0, NO_VALIDATE)
}

/**
 * Đổ giá niêm yết + giá tính phí từ một product inventory vào form.
 * Field null/undefined → clear (undefined) để hiển thị placeholder.
 */
export function applyProductPriceToForm(setValue: SetValue, product: unknown): void {
  const p = product as {
    listed_price?: number | string | null
    fee_calculation_price?: number | string | null
  }
  setValue('listed_price', p?.listed_price != null ? Number(p.listed_price) : undefined, VALIDATE)
  setValue(
    'fee_calculation_price',
    p?.fee_calculation_price != null ? Number(p.fee_calculation_price) : undefined,
    VALIDATE
  )
}

/**
 * Đổ cấu hình hoa hồng hiện hành (current_commission) vào form:
 * phí đại lý, HH sale, và cặp doanh thu (ưu tiên amt > 0, rồi pct).
 * Trả về pct_sale_commission đã resolve để caller đồng bộ dòng nhân sự bán.
 */
export function applyCommissionToForm(
  setValue: SetValue,
  commission: unknown
): { pct?: number; amt?: number } {
  const c = commission as {
    pct_agency_fee?: number | string | null
    pct_sale_commission?: number | string | null
    amt_sale_commission?: number | string | null
    amt_revenue?: number | string | null
    pct_revenue?: number | string | null
  } | null

  setValue(
    'pct_agency_fee',
    c?.pct_agency_fee != null ? Number(c.pct_agency_fee) : undefined,
    VALIDATE
  )

  let pctSaleCommission: number | undefined
  let amtSaleCommission: number | undefined

  if (c?.amt_sale_commission != null && Number(c.amt_sale_commission) > 0) {
    amtSaleCommission = Number(c.amt_sale_commission)
    setValue('amt_sale_commission', amtSaleCommission, VALIDATE)
    setValue('pct_sale_commission', undefined, VALIDATE)
    setValue('sale_commission_type', RATE_TYPE.AMT, VALIDATE)
  } else if (c?.pct_sale_commission != null) {
    pctSaleCommission = Number(c.pct_sale_commission)
    setValue('pct_sale_commission', pctSaleCommission, VALIDATE)
    setValue('amt_sale_commission', undefined, VALIDATE)
    setValue('sale_commission_type', RATE_TYPE.PCT, VALIDATE)
  } else {
    setValue('pct_sale_commission', undefined, VALIDATE)
    setValue('amt_sale_commission', undefined, VALIDATE)
    setValue('sale_commission_type', RATE_TYPE.PCT, VALIDATE)
  }

  if (c?.amt_revenue != null && Number(c.amt_revenue) > 0) {
    setValue('amt_revenue', Number(c.amt_revenue), VALIDATE)
    setValue('revenue_type', RATE_TYPE.AMT, VALIDATE)
    setValue('pct_revenue', undefined, VALIDATE)
  } else if (c?.pct_revenue != null) {
    setValue('pct_revenue', Number(c.pct_revenue), VALIDATE)
    setValue('revenue_type', RATE_TYPE.PCT, VALIDATE)
    setValue('amt_revenue', undefined, VALIDATE)
  } else {
    setValue('pct_revenue', undefined, VALIDATE)
    setValue('amt_revenue', undefined, VALIDATE)
    setValue('revenue_type', RATE_TYPE.PCT, VALIDATE)
  }

  return { pct: pctSaleCommission, amt: amtSaleCommission }
}

/**
 * Trích xuất ID nhân viên, sàn (đại lý), cộng tác viên từ object sale (BookingSale / DepositContractSale).
 * Xử lý an toàn khi backend trả exchange=null nhưng exchange_detail={id:...}.
 */
export function extractSaleStaffIds(sale: any): {
  empId: number | null
  exchId: number | null
  colId: number | null
} {
  if (!sale) return { empId: null, exchId: null, colId: null }
  const empId =
    typeof sale.employee === 'number'
      ? sale.employee
      : (sale.employee?.id ?? sale.employee_id ?? sale.employee_detail?.id ?? null)
  const exchId =
    typeof sale.exchange === 'number'
      ? sale.exchange
      : (sale.exchange?.id ?? sale.exchange_id ?? sale.exchange_detail?.id ?? null)
  const colId =
    typeof sale.collaborator === 'number'
      ? sale.collaborator
      : (sale.collaborator?.id ?? sale.collaborator_id ?? sale.collaborator_detail?.id ?? null)
  return { empId, exchId, colId }
}
