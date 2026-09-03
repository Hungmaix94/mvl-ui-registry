import { useEffect, useMemo, useState } from 'react'
import { eq } from 'lodash'
import { useDebounceValue } from 'usehooks-ts'

import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

import type { Allocation } from '../components/PaymentProgressTimeline'
import { parsePct } from '../utils/parse-pct'
import {
  type CommissionSplitDetail,
  type useCommissionSplits,
  useDealPaymentProgress,
} from '../services/commission-splits-service'

const COMMISSION_PCT_TYPES = APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES

/** Một dòng kỳ của căn, neo thẳng vào kiểu service trả về. Dùng chung với các hook khác. */
export type WorksheetRow = NonNullable<
  NonNullable<ReturnType<typeof useCommissionSplits>['data']>['results']
>[number]

interface UseWorksheetDialArgs {
  detail: CommissionSplitDetail
  /** Kỳ ĐANG CHỌN — dial luôn thuộc về kỳ này, không phải kỳ trên route. */
  currentWorksheet: WorksheetRow | undefined
  /** Mọi kỳ của căn, để dựng dòng thời gian và tính % của các kỳ KHÁC. */
  worksheets: WorksheetRow[] | undefined
  /**
   * Query danh sách kỳ đã chạy xong CHƯA (thành công hay lỗi đều tính là xong).
   *
   * Phải tách khỏi `worksheets != null`: cả hai ca đều cho `undefined` nhưng ý nghĩa ngược
   * nhau. "Chưa về" thì không được seed (xem effect bên dưới); còn "về rồi mà hỏng/rỗng" thì
   * BẮT BUỘC phải seed, nếu không `dialSeededFor` đứng yên ⇒ `isDialSyncing` không bao giờ
   * tắt ⇒ `BusyOverlay` phủ chết Mục ③④⑤⑥ và màn thành vô dụng cho tới khi F5.
   */
  isWorksheetListSettled: boolean
  worksheetId: number
}

/**
 * Bốn dial "% thanh toán kỳ này" của Mục ③ — state, bản debounce, trần, và default.
 *
 * KHÔNG gộp được vào `PaymentProgressTimeline` như cách tách Mục ④/⑤⑥: bản debounce là đầu
 * vào của `effectivePositions`, tức TIỀN của Mục ④ và ⑤⑥ đọc nó; luồng "Duyệt chi thực nhận"
 * ở trang cũng gửi cả 4 giá trị này lên. Dial là state của TRANG chứ không của riêng section,
 * nên gom thành hook để trang vẫn giữ chỗ đọc mà không phải cõng 200 dòng.
 */
export function useWorksheetDial({
  detail,
  currentWorksheet,
  worksheets,
  isWorksheetListSettled,
  worksheetId,
}: UseWorksheetDialArgs) {
  // Deal có F2 → hiện dial "Phí F2"; deal thuần sale/CTV thì ẩn.
  const hasF2 = useMemo(
    () =>
      detail.positions?.some(
        (p) =>
          p.pct_type === COMMISSION_PCT_TYPES.F2_SALE.pct ||
          p.pct_type === COMMISSION_PCT_TYPES.F2_SALE.amt
      ) ?? false,
    [detail]
  )

  // Deal có thưởng F2 → hiện dial "Thưởng F2" (độc lập với có phí F2 hay không).
  const hasF2Bonus = useMemo(
    () =>
      detail.positions?.some(
        (p) =>
          p.pct_type === COMMISSION_PCT_TYPES.F2_BONUS.pct ||
          p.pct_type === COMMISSION_PCT_TYPES.F2_BONUS.amt
      ) ?? false,
    [detail]
  )

  // Mục ③ dùng payment-progress để suy ra % ĐÃ THU của từng kỳ.
  const { data: dealPaymentProgress } = useDealPaymentProgress(detail.deal_id, {
    enabled: !!detail.deal_id,
  })

  // % TT phí / % TT thưởng ĐÃ THU của từng kỳ, từ Mục 2 (payment-progress) — gom các
  // dòng đối chiếu theo "kỳ thanh toán" (payment_period). Đây là fallback hiển thị cho
  // kỳ chưa chốt dial: distribution_pct là % tiền về của căn (gộp phí+thưởng) nên không
  // dùng làm "% TT phí" được.
  // Cộng ở ĐỘ CHÍNH XÁC ĐẦY ĐỦ: BE trả 10dp (ROUND_DOWN), việc làm tròn xảy ra đúng MỘT lần
  // ở `getPct` lúc render. Trước đây BE tròn sẵn 2dp nên phép cộng này ra số thứ ba, khác cả
  // ô lũy kế Mục 2 lẫn trần dial (69,22 vs 69,23).
  const periodCollection = useMemo(() => {
    // `bonusDial` = Σ shared_bonus_to_sale_pct of the confirmed IR rows paid in the period —
    // the bonus payment progress the admin PINNED for the reconciliation, distinct from
    // `bonus` (the cash-driven collection %). An unset dial counts as 0: no admin
    // quota means no bonus may be paid out this period.
    const map = new Map<string, { fee: number; bonus: number; bonusDial: number }>()
    for (const p of dealPaymentProgress?.periods ?? []) {
      if (!p.payment_period) continue
      const k = `${p.payment_period.year}-${p.payment_period.month}`
      const e = map.get(k) || { fee: 0, bonus: 0, bonusDial: 0 }
      e.fee += parseFloat(p.fee_collection_pct || '0')
      e.bonus += parseFloat(p.bonus_collection_pct || '0')
      e.bonusDial += parseFloat(p.shared_bonus_to_sale_pct || '0')
      map.set(k, e)
    }
    return map
  }, [dealPaymentProgress])

  // Mục 3 dials — % TT phí / % TT thưởng kỳ này (accountant-editable, persisted via
  // set-period-progress). Bonus null = chưa chốt (BE giữ catch-up theo tiền về).
  const [localFeePct, setLocalFeePct] = useState<number>(0)
  // Giải trình dial (dial_note): BE bắt buộc khi dial phí/F2 lệch default. Prefill từ
  // note đã lưu; gửi kèm set-period-progress ở CẢ HAI call site (Lưu dial + trước Duyệt).
  const [dialNote, setDialNote] = useState('')
  const [localBonusPct, setLocalBonusPct] = useState<number | null>(null)
  // F2 dial kỳ này — tách khỏi phí (sale/CTV/quản lý). null = deal không có F2 (ẩn dial).
  const [localF2Pct, setLocalF2Pct] = useState<number | null>(null)
  // Thưởng F2 dial — tách khỏi thưởng sale. null = chưa chốt (catch-up theo tiền về).
  const [localBonusF2Pct, setLocalBonusF2Pct] = useState<number | null>(null)

  // Bản trễ của 4 dial, CHỈ dùng để tính tiền preview ở Mục 4 (xem effectivePositions).
  // 400ms: đủ để gõ xong "55" mà không thấy bảng nhảy ở "5".
  const [debouncedFeePct] = useDebounceValue(localFeePct, 400)
  const [debouncedBonusPct] = useDebounceValue(localBonusPct, 400)
  const [debouncedF2Pct] = useDebounceValue(localF2Pct, 400)
  const [debouncedBonusF2Pct] = useDebounceValue(localBonusF2Pct, 400)

  // Dial hiện tại đã được seed cho kỳ nào, và kỳ nào đang trong lượt chuyển.
  // Xem giải thích đầy đủ ở `isDialSyncing` bên dưới.
  const [dialSeededFor, setDialSeededFor] = useState<number | null>(null)
  const [syncingFor, setSyncingFor] = useState<number | null>(null)

  /**
   * Nguồn seed của 4 dial + ô giải trình, tách thành GIÁ TRỊ THÔ để làm dependency.
   *
   * Trước đây effect seed neo vào `currentWorksheet` và `detail` (hai OBJECT). Mỗi response
   * react-query là một object mới, nên effect chạy lại kể cả khi mọi con số y hệt — và nó
   * `setLocal*` đè lên đúng thứ kế toán vừa gõ. Hai hậu quả đã đo được trên `split-sheets/181`:
   *
   *  1. **Ghi đè sau khi lưu.** `refetchWorksheetQueries` bắn SONG SONG query detail và query
   *     danh sách kỳ. Detail về trước ⇒ effect chạy lại trong khi `currentWorksheet` (lấy từ
   *     danh sách) VẪN là dòng cũ ⇒ dial bị kéo về % cũ, `effectivePositions` rescale theo và
   *     Mục 4 nháy về số cũ, tới khi danh sách về mới đúng lại (đo được: 40 → 10 → 40, tiền
   *     88tr → 22tr → 88tr trong ~1,4s). Kế toán bấm/blur trúng khoảng đó là PATCH luôn con số
   *     CŨ đè lên con số mình vừa lưu.
   *  2. **Mất chữ đang gõ.** Bất kỳ refetch nền nào (đổi tab, invalidate từ màn khác) cũng
   *     reset dial và ô giải trình về số của server giữa chừng.
   *
   * Neo theo giá trị thì response không đổi số = không seed lại, nên cả hai biến mất.
   */
  const seedFeePct = currentWorksheet?.fee_progress_pct ?? null
  const seedBonusPct = currentWorksheet?.bonus_progress_pct ?? null
  const seedF2Pct = currentWorksheet?.f2_progress_pct ?? null
  const seedBonusF2Pct = currentWorksheet?.bonus_f2_progress_pct ?? null
  const seedFeeDefaultPct = detail.fee_default_pct ?? null
  const seedF2DefaultPct = detail.f2_default_pct ?? null
  const seedDialNote = detail.dial_note ?? ''
  // Danh sách kỳ đã về hay chưa — KHÁC với "đã về nhưng không có dòng nào khớp".
  const hasWorksheetList = !!worksheets
  // Chỉ hoãn seed khi danh sách THỰC SỰ chưa về. Query hỏng/rỗng vẫn phải seed, xem
  // `isWorksheetListSettled`.
  const isWorksheetListPending = !hasWorksheetList && !isWorksheetListSettled

  useEffect(() => {
    // Danh sách kỳ chưa về thì chưa có gì đáng tin để seed. Bỏ qua nhánh else bên dưới:
    // `currentWorksheet` lúc này undefined KHÔNG có nghĩa "kỳ chưa ghim dial", nên rơi vào
    // `fee_default_pct` là biến % kế toán đang xem thành default của BE trong im lặng.
    if (isWorksheetListPending) return

    // Fee dial: the pinned % if the accountant already set one, else BE's fee_default_pct
    // (min(Σ distribution_pct, trần thu còn lại) — đã clamp). MỘT nguồn duy nhất: đây đúng
    // là con số BE auto-pin lúc "Duyệt chi thực nhận", nên số đang hiển thị = số sẽ được
    // ghi nhận. Fallback 3 tầng cũ (fee_collection_pct / total_distribution_pct) đã bỏ —
    // hai nguồn tự suy phía client sớm muộn lại lệch với BE.
    if (seedFeePct != null && seedFeePct !== '') {
      setLocalFeePct(parsePct(seedFeePct, 0))
    } else {
      setLocalFeePct(parsePct(seedFeeDefaultPct, 0))
    }
    setLocalBonusPct(parsePct(seedBonusPct, null))
    // F2 dial: pinned value if the accountant already set one, else the suggested
    // default (base reconciliation progress × cash − F2 already paid) so the slider
    // starts on the correct 10%-style figure. null only when the deal has no F2.
    if (!hasF2) {
      setLocalF2Pct(null)
    } else if (seedF2Pct != null && seedF2Pct !== '') {
      setLocalF2Pct(parsePct(seedF2Pct, 0))
    } else {
      setLocalF2Pct(parsePct(seedF2DefaultPct, 0))
    }
    // Thưởng F2: pinned value nếu đã chốt, else null (catch-up) — giống thưởng sale.
    setLocalBonusF2Pct(parsePct(seedBonusF2Pct, null))
    setDialNote(seedDialNote)
    setDialSeededFor(worksheetId)
  }, [
    isWorksheetListPending,
    seedFeePct,
    seedBonusPct,
    seedF2Pct,
    seedBonusF2Pct,
    seedFeeDefaultPct,
    seedF2DefaultPct,
    seedDialNote,
    hasF2,
    worksheetId,
  ])

  /**
   * Dial đã thuộc về kỳ đang xem chưa? Khoảng chưa-thuộc-về là lúc TIỀN trên màn là số rác.
   *
   * Trình tự khi bấm sang kỳ khác: `currentWorksheet` đổi ngay trong render đó, còn 4 dial
   * chỉ được seed ở `useEffect` CHẠY SAU, rồi bản debounce còn trễ thêm một nhịp nữa. Suốt
   * hai nhịp ấy `effectivePositions` thấy "dial ≠ số đã lưu" nên nhân chia lại TOÀN BỘ tiền
   * theo tỷ lệ của kỳ CŨ — đúng hiện tượng "số nhảy loạn một hồi rồi mới dừng". Nó thuần
   * client nên query đã cache cũng không cứu được: lần chuyển kỳ thứ hai trở đi không còn
   * overlay mạng che nữa thì người dùng nhìn thẳng vào mấy nhịp rác đó.
   */
  /**
   * `eq` của lodash (SameValueZero), KHÔNG dùng `===` và cũng không dùng `Object.is`.
   *
   * `===` hỏng vì `NaN === NaN` là false: chỉ một dial lỡ thành `NaN` là `dialSettled` không
   * bao giờ true, `isDialSyncing` kẹt vĩnh viễn và overlay phủ chết Mục ③④⑤⑥.
   * `Object.is` chữa được `NaN` nhưng lại đẻ ra bẫy thứ hai: `Object.is(0, -0)` là **false**,
   * mà `-0` hoàn toàn có thể xuất hiện (`parseFloat('-0')`, hoặc một phép nhân ra `-0`), thế
   * là kẹt y hệt. SameValueZero coi `NaN` bằng `NaN` VÀ `0` bằng `-0` — đúng cả hai vế.
   *
   * `parsePct` đã chặn `NaN` từ gốc; đây là lớp thứ hai cho những đường chưa lường tới.
   */
  const dialSettled =
    eq(debouncedFeePct, localFeePct) &&
    eq(debouncedBonusPct, localBonusPct) &&
    eq(debouncedF2Pct, localF2Pct) &&
    eq(debouncedBonusF2Pct, localBonusF2Pct)

  // Đổi kỳ ⇒ vào trạng thái đồng bộ. CHỈ neo theo `worksheetId`, cố ý không neo theo dial:
  // kế toán tự gõ dial cũng làm `dialSettled` false một nhịp, mà gõ xong bị phủ overlay thì
  // không gõ tiếp được.
  useEffect(() => {
    setSyncingFor(worksheetId)
  }, [worksheetId])

  useEffect(() => {
    if (syncingFor == null) return
    // `eq` vì `worksheetId` là `Number(param)` — param hỏng thì ra `NaN`, mà so `===` với
    // `NaN` luôn false ⇒ overlay không bao giờ tắt.
    if (eq(dialSeededFor, worksheetId) && dialSettled) setSyncingFor(null)
  }, [syncingFor, dialSeededFor, worksheetId, dialSettled])

  const isDialSyncing = syncingFor != null

  const sortedAllocations = useMemo<Allocation[]>(() => {
    if (!worksheets) return []

    const list = worksheets.map((w) => {
      const collection = periodCollection.get(`${w.period_year}-${w.period_month}`)
      return {
        id: w.representative_pbtv_id,
        worksheet_id: w.worksheet_id,
        period_year: w.period_year,
        period_month: w.period_month,
        distribution_pct: w.total_distribution_pct || '0',
        distribution_pct_breakdown: w.distribution_pct_breakdown ?? null,
        fee_progress_pct: w.fee_progress_pct ?? null,
        bonus_progress_pct: w.bonus_progress_pct ?? null,
        f2_progress_pct: w.f2_progress_pct ?? null,
        bonus_f2_progress_pct: w.bonus_f2_progress_pct ?? null,
        fee_collection_pct: collection != null ? String(collection.fee) : null,
        bonus_collection_pct: collection != null ? String(collection.bonus) : null,
        bonus_dial_pct: String(collection?.bonusDial ?? 0),
        amount_received: w.received || '0',
        date: w.deposit_date,
        status: w.is_locked ? 'LOCKED' : 'DRAFT',
        worksheet_status: w.worksheet_status,
        code: `Kỳ ${String(w.period_month).padStart(2, '0')}/${w.period_year}`,
        payout_allocated_amount: w.received,
      }
    })

    // Sort chronologically
    return list.sort((a, b) => {
      if (a.period_year !== b.period_year) return a.period_year - b.period_year
      return a.period_month - b.period_month
    })
  }, [worksheets, periodCollection])

  // Dial state luôn thuộc về kỳ đang chọn (xem `currentWorksheet`), nên % của kỳ đang xem
  // chính là `localFeePct` — không còn nhánh "kỳ khác thì đọc số đã lưu" nữa.
  const displayPct = localFeePct

  const otherPeriodsPct = useMemo(() => {
    // Sum distribution_pct of every OTHER period of the unit (every worksheet except the
    // one being viewed). The BE returns the per-period cumulative for BOTH
    // detail.total_distribution_pct and the worksheet row, so the old
    // baseline-minus-current subtraction collapsed to ~0 and silently dropped every
    // prior period from the cumulative. sortedAllocations is the reliable per-period source.
    return sortedAllocations
      .filter((a) => a.worksheet_id !== worksheetId)
      .reduce((sum, a) => {
        const hasPinnedDial = a.fee_progress_pct != null && a.fee_progress_pct !== ''
        if (hasPinnedDial) return sum + parseFloat(a.fee_progress_pct as string)
        const rawFallback = a.fee_collection_pct ?? a.distribution_pct
        return sum + parseFloat(rawFallback || '0')
      }, 0)
  }, [sortedAllocations, worksheetId])

  // Trần của 2 dial kỳ này từ đối chiếu CĐT (BE tính, xem CommissionSplitDetail):
  // - phí: lũy kế % TT phí đã thu − % đã chi các kỳ trước;
  // - thưởng: min(lũy kế % TT thưởng đã thu − đã chi trước, tiến độ TT thưởng sale/F2 kỳ này).
  const dialCaps = useMemo(() => {
    const num = (v?: string | null) => (v != null && v !== '' ? parseFloat(v) : null)
    // `detail` = payload của kỳ ĐANG CHỌN. Trước đây là `currentDetail || detail`, mà
    // `currentDetail` luôn truthy nên trần dial luôn là của kỳ trên route.
    const feeCollected = num(detail.fee_collected_cap_pct)
    const feePrior = num(detail.fee_paid_prior_pct) ?? 0
    const bonusCollected = num(detail.bonus_collected_cap_pct)
    const bonusDial = num(detail.bonus_dial_this_period_pct)
    // Trần chi thưởng kỳ này = cam kết CĐT ĐÃ NHÂN tỉ lệ tiền về (BE tính, chốt 04/08).
    const bonusCeiling = num((detail as any).bonus_ceiling_pct)
    // F2 dùng chung trần thu với phí (đối chiếu base × tiền về), trừ F2 đã chi kỳ trước.
    const f2Prior = num(detail.f2_paid_prior_pct) ?? 0
    // Thưởng F2 chỉ hiển thị "đã chi kỳ trước" trong hint; trần dùng chung dial thưởng kỳ.
    const bonusF2Prior = num(detail.bonus_f2_paid_prior_pct) ?? 0
    return {
      feeCollected,
      bonusCollected,
      bonusDial,
      f2Prior,
      bonusF2Prior,
      feeMax: feeCollected != null ? Math.max(0, feeCollected - feePrior) : null,
      f2Max: feeCollected != null ? Math.max(0, feeCollected - f2Prior) : null,
      bonusCeiling,
      // Trần thưởng = cam kết CĐT ĐÃ NHÂN tỉ lệ tiền về (`bonus_ceiling_pct`, chốt 04/08).
      // `bonus_dial_this_period_pct` mới là cam kết, CHƯA nhân tiền về — dùng nó làm trần là
      // cho kế toán chi vượt phần tiền thực về. Sale-bonus và F2-bonus dùng chung cận này.
      bonusMax: bonusCeiling != null ? Math.max(0, bonusCeiling) : null,
      bonusF2Max: bonusCeiling != null ? Math.max(0, bonusCeiling) : null,
    }
  }, [detail])

  // Default 2 dial có auto-default (phí/F2) từ BE — mốc so lệch cho ô giải trình.
  const feeDefaultPct = useMemo(() => {
    const v = detail.fee_default_pct
    return v != null ? parseFloat(v) : null
  }, [detail])
  const f2DefaultPct = useMemo(() => {
    const v = detail.f2_default_pct
    return v != null ? parseFloat(v) : null
  }, [detail])

  const maxFeePct = useMemo(() => {
    const remainingOfUnit = Math.max(0, 100 - otherPeriodsPct)
    return dialCaps.feeMax != null ? Math.min(remainingOfUnit, dialCaps.feeMax) : remainingOfUnit
  }, [otherPeriodsPct, dialCaps.feeMax])

  const maxBonusPct = useMemo(() => {
    return dialCaps.bonusMax != null ? dialCaps.bonusMax : 100
  }, [dialCaps.bonusMax])

  const maxF2Pct = useMemo(() => {
    return dialCaps.f2Max != null ? dialCaps.f2Max : 100
  }, [dialCaps.f2Max])

  const maxBonusF2Pct = useMemo(() => {
    return dialCaps.bonusF2Max != null ? dialCaps.bonusF2Max : 100
  }, [dialCaps.bonusF2Max])

  const totalCumPct = useMemo(() => {
    const sum = otherPeriodsPct + displayPct
    return sum % 1 === 0 ? sum : parseFloat(sum.toFixed(2))
  }, [otherPeriodsPct, displayPct])

  return {
    // state 4 dial + ô giải trình
    localFeePct,
    setLocalFeePct,
    localBonusPct,
    setLocalBonusPct,
    localF2Pct,
    setLocalF2Pct,
    localBonusF2Pct,
    setLocalBonusF2Pct,
    dialNote,
    setDialNote,
    // bản trễ — đầu vào tính TIỀN của Mục ④/⑤⑥, đừng bind vào input
    debouncedFeePct,
    debouncedBonusPct,
    debouncedF2Pct,
    debouncedBonusF2Pct,
    // suy diễn
    hasF2,
    hasF2Bonus,
    sortedAllocations,
    dialCaps,
    feeDefaultPct,
    f2DefaultPct,
    maxFeePct,
    maxBonusPct,
    maxF2Pct,
    maxBonusF2Pct,
    totalCumPct,
    /** Đang chuyển kỳ và dial chưa kịp thuộc về kỳ mới — tiền trên màn chưa đáng tin. */
    isDialSyncing,
  }
}
