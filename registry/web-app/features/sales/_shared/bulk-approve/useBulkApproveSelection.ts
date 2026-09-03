// Toàn bộ trạng thái của luồng "Duyệt nhiều" (CR STT35): tích chọn qua nhiều trang, ghi chú
// riêng từng dòng, gọi API, giữ kết quả. Ba màn dùng chung hook này nên hành vi không thể lệch
// nhau — trước đây mỗi màn tự quản selection là ba lần cơ hội sai khác.
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RowSelectionState } from '@tanstack/react-table'

import {
  BULK_APPROVE_MAX_ITEMS,
  buildBulkApproveOutcome,
  type BulkApproveCandidate,
  type BulkApproveItemRequest,
  type BulkApproveOutcome,
  type BulkApproveResult,
  type BulkApproveStep,
} from './bulk-approve-model'

type Params<TRow> = {
  /** Các dòng của TRANG hiện tại. Lựa chọn vẫn tích luỹ qua trang nhờ `selectedMeta`. */
  rows: readonly TRow[]
  /**
   * Đổi khoá này ⇒ xoá sạch lựa chọn. Truyền chuỗi query đã BỎ `page`/`page_size`/`ordering`:
   * đổi trang thì phải giữ lựa chọn, đổi bộ lọc thì phải xoá (dòng đã chọn có thể không còn
   * nằm trong tập kết quả, mà người dùng thì không thấy nó nữa để bỏ tích).
   */
  scopeKey: string
  /** Người dùng có được thấy checkbox không (thường: có ít nhất một quyền duyệt). */
  enabled: boolean
  getRowId: (row: TRow) => number
  /** Bàn duyệt của dòng, suy từ trạng thái. `null` = dòng không nằm trong luồng duyệt. */
  resolveStep: (row: TRow) => BulkApproveStep | null
  /** Người đang đăng nhập có quyền của đúng bàn đó không. */
  canRunStep: (step: BulkApproveStep) => boolean
  /** Thông tin hiển thị của dòng trong dialog xác nhận. */
  describeRow: (row: TRow) => { code: string; subject: string }
  submit: (items: BulkApproveItemRequest[]) => Promise<BulkApproveResult>
}

export type UseBulkApproveSelection<TRow> = {
  /** Bật cột checkbox trên bảng. */
  selectionEnabled: boolean
  rowSelection: RowSelectionState
  setRowSelection: (next: RowSelectionState) => void
  getRowId: (row: TRow) => string
  /** Dòng nào được tích: đúng bàn + đủ quyền. Dòng khác bị disable, không phải ẩn đi. */
  isRowSelectable: (row: TRow) => boolean
  candidates: BulkApproveCandidate[]
  selectedCount: number
  /** Đếm theo bàn duyệt, để thanh hành động nói rõ một lần bấm sẽ chạy những bàn nào. */
  countByStep: Partial<Record<BulkApproveStep, number>>
  isOverLimit: boolean
  clearSelection: () => void
  confirmOpen: boolean
  openConfirm: () => void
  closeConfirm: () => void
  notes: Record<number, string>
  setNote: (id: number, note: string) => void
  outcome: BulkApproveOutcome | null
  closeOutcome: () => void
  runApprove: () => Promise<BulkApproveOutcome | null>
}

export function useBulkApproveSelection<TRow>({
  rows,
  scopeKey,
  enabled,
  getRowId,
  resolveStep,
  canRunStep,
  describeRow,
  submit,
}: Params<TRow>): UseBulkApproveSelection<TRow> {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  // Thông tin hiển thị của các dòng đã chọn, tích luỹ qua trang: sang trang 2 thì dòng của
  // trang 1 không còn trong `rows` nữa, nhưng dialog xác nhận vẫn phải liệt kê được nó.
  const [selectedMeta, setSelectedMeta] = useState<Map<number, BulkApproveCandidate>>(new Map())
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [outcome, setOutcome] = useState<BulkApproveOutcome | null>(null)

  useEffect(() => {
    setRowSelection({})
    setSelectedMeta(new Map())
    setNotes({})
    setConfirmOpen(false)
  }, [scopeKey])

  const isRowSelectable = useCallback(
    (row: TRow) => {
      const step = resolveStep(row)
      return step !== null && canRunStep(step)
    },
    [resolveStep, canRunStep]
  )

  // Đồng bộ `selectedMeta` với `rowSelection`: thêm dòng vừa tích ở trang hiện tại, xoá dòng
  // vừa bỏ tích. Chỉ setState khi thực sự đổi, nếu không effect tự kích lại chính nó.
  useEffect(() => {
    setSelectedMeta((prev) => {
      const next = new Map(prev)
      let changed = false

      for (const id of Array.from(next.keys())) {
        if (!rowSelection[String(id)]) {
          next.delete(id)
          changed = true
        }
      }

      for (const row of rows) {
        const id = getRowId(row)
        if (!rowSelection[String(id)] || next.has(id)) continue
        const step = resolveStep(row)
        if (step === null) continue
        next.set(id, { id, step, ...describeRow(row) })
        changed = true
      }

      return changed ? next : prev
    })
  }, [rowSelection, rows, getRowId, resolveStep, describeRow])

  // Ghi chú của dòng đã bỏ tích phải biến mất, không được âm thầm gửi kèm ở lượt sau.
  useEffect(() => {
    setNotes((prev) => {
      const stale = Object.keys(prev).filter((id) => !rowSelection[id])
      if (stale.length === 0) return prev
      const next = { ...prev }
      stale.forEach((id) => delete next[Number(id)])
      return next
    })
  }, [rowSelection])

  const candidates = useMemo(() => Array.from(selectedMeta.values()), [selectedMeta])

  const countByStep = useMemo(() => {
    const counts: Partial<Record<BulkApproveStep, number>> = {}
    for (const candidate of candidates) {
      counts[candidate.step] = (counts[candidate.step] ?? 0) + 1
    }
    return counts
  }, [candidates])

  const clearSelection = useCallback(() => {
    setRowSelection({})
    setSelectedMeta(new Map())
    setNotes({})
  }, [])

  const setNote = useCallback((id: number, note: string) => {
    setNotes((prev) => ({ ...prev, [id]: note }))
  }, [])

  const runApprove = useCallback(async () => {
    if (candidates.length === 0) return null
    const items: BulkApproveItemRequest[] = candidates.map((candidate) => ({
      id: candidate.id,
      note: notes[candidate.id]?.trim() || '',
    }))
    const result = await submit(items)
    const nextOutcome = buildBulkApproveOutcome(result, candidates)
    setConfirmOpen(false)
    // Chỉ mở dialog kết quả khi CÓ dòng bị bỏ qua. Duyệt sạch cả lô thì không có gì để đọc, một
    // toast là đủ — bắt người dùng bấm "Đóng" trên dialog toàn màu xanh là thêm một cú bấm vô
    // nghĩa vào việc họ làm hàng chục lần mỗi phiên. Giống tiền lệ
    // `DealPeriodAllocationListPage`, và là hành vi đã ghi trong SRS + comment QA.
    // Call site vẫn nhận đủ `nextOutcome` để tự quyết định toast.
    if (nextOutcome.skippedRows.length > 0) setOutcome(nextOutcome)
    clearSelection()
    return nextOutcome
  }, [candidates, notes, submit, clearSelection])

  return {
    selectionEnabled: enabled,
    rowSelection,
    setRowSelection,
    getRowId: useCallback((row: TRow) => String(getRowId(row)), [getRowId]),
    isRowSelectable,
    candidates,
    selectedCount: candidates.length,
    countByStep,
    isOverLimit: candidates.length > BULK_APPROVE_MAX_ITEMS,
    clearSelection,
    confirmOpen,
    openConfirm: useCallback(() => setConfirmOpen(true), []),
    closeConfirm: useCallback(() => setConfirmOpen(false), []),
    notes,
    setNote,
    outcome,
    closeOutcome: useCallback(() => setOutcome(null), []),
    runApprove,
  }
}
