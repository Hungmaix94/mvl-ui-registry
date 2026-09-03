import { useCallback, useRef, useState } from 'react'

import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select'
import { getDealService, type Deal } from '@/features/sales/deals/services/deal-service'
import { getRealEstateService } from '@/services/realestate-service'
import { PAGE_SIZE } from '@/constants/table'

/**
 * Subset of the selected deal's data the line card needs for its header chips + auto-fill. Sourced
 * from {@link Deal} (DealList): the mã-căn Select stores `product_inventory_id` (= the deal's
 * product_inventory.id) so the payload field is unchanged, while everything else here drives the
 * read-only header.
 */
export interface ReconSelectedDeal {
  productInventoryId: number
  /** Deal PK — khoá fetch `deals/{deal_pk}/commission-config/` cho cột "MV ghi nhận". */
  dealId: number
  /** Mã HĐ — Select display label. */
  dealCode: string
  /** Mã căn (product code) — blue header chip. */
  productCode: string
  productUnitNumber: string
  listedPrice: number | null
  feeCalculationPrice: number | null
  agencyFeeRate: number | null
  /** Tổng thưởng đại lý (whole-deal) cache off the deal — XOR with sharedBonusPct. */
  sharedBonusAmount: number | null
  sharedBonusPct: number | null
  /** Đã ĐC % — cumulative reconciled rate snapshot off the deal. */
  reconciliationRate: number | null
  /**
   * Tổng giảm trừ ĐÃ CHỐT của deal (`total_fee_deduction`, PRE-VAT) — feed `ReconMvReference.deductAgreed`
   * (settlement expected "Khấu trừ"). null khi BE chưa expose trên DealList (BE branch chưa deploy).
   */
  deductAgreed: number | null
}

function toNullableNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function dealToSelectedDeal(deal: Deal): ReconSelectedDeal {
  return {
    productInventoryId: deal.product_inventory.id,
    dealId: deal.id,
    dealCode: deal.code,
    productCode: deal.product_inventory.code,
    productUnitNumber: deal.product_inventory.unit_number,
    listedPrice: toNullableNumber(deal.listed_price),
    feeCalculationPrice: toNullableNumber(deal.fee_calculation_price),
    agencyFeeRate: toNullableNumber(deal.agency_fee_rate),
    sharedBonusAmount: toNullableNumber(deal.shared_bonus_amount),
    sharedBonusPct: toNullableNumber(deal.shared_bonus_pct),
    reconciliationRate: toNullableNumber(deal.reconciliation_rate),
    // TODO: remove cast after `yarn api:update:local` regen (BE thêm total_fee_deduction vào deal).
    deductAgreed: toNullableNumber(
      (deal as Deal & { total_fee_deduction?: string | number | null }).total_fee_deduction
    ),
  }
}

/**
 * Composite option label for the deal dropdown: "mã HĐ · mã căn · % đã ĐC".
 *
 * NOTE — tên khách (customer) is intentionally ABSENT: DealList / DepositContractNested /
 * ProductInventoryNested expose no customer field (BE-pending). Insert it here once BE provides it.
 */
function buildDealOptionLabel(deal: Deal): string {
  const canCode = deal.product_inventory.unit_number || deal.product_inventory.code || ''
  const reconRate = toNullableNumber(deal.reconciliation_rate) ?? 0
  return [deal.code, canCode, `${reconRate}% đã ĐC`].filter(Boolean).join('  ·  ')
}

function parseNextPage(next: string | null | undefined, currentPage: number): number | null {
  if (!next) return null
  try {
    const nextUrl = next.startsWith('http') ? new URL(next) : new URL(next, window.location.origin)
    const param = nextUrl.searchParams.get('page')
    if (param) return Number(param)
  } catch {
    const match = next.match(/[?&]page=(\d+)/)
    if (match) return Number(match[1])
  }
  return currentPage + 1
}

export interface UseReconDealSelectArgs {
  /** Project scope for the deal dropdown (GetDealsParams supports `project`). 0 ⇒ no fetch. */
  projectId: number
  /**
   * CĐT (chủ đầu tư) scope — the selected project's investor, from the sheet's general info. Passed as
   * `getDeals({ investor })` so the dropdown is scoped to the reconciliation's investor. (Redundant with
   * `project` in the common 1-investor-per-project case, but explicit per the general-info contract.)
   * NOTE: nguồn hàng (source_exchange) is intentionally NOT passed — `getDeals` exposes no such filter
   * (BE gap); deals therefore stay scoped by project + investor only.
   */
  investorId?: number
}

/**
 * Deal-based mã-căn Select source for the reconciliation line cards (Đợt 1 #7).
 *
 * The Select VALUE is `product_inventory_id` (= deal.product_inventory.id) so the stored payload
 * field is unchanged; the Select DISPLAY label is `deal.code` (mã HĐ). Every deal returned by the
 * dropdown is cached by its product_inventory.id, so the line card can resolve the selected deal's
 * data (căn code, listed_price, fee_calculation_price, agency_fee_rate, reconciliation_rate) for the
 * header chips + auto-fill without a second fetch.
 */
export function useReconDealSelect({ projectId, investorId }: UseReconDealSelectArgs) {
  const investorScope = investorId && investorId > 0 ? investorId : undefined
  /**
   * product_inventory.id → selected-deal subset. Populated as dropdown pages load + on edit/view-mode
   * resolve. Reactive `useState` (NOT a ref) so the line-card header re-renders once a saved căn's deal
   * is resolved asynchronously by {@link loadInitialDealOptions} — a ref mutation wouldn't repaint the
   * read-only detail view, leaving the chip / HĐMB×% / Đã ĐC% blank.
   */
  /**
   * product_inventory.id → selected-deal subset. A `useRef` map (NOT state) on purpose: the dropdown's
   * paged `cacheDeals` calls must NOT re-render, because a re-render hands the Select a fresh
   * `loadOptions` identity and retriggers its open-fetch effect — an infinite `GET /sales/deals/` spam
   * loop. After the user PICKS a deal the RHF value change repaints the header; for the read-only/edit
   * initial resolve we bump `resolvedTick` once (see {@link resolveInitialOption}) so it still updates.
   */
  const dealByProductInventoryIdRef = useRef<Map<number, ReconSelectedDeal>>(new Map())
  const [resolvedTick, setResolvedTick] = useState(0)

  const cacheDeals = useCallback((deals: Deal[]) => {
    deals.forEach((deal) => {
      const resolved = dealToSelectedDeal(deal)
      if (resolved.productInventoryId > 0) {
        dealByProductInventoryIdRef.current.set(resolved.productInventoryId, resolved)
      }
    })
  }, [])

  const getSelectedDeal = useCallback(
    (productInventoryId: number | undefined | null): ReconSelectedDeal | undefined => {
      // `resolvedTick` ở deps để hàm ĐỔI IDENTITY sau mỗi lần cache deal được nạp bất đồng bộ
      // (resolveInitialOption ở view/edit). Cache là `ref` nên các line card memo hoá theo
      // `getSelectedDeal` sẽ không tự tính lại; đổi identity buộc chúng dựng lại MV reference thay vì
      // kẹt giá trị rỗng cũ (bug "MV dự kiến nhận = 0" khi xem chi tiết phiếu đã lưu). `void` để
      // eslint thấy dep được dùng.
      void resolvedTick
      if (!productInventoryId || productInventoryId <= 0) return undefined
      return dealByProductInventoryIdRef.current.get(productInventoryId)
    },
    [resolvedTick]
  )

  /**
   * Per-`projectId:product_inventory_id` resolution promise cache. The Select can invoke
   * `loadInitialOptions` several times for the same value (re-renders, StrictMode double-invoke), so
   * memoise the promise to guarantee EXACTLY ONE network call per căn instead of the duplicate
   * `GET /sales/deals/?product_inventory=…` requests we'd otherwise fire.
   */
  const initialOptionByKeyRef = useRef<Map<string, Promise<SelectOption>>>(new Map())

  /**
   * Build a per-row option loader that scopes to the project and EXCLUDES product_inventory_ids
   * already chosen by other rows (preserves the dedup behavior of the old inventory dropdown).
   *
   * `getExcludedProductInventoryIds` is read at FETCH time (not render time) so the factory identity
   * stays stable across renders — mirroring the old getLoadProductInventoryOptionsByRow pattern.
   */
  const getLoadDealOptionsByRow = useCallback(
    (getExcludedProductInventoryIds: () => Set<number>) =>
      async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
        if (!projectId) {
          return { items: [], nextPage: null, hasNextPage: false }
        }

        try {
          const paginatedData = await getDealService().getDeals({
            page: params.page,
            page_size: params.pageSize || PAGE_SIZE,
            search: params.query || undefined,
            project: projectId,
            investor: investorScope,
            // Ẩn giao dịch đã ở trạng thái kết thúc (hủy / hủy & tất toán / bỏ cọc / hoàn cọc): BE
            // từ chối thêm dòng đối chiếu cho các deal này, nên để trong dropdown chỉ tổ lỗi lúc lưu.
            // Chỉ áp cho dropdown — resolveInitialOption bên dưới KHÔNG lọc, để dòng đã lưu trỏ vào
            // deal đã hủy vẫn hiển thị được ở màn xem/sửa.
            reconcilable: true,
          })

          if (!paginatedData?.results) {
            return { items: [], nextPage: null, hasNextPage: false }
          }

          cacheDeals(paginatedData.results)

          const excluded = getExcludedProductInventoryIds()
          const items: SelectOption[] = paginatedData.results
            .filter((deal) => !excluded.has(Number(deal.product_inventory.id)))
            .map((deal) => ({
              // VALUE = product_inventory_id (payload). LABEL = mã HĐ only (the selected box shows
              // just this; mã căn / KH / HĐMB×% / Đã ĐC% render BESIDE the box in the header).
              // optionLabel = rich "mã HĐ · mã căn · % đã ĐC" shown in the dropdown list + search.
              value: deal.product_inventory.id,
              label: deal.code,
              optionLabel: buildDealOptionLabel(deal),
            }))

          const hasNextPage = !!paginatedData.next
          const nextPage = parseNextPage(paginatedData.next, params.page)
          return { items, hasNextPage, nextPage }
        } catch {
          return { items: [], nextPage: null, hasNextPage: false }
        }
      },
    [projectId, investorScope, cacheDeals]
  )

  /**
   * Edit / view-mode initial options. The stored value is a `product_inventory_id`. `getDeals` supports
   * a `product_inventory` filter, so we resolve the saved căn's deal directly (project-scoped) and cache
   * it — this makes the header chips (mã căn / HĐMB×% / Đã ĐC%) + auto-fill work in the read-only detail
   * and edit views without opening the dropdown. Falls back to the căn code via `getProductInventory`
   * when no matching deal exists (or no project scope).
   */
  const resolveInitialOption = useCallback(
    async (id: number): Promise<SelectOption> => {
      if (projectId) {
        try {
          const deals = await getDealService().getDeals({
            project: projectId,
            product_inventory: id,
            page_size: 1,
          })
          const deal = deals?.results?.[0]
          if (deal) {
            cacheDeals([deal])
            // Repaint once so the read-only/edit header picks up the freshly-resolved deal (the ref
            // write alone wouldn't re-render). Memoised upstream ⇒ fires once per căn, no loop.
            setResolvedTick((t) => t + 1)
            return {
              value: id,
              label: deal.code,
              optionLabel: buildDealOptionLabel(deal),
            } as SelectOption
          }
        } catch {
          // fall through to the product-inventory fallback below
        }
      }

      try {
        const detail = await getRealEstateService().getProductInventory(id)
        return {
          value: id,
          label: detail.unit_number || detail.code || String(id),
        } as SelectOption
      } catch {
        return { value: id, label: String(id) } as SelectOption
      }
    },
    [projectId, cacheDeals]
  )

  const loadInitialDealOptions = useCallback(
    async (values: (string | number)[]) => {
      if (!values?.length) return []
      return Promise.all(
        values.map((raw) => {
          const id = Number(raw)
          const key = `${projectId}:${id}`
          const cached = initialOptionByKeyRef.current.get(key)
          if (cached) return cached
          // Memoise the in-flight promise so repeated Select calls reuse one request per căn. On
          // failure, drop it so a later attempt can retry instead of caching the rejection.
          const promise = resolveInitialOption(id).catch((error) => {
            initialOptionByKeyRef.current.delete(key)
            throw error
          })
          initialOptionByKeyRef.current.set(key, promise)
          return promise
        })
      )
    },
    [projectId, resolveInitialOption]
  )

  return { getLoadDealOptionsByRow, loadInitialDealOptions, getSelectedDeal, cacheDeals }
}
