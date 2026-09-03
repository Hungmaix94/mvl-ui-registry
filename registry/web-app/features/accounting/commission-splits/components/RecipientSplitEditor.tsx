/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import { Controller, useFieldArray, useWatch } from 'react-hook-form'
import { FullCellNumberInput } from '@/components/commons'
import { Select } from '@/components/ui'
import { IconTrash } from '@/assets/icons'
import { formatCurrencyVND } from '@/utils/common'
import { useCollaboratorSelect } from '@/hooks/useCollaboratorSelect'
import { useExchangeSelect } from '@/hooks/useExchangeSelect'
import { parseNumberSafe } from '@/features/accounting/_shares/utils/recipient-utils'
import { deductionMagnitudesFromFee } from '../utils/deduction-follow'
import {
  editableAmountOf,
  feeAnchorAmounts,
  isBucketFullyLocked,
  lockedAmountOf,
} from '../utils/editable-grain'
import { derivePayout, isDeductionType } from '../utils/payout-math'
import { isStaffIncentivePctType } from '../utils/pct-type'

/** A split row tagged with a pooled allocation (chia gộp) — owned by the pooled dialog. */
const isPooledRow = (r: any) => r?.pooled_allocation_id != null

/**
 * Editable rows are the non-pooled PREFIX of the array (the BE appends pooled rows last).
 * Every caller uses this POSITIONALLY — `slice(0, n)`, `insert(n, …)`, `adjustIdx = n - 1`
 * — so it must be the index of the first pooled row, not a count. With `filter().length` a
 * pooled row that isn't last (BE reorder, a future edit path) would silently shift the
 * boundary: pct writes would land on the pooled row and one real row would be skipped.
 */
const editableCount = (recips: any[]) => {
  const i = recips.findIndex(isPooledRow)
  return i < 0 ? recips.length : i
}

/**
 * Editable "chia thực nhận" table for ONE stand person, matching the read pivot columns
 * (RecipientPayoutTable). One row per actual payee, combining the fee position with EVERY
 * bonus position. Editable: one money column per bonus bucket + Thành tiền phí (fee money).
 * Phí (%) is the deal fee RATE (read-only); Tổng trả / Thuế TNCN / Thực nhận derive live.
 * TNCN is a FE preview: 10% for CTV, blank for employees.
 *
 * The write model is per (pct_type) split, so fee amount binds to the fee position's
 * recipient and each bonus amount to its own position's — kept in lockstep by row index.
 *
 * 2026-08-06: bonus used to be a single `.find()` — with both an investor shared bonus and
 * a `staff_incentive` on one person, whichever came FIRST in the array was the only one
 * editable and the other was unreachable (amber warning only). Each bucket now gets its
 * own column, so the money the read table shows is the money the editor can move.
 */

interface GroupPosition {
  posIdx: number
  posData: any
}

interface Props {
  positions: GroupPosition[]
  isCommissionType: (t: string) => boolean
  form: any
  loadEmployeeOptions: any
  ownerType?: string
  ownerId?: number | string
}

export const RecipientSplitEditor = ({
  positions,
  isCommissionType,
  form,
  loadEmployeeOptions,
  ownerType,
  ownerId,
}: Props) => {
  const { loadCollaboratorOptions } = useCollaboratorSelect()
  const { loadExchangeOptions } = useExchangeSelect({ valueType: 'id' })

  const feePos = positions.find(
    (p) => isCommissionType(p.posData.pct_type || '') && !isDeductionType(p.posData)
  )
  // MỌI xô thưởng, mỗi xô một cột tiền riêng — không còn `.find()` lấy xô đầu tiên.
  // Một người đứng tên có thể vừa có thưởng chia sẻ CĐT vừa có Thưởng MV
  // (`staff_incentive`); bản cũ chỉ sửa được xô đầu MẢNG, tức xô nào sửa được phụ thuộc
  // thứ tự BE trả về, còn xô kia thì kế toán không với tới (chỉ hiện cảnh báo vàng).
  // Write model của BE khoá theo (recipient_type, recipient_id, pct_type) nên N xô ghi
  // được; nghẽn chỉ nằm ở trình sửa này.
  const bonusPositions = positions.filter(
    (p) => !isCommissionType(p.posData.pct_type || '') && !isDeductionType(p.posData)
  )
  const incentivePos = bonusPositions.find((p) => isStaffIncentivePctType(p.posData.pct_type || ''))
  const sharedBonusPositions = bonusPositions.filter(
    (p) => !isStaffIncentivePctType(p.posData.pct_type || '')
  )
  /**
   * Cột thưởng của modal phải khớp CỘT-VỚI-CỘT với bảng đọc ngay trên nó, kể cả khi nhóm
   * không có xô đó: bảng đọc render `<th>Thưởng MV</th>` VÔ ĐIỀU KIỆN. Dựng theo dữ liệu
   * thuần thì deal không có `staff_incentive` sẽ mất hẳn cột, kế toán mở modal ra thấy
   * thiếu một cột so với bảng — đúng thứ tech lead bắt được 2026-08-06.
   *
   * Nhãn dùng ĐÚNG chữ của bảng đọc, KHÔNG lấy từ `/api/constants/`: nhãn ấy đi theo
   * `Accept-Language`, máy đặt tiếng Anh sẽ ra "Staff policy incentive" trong khi bảng
   * ngay trên vẫn ghi "Thưởng MV".
   *
   * `posIdx === undefined` = nhóm không có xô đó ⇒ ô hiển thị '—' read-only, không có gì
   * để bind và cũng không có tiền để cân.
   */
  const bonusSlots: { key: string; label: string; posIdx: number | undefined }[] = [
    ...(sharedBonusPositions.length > 0
      ? sharedBonusPositions.map((p) => ({
          key: `bonus-${p.posIdx}`,
          label: 'Thưởng sale',
          posIdx: p.posIdx as number | undefined,
        }))
      : [{ key: 'bonus-none', label: 'Thưởng sale', posIdx: undefined }]),
    { key: 'incentive', label: 'Thưởng MV', posIdx: incentivePos?.posIdx },
  ]
  // Reconciliation fee-deduction bucket (rule (b)): NEGATIVE amounts in the form,
  // edited as a positive magnitude in the UI. Untouched -> not sent -> BE cascades.
  const dedPos = positions.find((p) => isDeductionType(p.posData))
  const feeParticipation =
    feePos?.posData?.participation != null
      ? Number(feePos.posData.participation)
      : feePos?.posData?.participation_pct != null
        ? Number(feePos.posData.participation_pct)
        : null
  // Personal effective fee rate = pool rate × tỷ lệ tham gia, same formula as
  // buildPayeeRows so the editor and the read table agree. Participation may only SCALE a
  // real rate — never stand in for a missing one: amount-based shares (the F2 exchange
  // fee, fixed_amount mode) carry no percentage, and `null` renders '—' read-only instead
  // of letting a 30% participation masquerade as a fee rate.
  const standPersonFeePct =
    feePos?.posData?.percentage != null
      ? Number(feePos.posData.percentage) *
        (feeParticipation != null && feeParticipation > 0 ? feeParticipation / 100 : 1)
      : null
  // This editor binds ONE fee + ONE deduction position (bonus is now one column per
  // bucket). If a stand person has more than one fee or deduction share, the extras
  // aren't editable here — surface a warning so the split isn't silently partial (the
  // read table sums all of them).
  const feeCount = positions.filter(
    (p) => isCommissionType(p.posData.pct_type || '') && !isDeductionType(p.posData)
  ).length
  const dedCount = positions.filter((p) => isDeductionType(p.posData)).length
  // Thưởng KHÔNG còn trong điều kiện này: mọi xô thưởng đều có cột riêng nên không còn xô
  // nào bị bỏ rơi. Phí và giảm trừ vẫn neo một khoản, nên vẫn phải cảnh báo.
  const hasExtraPositions = feeCount > 1 || dedCount > 1
  const feePosIdx = feePos?.posIdx
  const bonusPosIdxs = bonusPositions.map((p) => p.posIdx)
  const dedPosIdx = dedPos?.posIdx

  // Pooled (chia gộp) rows are OWNED by the pooled dialog: hidden from this editor and
  // excluded from the editable total and every balance/normalize target. The BE
  // validates the editor's input against `allocated − pooled` and re-appends the pooled
  // rows itself. Suffix invariant: the BE always appends the pooled row LAST, so the
  // editable rows are exactly the prefix [0, editableCount).
  const feeRecipientsLive = useWatch({
    control: form.control,
    name: feePosIdx != null ? `positions.${feePosIdx}.recipients` : 'positions.0.recipients',
  }) as any[] | undefined
  const pooledFeeCut =
    feePosIdx != null
      ? (feeRecipientsLive || [])
          .filter((r: any) => isPooledRow(r))
          .reduce((s: number, r: any) => s + Number(r?.amount || 0), 0)
      : 0

  const dedRecipientsLive = useWatch({
    control: form.control,
    name: dedPosIdx != null ? `positions.${dedPosIdx}.recipients` : 'positions.0.recipients',
  }) as any[] | undefined
  // Chia gộp cũng carve giảm trừ (kênh DEDUCTION) — trừ phần pooled ra khỏi số phải cân,
  // đúng như phí, vì BE validate input theo `allocated − pooled` rồi tự nối lại dòng pooled.
  const pooledDedCut =
    dedPosIdx != null
      ? (dedRecipientsLive || [])
          .filter((r: any) => isPooledRow(r))
          .reduce((s: number, r: any) => s + Number(r?.amount || 0), 0)
      : 0

  const feeExpected = Number(feePos?.posData.expected_amount || 0) - pooledFeeCut
  /** Mức phải cân của TỪNG xô thưởng — mỗi cột cân về đúng số phân bổ của xô đó. */
  const bonusExpectedByPos: Record<number, number> = {}
  bonusPositions.forEach((p) => {
    bonusExpectedByPos[p.posIdx] = Number(p.posData.expected_amount || 0)
  })
  // NEGATIVE by the sign convention; the UI works with its magnitude.
  const dedExpected = Number(dedPos?.posData.expected_amount || 0) - pooledDedCut
  // A share earmarked for a prepaid advance is already disbursed — re-splitting it would
  // desync the ledger, so this group's amounts/rows are locked (mirrors PositionTableBlock).
  const locked = !!(
    feePos?.posData.is_earmarked_prepaid ||
    bonusPositions.some((p) => p.posData.is_earmarked_prepaid)
  )
  // Khoá theo TỪNG XÔ, không theo cả nhóm: một nhóm có thể còn thưởng chia được trong khi
  // xô phí đã chi hết ở đợt trước (ws176 — nhóm Sàn T123 còn 333.690đ nên `groupLockState`
  // báo "sửa được", che mất việc xô phí bên trong đã chết). Gõ % vào xô đã chết là no-op
  // im lặng, mà giảm trừ đi theo nó thì lại không im lặng.
  const feeBucketFrozen = !!feePos && isBucketFullyLocked(feePos.posData)
  const dedBucketFrozen = !!dedPos && isBucketFullyLocked(dedPos.posData)
  const bonusBucketFrozen: Record<number, boolean> = {}
  bonusPositions.forEach((p) => {
    bonusBucketFrozen[p.posIdx] = isBucketFullyLocked(p.posData)
  })
  // Chỉ nêu những xô CÓ tiền đã chốt — kỳ bình thường (chưa đợt nào khoá) không hiện gì,
  // đúng bất biến A0: màn không đổi khi chưa có đợt nào bị đóng băng.
  const frozenBucketNotes = [
    ...(feePos ? [{ label: 'Phí hoa hồng', posData: feePos.posData }] : []),
    ...bonusPositions.map((p) => ({
      label: bonusSlots.find((slot) => slot.posIdx === p.posIdx)?.label || 'Thưởng',
      posData: p.posData,
    })),
    ...(dedPos ? [{ label: 'Giảm trừ', posData: dedPos.posData }] : []),
  ]
    .filter((entry) => lockedAmountOf(entry.posData) !== 0)
    .map((entry) => ({
      label: entry.label,
      locked: lockedAmountOf(entry.posData),
      editable: editableAmountOf(entry.posData),
    }))

  const feeArray = useFieldArray({
    control: form.control,
    name: feePosIdx != null ? `positions.${feePosIdx}.recipients` : 'positions.0.recipients',
  })
  const dedArray = useFieldArray({
    control: form.control,
    name: dedPosIdx != null ? `positions.${dedPosIdx}.recipients` : 'positions.0.recipients',
  })

  // Các xô thưởng KHÔNG dùng `useFieldArray`: số xô thay đổi theo nhóm mà hook thì không
  // gọi được trong vòng lặp. Chúng chỉ cần đếm/thêm/xoá, làm thẳng trên mảng form là đủ.
  const appendBonusRow = (blank: any) => {
    bonusPosIdxs.forEach((posIdx) => {
      const recs = form.getValues(`positions.${posIdx}.recipients`) || []
      form.setValue(`positions.${posIdx}.recipients`, [...recs, { ...blank }], {
        shouldDirty: true,
      })
    })
  }
  const removeBonusRow = (i: number) => {
    bonusPosIdxs.forEach((posIdx) => {
      const recs = form.getValues(`positions.${posIdx}.recipients`) || []
      if (i >= recs.length) return
      form.setValue(
        `positions.${posIdx}.recipients`,
        recs.filter((_: any, idx: number) => idx !== i),
        { shouldDirty: true }
      )
      updatePercentages(posIdx)
    })
  }

  // Mọi xô giữ số dòng bằng nhau (thêm/xoá luôn chạm hết), nên chỉ cần theo dõi xô đầu để
  // biết số dòng khi nhóm không có phí. Đường dẫn cố định trong vòng đời một nhóm.
  const firstBonusRecipientsLive = useWatch({
    control: form.control,
    name:
      bonusPosIdxs.length > 0
        ? `positions.${bonusPosIdxs[0]}.recipients`
        : 'positions.0.__no_bonus',
  }) as any[] | undefined

  // Row index i pairs feePos.recipients[i] / <mỗi xô thưởng>.recipients[i] /
  // dedPos.recipients[i] (same payee).
  const rowCount = Math.max(
    feePosIdx != null ? feeArray.fields.length : 0,
    bonusPosIdxs.length > 0 ? (firstBonusRecipientsLive?.length ?? 0) : 0,
    dedPosIdx != null ? dedArray.fields.length : 0
  )

  const updatePercentages = (posIdx: number) => {
    const recipients = form.getValues(`positions.${posIdx}.recipients`) || []
    // Editable prefix only: with a pooled cut, pct is RELATIVE to the remainder (the BE
    // group-editor contract) — the pooled suffix keeps its own stored pct untouched.
    const len = editableCount(recipients)
    if (len === 0) return
    const editable = recipients.slice(0, len)
    const totalAmount = editable.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0)
    let remainingPct = 100.0

    editable.forEach((r: any, idx: number) => {
      let pctStr = '0.00'
      if (idx === len - 1) {
        pctStr = remainingPct.toFixed(2)
      } else {
        // `!== 0`, không phải `> 0`: giảm trừ là tiền ÂM, tổng âm — chia âm/âm vẫn ra tỉ lệ
        // dương đúng. Chặn theo `> 0` là rơi vào nhánh chia đều, ra 50/50 cho một dòng
        // gánh hết và một dòng gánh 0.
        const rawPct = totalAmount !== 0 ? (Number(r.amount || 0) / totalAmount) * 100 : 100 / len
        const pct = Math.max(0, Math.min(remainingPct, Math.round(rawPct * 100) / 100))
        pctStr = pct.toFixed(2)
        remainingPct = Math.round((remainingPct - pct) * 100) / 100
      }
      form.setValue(`positions.${posIdx}.recipients.${idx}.pct_of_parent`, pctStr, {
        shouldDirty: true,
      })
    })
  }

  // Automatically initialize / normalize percentages on mount
  useEffect(() => {
    if (feePosIdx == null) return
    const recs = form.getValues(`positions.${feePosIdx}.recipients`) || []
    if (
      recs.length === 1 &&
      (recs[0]?.pct_of_parent == null || parseFloat(recs[0]?.pct_of_parent || '0') === 0)
    ) {
      form.setValue(`positions.${feePosIdx}.recipients.0.pct_of_parent`, '100.00', {
        shouldDirty: true,
      })
    } else {
      const needsUpdate = recs.some(
        (r: any) =>
          r.pct_of_parent == null || (parseFloat(r.pct_of_parent) === 0 && recs.length === 1)
      )
      // With a pooled cut the stored pct is relative to the FULL allocated; the editor
      // works relative to the remainder, so re-normalize the editable prefix to 100.
      if (needsUpdate || recs.some((r: any) => isPooledRow(r))) {
        updatePercentages(feePosIdx)
      }
    }
  }, [feePosIdx])

  const setMoney = (posIdx: number | undefined, rIdx: number, val: string, isFee: boolean) => {
    if (posIdx == null) return
    const clean = val || '0'
    // Mỗi xô cân về mức phân bổ của CHÍNH nó — tra theo posIdx thay vì rẽ nhánh phí/thưởng,
    // vì giờ có nhiều xô thưởng với mức khác nhau.
    const expected = isFee ? feeExpected : (bonusExpectedByPos[posIdx] ?? 0)

    const currentRecipients = form.getValues(`positions.${posIdx}.recipients`) || []
    // Editable prefix only — a pooled suffix row must never be a balance target.
    const N = editableCount(currentRecipients)

    if (N === 1) {
      const expStr = Math.round(expected).toString()
      form.setValue(`positions.${posIdx}.recipients.0.amount`, expStr, { shouldDirty: true })
      form.setValue(`positions.${posIdx}.recipients.0.base_amount`, isFee ? expStr : '0', {
        shouldDirty: true,
      })
      form.setValue(`positions.${posIdx}.recipients.0.bonus_amount`, isFee ? '0' : expStr, {
        shouldDirty: true,
      })
      form.setValue(`positions.${posIdx}.recipients.0.pct_of_parent`, '100.00', {
        shouldDirty: true,
      })
      if (isFee) syncDeductionToFee()
      return
    }

    // Determine target recipient index to adjust
    const adjustIdx = rIdx < N - 1 ? N - 1 : 0

    // Calculate sum of other recipients excluding both rIdx and adjustIdx
    let otherSumWithoutAdjust = 0
    for (let idx = 0; idx < N; idx++) {
      if (idx === adjustIdx || idx === rIdx) continue
      otherSumWithoutAdjust += parseNumberSafe(currentRecipients[idx]?.amount || '0')
    }

    // Kẹp về phía xa 0 của chính dấu `expected`, không phải luôn về 0. Một dòng ĐÒI LẠI có
    // `expected` âm (BE thu hồi phần chi dư, 2026-08-06): `Math.max(0, ...)` cho ra trần 0 nên
    // mọi ô về 0, tổng chia ≠ expected và nút Lưu bị chặn vĩnh viễn với nhóm >1 người.
    const headroom = Math.round(expected - otherSumWithoutAdjust)
    let cleanNum = parseNumberSafe(clean)
    if (headroom >= 0 ? cleanNum > headroom : cleanNum < headroom) {
      cleanNum = headroom
    }

    const cleanStr = cleanNum.toString()

    // Set the edited recipient values
    form.setValue(`positions.${posIdx}.recipients.${rIdx}.amount`, cleanStr, { shouldDirty: true })
    form.setValue(`positions.${posIdx}.recipients.${rIdx}.base_amount`, isFee ? cleanStr : '0', {
      shouldDirty: true,
    })
    form.setValue(`positions.${posIdx}.recipients.${rIdx}.bonus_amount`, isFee ? '0' : cleanStr, {
      shouldDirty: true,
    })

    // Dòng cân bằng cũng phải mang được số âm, nếu không tổng không bao giờ khớp `expected` âm.
    const adjustedAmount = Math.round(expected - otherSumWithoutAdjust - cleanNum)
    const adjustedStr = adjustedAmount.toString()

    form.setValue(`positions.${posIdx}.recipients.${adjustIdx}.amount`, adjustedStr, {
      shouldDirty: true,
    })
    form.setValue(
      `positions.${posIdx}.recipients.${adjustIdx}.base_amount`,
      isFee ? adjustedStr : '0',
      { shouldDirty: true }
    )
    form.setValue(
      `positions.${posIdx}.recipients.${adjustIdx}.bonus_amount`,
      isFee ? '0' : adjustedStr,
      { shouldDirty: true }
    )

    updatePercentages(posIdx)
    if (isFee) syncDeductionToFee()
  }

  const storeDeduction = (idx: number, magnitude: number) => {
    if (dedPosIdx == null) return
    form.setValue(
      `positions.${dedPosIdx}.recipients.${idx}.amount`,
      magnitude > 0 ? (-magnitude).toString() : '0',
      { shouldDirty: true }
    )
  }

  /**
   * Giảm trừ ĐI THEO tỉ lệ chia phí — nhận 100% phí thì gánh 100% giảm trừ (giảm trừ là
   * khoản đòi lại TRÊN PHÍ, chốt 05/08). Đây là MẶC ĐỊNH, không phải luật: một khi kế toán
   * gõ tay vào cột giảm trừ (`__ded_touched`), số đó được giữ nguyên kể cả khi % phí đổi —
   * chỉ thêm/xoá người nhận mới cân lại, vì lúc đó tiền buộc phải cộng đủ.
   *
   * Dòng giảm trừ ghép với dòng phí THEO CHỈ SỐ (addRecipient thêm cả hai mảng cùng lúc).
   * Phần dư làm tròn dồn vào dòng gánh phí nhiều nhất, để dòng phí 0 không bị dính 1đ.
   */
  const syncDeductionToFee = () => {
    if (dedPosIdx == null || feePosIdx == null) return
    if (form.getValues(`positions.${dedPosIdx}.__ded_touched`) === true) return
    const feeRecs = form.getValues(`positions.${feePosIdx}.recipients`) || []
    const dedRecs = form.getValues(`positions.${dedPosIdx}.recipients`) || []
    const N = Math.min(editableCount(feeRecs), editableCount(dedRecs))
    if (N === 0) return
    // Neo vào phần phí THỰC SỰ đi được, không vào số đang hiển thị. Số hiển thị là grain cả
    // kỳ (gồm cả tiền đã chi ở đợt trước), nên neo vào nó là gán giảm trừ theo một tỉ lệ
    // không hiện thực hoá được: ws176 tính CTV −87.867đ giảm trừ trong khi phí ghi được của
    // xô là 0đ nên CTV nhận 0đ. Xô phí đã chi hết thì neo vào NGƯỜI ĐÃ NHẬN phần đã chi
    // (`locked_recipients`) — tiền ra rồi, nhưng khoản đòi lại vẫn thuộc về họ.
    const feeAmounts = feeAnchorAmounts(
      feePos!.posData,
      feeRecs.slice(0, N),
      feePos!.posData.locked_recipients || []
    )
    const magnitudes = deductionMagnitudesFromFee(feeAmounts, dedExpected)
    // null = không có phí nào để bám vào (nhóm chỉ có thưởng, hoặc kỳ này phí = 0) — giữ
    // nguyên thế chia hiện tại thay vì bịa ra một tỉ lệ.
    if (!magnitudes) return
    magnitudes.forEach((mag, idx) => storeDeduction(idx, mag))
    updatePercentages(dedPosIdx)
  }

  // Deduction money: the user types a POSITIVE magnitude; the form stores the SIGNED
  // negative amount the BE expects. Last-absorbs-drift so magnitudes always sum to
  // |dedExpected|. Any hand edit marks the position __ded_touched, which both pins the
  // number against later fee edits and tells saveGroup it is a deliberate figure.
  const setDeductionMoney = (rIdx: number, val: string) => {
    if (dedPosIdx == null) return
    const targetMagnitude = Math.abs(Math.round(dedExpected))
    const currentRecipients = form.getValues(`positions.${dedPosIdx}.recipients`) || []
    // Editable prefix only — a pooled suffix row must never be a balance target.
    const N = editableCount(currentRecipients)

    if (N === 1) {
      storeDeduction(0, targetMagnitude)
      form.setValue(`positions.${dedPosIdx}.__ded_touched`, true, { shouldDirty: true })
      return
    }

    const adjustIdx = rIdx < N - 1 ? N - 1 : 0
    let otherSumWithoutAdjust = 0
    for (let idx = 0; idx < N; idx++) {
      if (idx === adjustIdx || idx === rIdx) continue
      otherSumWithoutAdjust += Math.abs(parseNumberSafe(currentRecipients[idx]?.amount || '0'))
    }
    const maxAllowed = Math.max(0, targetMagnitude - otherSumWithoutAdjust)
    const cleanNum = Math.min(parseNumberSafe(val || '0'), maxAllowed)
    storeDeduction(rIdx, cleanNum)
    storeDeduction(adjustIdx, Math.max(0, targetMagnitude - otherSumWithoutAdjust - cleanNum))
    form.setValue(`positions.${dedPosIdx}.__ded_touched`, true, { shouldDirty: true })
  }

  const onPctChange = (idx: number, val: string) => {
    if (feePosIdx == null) return
    const cleanPct = val || '0'
    const pctVal = parseFloat(cleanPct)

    const currentRecipients = form.getValues(`positions.${feePosIdx}.recipients`) || []
    // Editable prefix only — a pooled suffix row must never be a balance target.
    const N = editableCount(currentRecipients)

    if (N === 1) {
      const expStr = Math.round(feeExpected).toString()
      form.setValue(`positions.${feePosIdx}.recipients.0.amount`, expStr, { shouldDirty: true })
      form.setValue(`positions.${feePosIdx}.recipients.0.base_amount`, expStr, {
        shouldDirty: true,
      })
      form.setValue(`positions.${feePosIdx}.recipients.0.bonus_amount`, '0', { shouldDirty: true })
      form.setValue(`positions.${feePosIdx}.recipients.0.pct_of_parent`, '100.00', {
        shouldDirty: true,
      })
      syncDeductionToFee()
      return
    }

    // Determine target recipient index to adjust
    const adjustIdx = idx < N - 1 ? N - 1 : 0

    // Calculate sum of other recipients' percentages excluding both idx and adjustIdx
    let otherPctSumWithoutAdjust = 0
    for (let i = 0; i < N; i++) {
      if (i === adjustIdx || i === idx) continue
      otherPctSumWithoutAdjust += parseFloat(currentRecipients[i]?.pct_of_parent || '0')
    }

    const maxAllowedPct = Math.max(0, 100 - otherPctSumWithoutAdjust)
    const cleanPctNum = Math.min(maxAllowedPct, pctVal)

    // Set the edited recipient values
    const cleanPctStr = cleanPctNum.toFixed(2)
    form.setValue(`positions.${feePosIdx}.recipients.${idx}.pct_of_parent`, cleanPctStr, {
      shouldDirty: true,
    })

    const newAmount = Math.round(feeExpected * (cleanPctNum / 100))
    const newAmountStr = newAmount.toString()
    form.setValue(`positions.${feePosIdx}.recipients.${idx}.amount`, newAmountStr, {
      shouldDirty: true,
    })
    form.setValue(`positions.${feePosIdx}.recipients.${idx}.base_amount`, newAmountStr, {
      shouldDirty: true,
    })
    form.setValue(`positions.${feePosIdx}.recipients.${idx}.bonus_amount`, '0', {
      shouldDirty: true,
    })

    // Set adjusted recipient values
    const adjustedPct = Math.max(0, 100 - otherPctSumWithoutAdjust - cleanPctNum)
    const adjustedPctStr = adjustedPct.toFixed(2)
    form.setValue(`positions.${feePosIdx}.recipients.${adjustIdx}.pct_of_parent`, adjustedPctStr, {
      shouldDirty: true,
    })

    let otherAmountSumWithoutAdjust = 0
    for (let i = 0; i < N; i++) {
      if (i === adjustIdx || i === idx) continue
      otherAmountSumWithoutAdjust += parseNumberSafe(currentRecipients[i]?.amount || '0')
    }
    const adjustedAmount = Math.max(
      0,
      Math.round(feeExpected - otherAmountSumWithoutAdjust - newAmount)
    )
    const adjustedAmountStr = adjustedAmount.toString()
    form.setValue(`positions.${feePosIdx}.recipients.${adjustIdx}.amount`, adjustedAmountStr, {
      shouldDirty: true,
    })
    form.setValue(`positions.${feePosIdx}.recipients.${adjustIdx}.base_amount`, adjustedAmountStr, {
      shouldDirty: true,
    })
    form.setValue(`positions.${feePosIdx}.recipients.${adjustIdx}.bonus_amount`, '0', {
      shouldDirty: true,
    })
    syncDeductionToFee()
  }

  const onFeePctChange = (idx: number, val: string) => {
    // No share percentage ⇒ no fee rate to divide by; the cell is read-only in that case.
    if (standPersonFeePct == null || standPersonFeePct <= 0) return
    const feePctInput = parseFloat(val || '0')
    onPctChange(idx, ((feePctInput / standPersonFeePct) * 100).toFixed(4))
  }

  const addRecipient = () => {
    if (locked) return
    const blank = {
      employee_id: null,
      collaborator_id: null,
      exchange_id: null,
      amount: '0',
      base_amount: '0',
      bonus_amount: '0',
      pct_of_parent: '0.00',
      recipient_name: '',
      hold_amount: '0',
      reason: '',
    }
    if (feePosIdx != null) {
      // Keep the pooled rows a SUFFIX: insert the new editable row before them so the
      // row index keeps pairing with the bonus/deduction arrays (which have no pooled rows).
      const recs = form.getValues(`positions.${feePosIdx}.recipients`) || []
      const eN = editableCount(recs)
      if (eN < recs.length) feeArray.insert(eN, { ...blank })
      else feeArray.append({ ...blank })
    }
    appendBonusRow(blank)
    if (dedPosIdx != null) dedArray.append({ ...blank })
    // Dòng mới chưa có phí nên chưa gánh gì; gọi để giữ đúng bất biến "giảm trừ luôn khớp
    // thế chia phí hiện tại" ngay từ lúc thêm.
    syncDeductionToFee()
  }

  const removeRecipient = (i: number) => {
    if (locked) return

    const feeRecs =
      feePosIdx != null ? form.getValues(`positions.${feePosIdx}.recipients`) || [] : []

    if (feePosIdx != null && editableCount(feeRecs) > 1) {
      const removedAmount = parseNumberSafe(feeRecs[i]?.amount || '0')
      const adjustIdx = i === 0 ? 1 : 0
      const currentAmount = parseNumberSafe(feeRecs[adjustIdx]?.amount || '0')
      const newAmount = Math.max(0, currentAmount + removedAmount)
      const newAmtStr = newAmount.toString()
      form.setValue(`positions.${feePosIdx}.recipients.${adjustIdx}.amount`, newAmtStr, {
        shouldDirty: true,
      })
      form.setValue(`positions.${feePosIdx}.recipients.${adjustIdx}.base_amount`, newAmtStr, {
        shouldDirty: true,
      })
    }

    // Từng xô thưởng dồn phần của người bị xoá sang dòng kề một cách ĐỘC LẬP — tiền của xô
    // này không được chảy sang xô khác.
    bonusPosIdxs.forEach((posIdx) => {
      const bonusRecs = form.getValues(`positions.${posIdx}.recipients`) || []
      if (bonusRecs.length <= 1) return
      const removedAmount = parseNumberSafe(bonusRecs[i]?.amount || '0')
      const adjustIdx = i === 0 ? 1 : 0
      const currentAmount = parseNumberSafe(bonusRecs[adjustIdx]?.amount || '0')
      const newAmtStr = Math.max(0, currentAmount + removedAmount).toString()
      form.setValue(`positions.${posIdx}.recipients.${adjustIdx}.amount`, newAmtStr, {
        shouldDirty: true,
      })
      form.setValue(`positions.${posIdx}.recipients.${adjustIdx}.bonus_amount`, newAmtStr, {
        shouldDirty: true,
      })
    })

    // Xoá người nhận thì tiền BUỘC phải cộng lại cho đủ, kể cả khi số giảm trừ đã sửa tay:
    // phần của người bị xoá dồn sang dòng kề. Thế chia còn lại giữ nguyên (không đụng
    // __ded_touched) — nhóm chưa sửa tay sẽ được syncDeductionToFee() dưới đây tính lại
    // theo tỉ lệ phí mới.
    if (dedPosIdx != null) {
      const dedRecs = form.getValues(`positions.${dedPosIdx}.recipients`) || []
      if (editableCount(dedRecs) > 1) {
        const removedMag = Math.abs(parseNumberSafe(dedRecs[i]?.amount || '0'))
        const adjustIdx = i === 0 ? 1 : 0
        const currentMag = Math.abs(parseNumberSafe(dedRecs[adjustIdx]?.amount || '0'))
        const newMag = currentMag + removedMag
        form.setValue(
          `positions.${dedPosIdx}.recipients.${adjustIdx}.amount`,
          newMag > 0 ? (-newMag).toString() : '0',
          { shouldDirty: true }
        )
      }
    }

    if (feePosIdx != null && i < feeArray.fields.length) {
      feeArray.remove(i)
      updatePercentages(feePosIdx)
    }
    removeBonusRow(i)
    if (dedPosIdx != null && i < dedArray.fields.length) {
      dedArray.remove(i)
      updatePercentages(dedPosIdx)
    }
    syncDeductionToFee()
  }

  const setRecipient = (
    i: number,
    kind: 'employee' | 'collaborator' | 'exchange',
    id: number,
    name: string
  ) => {
    ;[feePosIdx, ...bonusPosIdxs, dedPosIdx].forEach((posIdx) => {
      if (posIdx == null) return
      const p = `positions.${posIdx}.recipients.${i}`
      form.setValue(`${p}.employee_id`, kind === 'employee' ? String(id) : null, {
        shouldDirty: true,
      })
      form.setValue(`${p}.collaborator_id`, kind === 'collaborator' ? String(id) : null, {
        shouldDirty: true,
      })
      form.setValue(`${p}.exchange_id`, kind === 'exchange' ? String(id) : null, {
        shouldDirty: true,
      })
      form.setValue(`${p}.recipient_name`, name)
    })
  }

  const th = 'px-3 py-2.5 text-[11px] font-medium text-neutral-500 whitespace-nowrap'
  const td = 'px-3 py-2 text-[13px] align-middle'

  const rows = Array.from({ length: rowCount }, (_, i) => i)

  return (
    <div className="border-border-1 overflow-hidden rounded-lg border">
      {hasExtraPositions && (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          Nhóm này có nhiều hơn 1 khoản phí hoặc thưởng — trình sửa chỉ thao tác được khoản đầu mỗi
          loại. Vui lòng kiểm tra lại ở bảng chi tiết hoặc liên hệ kỹ thuật để chia đầy đủ.
        </div>
      )}
      {/* Cột tiền hiển thị grain CẢ KỲ nhưng ô nhập chỉ ghi lên đợt còn mở — hai gốc khác
          nhau trên cùng một dòng. Không nói ra thì kế toán gõ % vào một xô đã chi hết mà
          tưởng đã chia (ws176: xô phí F2 hiện 13.236.300đ, ghi lại được 0đ). */}
      {frozenBucketNotes.length > 0 && (
        <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] text-neutral-700">
          {frozenBucketNotes.map((note) => (
            <div key={note.label} className="flex flex-wrap items-center gap-x-2">
              <span className="font-medium">{note.label}</span>
              {note.locked > 0 && (
                <span className="text-neutral-500">
                  🔒 đã chốt ở đợt đã chi {formatCurrencyVND(note.locked)} đ
                </span>
              )}
              <span className={note.editable === 0 ? 'text-neutral-400' : 'text-neutral-600'}>
                · còn chia được {formatCurrencyVND(note.editable)} đ
              </span>
              {note.editable === 0 && (
                <span className="text-neutral-400">— ô nhập của khoản này đã khoá</span>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1360px] border-collapse text-right [&_td]:align-middle [&_th]:align-middle">
          <thead className="bg-[#F9F9F9]">
            <tr className="border-border-1 border-b">
              <th className={`${th} text-left`}>Đối tượng / Thành viên</th>
              {bonusSlots.map((slot) => (
                <th key={slot.key} className={th}>
                  {slot.label}
                </th>
              ))}
              <th className={th}>Đã tạm ứng</th>
              <th className={`${th} w-[120px] min-w-[120px]`}>% chia</th>
              <th className={`${th} w-[120px] min-w-[120px]`}>% Phí từng sale</th>
              <th className={th}>Phí từng sale</th>
              <th className={th}>Giảm trừ</th>
              <th className={th}>Tổng trả</th>
              <th className={th}>Thuế TNCN</th>
              <th className={th}>Thực nhận</th>
              <th className={th}>Tạm giữ trước thuế</th>
              <th className={th}>Tạm giữ sau thuế</th>
              <th
                className={`${th} sticky right-0 z-20 bg-[#F9F9F9] text-center shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]`}
              >
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => {
              // Pooled rows render once in the read-table's pooled band — never here.
              if (feePosIdx != null && isPooledRow(feeRecipientsLive?.[i])) return null
              return (
                <EditorRow
                  key={feeArray.fields[i]?.id || i}
                  i={i}
                  form={form}
                  locked={locked}
                  feeBucketFrozen={feeBucketFrozen}
                  dedBucketFrozen={dedBucketFrozen}
                  bonusBucketFrozen={bonusBucketFrozen}
                  feePosIdx={feePosIdx}
                  bonusSlots={bonusSlots}
                  dedPosIdx={dedPosIdx}
                  standPersonFeePct={standPersonFeePct}
                  ownerType={ownerType}
                  ownerId={ownerId}
                  td={td}
                  loadEmployeeOptions={loadEmployeeOptions}
                  loadCollaboratorOptions={loadCollaboratorOptions}
                  loadExchangeOptions={loadExchangeOptions}
                  onFeeChange={(v) => setMoney(feePosIdx, i, v, true)}
                  onBonusChange={(posIdx, v) => setMoney(posIdx, i, v, false)}
                  onDeductionChange={(v) => setDeductionMoney(i, v)}
                  onPctChange={(v) => onPctChange(i, v)}
                  onFeePctChange={(v) => onFeePctChange(i, v)}
                  onPickRecipient={(kind, id, name) => setRecipient(i, kind, id, name)}
                  onRemove={() => removeRecipient(i)}
                />
              )
            })}
          </tbody>
          <tfoot className="border-border-1 border-t bg-neutral-50/70 text-[12px]">
            <tr>
              <td className="px-3 py-2 text-left font-medium">
                {locked ? (
                  <span className="text-[11px] text-neutral-400">Đã tạm ứng — khóa chỉnh sửa</span>
                ) : (
                  <button
                    type="button"
                    onClick={addRecipient}
                    className="border-border-1 hover:bg-neutral-30 inline-flex items-center justify-center gap-1 rounded border border-dashed bg-white px-3 py-1.5 text-[12px] font-medium whitespace-nowrap text-neutral-700 transition-colors hover:border-neutral-400"
                  >
                    + Chia thêm cho người khác
                  </button>
                )}
              </td>
              {bonusSlots.map((slot) => (
                <td key={slot.key} className="px-3 py-2 text-right">
                  <TotalCell
                    form={form}
                    posIdx={slot.posIdx}
                    target={slot.posIdx != null ? (bonusExpectedByPos[slot.posIdx] ?? 0) : 0}
                    rowCount={rowCount}
                  />
                </td>
              ))}
              <td />
              <td className="px-3 py-2 text-right">
                <PctTotalCell form={form} posIdx={feePosIdx} rowCount={rowCount} />
              </td>
              <td />
              <td className="px-3 py-2 text-right">
                <TotalCell
                  form={form}
                  posIdx={feePosIdx}
                  target={feeExpected}
                  rowCount={rowCount}
                />
              </td>
              <td className="px-3 py-2 text-right">
                <TotalCell
                  form={form}
                  posIdx={dedPosIdx}
                  target={dedExpected}
                  rowCount={rowCount}
                />
              </td>
              <td colSpan={5} />
              <td className="sticky right-0 z-10 bg-neutral-50/70" />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap gap-3 px-3 py-2 text-[11px] text-neutral-400">
        <span>
          Tổng trả = Thưởng + Phí từng sale − Giảm trừ · Thực nhận = Tổng trả − TNCN − Tạm giữ trước
          thuế − Tạm giữ sau thuế
        </span>
        <span>Phí từng sale là tỷ lệ phí của giao dịch (không sửa)</span>
        <span>Σ Phí từng sale = HH phí kỳ này, Σ Thưởng = thưởng kỳ này</span>
        <span>Giảm trừ: không sửa thì tự chia theo tỷ lệ phí, sửa thì tổng phải khớp</span>
      </div>
    </div>
  )
}

const TotalCell = ({
  form,
  posIdx,
  target,
  rowCount,
}: {
  form: any
  posIdx: number | undefined
  target: number
  rowCount: number
}) => {
  const values = useWatch({
    control: form.control,
    name: posIdx != null ? `positions.${posIdx}.recipients` : 'positions.0.recipients',
  })
  if (posIdx == null) return <span className="text-neutral-400">—</span>
  const sum = Array.from({ length: rowCount }).reduce(
    // Pooled rows are hidden from the editor — keep them out of the visible total too.
    (s: number, _v, idx) =>
      isPooledRow(values?.[idx]) ? s : s + Number(values?.[idx]?.amount || 0),
    0
  )
  // ±1đ tolerance so a legit 50/50 split of an odd amount isn't flagged red.
  const ok = Math.abs(sum - Math.round(target)) <= 1
  return (
    <span className={`font-semibold ${ok ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
      {ok ? '✓ ' : ''}
      {formatCurrencyVND(sum)}
    </span>
  )
}

const PctTotalCell = ({
  form,
  posIdx,
  rowCount,
}: {
  form: any
  posIdx: number | undefined
  rowCount: number
}) => {
  const values = useWatch({
    control: form.control,
    name: posIdx != null ? `positions.${posIdx}.recipients` : 'positions.0.recipients',
  })
  if (posIdx == null) return <span className="text-neutral-400">—</span>
  const sum = Array.from({ length: rowCount }).reduce(
    // Editable pct is relative to the non-pooled remainder — skip pooled rows.
    (s: number, _v, idx) =>
      isPooledRow(values?.[idx]) ? s : s + parseFloat(values?.[idx]?.pct_of_parent || '0'),
    0
  )
  const ok = Math.abs(sum - 100) <= 0.05
  return (
    <span className={`font-semibold ${ok ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
      {ok ? '✓ ' : ''}
      {sum.toFixed(2).replace('.', ',')}%
    </span>
  )
}

interface RowProps {
  i: number
  form: any
  locked: boolean
  /** Xô đã chi hết ở đợt trước — ô tiền của riêng xô đó phải chết, xem `isBucketFullyLocked`. */
  feeBucketFrozen: boolean
  dedBucketFrozen: boolean
  bonusBucketFrozen: Record<number, boolean>
  feePosIdx: number | undefined
  bonusSlots: { key: string; label: string; posIdx: number | undefined }[]
  dedPosIdx: number | undefined
  standPersonFeePct: number | null
  ownerType?: string
  ownerId?: number | string
  td: string
  loadEmployeeOptions: any
  loadCollaboratorOptions: any
  loadExchangeOptions: any
  onFeeChange: (v: string) => void
  onBonusChange: (posIdx: number, v: string) => void
  onDeductionChange: (v: string) => void
  onPctChange: (v: string) => void
  onFeePctChange: (v: string) => void
  onPickRecipient: (
    kind: 'employee' | 'collaborator' | 'exchange',
    id: number,
    name: string
  ) => void
  onRemove: () => void
}

const EditorRow = ({
  i,
  form,
  locked,
  feeBucketFrozen,
  dedBucketFrozen,
  bonusBucketFrozen,
  feePosIdx,
  bonusSlots,
  dedPosIdx,
  standPersonFeePct,
  ownerType,
  ownerId,
  td,
  loadEmployeeOptions,
  loadCollaboratorOptions,
  loadExchangeOptions,
  onFeeChange,
  onBonusChange,
  onDeductionChange,
  onPctChange,
  onFeePctChange,
  onPickRecipient,
  onRemove,
}: RowProps) => {
  // Prefer the fee position's recipient identity; fall back to bonus.
  const bonusPosIdxs = bonusSlots.map((sl) => sl.posIdx).filter((x): x is number => x != null)
  const refPos = feePosIdx ?? bonusPosIdxs[0]
  const rec = useWatch({ control: form.control, name: `positions.${refPos}.recipients.${i}` }) || {}
  // Watch identity fields specifically — object-level useWatch doesn't reliably re-render on
  // a nested setValue (so a freshly-picked CTV wasn't detected for the TNCN preview).
  const empId = useWatch({
    control: form.control,
    name: `positions.${refPos}.recipients.${i}.employee_id`,
  })
  const colId = useWatch({
    control: form.control,
    name: `positions.${refPos}.recipients.${i}.collaborator_id`,
  })
  const excId = useWatch({
    control: form.control,
    name: `positions.${refPos}.recipients.${i}.exchange_id`,
  })
  const recName = useWatch({
    control: form.control,
    name: `positions.${refPos}.recipients.${i}.recipient_name`,
  })
  const feeAmt = Number(
    useWatch({
      control: form.control,
      name:
        feePosIdx != null ? `positions.${feePosIdx}.recipients.${i}.amount` : `positions.0.__none`,
    }) || 0
  )
  // "Tổng trả" ăn TỔNG mọi xô thưởng của dòng — theo dõi cả danh sách đường dẫn một lần
  // (RHF nhận mảng `name`), không gọi hook trong vòng lặp.
  const bonusAmtsWatched = useWatch({
    control: form.control,
    name:
      bonusPosIdxs.length > 0
        ? bonusPosIdxs.map((p) => `positions.${p}.recipients.${i}.amount`)
        : [`positions.0.__none`],
  }) as unknown[]
  const bonusAmt =
    bonusPosIdxs.length > 0
      ? (bonusAmtsWatched || []).reduce((s: number, v) => s + Number(v || 0), 0)
      : 0

  const isCtv = !!colId
  const isExchange = !!excId
  const isProxy = !(
    (ownerType === 'employee' && empId != null && String(empId) === String(ownerId)) ||
    (ownerType === 'collaborator' && colId != null && String(colId) === String(ownerId)) ||
    (ownerType === 'exchange' && excId != null && String(excId) === String(ownerId))
  )
  const advance = Number(rec.advance_granted_amount || 0)
  const paid = Number(rec.paid_amount || 0)

  const accountHold = Number(rec.account_hold_amount || 0)
  const ralHold = Number(rec.hold_amount || 0)
  const useAccount = accountHold > 0
  const totalHold = useAccount ? accountHold : ralHold
  const taxBase = rec.tax_base || null

  let preTaxHold = 0
  let postTaxHold = 0

  if (useAccount) {
    preTaxHold = Number(
      (rec as any).account_pre_tax_hold_amount || (rec as any).pre_tax_hold_amount || 0
    )
    postTaxHold = Number(
      (rec as any).account_post_tax_hold_amount || (rec as any).post_tax_hold_amount || 0
    )
    if (totalHold > 0 && preTaxHold === 0 && postTaxHold === 0) {
      preTaxHold = totalHold
    }
  } else {
    if (taxBase === 'PRE_TAX') {
      preTaxHold = totalHold
    } else if (taxBase === 'POST_TAX') {
      postTaxHold = totalHold
    } else if (totalHold > 0) {
      preTaxHold = totalHold
    }
  }

  // Live per-payee deduction from the deduction position's paired row (signed
  // negative in the form; derivePayout takes the positive magnitude).
  const dedAmtRaw = useWatch({
    control: form.control,
    name:
      dedPosIdx != null ? `positions.${dedPosIdx}.recipients.${i}.amount` : `positions.0.__none`,
  })
  const deductionAmt = dedPosIdx != null ? Math.abs(Number(dedAmtRaw || 0)) : 0

  const { tongTra, tncn, thucNhan } = derivePayout({
    bonus: bonusAmt,
    fee: feeAmt,
    deduction: deductionAmt,
    isCtv,
    paid,
    preTaxHold,
    postTaxHold,
  })

  const hasName = !!(empId || colId || excId) || !!recName

  const [pickKind, setPickKind] = useState<'employee' | 'collaborator' | 'exchange'>('employee')
  const pickLoader =
    pickKind === 'collaborator'
      ? loadCollaboratorOptions
      : pickKind === 'exchange'
        ? loadExchangeOptions
        : loadEmployeeOptions

  const pctOfParentVal = useWatch({
    control: form.control,
    name:
      feePosIdx != null
        ? `positions.${feePosIdx}.recipients.${i}.pct_of_parent`
        : `positions.0.__none`,
  })
  const pctOfParentNum = parseFloat(pctOfParentVal || '0')
  // null on an amount-based share — the cell shows '—' instead of a fabricated rate. A 0
  // rate is equally unusable (onFeePctChange would divide by it), so treat it the same.
  const feePctNum =
    standPersonFeePct != null && standPersonFeePct > 0
      ? (pctOfParentNum * standPersonFeePct) / 100
      : null
  const feePctDisplayStr =
    feePctNum != null && feePctNum > 0 ? (Math.round(feePctNum * 10000) / 10000).toString() : '0'

  return (
    <tr className="group/row border-border-1 hover:bg-data-light-grey-hover border-b">
      <td className={`${td} text-left`}>
        {hasName ? (
          <div className="flex flex-col items-start gap-0.5">
            <span className="font-medium text-neutral-900">
              {recName || rec.recipient_name || '—'}
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                isProxy ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#DCFCE7] text-[#166534]'
              }`}
            >
              {isProxy ? `nhận hộ${isCtv ? ' · CTV' : isExchange ? ' · sàn' : ''}` : 'chính chủ'}
            </span>
          </div>
        ) : (
          <div className="w-[220px]">
            <div className="mb-1 flex gap-1">
              {(
                [
                  { k: 'employee', l: 'NV' },
                  { k: 'collaborator', l: 'CTV' },
                  { k: 'exchange', l: 'Sàn' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.k}
                  type="button"
                  onClick={() => setPickKind(opt.k)}
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                    pickKind === opt.k
                      ? 'bg-data-blue-default text-white'
                      : 'border-border-1 border text-neutral-600'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
            <Select
              key={pickKind}
              loadOptions={pickLoader}
              enableSearch
              placeholder={
                pickKind === 'collaborator'
                  ? 'Chọn CTV...'
                  : pickKind === 'exchange'
                    ? 'Chọn sàn...'
                    : 'Chọn nhân viên...'
              }
              // Select's onChange emits the raw value; the option (with label) comes via
              // onChangeOption — the identity must be set from here.
              onChangeOption={(opt: any) => {
                if (opt?.value != null) {
                  const name =
                    String(opt.label || '')
                      .split(' - ')
                      .slice(1)
                      .join(' - ') || opt.label
                  onPickRecipient(pickKind, Number(opt.value), name)
                }
              }}
            />
          </div>
        )}
      </td>
      {bonusSlots.map((slot) => (
        <td key={slot.key} className="border-border-1 h-px w-[190px] min-w-[190px] p-0 text-right">
          {slot.posIdx == null ? (
            // Nhóm không có xô này -> không có gì để bind. Giữ ô để khớp cột với bảng đọc.
            <span className="px-3 text-neutral-400">—</span>
          ) : (
            <Controller
              name={`positions.${slot.posIdx}.recipients.${i}.amount`}
              control={form.control}
              render={({ field }) => (
                <FullCellNumberInput
                  {...field}
                  value={field.value != null ? String(field.value) : ''}
                  allowNegative
                  onChange={(e) => onBonusChange(slot.posIdx as number, e.target.value || '0')}
                  placeholder="0"
                  suffix=""
                  variant="editable"
                  disabled={locked || !!bonusBucketFrozen[slot.posIdx as number]}
                  className="text-right"
                />
              )}
            />
          )}
        </td>
      ))}
      <td className={`${td} text-neutral-500`}>{advance > 0 ? formatCurrencyVND(advance) : '—'}</td>
      <td className="border-border-1 h-px w-[120px] min-w-[120px] p-0 text-right">
        {feePosIdx != null ? (
          <Controller
            name={`positions.${feePosIdx}.recipients.${i}.pct_of_parent`}
            control={form.control}
            render={({ field }) => (
              <FullCellNumberInput
                {...field}
                value={field.value != null ? String(field.value) : ''}
                onChange={(e) => onPctChange(e.target.value || '0')}
                placeholder="0,00"
                suffix="%"
                variant="editable"
                disabled={locked || feeBucketFrozen}
                className="text-right font-medium text-neutral-800"
              />
            )}
          />
        ) : (
          <span className="px-3 text-neutral-400">—</span>
        )}
      </td>
      <td className="border-border-1 h-px w-[120px] min-w-[120px] p-0 text-right">
        {feePosIdx != null && feePctNum != null ? (
          <FullCellNumberInput
            value={feePctDisplayStr}
            onChange={(e) => onFeePctChange(e.target.value || '0')}
            placeholder="0,00"
            suffix="%"
            variant="editable"
            disabled={locked || feeBucketFrozen}
            className="text-right text-neutral-600"
          />
        ) : (
          <span className="px-3 text-neutral-400">—</span>
        )}
      </td>
      <td className="border-border-1 h-px w-[190px] min-w-[190px] p-0 text-right">
        {feePosIdx != null ? (
          <Controller
            name={`positions.${feePosIdx}.recipients.${i}.amount`}
            control={form.control}
            render={({ field }) => (
              <FullCellNumberInput
                {...field}
                value={field.value != null ? String(field.value) : ''}
                allowNegative
                onChange={(e) => onFeeChange(e.target.value || '0')}
                placeholder="0"
                suffix=""
                variant="editable"
                disabled={locked || feeBucketFrozen}
                className="text-action-primary-red-default text-right font-bold"
              />
            )}
          />
        ) : (
          <span className="px-3 text-neutral-400">—</span>
        )}
      </td>
      <td className="border-border-1 h-px w-[170px] min-w-[170px] p-0 text-right">
        {dedPosIdx != null ? (
          // Sửa được (chốt 05/08, mở lại sau khoá 04/08): mặc định ai gánh bao nhiêu đi
          // theo tỉ lệ chia phí — nhận 100% phí thì gánh 100% giảm trừ — nhưng đó chỉ là
          // MẶC ĐỊNH: kế toán gõ đè được, phần còn lại dồn về người đứng tên. Người dùng
          // nhập số DƯƠNG; setDeductionMoney lưu số âm có dấu và đánh dấu đã sửa tay.
          <FullCellNumberInput
            value={deductionAmt > 0 ? String(deductionAmt) : ''}
            onChange={(e) => onDeductionChange(e.target.value || '0')}
            placeholder="0"
            suffix=""
            variant="editable"
            disabled={locked || dedBucketFrozen}
            title="Mặc định theo tỉ lệ chia phí — gõ đè để đổi người gánh"
            className="text-right font-medium text-[#DC2626]"
          />
        ) : (
          <span className="px-3 text-neutral-400">—</span>
        )}
      </td>
      <td className={`${td} font-medium`}>{formatCurrencyVND(tongTra)}</td>
      <td className={`${td} text-[#DC2626]`}>
        {tncn != null ? `-${formatCurrencyVND(tncn)}` : '—'}
      </td>
      <td className={`${td} font-semibold text-[#16A34A]`}>{formatCurrencyVND(thucNhan)}</td>
      <td className={`${td} font-medium text-[#D97706]`}>
        {preTaxHold > 0 ? formatCurrencyVND(preTaxHold) : '0'}
      </td>
      <td className={`${td} font-medium text-[#D97706]`}>
        {postTaxHold > 0 ? formatCurrencyVND(postTaxHold) : '0'}
      </td>
      <td className="group-hover/row:bg-data-light-grey-hover sticky right-0 z-10 bg-white px-3 py-2 text-center shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
        {!locked && (
          <button
            type="button"
            onClick={onRemove}
            title="Xóa người nhận"
            className="border-border-1 text-data-red-default hover:bg-neutral-30 inline-flex h-7 w-7 items-center justify-center rounded border bg-white transition-colors"
          >
            <IconTrash className="h-4 w-4" />
          </button>
        )}
      </td>
    </tr>
  )
}
