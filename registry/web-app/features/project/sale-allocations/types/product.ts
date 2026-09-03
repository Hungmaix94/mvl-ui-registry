// ============================================
// Product Types for Thông tin bán hàng (Property Listing) DA05
// ============================================
import { components } from '@/api/schema'

export enum ProductStatus {
  AVAILABLE = 'available', // Chưa bán
  RESERVED = 'reserved', // Đã đặt booking (reserved in API)
  DEPOSITED = 'deposited', // Đã đặt cọc
  SOLD = 'sold', // Đã bán
  LOCKED = 'locked', // Khóa
}

export enum ProductType {
  APARTMENT = 'apartment', // Chung cư
  TOWNHOUSE = 'shophouse', // API Uses Shophouse
  VILLA = 'villa', // Biệt thự
  LAND = 'land', // Đất nền
  OFFICE = 'office', // API Uses Office
  OTHER = 'other', // Khác
}

export enum SourceType {
  DIRECT = 'direct', // CĐT
  F0 = 'F0', // Đại lý
}

export enum TbcSource {
  SA = 'sa', // Nguồn từ Sale Allocation
  PI = 'pi', // Nguồn tùy chỉnh từ Product Inventory
}

export enum PromotionCommissionType {
  RELATIONSHIP = 'relationship', // Đầu mối quan hệ
  PLANNING_NEGOTIATION = 'planning_negotiation', // Lên kế hoạch - Đàm phán - Ký hợp đồng
  PACKAGING = 'packaging', // Đóng gói sản phẩm
  BUSINESS_SUPPORT = 'business_support', // Hỗ trợ kinh doanh
  COORDINATION = 'coordination', // Điều phối chung dự án
}

export enum AllocationType {
  PERSON = 'person',
  DEPARTMENT = 'department',
}

// These are for frontend UI only since backend doesn't support them
export interface PromotionEmployeeAmount {
  employee_id: number
  employee_name?: string
  contribution_rate: number // Mức độ đóng góp (%)
}

export interface PromotionCommission {
  type: PromotionCommissionType
  percent: number
  allocation_type: AllocationType
  department_id?: number
  department_name?: string
  employees?: PromotionEmployeeAmount[]
}

// Main Product interface matching API
export type Product = components['schemas']['ProductInventory']
export type ProductDropdown = components['schemas']['ProductInventoryDropdown']

// API request/response types
export type ProductRequest = components['schemas']['ProductInventoryRequest']
export type PatchedProductRequest = components['schemas']['PatchedProductInventoryRequest']

export interface ProductStatusUpdateRequest {
  status: ProductStatus
  notes?: string
}

export interface PaginatedProductList {
  count: number
  next?: string | null
  previous?: string | null
  results: Product[]
}

export interface GetProductsParams {
  page?: number
  page_size?: number
  ordering?: string
  search?: string
  project_id?: number
  investor_id?: number
  block_id?: number
  status?: ProductStatus
  product_type?: ProductType
}
