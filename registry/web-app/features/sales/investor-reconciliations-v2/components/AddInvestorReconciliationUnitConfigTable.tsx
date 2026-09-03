import type { ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'
import { Flex } from '@radix-ui/themes'

import { IconWarning } from '@/assets/icons'
import { Checkbox } from '@/components/ui'
import FullCellNumberInput from '@/components/commons/FullCellNumberInput'
import ReconPctAmountInline from '@/features/sales/_shared/reconciliation/ReconPctAmountInline'
import { formatReconUnit } from '@/features/sales/_shared/reconciliation/ReconConfigTableRow'
import {
  resolveProgressBeforePct,
  toNum,
} from '@/features/sales/_shared/reconciliation/recon-calculations'
import { rateScratchpadAmount } from '@/features/sales/_shared/reconciliation/recon-rate-scratchpad'
import type { ReconMvReference } from '@/features/sales/_shared/reconciliation/useReconMvReference'
import type {
  InvestorReconciliationSheetCreateItemValues,
  InvestorReconciliationSheetCreateValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import { formatCurrencyVND, formatPercent } from '@/utils/common'

/** Ô "MVL ghi nhận" khi hệ thống không có giá trị tham chiếu — mockup 2.0 dùng dấu "-" đơn giản (khác
 * `RECON_NO_REFERENCE_TEXT` verbose "— (không quy định)" của v1, giữ nguyên bên v1 không đổi). */
const NO_REFERENCE_TEXT = '-'

/**
 * Chú thích của dòng giấy nháp %→₫. Nói rõ đây là công cụ đối chiếu, KHÔNG phải nguồn số — và nói
 * trước rằng nhập bằng số tiền KHÔNG làm mất phần trăm tròn, vì đó là nỗi lo đầu tiên của người nhập.
 */
const RATE_SCRATCHPAD_HINT =
  'Chỉ để đối chiếu bằng mắt với bảng kê CĐT — hệ thống không lấy số này làm nguồn. Nhiều CĐT làm ' +
  'tròn giữa chừng nên số của họ có thể lệch vài đồng; cứ nhập thẳng số tiền của họ, hệ thống vẫn ' +
  'suy ra đúng tỷ lệ (làm tròn 2 chữ số thập phân).'

function money(value: number): string {
  return `${formatCurrencyVND(value, { maximumFractionDigits: 0 })} đ`
}

/** Viền ô input số đơn (không XOR %/đ) — khớp `wrapperCls` của v1 (ReconConfigTable.tsx), field
 * `FullCellNumberInput` không tự có viền, phải truyền ngoài mới thấy rõ là ô nhập. */
const NUMBER_INPUT_WRAPPER_CLS = 'border-border-1 rounded-sm border-[1px] min-h-[40px]'

function numericInputChange(
  setValue: ReturnType<typeof useFormContext<InvestorReconciliationSheetCreateValues>>['setValue'],
  path: `items.0.${keyof InvestorReconciliationSheetCreateItemValues}`,
  emptyValue: number | null,
  e: React.ChangeEvent<HTMLInputElement>
) {
  setValue(path as never, (e.target.value === '' ? emptyValue : Number(e.target.value)) as never, {
    shouldDirty: true,
  })
}

function SectionBand({ label, badge }: { label: string; badge?: string }) {
  return (
    <tr>
      <td colSpan={3} className="bg-data-blue-disabled px-3 py-1.5">
        <Flex align="center" gap="2">
          <span className="typo-body-sm-semibold text-data-blue-default">{label}</span>
          {badge && (
            <span className="typo-body-xs-medium bg-red-10 text-data-red-default rounded-full px-2 py-0.5">
              {badge}
            </span>
          )}
        </Flex>
      </td>
    </tr>
  )
}

function FieldRow({
  label,
  sub,
  mv,
  cdt,
}: {
  label: string
  sub?: ReactNode
  mv: ReactNode
  cdt: ReactNode
}) {
  return (
    <tr className="border-border-1 border-b">
      <td className="bg-background-2 border-border-1 border-r px-3 py-2.5 align-top">
        <span className="typo-body-base text-content-dark-2 block">{label}</span>
        {sub != null && (
          <span className="typo-body-xs-regular text-content-dark-3 mt-0.5 block">{sub}</span>
        )}
      </td>
      <td className="bg-background-2 border-border-1 typo-body-base-medium text-content-dark-2 border-r px-3 py-2.5 text-right align-middle">
        {mv}
      </td>
      <td className="bg-background-1 px-3 py-2.5 align-middle">
        <div className="flex justify-end">{cdt}</div>
      </td>
    </tr>
  )
}

/** Ô "MVL ghi nhận" đơn (không VAT) — text-right, tự chứa layout (dùng khi `mv` không phải chuỗi trơn). */
function MvValuePlain({ value }: { value: ReactNode }) {
  return <div className="text-right">{value}</div>
}

/** Ô "MVL ghi nhận" cho các mục có VAT: nhãn "(Gồm/Chưa gồm VAT)" bên TRÁI (mờ), giá trị bên PHẢI —
 * khớp mockup 2.0 (khác cách nối chuỗi "giá trị (nhãn)" của `withVatInclusion` bên v1). */
function MvValueWithVat({
  value,
  includeVat,
}: {
  value: string
  includeVat: boolean | null | undefined
}) {
  if (includeVat == null) return <MvValuePlain value={value} />
  return (
    <Flex align="center" justify="between" gap="2">
      <span className="typo-body-xs-regular text-content-dark-3 whitespace-nowrap">
        {includeVat ? '(Gồm VAT)' : '(Chưa gồm VAT)'}
      </span>
      <span>{value}</span>
    </Flex>
  )
}

export type AddInvestorReconciliationUnitConfigTableProps = {
  item: InvestorReconciliationSheetCreateItemValues
  mv: ReconMvReference
  disabled?: boolean
  /** "Đã đối chiếu X%" badge cạnh tiêu đề nhóm "Tiến độ". */
  reconciledPct?: number | null
  /** "Đã rút X%" badge cạnh tiêu đề nhóm "Phí tăng thêm". */
  extraWithdrawnPct?: number | null
  /**
   * Lũy kế giảm trừ các kỳ ĐÃ DUYỆT (PRE-VAT, khớp `prior_*` BE) — hint dưới "Giảm trừ khác" +
   * "· Trong đó Sale / F2 phải chịu". `undefined` = đang tải / chưa chọn căn ⇒ không render hint;
   * đã tải mà 0 ⇒ vẫn hiện "0 đ".
   */
  priorDeduction?: { total: number; toSale: number }
  /**
   * Chế độ phí đại lý đã "chốt" của căn theo các kỳ đã duyệt (`'pct'` = Tỷ lệ %, `'amt'` = Số tiền cố
   * định, `null`/`undefined` = chưa chốt). Khi kỳ này chọn lệch chế độ đã chốt → hiện cảnh báo sớm để
   * user sửa trước khi BE chặn lúc xác nhận phiếu.
   */
  establishedAgencyFeeMode?: 'pct' | 'amt' | null
  /**
   * Số tiền thưởng đã chia về Sale/F2 kỳ này — BE tính (read-only), lấy từ dòng đã lưu (`editingLine`).
   * BE trả decimal dạng CHUỖI (vd `"0"`) dù type gen ra `number` — luôn `Number(...)` trước khi so
   * sánh/format, KHÔNG dùng truthy check trực tiếp (`!!"0"` = true, sẽ hiện nhầm "= 0 đ").
   * `undefined`/`null`/0 ⇒ chưa có số BE (tạo mới / chưa lưu) hoặc đúng là 0 → không hiện.
   */
  sharedBonusToSaleAmount?: number | string | null
}

/**
 * Bảng cấu hình chính của dialog "Thêm căn" (2.0) — đúng 10 dòng cố định theo mockup (không tái sử
 * dụng `ReconConfigTable` của v1: component đó có thêm cột "Đối chiếu"/tooltip công thức/band phụ
 * không có trong mockup). Input %/đ dùng `ReconPctAmountInline` với `variant="pill"` (2 pill bo tròn
 * nhạt màu nằm trong khung input — đơn vị đang chọn có nền xám nhạt, đơn vị còn lại chữ đỏ nhấn — khớp
 * mockup) nhưng vẫn giữ logic XOR pct/amt + quy đổi theo giá tính phí của component gốc; field đơn vị
 * cố định dùng thẳng `FullCellNumberInput`. VAT dùng `Checkbox` vuông (mockup dùng checkbox, không
 * phải toggle) — KHÔNG dùng `ReconVatToggle` (switch) của v1.
 */
function AddInvestorReconciliationUnitConfigTable({
  item,
  mv,
  disabled,
  reconciledPct,
  extraWithdrawnPct,
  priorDeduction,
  establishedAgencyFeeMode,
  sharedBonusToSaleAmount,
}: AddInvestorReconciliationUnitConfigTableProps) {
  const { setValue } = useFormContext<InvestorReconciliationSheetCreateValues>()

  const feeCalculationPrice =
    item.fee_calculation_price ?? mv.feeCalculationPrice ?? mv.listedPrice ?? 0

  // Chế độ phí đại lý kỳ này (XOR pct/amt do ReconPctAmountInline đảm bảo). Cảnh báo khi kỳ này chọn
  // ngược chế độ đã chốt của căn — BE (_validate_agency_fee_mode_consistency) sẽ chặn khi xác nhận.
  const currentAgencyFeeMode: 'pct' | 'amt' | null =
    item.pct_agency_fee != null ? 'pct' : item.amt_agency_fee != null ? 'amt' : null
  const agencyFeeModeMismatch =
    establishedAgencyFeeMode != null &&
    currentAgencyFeeMode != null &&
    currentAgencyFeeMode !== establishedAgencyFeeMode

  // Khi "Tổng thưởng đại lý" (benchmark, %/đ) = 0 → khoá "Thưởng ghi nhận kỳ này" (không có tổng thưởng
  // để ghi nhận). KHÁC v1 (ReconConfigTable.tsx dòng ~275): v2 KHÔNG khoá % chia Sale/F2, Giảm trừ khác,
  // và "Trong đó Sale / F2 phải chịu" theo benchmark này — các mục khấu trừ độc lập với thưởng đại lý.
  const sharedBonusBenchmarkZero = !(
    Number(item.shared_bonus_amount) > 0 || Number(item.shared_bonus_pct) > 0
  )
  const feeDeduction = Number(item.fee_deduction) || 0

  // GAP 4c — giấy nháp cho ô tỷ lệ: số tiền mà "% tiến độ đợt này" quy ra theo phí trọn căn đang
  // khai. Chỉ để ĐỐI CHIẾU bằng mắt với bảng kê CĐT; không bao giờ tự ghi đè ô số tiền.
  const rateScratchpad = rateScratchpadAmount({
    feeCalculationPrice,
    pctAgencyFee: item.pct_agency_fee ?? null,
    amtAgencyFee: item.amt_agency_fee ?? null,
    pctPeriodCommission: item.pct_period_commission,
  })

  // "Tiến độ ĐC phí tăng thêm đợt này" — v1 (renderProgressTrio) hiển thị/nhập DELTA (% tăng thêm
  // đợt này), KHÔNG phải % lũy kế tuyệt đối; ghi cả extra_bonus_progress_from_pct (materialise baseline
  // từ lũy kế đã duyệt trước đó) VÀ extra_bonus_progress_to_pct = from + delta. Value tuyệt đối sẽ SAI
  // (mất baseline, ghi đè lũy kế cũ) nếu chỉ set thẳng to_pct như field %-only thông thường.
  const extraProgressBefore = resolveProgressBeforePct(
    item.extra_bonus_progress_from_pct,
    extraWithdrawnPct ?? null
  )
  const extraProgressHasBounds =
    item.extra_bonus_progress_from_pct != null && item.extra_bonus_progress_to_pct != null
  const extraProgressDelta = extraProgressHasBounds
    ? Math.round(
        (toNum(item.extra_bonus_progress_to_pct) - toNum(item.extra_bonus_progress_from_pct)) * 100
      ) / 100
    : item.extra_bonus_progress_to_pct != null
      ? Math.round((toNum(item.extra_bonus_progress_to_pct) - extraProgressBefore) * 100) / 100
      : null

  const feePriceMv =
    mv.feeCalculationPrice != null
      ? money(mv.feeCalculationPrice)
      : mv.listedPrice != null
        ? money(mv.listedPrice)
        : NO_REFERENCE_TEXT

  // HĐPP quy định phí đại lý theo % HOẶC ₫ cố định (XOR) — đọc thiếu một nhánh thì cấu hình dạng đó
  // biến mất khỏi cột tham chiếu, người nhập không còn mốc nào để đối chiếu (ClickUp 86eyee86j).
  const agencyFeeMv =
    mv.pctAgencyFee != null ? (
      <MvValueWithVat
        value={formatReconUnit(mv.pctAgencyFee, 'percent')}
        includeVat={mv.isAgencyFeeIncludeVat}
      />
    ) : mv.amtAgencyFee != null ? (
      <MvValueWithVat value={money(mv.amtAgencyFee)} includeVat={mv.isAgencyFeeIncludeVat} />
    ) : (
      NO_REFERENCE_TEXT
    )

  const sharedBonusMv =
    mv.amtSharedBonus != null ? (
      <MvValueWithVat value={money(mv.amtSharedBonus)} includeVat={mv.isSharedBonusIncludeVat} />
    ) : mv.pctSharedBonus != null ? (
      <MvValueWithVat
        value={formatReconUnit(mv.pctSharedBonus, 'percent')}
        includeVat={mv.isSharedBonusIncludeVat}
      />
    ) : (
      NO_REFERENCE_TEXT
    )

  // Cùng lý do với `agencyFeeMv`: phí tăng thêm cũng nhập được "₫ trọn gói HOẶC % trên giá tính phí",
  // nên tham chiếu phải đọc cả 2 nhánh — giống `sharedBonusMv` ngay trên.
  const extraBonusMv =
    mv.amtInvestorBonus != null ? (
      <MvValueWithVat
        value={money(mv.amtInvestorBonus)}
        includeVat={mv.isInvestorBonusIncludeVat}
      />
    ) : mv.pctInvestorBonus != null ? (
      <MvValueWithVat
        value={formatReconUnit(mv.pctInvestorBonus, 'percent')}
        includeVat={mv.isInvestorBonusIncludeVat}
      />
    ) : (
      NO_REFERENCE_TEXT
    )

  return (
    <div className="border-border-1 overflow-hidden rounded-md border">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[42%]" />
          <col className="w-[18%]" />
          <col className="w-[40%]" />
        </colgroup>
        <thead>
          <tr className="border-border-1 border-b">
            <th className="border-border-1 border-r" />
            <th className="border-border-1 typo-body-xs-semibold text-content-dark-3 border-r px-3 py-2 text-right uppercase">
              MVL ghi nhận
            </th>
            <th className="typo-body-xs-semibold text-content-dark-3 px-3 py-2 text-right uppercase">
              CĐT đề nghị
            </th>
          </tr>
        </thead>
        <tbody>
          <SectionBand label="Giá tính phí và tỷ lệ hoa hồng" />

          <FieldRow
            label="Giá tính phí (HĐMB)"
            sub="Có thể nhập số khác để điều chỉnh"
            mv={feePriceMv}
            cdt={
              <FullCellNumberInput
                value={item.fee_calculation_price ?? ''}
                suffix="VNĐ"
                disabled={disabled}
                inputWrapperClassName={NUMBER_INPUT_WRAPPER_CLS}
                onChange={(e) =>
                  numericInputChange(setValue, 'items.0.fee_calculation_price', null, e)
                }
              />
            }
          />

          <FieldRow
            label="% Hoa hồng (theo HĐPP)"
            sub="Nhập % khác hoặc bấm đ để đổi sang phí cố định"
            mv={agencyFeeMv}
            cdt={
              <Flex align="center" gap="2" className="w-full">
                <Checkbox
                  label="VAT"
                  checked={!!item.is_agency_fee_include_vat}
                  disabled={disabled}
                  onCheckedChange={(next) =>
                    setValue('items.0.is_agency_fee_include_vat', next === true, {
                      shouldDirty: true,
                    })
                  }
                />
                <ReconPctAmountInline
                  pct={item.pct_agency_fee}
                  amt={item.amt_agency_fee}
                  feeCalculationPrice={feeCalculationPrice}
                  disabled={disabled}
                  onChange={({ pct, amt }) => {
                    setValue('items.0.pct_agency_fee', pct, { shouldDirty: true })
                    setValue('items.0.amt_agency_fee', amt, { shouldDirty: true })
                  }}
                  wrapperClassname="flex-1"
                  variant="pill"
                />
              </Flex>
            }
          />

          {agencyFeeModeMismatch && (
            <tr className="border-border-1 border-b">
              <td colSpan={3} className="bg-background-8 px-3 py-2">
                <Flex align="start" gap="2" className="text-data-orange-default">
                  <IconWarning size={14} color="currentColor" className="mt-0.5 shrink-0" />
                  <span className="typo-body-xs-regular text-content-dark-2">
                    Các kỳ đối chiếu trước của giao dịch này dùng{' '}
                    <b className="text-data-orange-default">
                      {establishedAgencyFeeMode === 'pct'
                        ? 'Tỷ lệ % phí đại lý'
                        : 'Số tiền phí đại lý cố định'}
                    </b>
                    . Kỳ này cũng phải dùng{' '}
                    <b className="text-data-orange-default">
                      {establishedAgencyFeeMode === 'pct' ? 'Tỷ lệ %' : 'Số tiền cố định'}
                    </b>{' '}
                    — nếu để lệch, hệ thống sẽ chặn khi xác nhận phiếu.
                  </span>
                </Flex>
              </td>
            </tr>
          )}

          <FieldRow
            label="Giá tính phí riêng (Sale/F2)"
            sub="Chỉ tính HH Sale/F2 nội bộ - không ảnh hưởng đối chiếu CĐT"
            mv={NO_REFERENCE_TEXT}
            cdt={
              <FullCellNumberInput
                value={item.commission_fee_calculation_price ?? ''}
                suffix="VNĐ"
                placeholder="Bỏ trống ⇒ dùng giá A"
                disabled={disabled}
                inputWrapperClassName={NUMBER_INPUT_WRAPPER_CLS}
                onChange={(e) =>
                  numericInputChange(setValue, 'items.0.commission_fee_calculation_price', null, e)
                }
              />
            }
          />

          <SectionBand
            label="Tiến độ"
            badge={
              reconciledPct != null ? `Đã đối chiếu ${formatPercent(reconciledPct)}` : undefined
            }
          />

          <FieldRow
            label="Tiến độ đối chiếu đợt này"
            sub="Nhập % hoặc bấm đ để đổi sang số tiền (không VAT)"
            mv={NO_REFERENCE_TEXT}
            cdt={
              <div className="flex w-full flex-col items-end gap-1">
                <ReconPctAmountInline
                  pct={item.pct_period_commission}
                  amt={item.amt_period_commission}
                  feeCalculationPrice={feeCalculationPrice}
                  disabled={disabled}
                  onChange={({ pct, amt }) => {
                    setValue('items.0.pct_period_commission', pct, { shouldDirty: true })
                    setValue('items.0.amt_period_commission', amt, { shouldDirty: true })
                  }}
                  wrapperClassname="w-full"
                  variant="pill"
                />
                {/* GAP 4c — ô TỶ LỆ là giấy nháp: hiện số tiền mà tỷ lệ đang nhập quy ra để đối chiếu
                    với bảng kê CĐT. KHÔNG tự ghi số này vào form (xem recon-rate-scratchpad.ts). */}
                {rateScratchpad != null && (
                  <span
                    className="typo-body-xs-regular text-content-dark-3 text-right"
                    title={RATE_SCRATCHPAD_HINT}
                  >
                    {`≈ ${money(rateScratchpad)} theo tỷ lệ đang nhập — lệch với bảng kê CĐT thì bấm "đ" và nhập thẳng số của CĐT.`}
                  </span>
                )}
              </div>
            }
          />

          {/* GAP 4b — cột V của bảng kê CĐT. Con số KIỂM TRA: BE tính lại từ các ô trên và từ chối
              dòng khi lệch dù 1 đồng. Bỏ trống ⇒ không chạy kiểm tra. */}
          <FieldRow
            label="Tổng tiền có VAT của dòng (theo bảng kê CĐT)"
            sub="Bỏ trống ⇒ không đối chiếu. Có số ⇒ lệch 1 đồng là bị từ chối lưu."
            mv={NO_REFERENCE_TEXT}
            cdt={
              <FullCellNumberInput
                value={item.total_amount_with_vat ?? ''}
                suffix="VNĐ"
                placeholder="Bỏ trống nếu không đối chiếu"
                disabled={disabled}
                inputWrapperClassName={NUMBER_INPUT_WRAPPER_CLS}
                onChange={(e) =>
                  numericInputChange(setValue, 'items.0.total_amount_with_vat', null, e)
                }
              />
            }
          />

          <SectionBand label="Thưởng đại lý / Khấu trừ" />

          <FieldRow
            label="Tổng thưởng đại lý"
            sub="Tổng thưởng CĐT"
            mv={sharedBonusMv}
            cdt={
              <Flex align="center" gap="2" className="w-full">
                <Checkbox
                  label="VAT"
                  checked={!!item.is_shared_bonus_include_vat}
                  disabled={disabled}
                  onCheckedChange={(next) =>
                    setValue('items.0.is_shared_bonus_include_vat', next === true, {
                      shouldDirty: true,
                    })
                  }
                />
                <ReconPctAmountInline
                  pct={item.shared_bonus_pct}
                  amt={item.shared_bonus_amount}
                  feeCalculationPrice={feeCalculationPrice}
                  disabled={disabled}
                  onChange={({ pct, amt }) => {
                    setValue('items.0.shared_bonus_pct', pct, { shouldDirty: true })
                    setValue('items.0.shared_bonus_amount', amt ?? 0, { shouldDirty: true })
                  }}
                  wrapperClassname="flex-1"
                  variant="pill"
                />
              </Flex>
            }
          />

          <FieldRow
            label="Thưởng ghi nhận kỳ này"
            mv={NO_REFERENCE_TEXT}
            cdt={
              <FullCellNumberInput
                value={item.shared_bonus_period_amount ?? 0}
                suffix="VNĐ"
                disabled={disabled || sharedBonusBenchmarkZero}
                inputWrapperClassName={NUMBER_INPUT_WRAPPER_CLS}
                onChange={(e) =>
                  numericInputChange(setValue, 'items.0.shared_bonus_period_amount', 0, e)
                }
              />
            }
          />

          <FieldRow
            label="Đã tạm ứng (trừ quỹ CĐT)"
            sub="Số CĐT khai đã ứng trước cho căn này. Xác nhận dòng sẽ trừ vào số dư tạm ứng của CĐT; còn phải thu giảm tương ứng."
            mv={NO_REFERENCE_TEXT}
            cdt={
              <FullCellNumberInput
                value={item.shared_bonus_prepaid_amount ?? 0}
                suffix="VNĐ"
                disabled={disabled}
                inputWrapperClassName={NUMBER_INPUT_WRAPPER_CLS}
                onChange={(e) =>
                  numericInputChange(setValue, 'items.0.shared_bonus_prepaid_amount', 0, e)
                }
              />
            }
          />

          <FieldRow
            label="Tiến độ thanh toán thưởng sale/F2 kỳ này"
            sub="Thưởng cho Sale (F2 + CTV) kỳ này. Điền 0 = tạm dừng chia (vẫn ghi nhận thưởng)."
            mv={NO_REFERENCE_TEXT}
            cdt={
              <div className="flex w-full flex-col gap-1">
                <FullCellNumberInput
                  value={item.shared_bonus_to_sale_pct ?? ''}
                  suffix="%"
                  disabled={disabled}
                  inputWrapperClassName={NUMBER_INPUT_WRAPPER_CLS}
                  onChange={(e) =>
                    numericInputChange(setValue, 'items.0.shared_bonus_to_sale_pct', null, e)
                  }
                />
                {Number(sharedBonusToSaleAmount) > 0 && (
                  <span className="typo-body-xs-regular text-content-dark-3 text-right">
                    = {money(Number(sharedBonusToSaleAmount))} chia về Sale/F2 kỳ này
                  </span>
                )}
              </div>
            }
          />

          <FieldRow
            label="Giảm trừ khác"
            sub={
              <>
                CĐT khấu trừ trong kỳ
                {priorDeduction != null && (
                  <span className="mt-0.5 block">
                    Đã giảm trừ lũy kế các kỳ đã duyệt: {money(priorDeduction.total)}
                  </span>
                )}
              </>
            }
            mv={NO_REFERENCE_TEXT}
            cdt={
              <Flex align="center" gap="2" className="w-full">
                <Checkbox
                  label="VAT"
                  checked={!!item.is_fee_deduction_include_vat}
                  disabled={disabled}
                  onCheckedChange={(next) =>
                    setValue('items.0.is_fee_deduction_include_vat', next === true, {
                      shouldDirty: true,
                    })
                  }
                />
                <FullCellNumberInput
                  value={item.fee_deduction ?? 0}
                  suffix="VNĐ"
                  disabled={disabled}
                  inputWrapperClassName={`${NUMBER_INPUT_WRAPPER_CLS} flex-1`}
                  onChange={(e) => numericInputChange(setValue, 'items.0.fee_deduction', 0, e)}
                />
              </Flex>
            }
          />

          {feeDeduction > 0 && (
            <FieldRow
              label="· Trong đó Sale / F2 phải chịu"
              sub={
                <>
                  Phần khấu trừ áp vào Sale (F2 + CTV) — để trống hoặc 0 = không trừ vào HH Sale/F2
                  {priorDeduction != null && (
                    <span className="mt-0.5 block">
                      Đã trừ từ HH Sale/F2 lũy kế các kỳ đã duyệt: {money(priorDeduction.toSale)}
                    </span>
                  )}
                </>
              }
              mv={NO_REFERENCE_TEXT}
              cdt={
                <FullCellNumberInput
                  value={item.fee_deduction_to_sale_amount ?? ''}
                  suffix="VNĐ"
                  min={0}
                  max={feeDeduction}
                  disabled={disabled}
                  inputWrapperClassName={NUMBER_INPUT_WRAPPER_CLS}
                  onChange={(e) => {
                    const raw = e.target.value
                    setValue(
                      'items.0.fee_deduction_to_sale_amount',
                      (raw === '' ? null : Math.min(Number(raw), feeDeduction)) as never,
                      { shouldDirty: true }
                    )
                  }}
                />
              }
            />
          )}

          <SectionBand
            label="Phí tăng thêm"
            badge={
              extraWithdrawnPct != null ? `Đã rút ${formatPercent(extraWithdrawnPct)}` : undefined
            }
          />

          <FieldRow
            label="Tổng phí tăng thêm (thỏa thuận)"
            sub="Tổng phí tăng thêm CĐT cam kết cho căn này (trọn gói). Nhập theo đ trọn gói hoặc % trên giá tính phí"
            mv={extraBonusMv}
            cdt={
              <Flex align="center" gap="2" className="w-full">
                <Checkbox
                  label="VAT"
                  checked={!!item.is_extra_bonus_include_vat}
                  disabled={disabled}
                  onCheckedChange={(next) =>
                    setValue('items.0.is_extra_bonus_include_vat', next === true, {
                      shouldDirty: true,
                    })
                  }
                />
                <ReconPctAmountInline
                  pct={item.extra_bonus_pct}
                  amt={item.extra_bonus_amount}
                  feeCalculationPrice={feeCalculationPrice}
                  disabled={disabled}
                  onChange={({ pct, amt }) => {
                    setValue('items.0.extra_bonus_pct', pct, { shouldDirty: true })
                    setValue('items.0.extra_bonus_amount', amt, { shouldDirty: true })
                  }}
                  wrapperClassname="flex-1"
                  variant="pill"
                />
              </Flex>
            }
          />

          <FieldRow
            label="Tiến độ ĐC phí tăng thêm đợt này"
            sub="Tiến độ rút phí tăng thêm — ĐỘC LẬP với tiến độ base"
            mv={NO_REFERENCE_TEXT}
            cdt={
              <FullCellNumberInput
                value={extraProgressDelta ?? ''}
                suffix="%"
                min={0}
                max={100}
                disabled={disabled}
                inputWrapperClassName={NUMBER_INPUT_WRAPPER_CLS}
                onChange={(e) => {
                  const raw = e.target.value
                  const needsFromSeed =
                    item.extra_bonus_progress_from_pct == null ||
                    item.extra_bonus_progress_from_pct < extraProgressBefore
                  if (raw === '') {
                    if (needsFromSeed) {
                      setValue('items.0.extra_bonus_progress_from_pct', extraProgressBefore, {
                        shouldDirty: true,
                      })
                    }
                    setValue('items.0.extra_bonus_progress_to_pct', extraProgressBefore, {
                      shouldDirty: true,
                    })
                    return
                  }
                  if (raw === '.' || raw.endsWith('.')) return
                  const delta = Number(raw)
                  if (!Number.isFinite(delta)) return
                  if (needsFromSeed) {
                    setValue('items.0.extra_bonus_progress_from_pct', extraProgressBefore, {
                      shouldDirty: true,
                    })
                  }
                  setValue(
                    'items.0.extra_bonus_progress_to_pct',
                    Math.min(100, extraProgressBefore + delta),
                    { shouldDirty: true }
                  )
                }}
              />
            }
          />
        </tbody>
      </table>
    </div>
  )
}

export default AddInvestorReconciliationUnitConfigTable
