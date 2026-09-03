import type { DepositCumulativeParams } from '@/features/sales/deposit-cumulative/services/deposit-cumulative-service'
import { getDepositCumulativeService } from '@/features/sales/deposit-cumulative/services/deposit-cumulative-service'

export type DepositCumulativeDimension = 'branch' | 'block'

export type DepositCumulativeReportConfig = {
  dimension: DepositCumulativeDimension
  title: string
  dimensionLabel: string
  permission: string
  exportFilename: string
  fetchReport: (params: DepositCumulativeParams) => Promise<unknown>
  exportReport: (params: DepositCumulativeParams, filename: string) => Promise<void>
}

const service = () => getDepositCumulativeService()

export const DEPOSIT_CUMULATIVE_REPORT_CONFIGS = {
  branch: {
    dimension: 'branch',
    // `title` = H1 + crumb cuối. PHẢI trùng nhãn menu (`menu-items.ts`) và entry breadcrumb
    // trong `PROJECT_ROUTES`, và phải nêu rõ "Cọc cộng dồn" — trước đây chỉ ghi "Theo Chi
    // nhánh"/"Theo Khối KD" nên H1 trùng khít báo cáo doanh số TKKD.
    title: 'Cọc cộng dồn theo Chi nhánh',
    dimensionLabel: 'Chi nhánh',
    permission: 'reports.tkkddepositcumulativebranch',
    exportFilename: 'deposit-cumulative-by-branch.xlsx',
    fetchReport: (params) => service().getByBranch(params),
    exportReport: (params, filename) => service().exportByBranch(params, filename),
  },
  block: {
    dimension: 'block',
    title: 'Cọc cộng dồn theo Khối kinh doanh',
    dimensionLabel: 'Khối KD',
    permission: 'reports.tkkddepositcumulativeblock',
    exportFilename: 'deposit-cumulative-by-block.xlsx',
    fetchReport: (params) => service().getByBlock(params),
    exportReport: (params, filename) => service().exportByBlock(params, filename),
  },
} satisfies Record<string, DepositCumulativeReportConfig>
