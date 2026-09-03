import { APP_PATH } from '@/routes/AppRoute.constant'
import type {
  TkkdDealsForUnitParams,
  TkkdRevenueGoodsParams,
} from '@/features/sales/tkkd-reports/services/tkkd-report-service'
import { getTkkdReportService } from '@/features/sales/tkkd-reports/services/tkkd-report-service'

export type TkkdReportDimension = 'project' | 'branch' | 'block' | 'department'

export type TkkdRevenueGoodsReportConfig = {
  dimension: TkkdReportDimension
  title: string
  dimensionLabel: string
  showBranchFilter: boolean
  permission: string
  exportFilename: string
  detailBasePath: string
  fetchReport: (params: TkkdRevenueGoodsParams) => Promise<unknown>
  exportReport: (params: TkkdRevenueGoodsParams, filename: string) => Promise<void>
  fetchDeals: (params: TkkdDealsForUnitParams) => Promise<unknown>
}

const service = () => getTkkdReportService()

export const TKKD_REVENUE_GOODS_REPORT_CONFIGS = {
  project: {
    dimension: 'project',
    // `title` = H1 + crumb cuối. PHẢI trùng nhãn menu (`menu-items.ts`) và entry breadcrumb
    // trong `PROJECT_ROUTES` — quy tắc "Một tên cho một màn" (docs/ai/conventions.md).
    title: 'Doanh số theo Dự án',
    dimensionLabel: 'Dự án chi tiết',
    showBranchFilter: true,
    permission: 'reports.tkkdrevenuegoodsproject',
    exportFilename: 'tkkd-revenue-goods-by-project.xlsx',
    detailBasePath: APP_PATH.REPORT_SALES_BY_PROJECT,
    fetchReport: (params) => service().getRevenueGoodsByProject(params),
    exportReport: (params, filename) => service().exportRevenueGoodsByProject(params, filename),
    fetchDeals: (params) => service().getRevenueGoodsByProjectDeals(params),
  },
  branch: {
    dimension: 'branch',
    title: 'Doanh số theo Chi nhánh',
    dimensionLabel: 'Chi nhánh',
    showBranchFilter: false,
    permission: 'reports.tkkdrevenuegoodsbranch',
    exportFilename: 'tkkd-revenue-goods-by-branch.xlsx',
    detailBasePath: APP_PATH.REPORT_SALES_BY_BRANCH,
    fetchReport: (params) => service().getRevenueGoodsByBranch(params),
    exportReport: (params, filename) => service().exportRevenueGoodsByBranch(params, filename),
    fetchDeals: (params) => service().getRevenueGoodsByBranchDeals(params),
  },
  department: {
    dimension: 'department',
    title: 'Doanh số theo Phòng kinh doanh',
    dimensionLabel: 'Phòng KD',
    showBranchFilter: true,
    permission: 'reports.tkkdrevenuegoodsdept',
    exportFilename: 'tkkd-revenue-goods-by-department.xlsx',
    detailBasePath: APP_PATH.REPORT_SALES_BY_DEPARTMENT,
    fetchReport: (params) => service().getRevenueGoodsByDepartment(params),
    exportReport: (params, filename) => service().exportRevenueGoodsByDepartment(params, filename),
    fetchDeals: (params) => service().getRevenueGoodsByDepartmentDeals(params),
  },
  block: {
    dimension: 'block',
    title: 'Doanh số theo Khối kinh doanh',
    dimensionLabel: 'Khối KD',
    showBranchFilter: true,
    permission: 'reports.tkkdrevenuegoodsblock',
    exportFilename: 'tkkd-revenue-goods-by-block.xlsx',
    detailBasePath: APP_PATH.REPORT_SALES_BY_DIVISION,
    fetchReport: (params) => service().getRevenueGoodsByBlock(params),
    exportReport: (params, filename) => service().exportRevenueGoodsByBlock(params, filename),
    fetchDeals: (params) => service().getRevenueGoodsByBlockDeals(params),
  },
} satisfies Record<string, TkkdRevenueGoodsReportConfig>
