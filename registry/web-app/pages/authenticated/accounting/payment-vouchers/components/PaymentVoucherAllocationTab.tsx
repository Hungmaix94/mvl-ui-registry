import { ReferenceCode } from '@/components/commons'
import DealDetailLink from '@/components/commons/DealDetailLink'
import F2ReconciliationLink from '@/components/commons/F2ReconciliationLink'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { APP_PATH } from '@/routes'
import type { PaymentVoucher } from '@/features/accounting/payment-vouchers/services/payment-voucher-service'
import { type InputInvoice } from '@/features/accounting/input-invoices/services/input-invoice-service'
import { toAmount } from '@/features/accounting/payment-vouchers/utils/amount'
import {
  findInvoiceLine,
  splitTierByInvoiceLine,
} from '@/features/accounting/payment-vouchers/utils/tier-vat-basis'
import { counterpartyLabel } from './PaymentVoucherGeneralTab'

interface PaymentVoucherAllocationTabProps {
  record: PaymentVoucher
  inputInvoicesMap: Record<number, InputInvoice>
  lineKindChoices: Record<string, string> | null
}

/** Rows the allocation tab will actually draw — the tab badge must agree with them.
 *
 *  Adding `invoices` and `commission_invoices` blindly counted an F2 settlement twice:
 *  posting creates a WS7 commission tier for the very lines the settlement tier already
 *  covers, so a 2-unit voucher jumped from 2 to 4 the moment it was posted. */
export function countAllocationRows(record: {
  invoices?: { input_invoice_line?: number | null }[] | null
  commission_invoices?: { input_invoice_id?: number | null }[] | null
}): number {
  const invoices = record.invoices ?? []
  const settlementTiers = invoices.filter((tier) => tier.input_invoice_line)
  if (settlementTiers.length > 0) {
    return settlementTiers.length
  }
  const legacySettled = (record.commission_invoices ?? []).filter((tier) => tier.input_invoice_id)
  return invoices.length + legacySettled.length
}

export const PaymentVoucherAllocationTab = ({
  record,
  inputInvoicesMap,
  lineKindChoices,
}: PaymentVoucherAllocationTabProps) => {
  // Diễn giải dòng chi được chụp lại lúc lập phiếu, nên phiếu cũ còn giữ mã kỹ thuật
  // ("pct_fee_deduction_to_f2") từ thời chưa có nhãn. Dịch tại chỗ khi đọc, để kế toán
  // không phải nhìn mã enum trên chứng từ.
  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.BOOKING.COMMISSION_PCT_TYPE],
  })
  const pctTypeLabels = keysMap.get(APP_CONSTANT_KEY.SALES.BOOKING.COMMISSION_PCT_TYPE) as
    | Record<string, string>
    | undefined
  const lineLabel = (description?: string | null) =>
    (description && pctTypeLabels?.[description]) || description || '—'

  const lines = record.lines ?? []
  const invoices = record.invoices ?? []
  // Tier tất toán theo CĂN (F2): tier tự nói nó trả cho dòng hóa đơn nào, và các dòng
  // dự chi treo ngay dưới nó. Đây là thứ cho phép gom hóa đơn → căn → dòng, thay vì
  // hai bảng rời mà kế toán không nối được với nhau.
  const settlementTiers = invoices.filter((tier) => tier.input_invoice_line)
  // Hình dạng cũ, còn tồn tại cho tới khi backfill chạy hết mọi môi trường.
  const commissionInvoices = (record.commission_invoices ?? []).filter(
    (tier) => tier.input_invoice_id
  )

  const totalLines = lines.reduce((sum, line) => sum + toAmount(line.amount), 0)
  const totalInvoices = invoices.reduce((sum, inv) => sum + toAmount(inv.allocated_amount), 0)
  const totalSettled = commissionInvoices.reduce(
    (sum, tier) => sum + toAmount(tier.allocated_amount),
    0
  )
  const totalTierGross = settlementTiers.reduce(
    (sum, tier) => sum + toAmount(tier.allocated_amount),
    0
  )

  if (settlementTiers.length > 0) {
    // Bảng này chỉ trả lời "căn này tất toán bao nhiêu, VAT bao nhiêu". Các cột tách theo
    // từng loại khoản chi (Hoa hồng F2 / Thưởng F2 / khấu trừ) đã gỡ: mặt chữ của chúng
    // không cùng cơ sở VAT với Thành tiền, nên bày cạnh nhau chỉ khiến kế toán cộng ra
    // lệch. Số chi từng khoản vẫn tra được ở bảng chia hoa hồng của giao dịch.

    // BE tính `net_amount` bằng Σ mặt chữ các dòng chia hoa hồng, nhưng mặt chữ đó không
    // nhất quán là số trước VAT: bảng đối chiếu bật `is_commission_include_vat` thì split
    // mang luôn số đã gồm VAT, Σ bằng đúng gross và `vat_amount = gross − net` sập về 0
    // (bug 86eygdrz8). Hóa đơn đầu vào thì luôn chụp đúng thuế suất theo từng dòng, và
    // trang chi tiết đã fetch sẵn nó cho mọi tier — nên tách VAT theo nó.
    const tierRows = settlementTiers.map((tier) => {
      const invoice = inputInvoicesMap[tier.input_invoice]
      const gross = toAmount(tier.allocated_amount)
      const invoiceLine = findInvoiceLine(invoice, tier.input_invoice_line)
      const { net, vat } = splitTierByInvoiceLine({
        gross,
        line: invoiceLine,
        fallbackNet: toAmount(tier.net_amount),
        fallbackVat: toAmount(tier.vat_amount),
      })
      return {
        tier,
        gross,
        net,
        vat,
        // Tier chỉ mang `f2_reconciliation_code`; id để dựng link nằm ở dòng hóa đơn.
        reconciliationId: invoiceLine?.f2_reconciliation,
        // Hóa đơn được trang fetch SAU khi có `record`, và map là state nên reset mỗi lần
        // vào tab — trong khi React Query trả `record` từ cache tức thì. Không chặn ở đây
        // thì mỗi lượt vào tab đều nháy đúng con số BE sai (VAT 0) rồi mới đổi. Trên chứng
        // từ kế toán, để trống lành hơn nháy số sai. GROSS thì luôn tin được nên vẫn hiện.
        isBasisPending: !invoice,
      }
    })
    const hasPendingBasis = tierRows.some((row) => row.isBasisPending)
    const totalNet = tierRows.reduce((sum, row) => sum + row.net, 0)
    const totalVat = tierRows.reduce((sum, row) => sum + row.vat, 0)

    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="typo-body-xl-semibold text-content-dark-1">
            Chi theo từng căn ({settlementTiers.length})
          </p>
          <p className="text-content-dark-3 text-xs">
            Mỗi dòng là một căn trên hóa đơn đầu vào. Thành tiền và VAT được tách từ số tất toán
            theo thuế suất trên dòng hóa đơn đầu vào của chính căn đó.
          </p>
        </div>

        <div className="border-border-1 bg-surface-primary-default w-full overflow-hidden overflow-x-auto rounded-xl border shadow-sm">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-border-1 border-b">
                <th className="text-content-dark-2 p-3.5 pl-5 font-semibold">Dự án</th>
                <th className="text-content-dark-2 p-3.5 font-semibold">Căn</th>
                <th className="text-content-dark-2 p-3.5 font-semibold">Giao dịch</th>
                <th className="text-content-dark-2 p-3.5 font-semibold">Hóa đơn</th>
                <th className="text-content-dark-2 p-3.5 font-semibold">Đối chiếu</th>
                <th
                  className="text-content-dark-2 p-3.5 text-right font-semibold"
                  title="Phần trước VAT của số tất toán căn này, tách theo thuế suất trên dòng hóa đơn đầu vào."
                >
                  Thành tiền
                </th>
                <th
                  className="text-content-dark-2 p-3.5 text-right font-semibold"
                  title="Phần VAT của số tất toán căn này. Phiếu trả nhiều đợt thì đây là VAT của riêng đợt này, không phải toàn bộ VAT của dòng hóa đơn."
                >
                  VAT
                </th>
                <th className="text-content-dark-2 p-3.5 pr-5 text-right font-semibold">
                  Thành tiền (gồm VAT)
                </th>
              </tr>
            </thead>
            <tbody className="divide-border-1 divide-y">
              {tierRows.map(({ tier, gross, net, vat, reconciliationId, isBasisPending }) => (
                <tr key={tier.id} className="hover:bg-neutral-50/20">
                  <td className="text-content-dark-2 p-3.5 pl-5">{tier.project_name || '—'}</td>
                  <td className="text-content-dark-1 p-3.5">{tier.unit_number || '—'}</td>
                  <td className="text-content-dark-2 p-3.5">
                    {tier.deal_code ? (
                      <DealDetailLink dealId={tier.deal_id} title="Mở chi tiết giao dịch ở tab mới">
                        {tier.deal_code}
                      </DealDetailLink>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-3.5">
                    <ReferenceCode
                      code={tier.input_invoice_code || `HĐ #${tier.input_invoice}`}
                      linkTo={APP_PATH.INPUT_INVOICE_DETAIL.replace(
                        ':id',
                        String(tier.input_invoice)
                      )}
                    />
                  </td>
                  <td className="text-content-dark-2 p-3.5 text-xs">
                    {tier.f2_reconciliation_code ? (
                      <F2ReconciliationLink
                        reconciliationId={reconciliationId}
                        title="Mở chi tiết đối chiếu F2 ở tab mới"
                      >
                        {tier.f2_reconciliation_code}
                      </F2ReconciliationLink>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="text-content-dark-1 p-3.5 text-right">
                    {isBasisPending ? '—' : formatCurrencyVND(net)}
                  </td>
                  <td className="text-content-dark-2 p-3.5 text-right">
                    {isBasisPending ? '—' : formatCurrencyVND(vat)}
                  </td>
                  <td className="text-data-red-default p-3.5 pr-5 text-right font-bold">
                    {formatCurrencyVND(gross)}
                  </td>
                </tr>
              ))}
              <tr className="bg-background-2">
                <td className="text-content-dark-1 p-3.5 pl-5 font-semibold" colSpan={5}>
                  Tổng cộng
                </td>
                <td className="text-content-dark-1 p-3.5 text-right font-semibold">
                  {hasPendingBasis ? '—' : formatCurrencyVND(totalNet)}
                </td>
                <td className="text-content-dark-2 p-3.5 text-right font-semibold">
                  {hasPendingBasis ? '—' : formatCurrencyVND(totalVat)}
                </td>
                <td className="text-data-red-default p-3.5 pr-5 text-right font-bold">
                  {formatCurrencyVND(totalTierGross)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {commissionInvoices.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="typo-body-xl-semibold text-content-dark-1">
            Tất toán hóa đơn đầu vào ({commissionInvoices.length})
          </p>
          <div className="border-border-1 bg-surface-primary-default w-full overflow-hidden overflow-x-auto rounded-xl border p-0 shadow-sm">
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-border-1 border-b">
                  <th className="text-content-dark-2 p-3.5 pl-5 font-semibold">Mã HĐ đầu vào</th>
                  <th className="text-content-dark-2 p-3.5 font-semibold">Giao dịch</th>
                  <th className="text-content-dark-2 p-3.5 pr-5 text-right font-semibold">
                    Số tất toán, gồm VAT (VND)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border-1 divide-y">
                {commissionInvoices.map((tier) => (
                  <tr key={tier.id} className="border-border-1 border-b">
                    <td className="p-3.5 pl-5">
                      <ReferenceCode
                        code={tier.input_invoice_code}
                        linkTo={APP_PATH.INPUT_INVOICE_DETAIL.replace(
                          ':id',
                          String(tier.input_invoice_id)
                        )}
                      />
                    </td>
                    <td className="text-content-dark-2 p-3.5">{tier.deal_code || '—'}</td>
                    <td className="text-data-red-default p-3.5 pr-5 text-right font-bold">
                      {formatCurrencyVND(toAmount(tier.allocated_amount))}
                    </td>
                  </tr>
                ))}
                <tr className="bg-background-2">
                  <td className="text-content-dark-1 p-3.5 pl-5 font-semibold" colSpan={2}>
                    Tổng tất toán
                  </td>
                  <td className="text-data-red-default p-3.5 pr-5 text-right font-bold">
                    {formatCurrencyVND(totalSettled)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-content-dark-3 text-xs">
            Số này là GỘP (gồm VAT) và là số dùng để tất toán hóa đơn. Các dòng dự chi bên dưới là
            số thực trả từng bên, nên tổng của chúng có thể nhỏ hơn khi hoa hồng chưa gồm VAT.
          </p>
        </div>
      )}

      {/* 1. Dòng dự chi */}
      <div className="flex flex-col gap-4">
        <p className="typo-body-xl-semibold text-content-dark-1">Dòng dự chi ({lines.length})</p>
        {lines.length > 0 ? (
          <div className="border-border-1 bg-surface-primary-default w-full overflow-hidden overflow-x-auto rounded-xl border p-0 shadow-sm">
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-border-1 border-b">
                  <th className="text-content-dark-2 p-3.5 pl-5 font-semibold">Loại dòng chi</th>
                  <th className="text-content-dark-2 p-3.5 font-semibold">Diễn giải</th>
                  <th className="text-content-dark-2 p-3.5 pr-5 text-right font-semibold">
                    Số tiền (VND)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border-1 divide-y">
                {lines.map((line, idx) => (
                  <tr
                    key={line.id ?? idx}
                    className="border-border-1 border-b transition-colors hover:bg-neutral-50/20"
                  >
                    <td className="text-content-dark-1 p-3.5 pl-5 font-medium">
                      {lineKindChoices?.[line.line_kind] ?? line.line_kind}
                    </td>
                    <td className="text-content-dark-2 p-3.5">{lineLabel(line.description)}</td>
                    <td className="text-data-red-default p-3.5 pr-5 text-right font-bold">
                      {line.amount ? formatCurrencyVND(toAmount(line.amount)) : '—'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-background-2">
                  <td className="text-content-dark-1 p-3.5 pl-5 font-semibold" colSpan={2}>
                    Tổng dòng dự chi
                  </td>
                  <td className="text-data-red-default p-3.5 pr-5 text-right font-bold">
                    {formatCurrencyVND(totalLines)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border-border-1 bg-surface-primary-default rounded-xl border border-dashed p-10 text-center">
            <span className="text-3xl">📋</span>
            <p className="text-content-dark-3 mt-2 text-sm font-semibold">
              Không có dòng dự chi nào trên phiếu chi này
            </p>
          </div>
        )}
      </div>

      {/* 2. Phân bổ theo hóa đơn đầu vào — hidden on an F2 settlement, whose invoice is
          already settled through the tier above. Showing an empty "(0)" block there is
          what led an accountant to try allocating by hand and hit the XOR error. */}
      {commissionInvoices.length === 0 && (
        <div className="flex flex-col gap-4">
          <p className="typo-body-xl-semibold text-content-dark-1">
            Phân bổ theo hóa đơn đầu vào ({invoices.length})
          </p>
          {invoices.length > 0 ? (
            <div className="border-border-1 bg-surface-primary-default w-full overflow-hidden overflow-x-auto rounded-xl border p-0 shadow-sm">
              <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-border-1 border-b">
                    <th className="text-content-dark-2 p-3.5 pl-5 font-semibold">Mã HĐ đầu vào</th>
                    <th className="text-content-dark-2 p-3.5 font-semibold">Số hóa đơn</th>
                    <th className="text-content-dark-2 p-3.5 font-semibold">Ngày lập</th>
                    <th className="text-content-dark-2 p-3.5 font-semibold">Đối tác / Supplier</th>
                    <th className="text-content-dark-2 p-3.5 text-right font-semibold">
                      Tổng tiền HĐ (VND)
                    </th>
                    <th className="text-content-dark-2 p-3.5 text-right font-semibold">
                      Tỷ lệ phân bổ
                    </th>
                    <th className="text-content-dark-2 p-3.5 pr-5 text-right font-semibold">
                      Số tiền phân bổ (VND)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border-1 divide-y">
                  {invoices.map((inv) => {
                    const detail = inputInvoicesMap[inv.input_invoice]
                    return (
                      <tr
                        key={inv.input_invoice}
                        className="border-border-1 border-b transition-colors hover:bg-neutral-50/20"
                      >
                        <td className="text-content-dark-1 p-3.5 pl-5 font-medium">
                          <ReferenceCode
                            code={detail?.code || `HĐ #${inv.input_invoice}`}
                            linkTo={APP_PATH.INPUT_INVOICE_DETAIL.replace(
                              ':id',
                              String(inv.input_invoice)
                            )}
                          />
                        </td>
                        <td className="text-content-dark-2 p-3.5 font-mono text-xs">
                          {detail?.external_invoice_no || '—'}
                        </td>
                        <td className="text-content-dark-2 p-3.5">
                          {detail?.invoice_date ? formatDate(detail.invoice_date) : '—'}
                        </td>
                        <td className="p-3.5">
                          <span className="text-content-dark-1 font-semibold">
                            {counterpartyLabel(detail)}
                          </span>
                        </td>
                        <td className="text-content-dark-1 p-3.5 text-right">
                          {detail?.total_amount_with_vat
                            ? formatCurrencyVND(Number(detail.total_amount_with_vat))
                            : '—'}
                        </td>
                        <td className="text-content-dark-2 p-3.5 text-right">
                          {inv.allocation_pct ? `${inv.allocation_pct}%` : '—'}
                        </td>
                        <td className="text-data-red-default p-3.5 pr-5 text-right font-bold">
                          {inv.allocated_amount
                            ? formatCurrencyVND(toAmount(inv.allocated_amount))
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-background-2">
                    <td className="text-content-dark-1 p-3.5 pl-5 font-semibold" colSpan={6}>
                      Tổng cộng
                    </td>
                    <td className="text-data-red-default p-3.5 pr-5 text-right font-bold">
                      {formatCurrencyVND(totalInvoices)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border-border-1 bg-surface-primary-default rounded-xl border border-dashed p-10 text-center">
              <span className="text-3xl">📄</span>
              <p className="text-content-dark-3 mt-2 text-sm font-semibold">
                Không có hóa đơn đầu vào nào được phân bổ trên phiếu chi này
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
