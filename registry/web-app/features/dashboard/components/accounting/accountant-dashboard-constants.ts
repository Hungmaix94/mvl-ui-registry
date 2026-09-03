/**
 * Ability mapping for the accountant dashboard widgets.
 * Permission codes (from schema.ts): `reports.accountantdashboard.{action}`
 */
export const ACCOUNTANT_DASHBOARD_SUBJECT = 'reports.accountantdashboard'

export const ACCOUNTANT_DASHBOARD_ACTIONS = {
  SUMMARY: 'summary',
  DEBT_TREND: 'debt_trend',
  COMMISSION_PAYABLE: 'commission_payable',
  COMMISSION_TREND: 'commission_trend',
  PARTNER_TABLE: 'partner_table',
  EXPORT: 'export',
} as const

/** Matches the SalesRevenueChart palette so the section blends with "Doanh thu" above it */
export const DEBT_TREND_COLORS = {
  investorReceivable: '#D32F2F',
  f2Payable: '#EF9A9A',
} as const

/** Mirrors the group order/colors of CommissionPayableBlock's 3 KPI cards */
export const COMMISSION_TREND_COLORS = {
  management: '#D32F2F',
  sale: '#F06292',
  collaborator: '#EF9A9A',
} as const

export const ONE_BILLION = 1_000_000_000
