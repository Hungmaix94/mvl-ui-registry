import { paths, components, PatchedSalesAllocationRequestPhase } from '@/api/schema'

export type SalesAllocationPhase = PatchedSalesAllocationRequestPhase

// Lấy type SalesAllocation chuẩn từ backend schema.ts và mở rộng các trường custom/frontend-specific
export type SalesAllocation = components['schemas']['SalesAllocation'] & {
  created_by?: {
    id: number
    fullname?: string
    name?: string
  }
  updated_by?: {
    id: number
    fullname?: string
    name?: string
  }
  staff_assignments?: any[]
}

// Cung cấp params search
export type GetSalesAllocationsParams =
  paths['/api/realestate/sales-allocations/']['get']['parameters']['query'] & { search?: string }

// Lấy list mapping
export type PaginatedSalesAllocationList = components['schemas']['PaginatedSalesAllocationList']
