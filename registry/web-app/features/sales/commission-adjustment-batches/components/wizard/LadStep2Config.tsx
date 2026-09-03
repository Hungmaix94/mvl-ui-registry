import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { Text } from '@/components/ui'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { useCommissionWorkspaceSACore } from '@/services/realestate-service'

import { LAD_CDT_CONFIG_ROWS } from '../../constants/lad-constants'
import {
  useLadF2s,
  usePatchLadBatch,
  usePreviewLad,
} from '../../services/commission-adjustment-batch-service'
import {
  ladPayloadSnapshotSchema,
  type LadBatchDetail,
  type LadF2AppliedRate,
  type LadF2Override,
  type LadPayloadSnapshot,
  type LadPreviewResult,
} from '../../types/lad-types'
import { DeltaMoney } from '../detail/ladDelta'
import { LadCdtConfigMatrix } from './LadCdtConfigMatrix'
import { LadF2PartnerCard } from './LadF2PartnerCard'
import { ladF2AppliedRateToOverride, tbcCoreToConfig, hasAnyF2OverrideValue } from './ladTbcMapping'

export interface LadStep2ConfigProps {
  batchId: number
  batch?: LadBatchDetail
  saleAllocationId: number
  /** Lets the wizard footer flush+validate this step before navigating. Returns false on invalid. */
  onRegisterSave?: (fn: (() => Promise<boolean>) | null) => void
}

function fieldErrorsFromZod(error: ReturnType<typeof ladPayloadSnapshotSchema.safeParse>) {
  const map: Record<string, string> = {}
  if (!error || error.success) return map
  for (const issue of error.error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !map[key]) map[key] = issue.message
  }
  return map
}

const EMPTY_F2: LadF2Override = {
  pct_f2_commission_spec: null,
  pct_f2_commission: null,
  amt_f2_commission: null,
  is_f2_commission_include_vat: null,
  pct_f2_bonus: null,
  amt_f2_bonus: null,
  is_f2_bonus_include_vat: null,
  pct_f2_inventory_hold: null,
}

interface F2Identity {
  name: string
  code?: string
}

const hasPositivePair = (pct?: number | null, amt?: number | null): boolean =>
  (typeof pct === 'number' && pct !== 0) || (typeof amt === 'number' && amt !== 0)

/**
 * Fill an F2 override's empty groups (commission / bonus / inventory-hold) from the applied rate
 * returned by GET /{batch_id}/f2s/. "Empty" = no positive value (null OR 0).
 */
function fillF2FromApplied(
  cur: LadF2Override,
  before: LadF2Override
): { next: LadF2Override; changed: boolean } {
  const next = { ...cur }
  let changed = false

  // "Trống" cho HH F2 = không có spec VÀ không có pct/amt dương (spec là nguồn sự thật khi có).
  const curHasCommission =
    cur.pct_f2_commission_spec != null ||
    hasPositivePair(cur.pct_f2_commission, cur.amt_f2_commission)
  if (!curHasCommission) {
    const ns = before.pct_f2_commission_spec ?? null
    const np = before.pct_f2_commission ?? null
    const na = before.amt_f2_commission ?? null
    if (next.pct_f2_commission_spec !== ns) {
      next.pct_f2_commission_spec = ns
      changed = true
    }
    if (next.pct_f2_commission !== np) {
      next.pct_f2_commission = np
      changed = true
    }
    if (next.amt_f2_commission !== na) {
      next.amt_f2_commission = na
      changed = true
    }
    if (before.is_f2_commission_include_vat != null && cur.is_f2_commission_include_vat == null) {
      next.is_f2_commission_include_vat = before.is_f2_commission_include_vat
      changed = true
    }
  }

  if (!hasPositivePair(cur.pct_f2_bonus, cur.amt_f2_bonus)) {
    const np = before.pct_f2_bonus ?? null
    const na = before.amt_f2_bonus ?? null
    if (next.pct_f2_bonus !== np) {
      next.pct_f2_bonus = np
      changed = true
    }
    if (next.amt_f2_bonus !== na) {
      next.amt_f2_bonus = na
      changed = true
    }
    if (before.is_f2_bonus_include_vat != null && cur.is_f2_bonus_include_vat == null) {
      next.is_f2_bonus_include_vat = before.is_f2_bonus_include_vat
      changed = true
    }
  }

  if (!hasPositivePair(cur.pct_f2_inventory_hold, null)) {
    const nh = before.pct_f2_inventory_hold ?? null
    if (next.pct_f2_inventory_hold !== nh) {
      next.pct_f2_inventory_hold = nh
      changed = true
    }
  }

  return { next, changed }
}

/**
 * Bước 2 — Cấu hình:
 *   • tbc-commissions (core) → "Hiện hành · Δ" column + first-visit prefill of CĐT "Giá trị mới".
 *   • GET /{batch_id}/f2s/ → danh sách F2 + rate đang áp dụng → identity, "Cũ", prefill override.
 * Preview supplies per-exchange "GD áp dụng" chips + net Δ qua F2.
 */
export function LadStep2Config({
  batchId,
  batch,
  saleAllocationId,
  onRegisterSave,
}: LadStep2ConfigProps) {
  const patchBatch = usePatchLadBatch()
  const preview = usePreviewLad()
  const { data: coreWs } = useCommissionWorkspaceSACore(saleAllocationId)
  // Danh sách F2 + rate đang áp dụng LẤY TỪ /f2s/ — đúng các sàn tham gia GD (đã lưu thành lines) của lô.
  const { data: f2sData } = useLadF2s(batchId)

  const [payload, setPayload] = useState<LadPayloadSnapshot>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [previewResult, setPreviewResult] = useState<LadPreviewResult | null>(null)
  // `seeded` là STATE (không phải ref) để khi nó bật, effect prefill CĐT chạy lại — tránh race
  // cold-load: nếu coreWs resolve TRƯỚC batch, effect prefill thoát sớm và sẽ không bao giờ chạy
  // lại nếu `seeded` chỉ là ref (không nằm trong deps) ⇒ card CĐT không prefill.
  const [seeded, setSeeded] = useState(false)
  const coreFilledRef = useRef(false)
  // Chữ ký TẬP sàn F2 đã đồng bộ vào payload (không phải one-shot boolean): cho phép re-sync khi
  // phạm vi GD đổi (F2S refetch sau khi thêm/loại GD ở Bước 1) mà vẫn idempotent.
  const f2SyncedSigRef = useRef<string | null>(null)
  const lastSavedRef = useRef<string>('')

  // ----- TBC core (current config) → before map cho bảng CĐT -----
  const beforeConfig = useMemo(
    () => tbcCoreToConfig(coreWs?.current?.entry?.record ?? null),
    [coreWs]
  )

  // /f2s/ là NGUỒN của danh sách F2 (deal-scoped) + identity (name/code chuẩn từ BE).
  const f2Rows: LadF2AppliedRate[] = useMemo(
    () =>
      Array.isArray(f2sData)
        ? f2sData
        : ((f2sData as { results?: LadF2AppliedRate[] } | undefined)?.results ?? []),
    [f2sData]
  )
  const { f2ExchangeIds, f2IdentityByExchange, f2DealCountByExchange, f2BeforeByExchange } =
    useMemo(() => {
      const ids: string[] = []
      const identity = new Map<string, F2Identity>()
      const dealCount = new Map<string, number>()
      const before = new Map<string, LadF2Override>()
      for (const r of f2Rows) {
        const key = String(r.exchange.id)
        ids.push(key)
        identity.set(key, { name: r.exchange.name, code: r.exchange.code ?? undefined })
        if (r.deal_count > 0) dealCount.set(key, r.deal_count)
        const applied = ladF2AppliedRateToOverride(r)
        if (hasAnyF2OverrideValue(applied)) before.set(key, applied)
      }
      return {
        f2ExchangeIds: ids,
        f2IdentityByExchange: identity,
        f2DealCountByExchange: dealCount,
        f2BeforeByExchange: before,
      }
    }, [f2Rows])

  // Seed once from the persisted snapshot when the batch first loads.
  useEffect(() => {
    if (seeded || !batch) return
    const snapshot = (batch.payload_snapshot ?? {}) as LadPayloadSnapshot
    setPayload(snapshot)
    lastSavedRef.current = JSON.stringify(snapshot)
    setSeeded(true)
  }, [batch, seeded])

  // Prefill CĐT từ TBC core — chỉ điền dòng nào đang trống cả % lẫn đ (tôn trọng loại trừ %/đ,
  // không ghi đè giá trị user đã nhập). Chờ tbc-commissions settle để beforeConfig sẵn sàng.
  useEffect(() => {
    if (!seeded || coreFilledRef.current || coreWs === undefined) return
    coreFilledRef.current = true
    if (!beforeConfig) return
    const src = beforeConfig as Record<string, number | boolean | null>
    setPayload((prev) => {
      const next = { ...prev } as Record<string, unknown>
      let changed = false
      for (const row of LAD_CDT_CONFIG_ROWS) {
        // Treat null OR 0 as "no real value" → fill from TBC. A stray 0 (e.g. left by an earlier
        // unit toggle) must not block the TBC default; only a positive entry is kept.
        const pctV = row.pctField ? next[row.pctField] : null
        const amtV = row.amtField ? next[row.amtField] : null
        const hasPositive =
          (typeof pctV === 'number' && pctV !== 0) || (typeof amtV === 'number' && amtV !== 0)
        if (hasPositive) continue
        // Apply the TBC pair as-is (one value, the other null) — clears any stray 0 so the row keeps
        // the XOR invariant and rowUnit resolves the correct unit.
        const newPct = row.pctField ? (src[row.pctField] ?? null) : undefined
        const newAmt = row.amtField ? (src[row.amtField] ?? null) : undefined
        if (row.pctField && next[row.pctField] !== newPct) {
          next[row.pctField] = newPct
          changed = true
        }
        if (row.amtField && next[row.amtField] !== newAmt) {
          next[row.amtField] = newAmt
          changed = true
        }
        if (row.vatField && src[row.vatField] != null && next[row.vatField] !== src[row.vatField]) {
          next[row.vatField] = src[row.vatField]
          changed = true
        }
      }
      return changed ? (next as LadPayloadSnapshot) : prev
    })
  }, [coreWs, beforeConfig, seeded])

  // Đồng bộ payload.f2_overrides_by_exchange THEO ĐÚNG /f2s/ (deal-scoped):
  //  • thêm sàn mới (prefill từ rate đang áp dụng nếu có, không thì EMPTY) · fill nhóm field trống
  //  • BỎ sàn không còn trong /f2s/ (GD đã đổi) để không lưu cấu hình thừa.
  // Re-sync mỗi khi TẬP sàn F2 đổi (KHÔNG one-shot): đổi phạm vi GD ở Bước 1 → F2S refetch.
  useEffect(() => {
    if (!seeded || f2sData === undefined) return
    const sig = f2ExchangeIds.join('|')
    if (f2SyncedSigRef.current === sig) return
    f2SyncedSigRef.current = sig
    setPayload((prev) => {
      const prevF2 = prev.f2_overrides_by_exchange ?? {}
      const nextF2: Record<string, LadF2Override> = {}
      for (const id of f2ExchangeIds) {
        const applied = f2BeforeByExchange.get(id) ?? EMPTY_F2
        const cur = prevF2[id]
        nextF2[id] = cur ? fillF2FromApplied(cur, applied).next : { ...applied }
      }
      const prevKeys = Object.keys(prevF2)
      const sameKeys =
        prevKeys.length === f2ExchangeIds.length && f2ExchangeIds.every((id) => id in prevF2)
      const changed = !sameKeys || f2ExchangeIds.some((id) => prevF2[id] !== nextF2[id])
      return changed ? { ...prev, f2_overrides_by_exchange: nextF2 } : prev
    })
  }, [f2sData, f2ExchangeIds, f2BeforeByExchange, seeded])

  // Preview on mount → CHỈ để lấy "GD áp dụng" chips per exchange + net Δ qua F2.
  // Danh sách F2 KHÔNG còn suy ra từ preview (đã chuyển hẳn sang /f2s/).
  useEffect(() => {
    let cancelled = false
    preview
      .mutateAsync(batchId)
      .then((res) => {
        if (!cancelled && res) setPreviewResult(res)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId])

  const dealCodesByExchange = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const l of previewResult?.lines ?? []) {
      if (l.exchange_id == null) continue
      const key = String(l.exchange_id)
      map.set(key, [...(map.get(key) ?? []), l.deal_code])
    }
    return map
  }, [previewResult])

  const f2Delta = useMemo(() => {
    let sum = 0
    for (const l of previewResult?.lines ?? [])
      if (l.exchange_id != null) sum += l.delta_total_fee ?? 0
    return sum
  }, [previewResult])

  // No autosave: the draft is persisted only when the user presses "Tiếp tục" / "Lưu nháp"
  // (wizard footer → save()). Bỏ qua hẳn PATCH khi cấu hình KHÔNG đổi so với lần lưu/seed gần nhất —
  // chỉ bước qua wizard mà không sửa gì thì không gọi API. `last_modified_step` do wizard shell
  // (goToStep) sở hữu, không ghi trùng ở đây nữa.
  const save = useCallback(async () => {
    const currentJson = JSON.stringify(payload)
    if (currentJson === lastSavedRef.current) return true // không đổi → không gọi API
    const parsed = ladPayloadSnapshotSchema.safeParse(payload)
    if (!parsed.success) {
      setErrors(fieldErrorsFromZod(parsed))
      toastService.error('Cấu hình chưa hợp lệ — vui lòng kiểm tra các khoản đánh dấu đỏ.')
      return false
    }
    setErrors({})
    try {
      await patchBatch.mutateAsync({ id: batchId, data: { payload_snapshot: parsed.data as any } })
      lastSavedRef.current = currentJson
      return true
    } catch (err) {
      toastService.error(extractErrorMessage(err))
      return false
    }
  }, [payload, batchId, patchBatch])

  useEffect(() => {
    onRegisterSave?.(save)
    return () => onRegisterSave?.(null)
  }, [onRegisterSave, save])

  const handleMatrixChange = (next: LadPayloadSnapshot) => {
    setPayload(next)
    if (Object.keys(errors).length) setErrors({})
  }

  const setF2 = (exchangeId: string, next: LadF2Override) => {
    setPayload((prev) => ({
      ...prev,
      f2_overrides_by_exchange: { ...(prev.f2_overrides_by_exchange ?? {}), [exchangeId]: next },
    }))
  }

  return (
    <Flex direction="column" gap="5">
      {/* Card 1 — CĐT config */}
      <section className="border-border-1 overflow-hidden rounded-xl border">
        <div className="border-border-1 flex flex-col gap-1 border-b px-5 py-3.5">
          <Flex align="center" gap="2" wrap="wrap">
            <span className="bg-data-purple-disabled text-data-purple-default flex h-5 w-5 items-center justify-center rounded text-xs font-bold">
              1
            </span>
            <Text className="typo-body-base-semibold text-content-dark-1">
              Cấu hình từ CĐT · áp chung
            </Text>
            <span className="bg-data-purple-disabled text-data-purple-default rounded px-2 py-0.5 text-[10px] font-semibold uppercase">
              1 cấu hình chung
            </span>
          </Flex>
          <Text className="text-content-dark-3 typo-body-sm-regular">
            Prefill từ cấu hình hiện hành (TBC) — chỉnh lại các khoản cần thay đổi. Mỗi khoản chỉ
            nhập % hoặc số tiền.
          </Text>
        </div>
        <LadCdtConfigMatrix
          value={payload}
          onChange={handleMatrixChange}
          beforeConfig={beforeConfig}
          errors={errors}
        />
      </section>

      {/* Card 2 — F2 per partner */}
      <section className="border-border-1 overflow-hidden rounded-xl border">
        <div className="border-border-1 flex flex-col gap-1 border-b px-5 py-3.5">
          <Flex align="center" gap="2" wrap="wrap">
            <span className="bg-data-orange-disabled text-data-orange-default flex h-5 w-5 items-center justify-center rounded text-xs font-bold">
              2
            </span>
            <Text className="typo-body-base-semibold text-content-dark-1">
              Outflow · MV trả F2 — cấu hình theo từng đối tác
            </Text>
            {f2ExchangeIds.length > 0 && (
              <span className="bg-data-orange-disabled text-data-orange-default rounded px-2 py-0.5 text-[10px] font-semibold uppercase">
                {f2ExchangeIds.length} cấu hình riêng
              </span>
            )}
          </Flex>
          <Text className="text-content-dark-3 typo-body-sm-regular">
            Mỗi F2 là một pháp nhân riêng với HĐ &amp; % HH riêng — không thể gom 1 cấu hình chung.
            Danh sách lấy theo các sàn tham gia GD trong lô; cấu hình hiện hành prefill từ rate đang
            áp dụng trên các GD trong lô.
          </Text>
        </div>

        <div className="flex flex-col gap-3 p-4">
          {f2ExchangeIds.length === 0 ? (
            <Text className="typo-body-sm-regular text-content-dark-3">
              Các giao dịch trong lô không có sàn liên kết (F2).
            </Text>
          ) : (
            f2ExchangeIds.map((exchangeId) => (
              <LadF2PartnerCard
                key={exchangeId}
                exchangeId={exchangeId}
                exchangeName={f2IdentityByExchange.get(exchangeId)?.name}
                exchangeCode={f2IdentityByExchange.get(exchangeId)?.code}
                dealCodes={dealCodesByExchange.get(exchangeId) ?? []}
                dealCount={f2DealCountByExchange.get(exchangeId)}
                before={f2BeforeByExchange.get(exchangeId) ?? null}
                value={
                  payload.f2_overrides_by_exchange?.[exchangeId] ??
                  f2BeforeByExchange.get(exchangeId) ??
                  EMPTY_F2
                }
                onChange={(next) => setF2(exchangeId, next)}
              />
            ))
          )}

          {f2ExchangeIds.length > 0 && (
            <Flex justify="end" align="center" gap="2" className="pt-1">
              <Text className="text-content-dark-3 typo-body-sm-regular">Tổng Δ qua F2:</Text>
              <DeltaMoney value={f2Delta || null} />
            </Flex>
          )}
        </div>
      </section>
    </Flex>
  )
}

export default LadStep2Config
