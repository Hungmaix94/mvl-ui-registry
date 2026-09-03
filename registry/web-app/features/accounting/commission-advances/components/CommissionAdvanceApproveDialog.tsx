import { useEffect, useMemo, useState } from 'react'
import { RadioGroup } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import FullCellNumberInput from '@/components/commons/FullCellNumberInput'
import { formatCurrencyVND } from '@/utils/common'
import toastService from '@/services/toast-service'
import { handleApiError } from '@/utils/error-utils'
import { useDealCommissionShares } from '@/features/sales/deals/services/deal-service'
import { useInvestorAdvanceAccounts } from '@/features/accounting/investor-advances/services/investor-advance-service'
import {
  useCommissionAdvance,
  useAdminLeadApproveCommissionAdvance,
  useApproveCommissionAdvance,
} from '@/features/accounting/commission-advances/services/commission-advance-service'
import {
  buildApprovedAmounts,
  findInvalidApprovedAmount,
} from '@/features/accounting/commission-advances/utils/commission-advance-approve'
import {
  DEFAULT_TAX_ESTIMATE_RATE,
  estimateNetAfterTax,
  grossShareForRecipient,
  isApprovedOverEstimatedNet,
} from '@/features/accounting/commission-advances/utils/commission-advance-tax-estimate'
import { getRecipientName } from '@/features/accounting/commission-advances/utils/commission-advance-recipient-name'
import TaxRateStepper from '@/features/accounting/commission-advances/components/TaxRateStepper'

/**
 * Hai bậc duyệt CÓ sửa số tiền từng người thụ hưởng.
 *
 * `ADMIN_LEAD_APPROVE` (TP TKKD) chỉ chốt số tiền; `APPROVE` (kế toán) là bậc tiền thật đi ra
 * nên có thêm Nguồn tiền + Thuế suất tạm tính. Bậc `ADMIN_APPROVE` (TKKD) không nằm ở đây:
 * nó chỉ xác nhận chuyển bậc, không quyết định con số nào.
 */
export type CommissionAdvanceApproveMode = 'ADMIN_LEAD_APPROVE' | 'APPROVE'

/**
 * Giá trị radio "Nguồn tiền" ứng với tiền của MV. `RadioGroup` chỉ nhận `value: string`, mà
 * nguồn tiền MV lại là `null` phía state/payload — nên cần một sentinel để đi qua component.
 */
const FUNDING_SOURCE_MV = 'mv'

type Props = {
  open: boolean
  /** Phiếu đang duyệt. `null` khi chưa chọn dòng nào — dialog không query gì cả. */
  advanceId: number | null
  mode: CommissionAdvanceApproveMode
  onOpenChange: (open: boolean) => void
  /** Gọi sau khi duyệt thành công — nơi gọi tự quyết cách làm mới dữ liệu của màn mình. */
  onSuccess?: () => void
}

/**
 * Hộp thoại duyệt phiếu tạm ứng hoa hồng — DÙNG CHUNG cho màn Chi tiết và duyệt nhanh ngoài
 * màn Danh sách (ClickUp 86eympqft, BA yêu cầu vòng 3 ngày 19/08).
 *
 * Vì sao là một component chứ không phải chép sang màn Danh sách: trước đó dialog nằm inline
 * trong `CommissionAdvanceDetailPage`, nên duyệt nhanh ngoài list chỉ là một hộp xác nhận trơn
 * và gửi `data: {}` — **mất cả `approved_amounts` lẫn `funding_investor_advance_account_id`**.
 * Tức cùng một nút "Duyệt" nhưng hai màn cho ra hai kết quả khác nhau: duyệt ngoài list thì BE
 * trả đúng số đề xuất và nguồn tiền luôn là tiền MV, kể cả khi giao dịch có quỹ CĐT.
 *
 * Dialog tự tải phiếu bằng `useCommissionAdvance` thay vì nhận sẵn bản ghi từ dòng bảng:
 * query key trùng với query của màn Chi tiết nên ở đó KHÔNG tốn thêm request, còn ở màn Danh
 * sách thì đảm bảo số liệu đúng bằng màn Chi tiết thay vì phụ thuộc serializer của endpoint list.
 */
export default function CommissionAdvanceApproveDialog({
  open,
  advanceId,
  mode,
  onOpenChange,
  onSuccess,
}: Props) {
  const isAccountantStep = mode === 'APPROVE'

  const { data: record } = useCommissionAdvance(advanceId ?? 0, {
    enabled: open && !!advanceId,
  })

  const adminLeadApproveMutation = useAdminLeadApproveCommissionAdvance()
  const approveMutation = useApproveCommissionAdvance()

  const [approveLines, setApproveLines] = useState<
    {
      id: number
      name: string
      approved_amount: number
    }[]
  >([])

  /**
   * Thuế suất tạm tính ở bước KẾ TOÁN duyệt (20.17 — ClickUp 86eympqft).
   *
   * FE-only: KHÔNG nằm trong payload approve, KHÔNG lưu ở đâu cả. Nó chỉ trả lời giúp kế toán
   * câu "duyệt ngần này thì người thụ hưởng thực nhận bao nhiêu", để không chi vượt số thực
   * nhận. Cố tình KHÔNG dùng làm trần chặn cứng — trần thật là rule BE `advanceCapForShare`,
   * và thuế TNCN thật quyết toán ở tổng kết hoa hồng tháng.
   */
  const [taxEstimateRate, setTaxEstimateRate] = useState<number>(DEFAULT_TAX_ESTIMATE_RATE)

  /**
   * Nguồn tiền kế toán chọn khi duyệt: null = tiền MV, id = quỹ tạm ứng của chủ đầu tư.
   * Chỉ gửi ở bước APPROVE (kế toán) — bước TP TKKD không quyết định nguồn tiền.
   */
  const [fundingAccountId, setFundingAccountId] = useState<number | null>(null)

  // Quỹ tạm ứng của (chủ đầu tư, dự án) của căn — nguồn tiền hợp lệ duy nhất cho phiếu này.
  // BE validate lại lần nữa, nên đây chỉ để kế toán không phải tự tra id.
  const dealProjectId = record?.deal_detail?.project?.id
  // Lọc theo CẢ CĐT lẫn dự án: một CĐT có nhiều dự án, lọc mỗi project rồi lấy results[0] có
  // thể vớ nhầm quỹ của dự án khác cùng CĐT.
  const dealInvestorId = (record?.deal_detail as { investor?: { id?: number } } | undefined)
    ?.investor?.id
  /**
   * KHÔNG gate hai query dưới đây bằng `open`.
   *
   * Ở màn Chi tiết `advanceId` luôn là id của trang, nên bỏ `open` ra là chúng nạp sẵn ngay lúc
   * mở trang — đúng hành vi trước 19/08. Gate bằng `open` thì giây đầu sau khi bấm "Duyệt đề
   * xuất" dialog hiện *thiếu* "HH cả căn" và quỹ CĐT đọc thành "giao dịch này chưa có quỹ": hai
   * thông tin SAI, không phải chỉ là chậm. Ở màn Danh sách thì `advanceId` chỉ khác `null` đúng
   * lúc mở dialog duyệt (xem cách truyền prop bên đó), nên vẫn không có request thừa.
   */
  const { data: walletPage, isLoading: isLoadingWallet } = useInvestorAdvanceAccounts(
    dealProjectId
      ? { project: dealProjectId, ...(dealInvestorId ? { investor: dealInvestorId } : {}) }
      : undefined,
    { enabled: isAccountantStep && !!dealProjectId }
  )
  const investorAdvanceAccount = walletPage?.results?.[0]
  const investorAdvanceAccountId = investorAdvanceAccount?.id ?? null

  /**
   * Bảng chia của giao dịch — nguồn tiền hoa hồng GỐC (trước thuế) của từng người thụ hưởng.
   * `recipient_lines` chỉ có `requested_amount`, không có tiền gốc, nên phải tra sang bảng chia.
   * Cùng query key với bảng "Danh sách nhân viên thụ hưởng" ở màn Chi tiết ⇒ hai chỗ không bao
   * giờ hiện hai con số khác nhau cho cùng một người.
   */
  const { data: dealSplitShares, isLoading: isLoadingShares } = useDealCommissionShares(
    record?.deal || 0,
    'split',
    { enabled: !!record?.deal }
  )

  /**
   * Phiếu CÓ giao dịch nhưng bảng chia chưa về. Phải phân biệt với "phiếu không gắn giao dịch":
   * hai trạng thái đó cùng cho `gross === undefined`, mà cách hiển thị "ẩn hẳn dòng" thì đọc ra
   * y hệt nhau — nên lúc đang tải phải hiện nhãn kèm '—' thay vì bỏ dòng đi.
   */
  const isGrossPending = isAccountantStep && !!record?.deal && isLoadingShares

  /**
   * Hai nguồn tiền khi kế toán duyệt. Quỹ CĐT LUÔN được liệt kê, chỉ bị tắt khi giao dịch chưa
   * có quỹ — kế toán cần thấy lựa chọn đó tồn tại thì mới hiểu vì sao mình không chọn được;
   * ẩn hẳn đi thì dialog lặng lẽ đổi số lựa chọn giữa các phiếu và trông như mất tính năng.
   *
   * Lúc đang tải thì nhãn phải nói là ĐANG TẢI, không được nói "chưa có quỹ" — câu đó là một
   * khẳng định về nghiệp vụ, và nói sai nó thì kế toán chọn nhầm nguồn chi.
   */
  const fundingSourceOptions = useMemo(
    () => [
      { value: FUNDING_SOURCE_MV, label: 'Tiền của MV (thu hồi khi tổng kết hoa hồng tháng)' },
      {
        value: investorAdvanceAccountId ? String(investorAdvanceAccountId) : 'no-investor-wallet',
        label: investorAdvanceAccountId
          ? `Quỹ tạm ứng chủ đầu tư (số dư ${formatCurrencyVND(
              Number(investorAdvanceAccount?.balance || 0)
            )} VNĐ)`
          : isLoadingWallet
            ? 'Quỹ tạm ứng chủ đầu tư (đang tải số dư…)'
            : 'Quỹ tạm ứng chủ đầu tư (giao dịch này chưa có quỹ)',
        disabled: !investorAdvanceAccountId,
      },
    ],
    [investorAdvanceAccountId, investorAdvanceAccount, isLoadingWallet]
  )

  /**
   * lineId → "HH cả căn": tiền hoa hồng của người đó trên CẢ CĂN theo bảng chia của giao dịch,
   * trước thuế và không scale theo tiến độ tiền CĐT về.
   * `undefined` = phiếu không gắn deal (tạm ứng theo kỳ) hoặc dòng không khớp share nào ⇒ ẩn dòng.
   */
  const grossByLineId = useMemo(() => {
    const byLineId = new Map<number, number | undefined>()
    for (const line of record?.recipient_lines ?? []) {
      byLineId.set(line.id, grossShareForRecipient(dealSplitShares?.commission_shares, line))
    }
    return byLineId
  }, [record, dealSplitShares])

  /**
   * lineId → TRẦN thực nhận sau thuế = HH cả căn × (1 − thuế suất).
   * Đây là con số "tối đa có thể ứng sau thuế" mà task 86eympqft yêu cầu, và nó CHỈ có khi
   * phiếu có bảng chia.
   */
  const maxNetByLineId = useMemo(() => {
    const byLineId = new Map<number, number | undefined>()
    for (const [lineId, gross] of grossByLineId) {
      byLineId.set(lineId, estimateNetAfterTax(gross, taxEstimateRate))
    }
    return byLineId
  }, [grossByLineId, taxEstimateRate])

  /**
   * lineId → số tiền ĐỀ XUẤT.
   *
   * Tra theo id, KHÔNG theo chỉ số mảng (bản cũ ở màn Chi tiết dùng
   * `record.recipient_lines[idx].requested_amount`). `approveLines` là state riêng, còn `record`
   * thì refetch độc lập, nên có đúng MỘT nhịp render đã commit mà hai mảng còn lệch nhau — effect
   * đồng bộ chạy sau khi paint. Trong nhịp đó ô "Số tiền đề xuất" của người này hiện số của người
   * khác.
   *
   * Không viết test cho chỗ này: đã thử và test ra RỖNG, vì effect đồng bộ luôn kịp làm hai mảng
   * bằng nhau trước khi assert đọc được. Đây là đổi cho chắc, KHÔNG phải sửa một bug quan sát
   * được — đừng ghi nó vào phần bàn giao như một lỗi đã tồn tại.
   */
  const requestedByLineId = useMemo(() => {
    const byLineId = new Map<number, number>()
    for (const line of record?.recipient_lines ?? []) {
      byLineId.set(line.id, Number(line.requested_amount || 0))
    }
    return byLineId
  }, [record])

  // Nạp số đề xuất làm giá trị mặc định cho ô nhập, mỗi lần mở dialog cho một phiếu.
  useEffect(() => {
    if (!open || !record?.recipient_lines) return
    setApproveLines(
      record.recipient_lines.map((line) => ({
        id: line.id,
        name: getRecipientName(line),
        approved_amount: Number(line.requested_amount || 0),
      }))
    )
  }, [open, record])

  /**
   * Dọn sạch state khi đóng.
   *
   * `fundingAccountId` BẮT BUỘC phải reset, không chỉ thuế suất: ngoài màn Danh sách người dùng
   * mở dialog cho nhiều phiếu liên tiếp, mà quỹ CĐT gắn với (chủ đầu tư, dự án) của TỪNG phiếu.
   * Giữ lại lựa chọn cũ là định tuyến tiền của phiếu sau vào quỹ của phiếu trước — BE có validate
   * nhưng đây là code chạm tiền, không dựa vào một lớp chặn duy nhất ở xa.
   */
  const resetState = () => {
    setApproveLines([])
    setTaxEstimateRate(DEFAULT_TAX_ESTIMATE_RATE)
    setFundingAccountId(null)
  }

  const handleClose = () => {
    resetState()
    onOpenChange(false)
  }

  const handleConfirm = async () => {
    if (!record || !advanceId) return

    try {
      // Gửi số tiền duyệt từng người tới `approve` (BE lưu vào `approved_amount` và giữ nguyên
      // `requested_amount`). Danh sách rỗng -> duyệt mà không sửa số, BE trả đúng số đề xuất.
      const requestedById = new Map(
        (record.recipient_lines ?? []).map((l) => [l.id, Number(l.requested_amount || 0)])
      )
      const invalid = findInvalidApprovedAmount(approveLines, requestedById)
      if (invalid) {
        toastService.error('Số tiền duyệt phải lớn hơn 0 và không vượt quá số tiền đề xuất')
        return
      }
      const approvedAmounts = buildApprovedAmounts(approveLines)
      const payload = approvedAmounts.length > 0 ? { approved_amounts: approvedAmounts } : {}

      if (isAccountantStep) {
        await approveMutation.mutateAsync({
          id: advanceId,
          data: { ...payload, funding_investor_advance_account_id: fundingAccountId },
        })
        toastService.success('Duyệt đề xuất thành công')
      } else {
        await adminLeadApproveMutation.mutateAsync({ id: advanceId, data: payload })
        toastService.success('TP TKKD duyệt thành công, chuyển kế toán duyệt')
      }

      resetState()
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toastService.error(handleApiError(err))
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose()
      }}
      onCancel={handleClose}
      title={isAccountantStep ? 'Duyệt đề xuất' : 'TP TKKD duyệt đề xuất'}
      variant="custom"
      isHideCancelButton={false}
      onConfirm={handleConfirm}
      // Phiếu chưa về thì `handleConfirm` return sớm — bấm Duyệt không xảy ra gì và cũng không có
      // thông báo nào, người dùng chỉ thấy nút "chết". Tắt nút đi thì trạng thái đó đọc được.
      disableConfirm={!record}
      loading={approveMutation.isPending || adminLeadApproveMutation.isPending}
      confirmText="Duyệt"
      cancelText="Hủy"
      content={
        <div className="flex flex-col gap-4 pt-4">
          <div className="flex flex-col gap-4">
            <p className="typo-body-base text-content-dark-1">
              Vui lòng kiểm tra và xác nhận số tiền duyệt cho từng người thụ hưởng:
            </p>
            {isAccountantStep ? (
              <div className="border-border-1 flex flex-col gap-4 rounded-lg border bg-white p-4">
                <div className="flex flex-col gap-1">
                  <RadioGroup
                    id="advance-funding-source"
                    label="Nguồn tiền"
                    disabled={false}
                    options={fundingSourceOptions}
                    value={fundingAccountId === null ? FUNDING_SOURCE_MV : String(fundingAccountId)}
                    onChange={(val) => {
                      // Chỉ nhận id quỹ là số. Option "chưa có quỹ" mang giá trị sentinel
                      // và đang bị tắt, nhưng đây là code định tuyến TIỀN — không dựa vào
                      // mỗi thuộc tính `disabled` của DOM để giữ đúng nguồn chi.
                      const walletId = Number(val)
                      setFundingAccountId(
                        val === FUNDING_SOURCE_MV || !Number.isFinite(walletId) ? null : walletId
                      )
                    }}
                    className="flex-col gap-1"
                  />
                  <span className="text-content-dark-3 typo-body-sm-regular">
                    Chọn quỹ: quỹ chỉ bị trừ tiền mặt khi xác nhận đã chi. Khoản này chưa tính là đã
                    đối trừ công nợ với chủ đầu tư — công nợ chỉ giảm khi có một dòng đối chiếu của
                    chủ đầu tư ghi nhận số đã tạm ứng, không phải ở phiếu thu.
                  </span>
                </div>

                <SeparatorHorizontal />

                <div className="flex flex-col gap-2">
                  {/* Nhãn nhóm là <span>: ô nhập nằm trong TaxRateStepper và tự đặt tên
                      khả truy cập bằng `aria-label`, nên không có id ổn định để `htmlFor`. */}
                  <span className="typo-body-base-semibold text-neutral-90">
                    Thuế suất tạm tính
                  </span>
                  <TaxRateStepper
                    value={taxEstimateRate}
                    onChange={setTaxEstimateRate}
                    ariaLabel="Thuế suất tạm tính"
                  />
                  <span className="text-content-dark-3 typo-body-sm-regular">
                    Chỉ để ước tính số người thụ hưởng thực nhận sau thuế, giúp tránh duyệt quá số
                    thực nhận. Thuế suất này không được lưu và không phải là hạn mức — thuế TNCN
                    thật được tính lại khi tổng kết hoa hồng tháng.
                  </span>
                </div>
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              {/* Đơn vị nêu một lần ở đây, không lặp sau từng con số bên dưới. */}
              <div className="flex items-baseline justify-between gap-2">
                <span className="typo-body-base-semibold text-neutral-90">
                  Người thụ hưởng ({approveLines.length})
                </span>
                <span className="typo-body-sm text-content-dark-2">Số tiền tính bằng VNĐ</span>
              </div>
              <div className="border-border-1 divide-border-1 max-h-[300px] divide-y overflow-y-auto rounded-lg border bg-white">
                {approveLines.map((line, idx) => {
                  // HH cả căn — nêu ra để kế toán thấy "Tối đa có thể ứng sau thuế" bên dưới
                  // được tính từ đâu (BA yêu cầu 15/08), thay cho dòng ước tính thực nhận cũ.
                  const gross = grossByLineId.get(line.id)
                  // Trần thực nhận theo bảng chia — chỉ có khi phiếu gắn deal.
                  const maxNet = maxNetByLineId.get(line.id)
                  const isOverNet =
                    isAccountantStep && isApprovedOverEstimatedNet(line.approved_amount, maxNet)

                  return (
                    <div
                      key={line.id || idx}
                      data-testid={`advance-recipient-${line.id}`}
                      className="flex items-start justify-between gap-4 px-4 py-3"
                    >
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="typo-body-base-semibold text-content-dark-1 truncate">
                          {line.name}
                        </span>
                        {/* Grid 2 cột thay vì mỗi dòng một `flex`: nhãn dài khác nhau
                            ("Số tiền đề xuất" vs "Tối đa có thể ứng sau thuế") thì flex đẩy
                            mỗi con số ra một vị trí, đọc thành zigzag. Cột `max-content` ép
                            mọi số về cùng một đường, `tabular-nums` giữ chữ số thẳng hàng, và
                            "VNĐ" nêu một lần ở nhãn nhóm thay vì lặp sau từng số. */}
                        <dl className="text-content-dark-3 typo-body-sm-regular grid grid-cols-[max-content_max-content] items-baseline gap-x-3 gap-y-1">
                          <dt>Số tiền đề xuất</dt>
                          <dd className="text-content-dark-1 text-right font-medium tabular-nums">
                            {formatCurrencyVND(requestedByLineId.get(line.id) ?? 0)}
                          </dd>
                          {isAccountantStep && (gross !== undefined || isGrossPending) && (
                            <>
                              <dt>HH cả căn</dt>
                              <dd className="text-content-dark-1 text-right font-medium tabular-nums">
                                {gross !== undefined ? (
                                  formatCurrencyVND(gross)
                                ) : (
                                  <span className="text-content-dark-4">—</span>
                                )}
                              </dd>
                            </>
                          )}
                          {isAccountantStep && (maxNet !== undefined || isGrossPending) && (
                            <>
                              <dt>Tối đa có thể ứng sau thuế</dt>
                              <dd className="text-content-dark-1 text-right font-medium tabular-nums">
                                {maxNet !== undefined ? (
                                  formatCurrencyVND(maxNet)
                                ) : (
                                  <span className="text-content-dark-4">—</span>
                                )}
                              </dd>
                            </>
                          )}
                        </dl>
                        {isOverNet && (
                          <span className="text-data-red-default typo-body-sm-medium">
                            Số tiền duyệt đang vượt mức tối đa có thể ứng sau thuế.
                          </span>
                        )}
                      </div>
                      <div className="w-[200px] shrink-0">
                        <FullCellNumberInput
                          aria-label={`Số tiền duyệt cho ${line.name}`}
                          value={line.approved_amount}
                          suffix="VNĐ"
                          min={0}
                          isError={isOverNet}
                          onChange={(e) => {
                            const val =
                              e.target.value === '' ? 0 : Number(e.target.value.replace(/\D/g, ''))
                            setApproveLines((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, approved_amount: val } : item
                              )
                            )
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      }
    />
  )
}
