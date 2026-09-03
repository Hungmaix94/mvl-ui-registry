/**
 * BC Chi tiết Bảng hàng — service + hook
 *
 * NOTE: This endpoint is new and not yet in schema.ts.
 * After BE deploys, run `yarn api:update:local` and migrate this file to
 * use generated ApiPaths + typed response types from schema.ts.
 *
 * SRS: docs/features/sales/18.6-bang-hang-detail-report/
 */

import { apiClient } from '@/api/client'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'

// ── Types ────────────────────────────────────────────────────────────────────

export type MonthGroup = {
  key: string // e.g. "2025_03_R0"
  label: string // e.g. "Tháng 3/2025" | "Tháng 3/2025 (Bổ sung)"
  has_f2: boolean
}

export type BangHangDetailRow = {
  project_name: string
  unit_number: string
  deposit_date: string
  employee_code: string
  employee_name: string
  block_name: string
  department_name: string
  branch_name: string
  sales_allocation_name: string
  listed_price: number | null
  fee_calculation_price: number | null
  participation_pct: number
  goods_value_detail: number | null
  pct_reconciliation: number
  reconciliation_amount: number
  total_reconciled: number
  remaining: number
  remaining_pct: number
  // Dynamic keys injected by backend: recon_amt_YYYY_MM_Rn, recon_f2_YYYY_MM_Rn
  [key: string]: string | number | null | boolean
}

export type BangHangDetailResponse = {
  month_groups: MonthGroup[]
  results: BangHangDetailRow[]
}

export type BangHangDetailParams = {
  year: number
  branch?: number
}

// ── API calls ─────────────────────────────────────────────────────────────────

const _PATH = '/api/sales/reports/bang-hang-detail/'

export async function getBangHangDetailReport(
  params: BangHangDetailParams
): Promise<BangHangDetailResponse> {
  // Cast to any-path call — replace with typed ApiPaths once schema is regenerated
  const response = await (
    apiClient.GET as unknown as (
      path: string,
      init: unknown
    ) => Promise<{ data?: BangHangDetailResponse; error?: unknown }>
  )(_PATH, { params: { query: params } })

  if (response.error) throw response.error
  return response.data!
}

export async function exportBangHangDetailXlsx(params: BangHangDetailParams): Promise<void> {
  const response = await (
    apiClient.GET as unknown as (
      path: string,
      init: unknown
    ) => Promise<{ data?: Blob; error?: unknown }>
  )(_PATH, {
    params: { query: { ...params, export: 'xlsx' } },
    parseAs: 'blob',
  })

  if (response.error) throw response.error

  const blob = response.data as Blob
  const url = window.URL.createObjectURL(new Blob([blob]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `bc-bang-hang-chi-tiet-${params.year}.xlsx`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBangHangDetailReport(
  params: BangHangDetailParams | undefined,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.TKKD_REPORTS.BANG_HANG_DETAIL(params ?? {}),
    () => getBangHangDetailReport(params!),
    { enabled: (options?.enabled ?? true) && !!params?.year }
  )
}
