import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button, PageTitle, TextArea, Chip, Select } from '@/components/ui'
import { Table } from '@radix-ui/themes'
import { PaymentVoucherStatusBadge } from '@/features/accounting/payment-vouchers/_shares/components/PaymentVoucherStatusBadge'
import { type PaymentVoucherStatusType } from '@/features/accounting/payment-vouchers/constants/payment-voucher-constants'
import { ColoredValueVariant } from '@/api/schema'
import { getRecipientName } from '@/features/accounting/commission-advances/utils/commission-advance-recipient-name'
import AppDialog from '@/components/dialog/AppDialog'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes'
import { QUERY_KEYS } from '@/constants'
import { cn, formatCurrencyVND } from '@/utils/common'
import { formatDate, formatDateToApi } from '@/utils/date-utils'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { useBankAccounts } from '@/features/accounting/bank-accounts/services/bank-account-service'
import { ReferenceCode } from '@/components/commons'
import EmployeeProfileLink from '@/components/commons/EmployeeProfileLink'
import {
  CommissionAdvanceStatusBadge,
  CommissionAdvanceStatus,
} from '@/features/accounting/commission-advances/components/CommissionAdvanceStatusBadge'
import {
  useDealCommissionShares,
  useDealWorkspace,
} from '@/features/sales/deals/services/deal-service'
import {
  useCommissionAdvance,
  useAdminApproveCommissionAdvance,
  useRejectCommissionAdvance,
  useResubmitCommissionAdvance,
  useMarkPaidCommissionAdvance,
  useDeleteCommissionAdvance,
} from '@/features/accounting/commission-advances/services/commission-advance-service'
import {
  advanceAmountForLine,
  grossShareForRecipient,
  remainingGross,
  sumRecipientGrossTotals,
} from '@/features/accounting/commission-advances/utils/commission-advance-tax-estimate'
import CommissionAdvanceApproveDialog from '@/features/accounting/commission-advances/components/CommissionAdvanceApproveDialog'
import toastService from '@/services/toast-service'
import { handleApiError } from '@/utils/error-utils'
import { DisplayField } from '@/components/commons/DisplayField'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import { VoucherPaymentMethod } from '@/constants/api-schema-aliases'
import { withRememberedSearch } from '@/utils/list-url-memory'

/**
 * Bảng "Danh sách nhân viên thụ hưởng" — quy ước trình bày, gom một chỗ để 3 tầng
 * (header · dòng dữ liệu · dòng tổng) không bao giờ lệch nhau.
 *
 * Năm luật đứng sau mấy hằng này, đừng gỡ khi sửa bảng:
 * 1. **Đơn vị "VNĐ" KHÔNG nằm trong tên cột** (user chốt 17/08) và cũng không lặp ở từng ô — lặp ở
 *    ô là thêm 4 ký tự vào mọi con số ⇒ cột hẹp lại làm số xuống dòng, đúng lỗi BA bắt 15/08.
 *    Nêu một lần ở nhãn cạnh tiêu đề section.
 * 2. **`tabular-nums`** cho mọi ô tiền: chữ số đều bề rộng nên hàng nghìn thẳng cột theo chiều dọc.
 *    Thiếu nó thì các dòng lệch nhau dù đã canh phải.
 * 3. **`align-top` cho ô DỮ LIỆU**: ô danh tính cao 3 dòng, ô tiền chỉ 1 — canh giữa thì số trôi
 *    lửng giữa ô, canh trên thì mọi con số của một hàng nằm đúng một đường.
 * 4. **`align-middle!` cho ô HEADER**: `Table.ColumnHeaderCell` của Radix tự set `vertical-align`,
 *    thiếu `!` thì mấy ô `rowSpan={2}` (STT, Nhân viên, Đơn vị, Chức vụ) dính lên mép trên thay vì
 *    canh giữa chiều cao 2 hàng header.
 * 5. **Mọi đường kẻ của bảng dùng ĐÚNG MỘT màu `border-border-1`.** Từng có vạch `border-3`
 *    (#8c8c8c) dựng lên để ngăn nhóm cột "Theo bảng chia hoa hồng" — đã gỡ 17/08: đậm hơn mọi
 *    viền còn lại nên nó đọc ra như vệt lỗi, và việc phân nhóm thì hàng nhóm header đã làm rồi.
 *    Đừng dựng lại vạch khác màu ở đây.
 */
const TH_BASE = 'border-border-1 typo-body-sm-semibold text-content-dark-1 px-3 py-2 align-middle!'
const TD_TEXT = 'border-border-1 typo-body-sm text-content-dark-1 px-3 py-2.5 align-top'
const TD_MONEY = `${TD_TEXT} text-right tabular-nums whitespace-nowrap`

/**
 * Nhãn nhóm cột. Vẫn là caption chứ không phải tên cột, nhưng thứ bậc phải đến từ CHỮ IN + cỡ chữ,
 * KHÔNG từ việc làm mờ đi — bản mờ (`text-content-dark-3`) user đọc không nổi (17/08).
 */
const TH_GROUP =
  'border-border-1 typo-body-xs-semibold text-content-dark-1 px-3 py-1.5 align-middle! uppercase tracking-[0.06em]'

/** Nhãn cấp bậc trong ô "Đơn vị" — mờ để giá trị bên cạnh nổi lên, đây là nhãn phụ chứ không phải dữ liệu. */
const ORG_LABEL = 'typo-body-xs-regular text-content-dark-3'

/** Chưa biết số ⇒ '—' mờ, KHÔNG phải `0` (0 đọc như "không được nhận đồng nào"). */
const DASH = <span className="text-content-dark-4">—</span>

/**
 * Ô tiền trong card thông tin: **màu mực, không màu riêng**. Bốn số ở nhóm "Số tiền" từng mang
 * bốn màu khác nhau (xanh dương / xanh lá / cam / xám) — user gạt 17/08 vì màu không mang thông
 * tin gì, chỉ làm card ồn. Nhấn bằng ĐỘ ĐẬM; `tabular-nums` để 4 số thẳng cột với nhau.
 * Chip và badge trạng thái thì giữ màu — đó là màu mã hoá trạng thái, không phải trang trí.
 */
const CARD_MONEY_VALUE = 'typo-body-base-semibold text-content-dark-1 tabular-nums'

/**
 * Một nhóm trường trong card thông tin: caption + grid 4 cột.
 * Card này có 13 trường; đọc thành một khối phẳng thì không thấy đâu là thông tin phiếu, đâu là
 * tiền, đâu là dấu vết phê duyệt — nên chia nhóm và ngăn nhau bằng `SeparatorHorizontal`.
 * Caption lấy thứ bậc từ CHỮ IN + cỡ nhỏ, không phải từ việc làm mờ (xem `TH_GROUP`).
 */
function InfoGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <span className="typo-body-xs-semibold text-content-dark-1 tracking-[0.06em] uppercase">
        {title}
      </span>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  )
}

export function extractLinkedPaymentVouchers(record: unknown) {
  if (!record || typeof record !== 'object') return []
  const rec = record as Record<string, unknown>
  const list: Array<{
    id: number
    code: string
    amount?: number | string | null
    status?: PaymentVoucherStatusType | null
  }> = []

  // 1. Array from payment_vouchers / payment_voucher_list
  const pvList =
    ('payment_vouchers' in rec && Array.isArray(rec.payment_vouchers)
      ? rec.payment_vouchers
      : null) ||
    ('payment_voucher_list' in rec && Array.isArray(rec.payment_voucher_list)
      ? rec.payment_voucher_list
      : null)

  if (pvList) {
    for (const item of pvList) {
      if (typeof item === 'object' && item !== null) {
        const itemObj = item as Record<string, unknown>
        const id = Number(itemObj.id)
        const code = typeof itemObj.code === 'string' ? itemObj.code : ''
        if (id && code && !list.some((pv) => pv.id === id)) {
          list.push({
            id,
            code,
            amount: (itemObj.amount ?? itemObj.total_amount ?? itemObj.paid_amount) as
              | number
              | string
              | null
              | undefined,
            status: (typeof itemObj.status === 'string'
              ? itemObj.status
              : null) as PaymentVoucherStatusType | null,
          })
        }
      }
    }
  }

  // 2. Single object from payment_voucher / paid_payment_voucher_detail / payment_voucher_detail
  const single =
    ('payment_voucher' in rec ? rec.payment_voucher : null) ||
    ('paid_payment_voucher_detail' in rec ? rec.paid_payment_voucher_detail : null) ||
    ('payment_voucher_detail' in rec ? rec.payment_voucher_detail : null)

  if (single && typeof single === 'object' && single !== null) {
    const singleObj = single as Record<string, unknown>
    const id = Number(singleObj.id)
    const code = typeof singleObj.code === 'string' ? singleObj.code : ''
    if (id && code && !list.some((pv) => pv.id === id)) {
      list.push({
        id,
        code,
        amount: (singleObj.amount ?? singleObj.total_amount ?? singleObj.paid_amount) as
          | number
          | string
          | null
          | undefined,
        status: (typeof singleObj.status === 'string'
          ? singleObj.status
          : null) as PaymentVoucherStatusType | null,
      })
    }
  }

  // 3. From recipient_lines (payment_voucher_detail, payment_voucher_advance_line_detail, etc.)
  if ('recipient_lines' in rec && Array.isArray(rec.recipient_lines)) {
    for (const line of rec.recipient_lines) {
      if (typeof line === 'object' && line !== null) {
        const lineObj = line as Record<string, unknown>
        const pv =
          lineObj.payment_voucher_detail ||
          (lineObj.payment_voucher_advance_line_detail &&
            (lineObj.payment_voucher_advance_line_detail as Record<string, unknown>)
              .voucher_detail) ||
          (lineObj.payment_voucher_advance_line &&
          typeof lineObj.payment_voucher_advance_line === 'object' &&
          lineObj.payment_voucher_advance_line !== null
            ? (lineObj.payment_voucher_advance_line as Record<string, unknown>).voucher_detail ||
              lineObj.payment_voucher_advance_line
            : null)

        if (pv && typeof pv === 'object') {
          const pvObj = pv as Record<string, unknown>
          const id = Number(pvObj.id || pvObj.voucher_id)
          const code = typeof pvObj.code === 'string' ? pvObj.code : ''
          if (id && code && !list.some((item) => item.id === id)) {
            list.push({
              id,
              code,
              amount: (pvObj.amount ?? pvObj.total_amount ?? pvObj.paid_amount) as
                | number
                | string
                | null
                | undefined,
              status: (typeof pvObj.status === 'string'
                ? pvObj.status
                : null) as PaymentVoucherStatusType | null,
            })
          }
        }
      }
    }
  }

  return list
}

/**
 * Nguồn tiền kế toán chọn lúc duyệt (§2.6 srs 20.17 brd.md): null = tiền MV, có quỹ = trích quỹ
 * tạm ứng CĐT. Chưa duyệt thì chưa có gì để hiển thị — không suy đoán trước thành "Tiền của MV".
 */
export function resolveAdvanceFundingSource(record: unknown): {
  kind: 'unapproved' | 'mv' | 'wallet'
  walletBalance?: number
} {
  if (!record || typeof record !== 'object') return { kind: 'unapproved' }
  const rec = record as Record<string, unknown>
  if (!rec.approved_at) return { kind: 'unapproved' }

  const wallet = rec.funding_investor_advance_account_detail
  if (wallet && typeof wallet === 'object' && 'id' in wallet) {
    const balance = Number((wallet as Record<string, unknown>).balance || 0)
    return { kind: 'wallet', walletBalance: balance }
  }
  return { kind: 'mv' }
}

export default function CommissionAdvanceDetailPage() {
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const navigate = useNavigate()
  const ability = useAbility()
  const queryClient = useQueryClient()

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data: record, isLoading, error } = useCommissionAdvance(id, { enabled: !!id })
  const { data: dealWorkspace } = useDealWorkspace(record?.deal || 0, {
    enabled: !!record?.deal,
  })
  // ── Mutations ─────────────────────────────────────────────────────────────
  // Hai bậc duyệt CÓ sửa số tiền (TP TKKD + kế toán) nằm trong
  // `CommissionAdvanceApproveDialog` — dialog đó tự giữ mutation, nguồn tiền và thuế suất, vì
  // nó dùng chung với duyệt nhanh ngoài màn Danh sách.
  const adminApproveMutation = useAdminApproveCommissionAdvance()
  const rejectMutation = useRejectCommissionAdvance()
  const resubmitMutation = useResubmitCommissionAdvance()
  const markPaidMutation = useMarkPaidCommissionAdvance()
  const deleteMutation = useDeleteCommissionAdvance()

  // ── Actions State ────────────────────────────────────────────────────────
  const [actionType, setActionType] = useState<
    | 'ADMIN_APPROVE'
    | 'ADMIN_LEAD_APPROVE'
    | 'APPROVE'
    | 'REJECT'
    | 'RESUBMIT'
    | 'MARK_PAID'
    | 'DELETE'
    | null
  >(null)
  const [rejectReason, setRejectReason] = useState('')

  /**
   * Bảng chia của giao dịch — nguồn tiền hoa hồng GỐC (trước thuế) của từng người thụ hưởng.
   * `recipient_lines` chỉ có `requested_amount`, không có tiền gốc, nên phải tra sang bảng chia.
   * Tải ngay khi phiếu có deal (không chờ mở dialog nữa): từ 15/08 bảng "Danh sách nhân viên
   * thụ hưởng" ở thân trang cũng lấy hai cột "HH cả căn" / "HH còn lại" từ đây.
   */
  const { data: dealSplitShares } = useDealCommissionShares(record?.deal || 0, 'split', {
    enabled: !!record?.deal,
  })

  /**
   * lineId → "HH cả căn": tiền hoa hồng của người đó trên CẢ CĂN theo bảng chia của giao dịch,
   * trước thuế và không scale theo tiến độ tiền CĐT về. Một nguồn duy nhất cho cả bảng ở thân
   * trang lẫn dialog duyệt, để hai chỗ không bao giờ hiện hai con số khác nhau cho cùng một người.
   * `undefined` = phiếu không gắn deal (tạm ứng theo kỳ) hoặc dòng không khớp share nào ⇒ '—'.
   */
  const grossByLineId = useMemo(() => {
    const byLineId = new Map<number, number | undefined>()
    for (const line of record?.recipient_lines ?? []) {
      byLineId.set(line.id, grossShareForRecipient(dealSplitShares?.commission_shares, line))
    }
    return byLineId
  }, [record, dealSplitShares])

  /**
   * Hai ô "HH cả căn" / "HH còn lại" của dòng TỔNG CỘNG — chỉ ra số khi MỌI dòng đều tra được
   * bảng chia, còn một dòng chưa biết là ra '—' (xem `sumRecipientGrossTotals`): tổng chạy trên
   * tập con thì cộng chéo với cột "Số tiền duyệt" bên cạnh sẽ lệch mà không có gì báo.
   */
  const recipientGrossTotals = useMemo(
    () =>
      sumRecipientGrossTotals(
        (record?.recipient_lines ?? []).map((line) => ({
          gross: grossByLineId.get(line.id),
          advanceAmount: advanceAmountForLine(line),
        }))
      ),
    [record, grossByLineId]
  )

  // States for Mark Paid dialog
  const [voucherDate, setVoucherDate] = useState(() => formatDateToApi(new Date()))
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'CASH' | 'OFFSET'>('TRANSFER')
  const [fromBankAccountId, setFromBankAccountId] = useState<number | null>(null)
  const [recipientLineIds, setRecipientLineIds] = useState<number[]>([])

  useEffect(() => {
    if (record?.recipient_lines) {
      setRecipientLineIds(record.recipient_lines.map((l) => l.id))
    }
  }, [record])

  const { data: bankAccountsResponse } = useBankAccounts(
    { page_size: 100 },
    { enabled: actionType === 'MARK_PAID' }
  )

  const bankOptions = useMemo(() => {
    return (bankAccountsResponse?.results ?? []).map((acc) => ({
      value: acc.id,
      label: `${acc.account_number} - ${acc.bank_name} (${acc.account_holder})`,
    }))
  }, [bankAccountsResponse])

  const recipientLineOptions = useMemo(() => {
    return (record?.recipient_lines ?? []).map((line) => {
      const name = getRecipientName(line)
      return {
        value: line.id,
        label: `${name} - ${formatCurrencyVND(Number(line.requested_amount || 0))} ₫`,
      }
    })
  }, [record])

  const linkedPaymentVouchers = useMemo(() => {
    return extractLinkedPaymentVouchers(record)
  }, [record])

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    return !record
  }, [isLoading, record])

  const handleBack = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.COMMISSION_ADVANCE))
  }, [navigate])

  const handleEdit = useCallback(() => {
    navigate(APP_PATH.COMMISSION_ADVANCE_EDIT.replace(':id', String(id)))
  }, [navigate, id])

  const handleShowHistory = useCallback(() => {
    navigate(APP_PATH.COMMISSION_ADVANCE_HISTORY.replace(':id', String(id)))
  }, [navigate, id])

  const handleDelete = useCallback(() => setActionType('DELETE'), [])

  /**
   * Làm mới phiếu sau khi duyệt xong ở `CommissionAdvanceApproveDialog`.
   * Tách riêng khỏi `handleAction` vì dialog đó tự gọi mutation của nó.
   */
  const handleApproved = useCallback(() => {
    setActionType(null)
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.ACCOUNTING.COMMISSION_ADVANCES.DETAIL(id),
    })
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.ACCOUNTING.COMMISSION_ADVANCES.LIST({}),
    })
  }, [queryClient, id])

  const handleAction = async () => {
    if (!record || !actionType) return

    try {
      if (actionType === 'ADMIN_APPROVE') {
        // TKKD tier of a mobile-initiated advance (PENDING_ADMIN -> PENDING_ADMIN_LEAD). Note-only
        // body; amount revision only happens later at the TKKD-lead / accountant step.
        await adminApproveMutation.mutateAsync({ id, data: {} })
        toastService.success('TKKD duyệt thành công, chuyển TP TKKD duyệt')
      } else if (actionType === 'RESUBMIT') {
        await resubmitMutation.mutateAsync({ id, data: {} })
        toastService.success('Đã gửi lại đề xuất cho TP TKKD duyệt')
      } else if (actionType === 'REJECT') {
        if (!rejectReason.trim()) {
          toastService.error('Vui lòng nhập lý do từ chối')
          return
        }
        await rejectMutation.mutateAsync({
          id,
          data: { reason: rejectReason },
        })
        toastService.success('Từ chối đề xuất thành công')
      } else if (actionType === 'MARK_PAID') {
        if (!voucherDate) {
          toastService.error('Vui lòng chọn ngày chứng từ')
          return
        }
        if (paymentMethod === 'TRANSFER' && !fromBankAccountId) {
          toastService.error('Vui lòng chọn tài khoản ngân hàng chi')
          return
        }
        if (recipientLineIds.length === 0) {
          toastService.error('Vui lòng chọn ít nhất một dòng thụ hưởng')
          return
        }
        await markPaidMutation.mutateAsync({
          id,
          data: {
            voucher_date: voucherDate,
            payment_method: paymentMethod as VoucherPaymentMethod,
            from_bank_account_id:
              paymentMethod === 'TRANSFER' ? (fromBankAccountId ?? undefined) : undefined,
            recipient_line_ids: recipientLineIds,
          },
        })
        toastService.success('Cập nhật trạng thái đã chi thành công')
      } else if (actionType === 'DELETE') {
        await deleteMutation.mutateAsync(id)
        toastService.success('Xóa đề xuất thành công')
        navigate(APP_PATH.COMMISSION_ADVANCE)
        return
      }

      setActionType(null)
      setRejectReason('')
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.COMMISSION_ADVANCES.DETAIL(id),
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.COMMISSION_ADVANCES.LIST({}),
      })
    } catch (err) {
      toastService.error(handleApiError(err))
    }
  }

  const status = record?.status as string | undefined
  // The TKKD tier is only reached by a mobile-initiated advance (a web-created one enters one tier
  // higher, at PENDING_ADMIN_LEAD). TKKD confirms it up to the TKKD-lead here.
  const isPendingAdmin = status === CommissionAdvanceStatus.PENDING_ADMIN
  // The TKKD-lead tier is where a web-created advance now lands, so it drives its own button.
  const isPendingAdminLead = status === CommissionAdvanceStatus.PENDING_ADMIN_LEAD
  // The accountant's `approve` accepts PENDING_ACCOUNTANT plus legacy/investor-bonus DRAFT rows.
  const isAwaitingAccountant =
    status === CommissionAdvanceStatus.PENDING_ACCOUNTANT ||
    status === CommissionAdvanceStatus.DRAFT
  const isRejected = status === CommissionAdvanceStatus.REJECTED
  const isApproved = status === CommissionAdvanceStatus.APPROVED
  // Editing is only open while the advance is REJECTED (returned for rework) — the backend
  // refuses a PATCH in any other state.
  const canEdit = isRejected && ability.can('update', 'commissionadvance')

  const customActions = record && (
    <div className="flex justify-end gap-2">
      {isRejected && ability.can('resubmit', 'commissionadvance') && (
        <Button variant="primary" onClick={() => setActionType('RESUBMIT')}>
          Gửi lại
        </Button>
      )}
      {(isPendingAdmin || isPendingAdminLead || isAwaitingAccountant) &&
        ability.can('update', 'commissionadvance') && (
          <Button variant="secondary" onClick={() => setActionType('REJECT')}>
            Từ chối
          </Button>
        )}
      {isPendingAdmin && ability.can('admin_approve', 'commissionadvance') && (
        <Button variant="primary" onClick={() => setActionType('ADMIN_APPROVE')}>
          TKKD duyệt
        </Button>
      )}
      {isPendingAdminLead && ability.can('admin_lead_approve', 'commissionadvance') && (
        <Button variant="primary" onClick={() => setActionType('ADMIN_LEAD_APPROVE')}>
          TP TKKD duyệt
        </Button>
      )}
      {isAwaitingAccountant && ability.can('update', 'commissionadvance') && (
        <Button variant="primary" onClick={() => setActionType('APPROVE')}>
          Duyệt đề xuất
        </Button>
      )}
      {isApproved && ability.can('update', 'commissionadvance') && (
        <Button variant="primary" onClick={() => setActionType('MARK_PAID')}>
          Xác nhận đã chi
        </Button>
      )}
    </div>
  )

  /**
   * Xoá và Lịch sử KHÔNG nằm ở `customActions`: `PageTitle` đã có sẵn `handleDelete` /
   * `handleShowHistory` (kèm icon và kiểu nút chuẩn), và `docs/ai/patterns.md` xếp việc tự
   * dựng lại chúng vào nhóm anti-pattern. `customActions` chỉ dành cho hành động nghiệp vụ
   * không có prop tương đương — ở đây là các bước duyệt / từ chối / gửi lại / xác nhận đã chi.
   */
  const canDelete =
    (isPendingAdminLead || isAwaitingAccountant || isRejected) &&
    ability.can('destroy', 'commissionadvance')

  const breadcrumbs = [
    { label: 'Kế toán', href: '/accounting/dashboard' },
    { label: 'Tạm ứng hoa hồng', href: APP_PATH.COMMISSION_ADVANCE },
    { label: record?.code ? `Phiếu ${record.code}` : 'Chi tiết', isCurrentPage: true },
  ]

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title={record?.code ? `Phiếu đề xuất · ${record.code}` : 'Chi tiết phiếu đề xuất'}
        idLabel={record?.code || ''}
        enableBackButton
        handleBackButton={handleBack}
        breadcrumb={breadcrumbs}
        handleEdit={canEdit ? handleEdit : undefined}
        handleDelete={canDelete ? handleDelete : undefined}
        handleShowHistory={
          ability.can('histories', 'commissionadvance') ? handleShowHistory : undefined
        }
        customActions={customActions}
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={!!error}
        hasPermission={ability.can('retrieve', 'commissionadvance')}
      >
        {record && (
          <div className="flex flex-grow flex-col gap-5 overflow-y-auto px-7 pt-4 pb-6">
            {/* Section 1: Thông tin đề xuất */}
            <div className="flex flex-col gap-5">
              <span className="typo-body-xl-semibold text-content-dark-1">Thông tin đề xuất</span>
              <div className="border-border-1 bg-surface-primary-default flex flex-col gap-5 rounded-xl border p-6">
                <InfoGroup title="Phiếu">
                  <DisplayField label="Mã phiếu" value={record.code} />
                  <DisplayField
                    label="Ngày đề xuất"
                    value={record.created_at ? formatDate(record.created_at) : '—'}
                  />
                  <DisplayField
                    label="Kỳ kế toán"
                    value={
                      record.period_month && record.period_year ? (
                        <Chip
                          variant={ColoredValueVariant.GREY}
                          label={`${String(record.period_month).padStart(2, '0')}/${record.period_year}`}
                          size="small"
                        />
                      ) : (
                        '—'
                      )
                    }
                  />
                  <DisplayField
                    label="Trạng thái đề xuất"
                    value={<CommissionAdvanceStatusBadge status={record.status} />}
                  />
                </InfoGroup>

                <SeparatorHorizontal />

                <InfoGroup title="Giao dịch">
                  <DisplayField
                    label="Giao dịch"
                    value={
                      record.deal ? (
                        <ReferenceCode
                          code={record.deal_detail?.code || `Giao dịch #${record.deal}`}
                          linkTo={APP_PATH.DEAL_DETAIL.replace(':id', String(record.deal))}
                        />
                      ) : (
                        'Tạm ứng theo kỳ'
                      )
                    }
                  />
                  {record.deal && (
                    <>
                      <DisplayField
                        label="Tên dự án"
                        value={
                          dealWorkspace?.overview?.project?.name ||
                          dealWorkspace?.header?.project_name ||
                          '—'
                        }
                      />
                      <DisplayField
                        label="Mã căn"
                        value={
                          dealWorkspace?.overview?.pi?.unit_number ||
                          dealWorkspace?.overview?.pi?.code ||
                          '—'
                        }
                      />
                    </>
                  )}
                </InfoGroup>

                <SeparatorHorizontal />

                <InfoGroup title="Số tiền">
                  <DisplayField
                    label="Tổng tiền tạm ứng"
                    valueClassName={CARD_MONEY_VALUE}
                    value={`${formatCurrencyVND(Number(record.requested_amount || 0))} VNĐ`}
                  />
                  <DisplayField
                    label="Đã thanh toán"
                    valueClassName={CARD_MONEY_VALUE}
                    value={`${formatCurrencyVND(Number(record.paid_amount || 0))} VNĐ`}
                  />
                  <DisplayField
                    label="Đã thu hồi"
                    valueClassName={CARD_MONEY_VALUE}
                    value={`${formatCurrencyVND(Number(record.recovered_amount || 0))} VNĐ`}
                  />
                  <DisplayField
                    label="Còn phải thu hồi"
                    valueClassName={CARD_MONEY_VALUE}
                    value={`${formatCurrencyVND(
                      Math.max(
                        0,
                        Number(record.paid_amount || 0) - Number(record.recovered_amount || 0)
                      )
                    )} VNĐ`}
                  />
                </InfoGroup>

                <SeparatorHorizontal />

                <InfoGroup title="Phê duyệt & phiếu chi">
                  <DisplayField
                    label="Ngày phê duyệt"
                    value={record.approved_at ? formatDate(record.approved_at) : '—'}
                  />
                  <DisplayField
                    label="Người phê duyệt"
                    value={record.approved_by ? `ID: ${record.approved_by}` : '—'}
                  />
                  <DisplayField
                    label="Nguồn tiền"
                    value={(() => {
                      const funding = resolveAdvanceFundingSource(record)
                      if (funding.kind === 'unapproved') return '—'
                      if (funding.kind === 'mv') return 'Tiền của MV'
                      return (
                        <>
                          Quỹ tạm ứng chủ đầu tư
                          <span className="text-content-dark-3 typo-body-sm-regular ml-1">
                            (số dư quỹ: {formatCurrencyVND(funding.walletBalance || 0)} VNĐ)
                          </span>
                        </>
                      )
                    })()}
                  />
                  <DisplayField
                    label="Phiếu chi liên kết"
                    value={
                      linkedPaymentVouchers.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {linkedPaymentVouchers.map((pv) => (
                            <div key={pv.id} className="flex items-center gap-2">
                              <ReferenceCode
                                code={pv.code}
                                linkTo={APP_PATH.PAYMENT_VOUCHER_DETAIL.replace(
                                  ':id',
                                  String(pv.id)
                                )}
                              />
                              {pv.amount != null && (
                                <span className="text-xs font-medium text-neutral-600">
                                  ({formatCurrencyVND(Number(pv.amount))} ₫)
                                </span>
                              )}
                              {pv.status && <PaymentVoucherStatusBadge status={pv.status} />}
                            </div>
                          ))}
                        </div>
                      ) : (
                        '—'
                      )
                    }
                  />
                </InfoGroup>

                {record.request_reason && (
                  <>
                    <SeparatorHorizontal />
                    <DisplayField label="Lý do tạm ứng" value={record.request_reason} />
                  </>
                )}
              </div>
            </div>

            <SeparatorHorizontal />

            {/* Section 2: Thông tin người đề xuất */}
            <div className="flex flex-col gap-5">
              <span className="typo-body-xl-semibold text-content-dark-1">
                Thông tin người đề xuất
              </span>
              {/* Dòng 1 = người đó là ai · Dòng 2 = thuộc đơn vị nào, ghi rõ ĐỦ BA CẤP
                  (chi nhánh → khối → phòng ban). Grid 3 cột nên hai dòng thẳng cột với nhau,
                  và trường "Đơn vị / Phòng ban" cũ bị thay hẳn vì nó chỉ nói được một cấp. */}
              <div className="border-border-1 bg-surface-primary-default grid grid-cols-1 gap-6 rounded-xl border p-6 md:grid-cols-2 lg:grid-cols-3">
                <DisplayField
                  label="Họ và tên"
                  value={record.requester_employee_detail?.fullname || '—'}
                />
                <DisplayField
                  label="Mã nhân viên"
                  value={
                    record.requester_employee_detail?.code ? (
                      // Bấm mã mở hồ sơ nhân viên ở TAB MỚI; component tự gate `employee.retrieve`
                      // và hạ về text thường khi thiếu quyền — giống cột Mã NV ở bảng thụ hưởng.
                      <EmployeeProfileLink
                        employeeId={
                          record.requester_employee_detail.id ?? record.requester_employee
                        }
                        title={`Xem hồ sơ ${record.requester_employee_detail.fullname || 'nhân viên'}`}
                      >
                        {record.requester_employee_detail.code}
                      </EmployeeProfileLink>
                    ) : record.requester_employee ? (
                      String(record.requester_employee)
                    ) : (
                      '—'
                    )
                  }
                />
                <DisplayField
                  label="Chức vụ"
                  value={record.requester_employee_detail?.position?.name || '—'}
                />
                <DisplayField
                  label="Chi nhánh"
                  value={record.requester_employee_detail?.branch?.name || '—'}
                />
                <DisplayField
                  label="Khối"
                  value={record.requester_employee_detail?.block?.name || '—'}
                />
                <DisplayField
                  label="Phòng ban"
                  value={record.requester_employee_detail?.department?.name || '—'}
                />
              </div>
            </div>

            {linkedPaymentVouchers.length > 0 && (
              <>
                <SeparatorHorizontal />
                <div className="flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <span className="typo-body-xl-semibold text-content-dark-1">
                      Phiếu chi liên kết
                    </span>
                    <Chip
                      label={`${linkedPaymentVouchers.length} phiếu chi`}
                      variant={ColoredValueVariant.BLUE}
                      size="small"
                    />
                  </div>
                  <div className="border-border-1 overflow-x-auto rounded-md border">
                    <Table.Root className="w-full border-collapse">
                      <Table.Header className="bg-neutral-10">
                        <Table.Row>
                          <Table.ColumnHeaderCell className="border-border-1 w-[50px] border-r px-3 py-2 text-center align-middle">
                            STT
                          </Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell className="border-border-1 border-r px-3 py-2 align-middle">
                            Mã phiếu chi
                          </Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell className="border-border-1 border-r px-3 py-2 text-right align-middle">
                            Số tiền chi
                          </Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell className="border-border-1 border-r px-3 py-2 text-center align-middle">
                            Trạng thái
                          </Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell className="border-border-1 px-3 py-2 text-center align-middle">
                            Hành động
                          </Table.ColumnHeaderCell>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {linkedPaymentVouchers.map((pv, idx) => {
                          const link = APP_PATH.PAYMENT_VOUCHER_DETAIL.replace(':id', String(pv.id))
                          return (
                            <Table.Row key={pv.id || idx} className="hover:bg-neutral-10">
                              <Table.Cell className="border-border-1 border-r px-3 py-2 text-center align-middle">
                                {idx + 1}
                              </Table.Cell>
                              <Table.Cell className="border-border-1 border-r px-3 py-2 align-middle">
                                <ReferenceCode code={pv.code} linkTo={link} />
                              </Table.Cell>
                              <Table.Cell className="border-border-1 border-r px-3 py-2 text-right align-middle font-semibold text-green-600">
                                {pv.amount != null
                                  ? `${formatCurrencyVND(Number(pv.amount))} VNĐ`
                                  : '—'}
                              </Table.Cell>
                              <Table.Cell className="border-border-1 border-r px-3 py-2 text-center align-middle">
                                {pv.status ? <PaymentVoucherStatusBadge status={pv.status} /> : '—'}
                              </Table.Cell>
                              <Table.Cell className="border-border-1 px-3 py-2 text-center align-middle">
                                <Link
                                  to={link}
                                  target="_blank"
                                  className="text-brand-primary hover:text-brand-secondary font-medium transition-colors"
                                >
                                  Xem chi tiết ↗
                                </Link>
                              </Table.Cell>
                            </Table.Row>
                          )
                        })}
                      </Table.Body>
                    </Table.Root>
                  </div>
                </div>
              </>
            )}

            <SeparatorHorizontal />

            {/* Section 3: Danh sách nhân viên thụ hưởng */}
            <div className="flex flex-col gap-5">
              {/* Đơn vị tiền nêu MỘT LẦN ở đây — user chốt 17/08 là không nhét "VNĐ" vào tên cột. */}
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="typo-body-xl-semibold text-content-dark-1">
                  Danh sách nhân viên thụ hưởng
                </span>
                <span className="typo-body-sm text-content-dark-2">Số tiền tính bằng VNĐ</span>
              </div>
              <div className="border-border-1 overflow-x-auto rounded-md border">
                <Table.Root className="w-full border-collapse">
                  <Table.Header className="bg-neutral-10">
                    {/* Hàng nhóm: nêu ĐƠN VỊ một lần cho cả nhóm (thay vì "VNĐ" ở từng ô — chính
                        cái đó làm số bị xuống dòng), và nói ra NGUỒN của hai cột HH: chúng đến từ
                        bảng chia của giao dịch, không phải số của phiếu này. */}
                    <Table.Row>
                      <Table.ColumnHeaderCell
                        rowSpan={2}
                        className={cn(TH_BASE, 'w-[46px] border-r text-center')}
                      >
                        STT
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell rowSpan={2} className={cn(TH_BASE, 'border-r')}>
                        Nhân viên
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell rowSpan={2} className={cn(TH_BASE, 'border-r')}>
                        Đơn vị
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell rowSpan={2} className={cn(TH_BASE, 'border-r')}>
                        Chức vụ
                      </Table.ColumnHeaderCell>
                      {/* KHÔNG thêm `border-b` ở đây: `Table.ColumnHeaderCell` của Radix đã tự vẽ
                          đường kẻ ngang bằng `box-shadow: inset 0 -1px`. Thêm border là hai đường
                          xếp lên nhau ⇒ dải dày hơn mọi kẻ khác (user bắt lỗi 17/08). */}
                      <Table.ColumnHeaderCell
                        colSpan={2}
                        className={cn(TH_GROUP, 'border-r text-center')}
                      >
                        Phiếu này
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell colSpan={2} className={cn(TH_GROUP, 'text-center')}>
                        Theo bảng chia hoa hồng
                      </Table.ColumnHeaderCell>
                    </Table.Row>
                    <Table.Row>
                      <Table.ColumnHeaderCell className={cn(TH_BASE, 'border-r text-right')}>
                        Số tiền đề xuất
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell className={cn(TH_BASE, 'border-r text-right')}>
                        Số tiền duyệt
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell className={cn(TH_BASE, 'border-r text-right')}>
                        HH cả căn
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell className={cn(TH_BASE, 'text-right')}>
                        HH còn lại
                      </Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {!record.recipient_lines || record.recipient_lines.length === 0 ? (
                      <Table.Row>
                        <Table.Cell
                          colSpan={8}
                          className="typo-body-sm text-content-dark-3 py-8 text-center italic"
                        >
                          Chưa có dòng nhân viên thụ hưởng nào.
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      <>
                        {record.recipient_lines.map((line, idx) => {
                          // HH cả căn từ bảng chia; HH còn lại = HH cả căn − số phiếu này lấy
                          // (duyệt nếu đã duyệt, chưa thì đề xuất). Chưa tra được bảng chia ⇒ '—'.
                          const gross = grossByLineId.get(line.id)
                          const remaining = remainingGross(gross, advanceAmountForLine(line))
                          const approved =
                            line.approved_amount != null ? Number(line.approved_amount) : undefined
                          // Ba cấp tổ chức, ghi rõ từng cấp kèm nhãn (user chốt 17/08): gộp thành
                          // "A / B / C" thì người đọc phải tự đoán đâu là chi nhánh, đâu là khối.
                          const orgLevels = [
                            {
                              label: 'Chi nhánh',
                              value: line.recipient_employee_detail?.branch?.name,
                            },
                            { label: 'Khối', value: line.recipient_employee_detail?.block?.name },
                            {
                              label: 'Phòng ban',
                              value: line.recipient_employee_detail?.department?.name,
                            },
                          ]
                          return (
                            <Table.Row key={line.id || idx} className="hover:bg-neutral-10">
                              <Table.Cell
                                className={cn(TD_TEXT, 'text-content-dark-3 border-r text-center')}
                              >
                                {idx + 1}
                              </Table.Cell>
                              {/* Tên + mã NV gộp một ô: hai mẩu cùng trả lời "ai", tách hai cột
                                  chỉ tốn chiều ngang của bảng. */}
                              <Table.Cell className={cn(TD_TEXT, 'border-r')}>
                                <div className="flex flex-col items-start gap-1">
                                  <span className="typo-body-sm-semibold text-content-dark-1">
                                    {getRecipientName(line)}
                                  </span>
                                  {line.recipient_employee_detail?.code ? (
                                    // Mã NV mở hồ sơ nhân viên ở TAB MỚI. `EmployeeProfileLink`
                                    // tự gate `employee.retrieve` và tự hạ về text thường khi
                                    // thiếu quyền hoặc thiếu id — không bao giờ render link chết.
                                    <EmployeeProfileLink
                                      employeeId={
                                        line.recipient_employee_detail.id ?? line.recipient_employee
                                      }
                                      title={`Xem hồ sơ ${getRecipientName(line)}`}
                                    >
                                      <ReferenceCode code={line.recipient_employee_detail.code} />
                                    </EmployeeProfileLink>
                                  ) : line.recipient_employee ? (
                                    <span className="typo-body-xs-regular text-content-dark-3">
                                      {String(line.recipient_employee)}
                                    </span>
                                  ) : null}
                                </div>
                              </Table.Cell>
                              {/* Đơn vị: chi nhánh → khối → phòng ban, mỗi cấp một dòng có nhãn.
                                  Grid 2 cột để giá trị của cả 3 cấp thẳng một đường. */}
                              <Table.Cell className={cn(TD_TEXT, 'border-r')}>
                                <div className="grid grid-cols-[max-content_1fr] items-baseline gap-x-2 gap-y-0.5">
                                  {orgLevels.map((level) => (
                                    <Fragment key={level.label}>
                                      <span className={ORG_LABEL}>{level.label}</span>
                                      <span className="typo-body-sm text-content-dark-1">
                                        {level.value || DASH}
                                      </span>
                                    </Fragment>
                                  ))}
                                </div>
                              </Table.Cell>
                              <Table.Cell className={cn(TD_TEXT, 'border-r')}>
                                {line.recipient_employee_detail?.position?.name || DASH}
                              </Table.Cell>
                              <Table.Cell className={cn(TD_MONEY, 'text-content-dark-1 border-r')}>
                                {formatCurrencyVND(Number(line.requested_amount || 0))}
                              </Table.Cell>
                              {/* Không tô màu ô này: chênh lệch duyệt/đề xuất đã tự hiện ra vì hai
                                  cột nằm cạnh nhau, tô thêm là nhấn lặp — và bảng thì chỉ được
                                  phép có MỘT màu, dành cho HH còn lại âm. */}
                              <Table.Cell className={cn(TD_MONEY, 'border-r font-medium')}>
                                {approved !== undefined ? formatCurrencyVND(approved) : DASH}
                              </Table.Cell>
                              <Table.Cell className={cn(TD_MONEY, 'text-content-dark-1 border-r')}>
                                {gross !== undefined ? formatCurrencyVND(gross) : DASH}
                              </Table.Cell>
                              <Table.Cell
                                className={cn(
                                  TD_MONEY,
                                  remaining !== undefined && remaining < 0
                                    ? 'text-data-red-default font-medium'
                                    : 'text-content-dark-1'
                                )}
                              >
                                {remaining !== undefined ? formatCurrencyVND(remaining) : DASH}
                              </Table.Cell>
                            </Table.Row>
                          )
                        })}
                        <Table.Row className="bg-neutral-20">
                          <Table.Cell
                            colSpan={4}
                            className={cn(
                              TD_TEXT,
                              'typo-body-sm-semibold text-content-dark-1 border-r'
                            )}
                          >
                            TỔNG CỘNG
                          </Table.Cell>
                          <Table.Cell
                            className={cn(TD_MONEY, 'text-content-dark-1 border-r font-semibold')}
                          >
                            {formatCurrencyVND(
                              record.recipient_lines.reduce(
                                (sum, line) => sum + Number(line.requested_amount || 0),
                                0
                              )
                            )}
                          </Table.Cell>
                          <Table.Cell
                            className={cn(TD_MONEY, 'text-content-dark-1 border-r font-semibold')}
                          >
                            {record.recipient_lines.some((line) => line.approved_amount != null)
                              ? formatCurrencyVND(
                                  record.recipient_lines.reduce(
                                    (sum, line) => sum + Number(line.approved_amount || 0),
                                    0
                                  )
                                )
                              : DASH}
                          </Table.Cell>
                          <Table.Cell
                            className={cn(TD_MONEY, 'text-content-dark-1 border-r font-semibold')}
                          >
                            {recipientGrossTotals.gross !== undefined
                              ? formatCurrencyVND(recipientGrossTotals.gross)
                              : DASH}
                          </Table.Cell>
                          <Table.Cell
                            className={cn(
                              TD_MONEY,
                              'font-semibold',
                              recipientGrossTotals.remaining !== undefined &&
                                recipientGrossTotals.remaining < 0
                                ? 'text-data-red-default'
                                : 'text-content-dark-1'
                            )}
                          >
                            {recipientGrossTotals.remaining !== undefined
                              ? formatCurrencyVND(recipientGrossTotals.remaining)
                              : DASH}
                          </Table.Cell>
                        </Table.Row>
                      </>
                    )}
                  </Table.Body>
                </Table.Root>
              </div>
            </div>
          </div>
        )}
      </DetailPageWrapper>

      {/* Duyệt có sửa số tiền (TP TKKD + kế toán) — dùng chung với duyệt nhanh ngoài màn
          Danh sách, xem `CommissionAdvanceApproveDialog`. */}
      <CommissionAdvanceApproveDialog
        open={actionType === 'ADMIN_LEAD_APPROVE' || actionType === 'APPROVE'}
        advanceId={id}
        mode={actionType === 'ADMIN_LEAD_APPROVE' ? 'ADMIN_LEAD_APPROVE' : 'APPROVE'}
        onOpenChange={(open) => {
          if (!open) setActionType(null)
        }}
        onSuccess={handleApproved}
      />

      {/* TKKD duyệt / Từ chối / Gửi lại — ba thao tác không sửa con số nào */}
      <AppDialog
        open={
          actionType === 'ADMIN_APPROVE' || actionType === 'REJECT' || actionType === 'RESUBMIT'
        }
        onOpenChange={(open) => {
          if (!open) {
            setActionType(null)
            setRejectReason('')
          }
        }}
        onCancel={() => {
          setActionType(null)
          setRejectReason('')
        }}
        title={
          actionType === 'ADMIN_APPROVE'
            ? 'TKKD duyệt đề xuất'
            : actionType === 'RESUBMIT'
              ? 'Gửi lại đề xuất'
              : 'Từ chối đề xuất'
        }
        variant="custom"
        isHideCancelButton={false}
        onConfirm={handleAction}
        loading={
          adminApproveMutation.isPending || rejectMutation.isPending || resubmitMutation.isPending
        }
        confirmText={
          actionType === 'REJECT' ? 'Từ chối' : actionType === 'RESUBMIT' ? 'Gửi lại' : 'Duyệt'
        }
        content={
          <div className="flex flex-col gap-4 pt-4">
            {actionType === 'ADMIN_APPROVE' ? (
              <p className="typo-body-base text-content-dark-1">
                Xác nhận duyệt đề xuất tạm ứng này và chuyển sang bước TP TKKD duyệt.
              </p>
            ) : actionType === 'RESUBMIT' ? (
              <p className="typo-body-base text-content-dark-1">
                Đề xuất sẽ quay lại bước TP TKKD duyệt. Nếu giao dịch này đã có phiếu tạm ứng khác
                đang hiệu lực, hệ thống sẽ từ chối gửi lại.
              </p>
            ) : actionType === 'REJECT' ? (
              <div className="flex flex-col gap-3">
                <span className="typo-body-base-semibold text-content-dark-3">
                  Lý do từ chối <span className="text-action-primary-red-default">*</span>
                </span>
                <TextArea
                  placeholder="Vui lòng nhập lý do từ chối..."
                  value={rejectReason}
                  onChange={(val) => setRejectReason(val)}
                  rows={4}
                  maxCharacters={1000}
                />
              </div>
            ) : null}
          </div>
        }
        cancelText="Hủy"
      />

      {/* Mark Paid Dialog */}
      <AppDialog
        open={actionType === 'MARK_PAID'}
        onOpenChange={(open) => {
          if (!open) {
            setActionType(null)
          }
        }}
        onCancel={() => setActionType(null)}
        title="Xác nhận đã chi"
        variant="custom"
        isHideCancelButton={false}
        onConfirm={handleAction}
        loading={markPaidMutation.isPending}
        confirmText="Xác nhận"
        cancelText="Hủy"
        content={
          <div className="flex min-w-[480px] flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <span className="typo-body-base-semibold text-content-dark-3">
                Ngày lập chứng từ <span className="text-action-primary-red-default">*</span>
              </span>
              <DatePicker
                value={voucherDate}
                onChange={(val) => setVoucherDate(val || '')}
                placeholder="Chọn ngày chứng từ"
              />
            </div>

            <Select
              label="Hình thức thanh toán"
              required
              value={paymentMethod}
              onChange={(val) => {
                if (val === 'TRANSFER' || val === 'CASH' || val === 'OFFSET') {
                  setPaymentMethod(val)
                }
                if (val !== 'TRANSFER') {
                  setFromBankAccountId(null)
                }
              }}
              // KHÔNG có "Rút tạm ứng" ở đây: nguồn tiền (tiền MV / quỹ CĐT) đã quyết ở bước kế
              // toán duyệt. Để lại option đó thì kế toán chọn nhầm, tưởng đã trích quỹ mà quỹ
              // không hề giảm.
              options={[
                { value: 'TRANSFER', label: 'Chuyển khoản' },
                { value: 'CASH', label: 'Tiền mặt' },
                { value: 'OFFSET', label: 'Bù trừ' },
              ]}
            />

            {paymentMethod === 'TRANSFER' && (
              <Select
                label="Tài khoản ngân hàng chi"
                required
                value={fromBankAccountId ?? undefined}
                onChange={(val) => setFromBankAccountId(val ? Number(val) : null)}
                placeholder="Chọn tài khoản ngân hàng nguồn"
                options={bankOptions}
                clearable
              />
            )}

            <Select
              label="Danh sách dòng thụ hưởng thanh toán"
              required
              multiple
              value={recipientLineIds}
              onChange={(val) => setRecipientLineIds(val as number[])}
              placeholder="Chọn dòng thụ hưởng"
              options={recipientLineOptions}
            />
          </div>
        }
      />

      {/* Delete Dialog */}
      <AppDialog
        open={actionType === 'DELETE'}
        onOpenChange={(open) => {
          if (!open) {
            setActionType(null)
          }
        }}
        onCancel={() => {
          setActionType(null)
        }}
        title="Xóa đề xuất"
        variant="alert"
        onConfirm={handleAction}
        loading={deleteMutation.isPending}
        confirmText="Xóa"
        content={
          <div className="flex flex-col gap-4 pt-4">
            <p className="typo-body-base text-content-dark-1">
              Bạn có chắc chắn muốn xóa đề xuất <strong>{record?.code}</strong> này không?
            </p>
          </div>
        }
        cancelText="Hủy"
      />
    </div>
  )
}
