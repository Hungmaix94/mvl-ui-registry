import { type MutableRefObject, useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  RECIPIENT_COLLABORATOR_LABEL,
  RECIPIENT_EXCHANGE_LABEL,
} from '@/features/accounting/_shares/utils/recipient-utils'

import {
  formSchema,
  type FormValues,
  type PayeeHoldValues,
} from '../components/commission-split-form.types'
import {
  type CommissionSplitDetail,
  type ExtendedCommissionSplitPosition,
  useManagementBonuses,
} from '../services/commission-splits-service'

import { parsePct } from '../utils/parse-pct'
import { isDeductionType } from '../utils/payout-math'
import {
  isF2CommissionPctType,
  isF2SharedBonusPctType,
  isReconDrivenPctType,
  isSharedBonusPctType,
} from '../utils/pct-type'
import type { WorksheetRow } from './useWorksheetDial'

/** Số tiền/tỷ lệ từ BE luôn là decimal-as-string; vài đường đã parse sẵn — nhận cả hai. */
type Decimalish = number | string | null | undefined

/**
 * Field BE ĐÃ trả nhưng `schema.ts` sinh tự động chưa có (chưa regen sau BE Phase B).
 *
 * Neo hẹp đúng những field đang đọc, thay cho `as any`: khi schema được regen, xoá khối này
 * đi là TypeScript chỉ ngay ra mọi chỗ cần đổi — còn `as any` thì im lặng vĩnh viễn.
 */
type BePositionExtras = {
  percentage?: Decimalish
  participation?: Decimalish
  payee_holds?: PayeeHoldValues[] | null
  /** Phần tiền của dòng nằm trên đợt đã chi (khoá) và phần còn ghi lại được. */
  locked_amount?: Decimalish
  editable_amount?: Decimalish
}

type BeRecipientExtras = {
  advance_granted_amount?: Decimalish
  advance_recovered_amount?: Decimalish
  account_hold_amount?: Decimalish
  paid_amount?: Decimalish
  pooled_allocation_id?: number | null
}

interface UseCommissionSplitFormArgs {
  detail: CommissionSplitDetail
  worksheetId: number
  /** Cờ "đang ghi worksheet" — đọc trong lượt render nên phải là ref, xem useWorksheetActions. */
  worksheetBusyRef: MutableRefObject<boolean>
  /**
   * Bản STATE của đúng cờ trên. Ref không kích render nên effect prefill không thể "tỉnh dậy"
   * khi cờ nhả; state này là thứ đưa vào deps để lượt nạp lại bị chặn được chạy bù.
   */
  isWorksheetBusy: boolean
  activeWorksheet: WorksheetRow | null | undefined
  currentWorksheet: WorksheetRow | undefined
  debouncedFeePct: number
  debouncedBonusPct: number | null
  debouncedF2Pct: number | null
  debouncedBonusF2Pct: number | null
}

/**
 * Form chia thực nhận của trang: nạp từ server và số tiền sau khi rescale theo dial.
 *
 * Hai việc này đi cùng nhau vì cùng một câu hỏi "dòng này đáng bao nhiêu tiền": `form` giữ
 * số ĐÃ LƯU, `effectivePositions` giữ số ĐANG XEM (đã nhân lại theo dial đang kéo). Mục ④ và
 * ⑤⑥ đọc bản thứ hai, còn khi lưu thì đọc bản thứ nhất — tách rời hai bên là mời sai lệch.
 *
 * Thưởng HH quản lý nạp ngay tại đây: các position quản lý KHÔNG nằm trong `detail.positions`
 * mà đến từ endpoint riêng, phải gộp vào trước khi prefill nếu không form thiếu hẳn Mục ⑤.
 */
export function useCommissionSplitForm({
  detail,
  worksheetId,
  worksheetBusyRef,
  isWorksheetBusy,
  activeWorksheet,
  currentWorksheet,
  debouncedFeePct,
  debouncedBonusPct,
  debouncedF2Pct,
  debouncedBonusF2Pct,
}: UseCommissionSplitFormArgs) {
  const { data: mgmtBonusesData } = useManagementBonuses(worksheetId)

  const mgmtBonuses = useMemo(() => {
    if (!mgmtBonusesData) return []
    // Endpoint trả khi thì mảng trần, khi thì bọc phân trang — nhận cả hai.
    const list = Array.isArray(mgmtBonusesData)
      ? mgmtBonusesData
      : ((mgmtBonusesData as { results?: unknown[] }).results ?? [])
    return list as ExtendedCommissionSplitPosition[]
  }, [mgmtBonusesData])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { positions: [] },
  })

  /**
   * Payload ĐÃ sinh ra đám `positions` hiện nằm trong form — không nhất thiết là `detail` mới nhất.
   *
   * `effectivePositions` so dial với "% đã lưu" để quyết định có rescale hay không, nên con số
   * đó BẮT BUỘC phải là % của chính payload đã dựng nên form. Đọc thẳng `detail` (hay dòng
   * danh sách kỳ) là sai: form chỉ được reset trong effect BÊN DƯỚI và còn bị cờ `worksheetBusy`
   * chặn, nên có một khoảng `detail` đã sang % mới trong khi form còn tiền của % cũ. Khoảng đó
   * `dialPct == storedPct` ⇒ tắt rescale ⇒ Mục ④ hiện thẳng tiền CŨ (đo được 2,7s trên
   * `split-sheets/181` khi đổi 10%→40%). Neo vào payload đã seed thì hai vế luôn cùng một gốc:
   * form cũ đi với % cũ (⇒ vẫn rescale, ra đúng số preview) và cùng nhau đổi sang bản mới.
   */
  const [seededDetail, setSeededDetail] = useState<CommissionSplitDetail | null>(null)

  // Prefill form từ detail. CHẶN trong lúc duyệt chi: `detail` và `mgmtBonuses` là object
  // mới sau mỗi response react-query, nên effect này chạy lại cho TỪNG response và
  // form.reset() dựng lại toàn bộ field array — 1 lần duyệt chi từng kích tới ~6 lần reset,
  // mỗi lần ra một bộ số khác nhau (đúng cái kế toán thấy "nhảy loạn"). Luồng duyệt chi tự
  // refetch một lượt ở cuối, cờ nhả ra rồi effect chạy đúng MỘT lần với số đã chốt.
  //
  // `isWorksheetBusy` PHẢI nằm trong deps. Cả hai luồng ghi (Lưu dial Mục ③ và Duyệt chi) đều
  // `await refetchWorksheetQueries(...)` TRƯỚC rồi mới nhả cờ trong `finally`, nên `detail` mới
  // về đúng lúc cờ còn bật và lượt reset này bị bỏ. Thiếu deps đó thì khi cờ nhả, deps cũ
  // (`detail`/`mgmtBonuses`) đã đứng yên ⇒ effect không bao giờ chạy lại và form kẹt ở số
  // TRƯỚC khi lưu; lúc ấy dial đã bằng số đã lưu nên `effectivePositions` không rescale nữa,
  // Mục ④ hiện thẳng số cũ (bug: sửa % phí ở Mục ③ mà bảng Mục ④ nhảy về số cũ).
  useEffect(() => {
    if (worksheetBusyRef.current) return
    if (detail) {
      const allPositions = [...(detail.positions || []), ...mgmtBonuses]

      const seen = new Set<number>()
      const uniquePositions = []
      for (const pos of allPositions) {
        if (pos.commission_share_id != null) {
          if (seen.has(pos.commission_share_id)) continue
          seen.add(pos.commission_share_id)
        }
        uniquePositions.push(pos)
      }

      const initialPositions = uniquePositions.map((rawPos) => {
        const pos = rawPos as ExtendedCommissionSplitPosition & BePositionExtras
        let owner_name = ''
        let owner_code = ''
        let recipient_type: 'employee' | 'collaborator' | 'exchange' = 'employee'
        let recipient_id = 0

        if (pos.stand_employee) {
          owner_name = pos.stand_employee.fullname
          owner_code = pos.stand_employee.code
          recipient_type = 'employee'
          recipient_id = pos.stand_employee.id
        } else if (pos.stand_collaborator) {
          owner_name = pos.stand_collaborator.name
          owner_code = pos.stand_collaborator.code
          recipient_type = 'collaborator'
          recipient_id = pos.stand_collaborator.id
        } else if (pos.stand_exchange) {
          owner_name = pos.stand_exchange.name
          owner_code = pos.stand_exchange.code
          recipient_type = 'exchange'
          recipient_id = pos.stand_exchange.id
        } else {
          owner_name = pos.owner_name || ''
          owner_code = pos.owner_code || ''
          recipient_id = pos.recipient_id || 0
        }

        return {
          commission_share_id: pos.commission_share_id,
          payable_id: pos.payable_id,
          type: pos.type || '',
          pct_type: pos.pct_type || '',
          // Bucket giảm trừ đối chiếu (tiền ÂM). Suy từ pct_type khi payload chưa có cờ:
          // BE chỉ mới thêm `is_deduction` vào position 05/08 — bản chưa deploy trả về
          // undefined, và `?? false` một mình đã từng làm cả màn tưởng không có dòng giảm
          // trừ nào.
          is_deduction: isDeductionType(pos),
          // Kế toán đã gõ tay vào cột giảm trừ chưa. Sai → số giảm trừ chạy theo tỉ lệ chia
          // phí; đúng → giữ nguyên số đã gõ. Reset mỗi lần dựng lại form từ detail.
          __ded_touched: false,
          pct: pos.pct?.toString() || '0',
          // BE Phase B: share fee/bonus rate (column AE). schema.ts not regenerated yet.
          percentage: pos.percentage?.toString() ?? null,
          // Contribution split of the deal party on this share (sale 55 / F2 45) — Mục ④
          // groups display this. schema.ts pending regen — xem `BePositionExtras`.
          participation: pos.participation?.toString() ?? null,
          owner_name,
          owner_code,
          expected_amount: pos.expected_amount?.toString() || '0',
          share_full_amount: pos.share_full_amount?.toString() || '0',
          actual_amount: pos.actual_amount?.toString() || '0',
          // Tách đợt đã chi / đợt còn mở. KHÔNG mặc định '0' khi payload thiếu: `buildGroups`
          // đọc `undefined` là "chưa có cột này, cả dòng còn sửa được", còn '0' nghĩa là
          // "không còn đồng nào ghi lại được" và sẽ xoá sạch phần chia của mọi kỳ bình thường.
          locked_amount: pos.locked_amount?.toString(),
          editable_amount: pos.editable_amount?.toString(),
          admin_hold: pos.admin_hold?.toString() || '0',
          // WS2 per-payee hold directives — buildPayeeRows needs these to show held state
          // (PENDING directives have hold_amount null until approve materializes them).
          payee_holds: pos.payee_holds ?? [],
          recipient_type,
          recipient_id,
          recipients: (pos.recipients || []).map((rawR, rIdx) => {
            const r = rawR as typeof rawR & BeRecipientExtras
            const emp = r.recipient_employee_detail || r.recipient_employee
            const col = r.recipient_collaborator_detail || r.recipient_collaborator
            const ex = r.recipient_exchange_detail || r.recipient_exchange

            let recipient_name = ''
            let recipient_type_label = ''

            if (emp) {
              recipient_name = emp.fullname
              recipient_type_label = ''
            } else if (col) {
              recipient_name = col.name
              recipient_type_label = RECIPIENT_COLLABORATOR_LABEL
            } else if (ex) {
              recipient_name = ex.name
              recipient_type_label = RECIPIENT_EXCHANGE_LABEL
            } else {
              recipient_name = r.recipient_name || ''
              recipient_type_label = r.recipient_type_label || ''
            }

            return {
              employee_id: r.recipient_employee?.id?.toString() || null,
              collaborator_id: r.recipient_collaborator?.id?.toString() || null,
              exchange_id: r.recipient_exchange?.id?.toString() || null,
              amount: r.amount?.toString() || '0',
              base_amount: r.base_amount?.toString() || '0',
              bonus_amount: r.bonus_amount?.toString() || '0',
              pct_of_parent: r.pct_of_parent?.toString() || null,
              hold_amount:
                r.hold_amount?.toString() ||
                (pos.is_held && rIdx === 0 ? pos.held_amount?.toString() : '0') ||
                '0',
              reason: r.reason || r.note || '',
              recipient_type_label,
              recipient_name,
              hold_reason: r.hold_reason || pos.hold_reason || '',
              tax_base: r.tax_base || null,
              is_held: r.is_held || pos.is_held || false,
              // BE Phase B per-payee account facts (columns AD/AJ/AK). schema.ts pending regen.
              // account_hold_amount is the payee-account hold; hold_amount above stays the
              // RAL-level share hold (with position fallback) used by the edit flow.
              advance_granted_amount: r.advance_granted_amount?.toString() || '0',
              // Per-deal advance recovered (from advance lines; accurate because advance is
              // deal-grain). Distinct from monthly-FIFO recovery — see B2 in the Mục ④ plan.
              advance_recovered_amount: r.advance_recovered_amount?.toString() || '0',
              account_hold_amount: r.account_hold_amount?.toString() || '0',
              paid_amount: r.paid_amount?.toString() || '0',
              // Pooled tag — the form mapping silently strips unmapped fields (same trap
              // as payee_holds): without it buildPayeeRows can never exclude the pooled
              // receiver's per-sale child rows and they showed under every stand person.
              pooled_allocation_id: r.pooled_allocation_id ?? null,
            }
          }),
        }
      })
      form.reset({ positions: initialPositions })
      // Ghi lại payload vừa dựng nên form — xem `seededDetail`.
      setSeededDetail(detail)
    }
    // Cờ "đang sửa" KHÔNG được đưa vào deps: bật/tắt chế độ sửa không phải lý do để nạp lại
    // số từ server. Trước đây nó ở đây nên `setIsEditing(false)` trong luồng duyệt chi tự
    // kích một lần reset nữa, chống lại cache CHƯA cập nhật (ảnh trước khi duyệt). Cờ đó nay
    // nằm trong từng section; khôi phục form khi huỷ sửa do chính section lo bằng
    // `form.reset()`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, mgmtBonuses, form, isWorksheetBusy])

  const { fields: positionFields } = useFieldArray({
    control: form.control,
    name: 'positions',
  })

  const watchedPositions = form.watch('positions')

  const effectivePositions = useMemo(() => {
    if (!watchedPositions) return []
    // % đã lưu phải đọc từ CHÍNH payload đã sinh ra `positions` đang nằm trong form
    // (`seededDetail`, xem khai báo ở trên), rồi mới rơi về dòng danh sách kỳ. Đọc `detail`
    // mới nhất hay dòng danh sách đều tạo ra khe lệch: cả hai đổi NGAY trong lượt render,
    // còn form thì đợi effect (và đợi cờ ghi nhả) — khe đó `dialPct == storedPct` nên rescale
    // tắt trong khi form còn tiền của % cũ, Mục 4 loé số cũ.
    // KHÔNG cast: `CommissionSplitDetail` sinh từ OpenAPI đã khai đủ 4 field `*_progress_pct`.
    const dialsOfDetail = seededDetail ?? detail
    // `parsePct` chứ không `parseFloat`: BE trả decimal-as-string và chuỗi RỖNG là có thật
    // (xem `utils/parse-pct.ts`) — một `NaN` lọt vào `storedFee` là mọi phép tính tiền của
    // Mục ④/⑤⑥ ra `NaN`, mà phép so `Math.abs(dialPct - storedPct)` cũng không bao giờ khớp
    // nên màn kẹt vĩnh viễn ở nhánh rescale.
    const pickStored = (
      fromDetail: string | null | undefined,
      fromList: string | null | undefined
    ) =>
      fromDetail != null && fromDetail !== ''
        ? parsePct(fromDetail, null)
        : parsePct(fromList, null)

    const storedFee =
      pickStored(dialsOfDetail.fee_progress_pct, activeWorksheet?.fee_progress_pct) ??
      parsePct(activeWorksheet?.total_distribution_pct, 0)
    const storedBonus =
      pickStored(dialsOfDetail.bonus_progress_pct, activeWorksheet?.bonus_progress_pct) ?? 0
    const storedF2 =
      pickStored(dialsOfDetail.f2_progress_pct, activeWorksheet?.f2_progress_pct) ?? storedFee
    const storedBonusF2 =
      pickStored(dialsOfDetail.bonus_f2_progress_pct, activeWorksheet?.bonus_f2_progress_pct) ??
      storedBonus

    const basis = Number(
      currentWorksheet?.basis ||
        activeWorksheet?.basis ||
        (detail as { basis?: Decimalish }).basis ||
        0
    )

    return watchedPositions.map((pos) => {
      const pctType = pos.pct_type || ''
      // Dùng bản DEBOUNCE, không dùng state tức thời: mỗi keystroke ở ô % sẽ rescale lại
      // toàn bộ tiền của Mục 4, số nhảy liên tục theo từng ký tự. Ô nhập vẫn chạy tức thời
      // (nó bind localFeePct), chỉ TIỀN mới chờ dial đứng yên rồi mới tính lại.
      let dialPct = debouncedFeePct
      let storedPct = storedFee

      // Giảm trừ & thưởng MV do ĐỐI CHIẾU quyết định, không dial nào chạm tới — giữ nguyên
      // số BE trả. Trước đây giảm trừ rơi vào nhánh mặc định nên preview nhân theo dial phí
      // trong khi BE không hề rescale nó: bấm Lưu là số nhảy về chỗ cũ.
      if (isReconDrivenPctType(pctType)) {
        return pos
      }
      // Khớp CHÍNH XÁC, không dùng `includes`: `mgmt_ceo_investor_bonus` cũng chứa 'bonus'
      // nên cách cũ kéo nhầm share quản lý vào nhánh thưởng.
      if (isF2CommissionPctType(pctType)) {
        dialPct = debouncedF2Pct ?? debouncedFeePct
        storedPct = storedF2
      } else if (isF2SharedBonusPctType(pctType)) {
        dialPct = debouncedBonusF2Pct ?? debouncedBonusPct ?? 0
        storedPct = storedBonusF2
      } else if (isSharedBonusPctType(pctType)) {
        dialPct = debouncedBonusPct ?? 0
        storedPct = storedBonus
      }

      // Dial chưa đổi so với giá trị đã lưu → giữ NGUYÊN số backend trả (split.amount).
      // Recompute qua pct_of_parent (chỉ lưu 2 số lẻ) tạo sai số làm tròn (vd 19.999.300
      // thay vì 20.000.000) — chỉ được phép khi kế toán đang kéo dial để preview.
      if (Math.abs(dialPct - storedPct) < 1e-9) {
        return pos
      }

      const posPct = Number(pos.pct || pos.percentage || 0)
      const partPct = Number(pos.participation || 100)
      const calculatedFull = basis > 0 && posPct > 0 ? basis * (posPct / 100) * (partPct / 100) : 0
      const shareFull = Number(pos.share_full_amount || 0) || calculatedFull
      const origExpected = Number(pos.expected_amount || 0)

      // `!== 0` chứ không `> 0`: `share_full_amount` và `expected_amount` mang số ÂM trên
      // dòng ĐÒI LẠI (BE thu hồi phần chi dư, 2026-08-06). Dùng `> 0` sẽ đẩy dòng âm xuống
      // nhánh cuối và bỏ qua dial hoàn toàn.
      const expectedAmt =
        shareFull !== 0
          ? shareFull * (dialPct / 100)
          : storedPct > 0
            ? origExpected * (dialPct / storedPct)
            : origExpected

      // Preview-scale each recipient by the RATIO of expected money, NOT by re-deriving
      // from pct_of_parent (stored at 2dp only — money recomputed through it drifts,
      // e.g. 19,999,300 instead of 20,000,000, and pooled rows amplify it). Scaling the
      // API amounts preserves the BE's exact apportionment; the last row absorbs the
      // rounding remainder so recipients still sum to the position's expected.
      const recips = pos.recipients || []
      // `!== 0`: với dòng âm, `> 0` cho ratio null nên rơi vào nhánh dựng lại từ
      // `pct_of_parent` 2 chữ số — đúng nhánh gây lệch tiền mà chú thích ngay trên cảnh báo.
      const ratio = origExpected !== 0 ? expectedAmt / origExpected : null
      const roundedExpected = Math.round(expectedAmt)
      // Absorbing the remainder in the last row is only correct when the recipients ALREADY
      // sum to expected. They don't always: a materialized hold voids splits out of
      // recipients[], and an unbalanced save is only warned (±1đ), not blocked — there the
      // last payee would swallow the whole gap and preview a wildly inflated number. Scale
      // proportionally in that case and let the drift stand.
      const origSum = recips.reduce((s, r) => s + Number(r.amount || 0), 0)
      const balanced = Math.abs(origSum - origExpected) <= 1
      let running = 0
      const updatedRecipients = recips.map((r, rIdx) => {
        const origRAmt = Number(r.amount || 0)
        let rAmount: number
        if (ratio != null) {
          rAmount =
            balanced && rIdx === recips.length - 1
              ? roundedExpected - running
              : Math.round(origRAmt * ratio)
          running += rAmount
        } else {
          const pctOfParent = r.pct_of_parent != null ? parseFloat(r.pct_of_parent) : 100
          rAmount = Math.round(expectedAmt * (pctOfParent / 100))
        }
        return {
          ...r,
          amount: rAmount.toString(),
        }
      })

      return {
        ...pos,
        expected_amount: Math.round(expectedAmt).toString(),
        recipients: updatedRecipients,
      }
    })
    // `currentWorksheet` và `detail` phải có mặt: cả hai tham gia tính `basis` ở trên. Trước
    // đây thiếu, nên khi danh sách kỳ refetch ra `basis` mới mà form chưa đổi thì tiền preview
    // vẫn tính trên cơ sở CŨ.
  }, [
    seededDetail,
    watchedPositions,
    debouncedFeePct,
    debouncedBonusPct,
    debouncedF2Pct,
    debouncedBonusF2Pct,
    activeWorksheet,
    currentWorksheet,
    detail,
  ])

  return { form, positionFields, watchedPositions, effectivePositions }
}
