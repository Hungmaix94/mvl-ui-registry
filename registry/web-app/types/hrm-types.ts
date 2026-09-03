/**
 * Shared HRM type definitions used across multiple services
 * Types that are specific to a single domain should be defined in that domain's service file
 */
import { components, paths } from '@/api/schema'

// ===== COMMON TYPES =====
export type ColoredValue = components['schemas']['ColoredValue']

// Histories types
export type AuditLogSearchResponse = components['schemas']['AuditLogSearchResponse']
export type AuditLog = components['schemas']['AuditLog']

export type HistoriesParams = {
  action?: string
  from_date?: string
  to_date?: string
  page?: number
  page_size?: number
  log_id?: string
}

// Import/Export related types
export type ImportTemplateResponse = components['schemas']['ImportTemplateResponse']
export type ImportStartRequest = components['schemas']['ImportStartRequest']
export type ImportStartResponse = components['schemas']['ImportStartResponse']
export type ImportOptionsRequest = components['schemas']['ImportOptionsRequest']

// ===== NATIONALITIES =====
export type Nationality = components['schemas']['Nationality']
export type GetNationalitiesParams = paths['/api/nationalities/']['get']['parameters']['query']

// ===== WORK SCHEDULES =====
export type WorkSchedule = components['schemas']['WorkSchedule']
