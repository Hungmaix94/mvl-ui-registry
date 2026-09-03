import { useMemo } from 'react'

import { ColoredValueVariant } from '@/api/schema'
import { Chip, Table, type ColumnDef } from '@/components/ui'
import { cn } from '@/utils'

import { FEE_SUPPORT_CALC_REQUEST_LABEL as REQ_LABEL } from '../constants/fee-support-request-constants'
import type {
  FeeSupportCalculation,
  FeeSupportCalculationRow,
} from '../services/fee-support-request-service'
import {
  formatCalcMoney as money,
  formatCalcPercent as percent,
  isNonZeroDecimal as isNonZero,
  subtractDecimals,
  sumDecimals,
} from '../utils/fee-support-calc-format'

/**
 * Nhóm màu — dịch cách tô của file Excel tham chiếu (CR STT16, ảnh 1) sang design
 * token thay vì bê nguyên mã màu Excel:
 * - `price`  (xanh)  — đầu vào: giá tính phí.
 * - `sale`   (hồng)  — các khoản thuộc phía SALE.
 * - `mv`     (vàng)  — các khoản thuộc phía MV và số kết quả.
 */
type SummaryTone = 'price' | 'sale' | 'mv'

const TONE_CLASS: Record<SummaryTone, string> = {
  price: 'bg-data-blue-disabled',
  sale: 'bg-data-red-disabled',
  mv: 'bg-data-yellow-disabled',
}

export type FeeSupportSummaryRow = {
  key: string
  label: string
  pct: string | null
  amount: string | null
  note?: string | null
  tone?: SummaryTone
  /** Dòng kết quả — in đậm để người duyệt bắt số ngay. */
  emphasised?: boolean
  includesVat?: boolean
}

const pair = (row: FeeSupportCalculationRow | undefined) => ({
  pct: row?.pct_effective ?? null,
  amount: row?.amount ?? null,
})

export type FeeSupportSummaryOptions = {
  /**
   * Phiếu nhập "Hỗ trợ thưởng" bằng SỐ TIỀN (`support_bonus_amount`) chứ không phải %.
   *
   * Phải truyền từ ngoài vào: `calculation.request.bonus_support` KHÔNG tự nói được
   * mình ở mode nào — BE luôn quy đổi ngược ra `pct_effective`, còn `pct_config` thì
   * null ở CẢ HAI mode (đo trên `FSR-2026-000049`, phiếu nhập bằng % vẫn null). Nguồn
   * đáng tin duy nhất là chính field `support_bonus_amount` trên phiếu.
   */
  bonusSupportIsAmountMode?: boolean
}

/**
 * Trình tự đọc: giá tính phí → MV nhận từ CĐT → mức sale theo QUY ĐỊNH (+ tổng)
 * → phần XIN THÊM (+ tổng) → cắt khách → sale thực hưởng → MV còn lại. Mỗi dòng
 * tổng đứng ngay sau các thành phần của chính nó.
 *
 * Mọi con số lấy nguyên từ khối `calculation` của BE — FE KHÔNG tính lại tiền.
 * Đúng HAI ngoại lệ, cả hai đều do BA chốt và đều được ghi tại chỗ:
 * - "Thưởng MV nhận" cộng `investor_bonus + shared_bonus` (FSD 18.8 §3.4.1 chốt BE
 *   giữ tách 2 kênh còn FE gộp lúc hiển thị);
 * - "Phí xin thêm" trừ `support − sale_regulated` (CR54 `86eyqwp4v`).
 * Cột "Ghi chú" chỉ diễn giải công thức để người duyệt lần được ra số.
 *
 * ⚠️ Số ở đây KHÔNG khớp file Excel đính kèm ticket, và đó là CHỦ Ý: BA đã bổ
 * sung công thức tường minh (BE PR #2831), còn ảnh Excel có lỗi gõ 1.68% (số
 * thực 1.08%) và hệ số ×90% mà plan đã bỏ từ đầu. Đừng "sửa" cho khớp ảnh.
 */
export function buildFeeSupportSummaryRows(
  calculation: FeeSupportCalculation,
  { bonusSupportIsAmountMode = false }: FeeSupportSummaryOptions = {}
): FeeSupportSummaryRow[] {
  const { inflow, request, remainder } = calculation
  const agency = inflow.rows.agency_fee

  return [
    {
      key: 'fee_price',
      label: 'Giá tính phí',
      pct: null,
      amount: calculation.fee_calculation_price,
      tone: 'price',
    },
    {
      key: 'agency_fee',
      label: 'Phí đại lý MV nhận',
      ...pair(agency),
      note: isNonZero(agency?.pct_config) ? `Cấu hình ${percent(agency?.pct_config)}` : null,
      includesVat: !!agency?.includes_vat,
    },
    {
      key: 'bonus_received',
      label: 'Thưởng MV nhận',
      // GỘP 2 KÊNH — không phải chỉ `investor_bonus`. FSD 18.8 §3.4.1 (chốt của BA):
      // BE cố ý giữ tách `investor_bonus` (thưởng CĐT) và `shared_bonus` (thưởng
      // chia sẻ) để không mất khả năng bóc tách, còn FE phải gộp khi hiển thị. Bản
      // trước chỉ lấy `investor_bonus` nên thiếu hẳn phần thưởng chia sẻ (CR 86eyhjjug).
      pct: sumDecimals(
        inflow.rows.investor_bonus?.pct_effective,
        inflow.rows.shared_bonus?.pct_effective
      ),
      amount: sumDecimals(inflow.rows.investor_bonus?.amount, inflow.rows.shared_bonus?.amount),
      note: 'Thưởng CĐT + Thưởng chia sẻ',
      // Chip "gồm VAT" bật khi BẤT KỲ kênh nào có rate gốc gồm VAT: nó giải thích vì
      // sao % hiệu dụng thấp hơn rate cấu hình. Trước CR 86eyhjjug thông tin này nằm
      // ở khối bóc tách (mỗi kênh một dòng riêng), khối đó gỡ rồi nên phải gánh ở đây,
      // nếu không người duyệt thấy % lệch mà không có lời giải thích nào.
      includesVat: !!(
        inflow.rows.investor_bonus?.includes_vat || inflow.rows.shared_bonus?.includes_vat
      ),
    },
    {
      key: 'sale_regulated',
      label: REQ_LABEL.sale_regulated,
      ...pair(request.sale_regulated),
      tone: 'sale',
    },
    {
      key: 'bonus_regulated',
      label: REQ_LABEL.bonus_regulated,
      ...pair(request.bonus_regulated),
      tone: 'sale',
    },
    {
      key: 'sale_total',
      label: REQ_LABEL.sale_total,
      ...pair(request.sale_total),
      note: 'Phí sale quy định + Thưởng sale',
      tone: 'sale',
      emphasised: true,
    },
    {
      key: 'support',
      label: REQ_LABEL.support,
      ...pair(request.support),
      tone: 'sale',
    },
    {
      key: 'support_extra',
      label: REQ_LABEL.support_extra,
      // CR54: dòng DUY NHẤT của bảng do FE trừ, BE không trả sẵn. Xem chú thích của
      // `REQ_LABEL.support_extra` và `subtractDecimals` — số ÂM là hợp lệ ở đây.
      pct: subtractDecimals(request.support?.pct_effective, request.sale_regulated?.pct_effective),
      amount: subtractDecimals(request.support?.amount, request.sale_regulated?.amount),
      note: `${REQ_LABEL.support} − ${REQ_LABEL.sale_regulated}`,
      tone: 'sale',
    },
    {
      key: 'bonus_support',
      label: REQ_LABEL.bonus_support,
      ...pair(request.bonus_support),
      // CR54: thưởng nhập bằng SỐ TIỀN thì bỏ hẳn cột % — con số BE trả về là %
      // quy đổi ngược từ tiền, không phải tỷ lệ ai đó đã duyệt, nên hiện ra chỉ
      // gây hiểu nhầm là phiếu xin theo tỷ lệ. Đo trên dev 26/08/2026: FSR-000027
      // xin 1.000.000đ mà BE trả 0,01%, FSR-000017 xin 44.444đ mà BE trả "0.00"
      // — tức % ở đây còn làm người duyệt tưởng phiếu xin 0 đồng.
      //
      // Chỉ áp khi dòng CÓ SỐ: dữ liệu cũ còn phiếu `support_bonus_amount = 0`
      // (FSR-000022) — BE trả cả hai vế null nên dòng vốn đã trống, gắn thêm ghi
      // chú "xin theo số tiền" vào đó là giải thích một khoản không tồn tại.
      ...(bonusSupportIsAmountMode && request.bonus_support?.amount != null
        ? { pct: null, note: 'Phiếu xin theo số tiền nên không có tỷ lệ %' }
        : null),
      tone: 'sale',
    },
    {
      key: 'support_total',
      label: REQ_LABEL.support_total,
      ...pair(request.support_total),
      note: `${REQ_LABEL.support} + ${REQ_LABEL.bonus_support}`,
      tone: 'sale',
      emphasised: true,
    },
    {
      key: 'customer_cut',
      // Cố ý NGẮN hơn nhãn khối bóc tách ("Trong đó cắt khách"): ở bảng phẳng
      // đây là dòng CR liệt kê, không phải chú thích phụ thuộc dòng trên.
      label: 'Cắt khách (HH)',
      ...pair(request.customer_cut),
      note: 'Trích ra TỪ phần xin hỗ trợ, không cộng thêm',
    },
    {
      key: 'customer_cut_bonus',
      label: 'Cắt khách (thưởng)',
      // TODO(schema): đổi về `request.customer_cut_bonus` sau khi regenerate.
      ...pair((request as { customer_cut_bonus?: FeeSupportCalculationRow }).customer_cut_bonus),
      // Neo KHÁC dòng trên: cắt khách phần thưởng trích ra từ mức thưởng QUY ĐỊNH
      // ("Thưởng sale" phía trên), không phải từ một khoản xin thêm — nghiệp vụ
      // không cho xin hỗ trợ thưởng. Ghi rõ để người duyệt biết đối chiếu vào đâu.
      note: `Trích ra TỪ ${REQ_LABEL.bonus_regulated}, không làm tăng tổng chi`,
    },
    {
      key: 'sale_net',
      // Dùng đúng chữ của CR ("Sale hưởng"), khối bóc tách dùng "Sale thực hưởng".
      label: 'Sale hưởng',
      ...pair(request.sale_net),
      // BẰNG 0 LÀ HỢP LỆ, không phải bug: cắt khách trích ra từ phần xin hỗ trợ
      // (FSD §5 rule 1), xin 1% rồi cắt trọn 1% cho khách thì sale không thêm gì.
      // ÂM cũng hợp lệ với phiếu CHỈ cắt khách phần thưởng: phiếu không xin gì cả,
      // nên tác động ròng lên sale đúng bằng phần cắt, mang dấu trừ.
      note: 'Phí xin hỗ trợ − Cắt khách (bằng 0 hoặc âm đều hợp lệ)',
      emphasised: true,
    },
    {
      key: 'mv_remaining',
      label: 'Phí đại lý còn lại (MV)',
      ...pair(remainder.mv_remaining),
      note: 'Giá tính phí × (tỷ lệ đại lý − tỷ lệ xin hỗ trợ HH sale). Không trừ phí sale quy định',
      tone: 'mv',
      emphasised: true,
    },
  ]
}

type Props = FeeSupportSummaryOptions & {
  calculation: FeeSupportCalculation
  projectName?: string | null
  unitNumber?: string | null
}

/**
 * Bảng tính chi tiết dạng PHẲNG, bám bố cục file Excel tham chiếu của CR STT16:
 * một cột chỉ tiêu, một cột %, một cột thành tiền, một cột ghi chú — đọc thẳng từ
 * trên xuống theo mạch nghiệp vụ.
 *
 * Từ CR `86eyhjjug` đây là BỀ MẶT DUY NHẤT của sao kê: khối "bóc tách hai chiều"
 * (nhiều thẻ inflow/outflow/remainder) đã bỏ khỏi giao diện.
 */
export function FeeSupportCalculationSummary({
  calculation,
  projectName,
  unitNumber,
  bonusSupportIsAmountMode,
}: Props) {
  const rows = useMemo(
    () => buildFeeSupportSummaryRows(calculation, { bonusSupportIsAmountMode }),
    [calculation, bonusSupportIsAmountMode]
  )

  const columns: ColumnDef<FeeSupportSummaryRow>[] = useMemo(() => {
    const weightOf = (row: FeeSupportSummaryRow) =>
      row.emphasised ? 'typo-body-base-semibold' : 'typo-body-base'

    return [
      {
        id: 'label',
        header: 'Chỉ tiêu',
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <span className={cn(weightOf(row.original), 'text-content-dark-1')}>
              {row.original.label}
            </span>
            {/* Rate gốc gồm VAT thì % hiệu dụng thấp hơn — nói rõ để khỏi tưởng sai số. */}
            {row.original.includesVat ? (
              <Chip label="gồm VAT" variant={ColoredValueVariant.ORANGE} size="small" />
            ) : null}
          </span>
        ),
      },
      {
        id: 'pct',
        header: 'Tỷ lệ (%)',
        cell: ({ row }) => (
          <span className={cn(weightOf(row.original), 'text-content-dark-2')}>
            {percent(row.original.pct)}
          </span>
        ),
        meta: { width: 'w-[130px]', align: 'right' },
      },
      {
        id: 'amount',
        header: 'Thành tiền (VNĐ)',
        cell: ({ row }) => (
          <span className={cn(weightOf(row.original), 'text-content-dark-1')}>
            {money(row.original.amount)}
          </span>
        ),
        meta: { width: 'w-[200px]', align: 'right' },
      },
      {
        id: 'note',
        header: 'Ghi chú',
        cell: ({ row }) => (
          <span className="typo-body-sm-regular text-content-dark-3">
            {row.original.note || ''}
          </span>
        ),
        meta: { width: 'flex-1' },
      },
    ]
  }, [])

  /**
   * Caption gánh 2 số NGỮ CẢNH mà bảng phẳng không có dòng riêng:
   * - `commission_fee_calculation_price` — base A′ của mọi dòng phía sale; thiếu nó
   *   thì không ai đối chiếu được `2,13% × base = 213tr`. Chỉ khác `fee_calculation_price`
   *   (đã là dòng "Giá tính phí") khi deal đã đối chiếu, nên vẫn phải hiện riêng.
   * - `vat_rate` — lời giải cho chip "gồm VAT" trên các dòng MV nhận.
   *
   * Trước CR 86eyhjjug hai số này nằm ở tiêu đề các thẻ bóc tách; gỡ thẻ mà không
   * dời chúng sang đây là mất hẳn khỏi màn.
   */
  const captionParts = [
    projectName,
    unitNumber,
    calculation.commission_fee_calculation_price
      ? `Giá chia hoa hồng ${money(calculation.commission_fee_calculation_price)}`
      : null,
    calculation.vat_rate ? `VAT ${percent(calculation.vat_rate)}` : null,
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-3">
      {captionParts.length > 0 && (
        <span className="typo-body-sm-regular text-content-dark-3">{captionParts.join(' · ')}</span>
      )}

      <Table
        // Bảng nằm TRONG section chi tiết (page đã có px-10) → bỏ padding cấp-trang.
        className="px-0 pb-0"
        tableContainerClassName="rounded-xl"
        columns={columns}
        data={rows}
        getRowId={(row) => row.key}
        getRowClassName={(row) => (row.tone ? TONE_CLASS[row.tone] : '')}
        showSTT={false}
        showActions={false}
        enablePagination={false}
        manualPagination={false}
        emptyMessage="Chưa có dữ liệu tính toán"
      />
    </div>
  )
}

export default FeeSupportCalculationSummary
