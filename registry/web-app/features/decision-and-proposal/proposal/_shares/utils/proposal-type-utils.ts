import { ApiPaths } from '@/api/schema.ts'
import type { HistoriesPaths, HistoryDetailPaths } from '@/services/histories-service.ts'
import { QUERY_KEYS } from '@/constants'
import { APP_PATH } from '@/routes'
import { lowerFirst } from 'lodash'
import { ProposalStatus, ProposalType } from '@/constants/api-schema-aliases'

/** Design token class for proposal type text color (fallback) */
const PROPOSAL_TYPE_TEXT_COLOR_FALLBACK = 'text-content-dark-1'

/** Mapping proposal type to text color class (design tokens from tailwind-colors.css). NOTE: no numbered `blue-*` scale exists — use `data-blue-*` for blue. */
const PROPOSAL_TYPE_TEXT_COLOR_MAP: Record<ProposalType, string> = {
  [ProposalType.unpaid_leave]: 'text-irish-50',
  [ProposalType.paid_leave]: 'text-green-60',
  [ProposalType.overtime_work]: 'text-orange-60',
  [ProposalType.late_exemption]: 'text-lime-yellow-60',
  [ProposalType.maternity_leave]: 'text-purple-60',
  [ProposalType.post_maternity_benefits]: 'text-irish-70',
  [ProposalType.timesheet_entry_complaint]: 'text-red-60',
  [ProposalType.job_transfer]: 'text-irish-60',
  [ProposalType.bulk_job_transfer]: 'text-irish-80',
  [ProposalType.asset_allocation]: 'text-green-70',
  [ProposalType.device_change]: 'text-lime-yellow-50',
  [ProposalType.return_to_work]: 'text-purple-70',
  [ProposalType.statutory_paid_leave]: 'text-data-blue-hover',
}

/**
 * Get Tailwind text color class for proposal type (for table column "Loại đề xuất").
 * Uses palette classes text-{color}-{number} from tailwind-colors.css. Returns fallback when type is null or unknown.
 */
export function getProposalTypeTextColorClass(proposalType: ProposalType | null): string {
  if (!proposalType || !(proposalType in PROPOSAL_TYPE_TEXT_COLOR_MAP)) {
    return PROPOSAL_TYPE_TEXT_COLOR_FALLBACK
  }
  return PROPOSAL_TYPE_TEXT_COLOR_MAP[proposalType]
}

/**
 * Get approve/reject dialog title based on proposal type
 * @param proposalType - The proposal type enum value
 * @param action - 'approve' or 'reject'
 * @param typeLabel - The label from useAppConstant (should be provided from useProposalTypeLabel hook)
 */
export function getProposalApproveRejectTitle(
  proposalType: ProposalType | ProposalStatus | null,
  action: 'approve' | 'reject',
  typeLabel?: string
): string {
  if (!proposalType) return action === 'approve' ? 'Duyệt đề xuất' : 'Từ chối đề xuất'

  // typeLabel should always be provided from useProposalTypeLabel hook
  // If not provided, use enum value as fallback
  const label = typeLabel || proposalType
  return action === 'approve'
    ? `Duyệt đề xuất ${lowerFirst(label)}`
    : `Từ chối đề xuất ${lowerFirst(label)}`
}

/**
 * Convert URL param to proposal type enum
 */
export function urlParamToProposalType(urlParam: string): ProposalType | null {
  const validTypes: ProposalType[] = [
    ProposalType.unpaid_leave,
    ProposalType.paid_leave,
    ProposalType.overtime_work,
    ProposalType.late_exemption,
    ProposalType.maternity_leave,
    ProposalType.post_maternity_benefits,
    ProposalType.timesheet_entry_complaint,
    ProposalType.job_transfer,
    ProposalType.bulk_job_transfer,
    ProposalType.asset_allocation,
    ProposalType.device_change,
    ProposalType.return_to_work,
    ProposalType.statutory_paid_leave,
  ]

  if (validTypes.includes(urlParam as any)) {
    return urlParam as ProposalType
  }

  return null
}

/**
 * Get histories API path based on proposal type
 */
export function getProposalHistoriesPath(proposalType: ProposalType | null): HistoriesPaths | null {
  if (!proposalType) return null

  const pathMap: Record<ProposalType, HistoriesPaths> = {
    [ProposalType.unpaid_leave]: ApiPaths.hrm_proposals_unpaid_leave_histories_retrieve,
    [ProposalType.paid_leave]: ApiPaths.hrm_proposals_paid_leave_histories_retrieve,
    [ProposalType.overtime_work]: ApiPaths.hrm_proposals_overtime_work_histories_retrieve,
    [ProposalType.late_exemption]: ApiPaths.hrm_proposals_late_exemption_histories_retrieve,
    [ProposalType.maternity_leave]: ApiPaths.hrm_proposals_maternity_leave_histories_retrieve,
    [ProposalType.post_maternity_benefits]:
      ApiPaths.hrm_proposals_post_maternity_benefits_histories_retrieve,
    [ProposalType.timesheet_entry_complaint]:
      ApiPaths.hrm_proposals_timesheet_entry_complaint_histories_retrieve,
    [ProposalType.job_transfer]: ApiPaths.hrm_proposals_job_transfer_histories_retrieve,
    [ProposalType.bulk_job_transfer]: ApiPaths.hrm_proposals_bulk_job_transfer_histories_retrieve,
    [ProposalType.asset_allocation]: ApiPaths.hrm_proposals_asset_allocation_histories_retrieve,
    [ProposalType.device_change]: ApiPaths.hrm_proposals_device_change_histories_retrieve,
    [ProposalType.return_to_work]: ApiPaths.hrm_proposals_return_to_work_histories_retrieve,
    [ProposalType.statutory_paid_leave]: ApiPaths.hrm_proposals_statutory_leave_histories_retrieve,
  }

  return pathMap[proposalType] || null
}

/**
 * Get history detail API path based on proposal type
 */
export function getProposalHistoryDetailPath(
  proposalType: ProposalType | null
): HistoryDetailPaths | null {
  if (!proposalType) return null

  const pathMap: Record<ProposalType, HistoryDetailPaths> = {
    [ProposalType.unpaid_leave]: ApiPaths.hrm_proposals_unpaid_leave_history_retrieve,
    [ProposalType.paid_leave]: ApiPaths.hrm_proposals_paid_leave_history_retrieve,
    [ProposalType.overtime_work]: ApiPaths.hrm_proposals_overtime_work_history_retrieve,
    [ProposalType.late_exemption]: ApiPaths.hrm_proposals_late_exemption_history_retrieve,
    [ProposalType.maternity_leave]: ApiPaths.hrm_proposals_maternity_leave_history_retrieve,
    [ProposalType.post_maternity_benefits]:
      ApiPaths.hrm_proposals_post_maternity_benefits_history_retrieve,
    [ProposalType.timesheet_entry_complaint]:
      ApiPaths.hrm_proposals_timesheet_entry_complaint_history_retrieve,
    [ProposalType.job_transfer]: ApiPaths.hrm_proposals_job_transfer_history_retrieve,
    [ProposalType.bulk_job_transfer]: ApiPaths.hrm_proposals_bulk_job_transfer_history_retrieve,
    [ProposalType.asset_allocation]: ApiPaths.hrm_proposals_asset_allocation_history_retrieve,
    [ProposalType.device_change]: ApiPaths.hrm_proposals_device_change_history_retrieve,
    [ProposalType.return_to_work]: ApiPaths.hrm_proposals_return_to_work_history_retrieve,
    [ProposalType.statutory_paid_leave]: ApiPaths.hrm_proposals_statutory_leave_history_retrieve,
  }

  return pathMap[proposalType] || null
}

/**
 * Subject (vế sau của mã quyền) mà backend gắn cho từng loại đề xuất.
 *
 * Đặt NGAY DƯỚI `getProposalHistoryDetailPath` là cố ý: hai bảng phải đi cùng nhau. Mỗi endpoint
 * `.../{id}/histories/{log_id}/` của một loại khai một mã RIÊNG (`proposal_paid_leave.history_detail`,
 * `proposal_device_change.history_detail`, …) — 13 loại là 13 mã. Trang lịch sử dùng chung
 * `ProposalHistoryDetailPage` nên phải tra mã theo `proposalType` lấy từ query param, không được
 * ghi cứng một mã.
 *
 * Lưu ý cái bẫy tên: `statutory_paid_leave` ánh xạ sang `proposal_statutory_leave` (KHÔNG có `paid`),
 * nên không suy được mã bằng cách ghép tiền tố — phải tra bảng.
 */
const PROPOSAL_PERMISSION_SUBJECT: Record<ProposalType, string> = {
  [ProposalType.unpaid_leave]: 'proposal_unpaid_leave',
  [ProposalType.paid_leave]: 'proposal_paid_leave',
  [ProposalType.overtime_work]: 'proposal_overtime_work',
  [ProposalType.late_exemption]: 'proposal_late_exemption',
  [ProposalType.maternity_leave]: 'proposal_maternity_leave',
  [ProposalType.post_maternity_benefits]: 'proposal_post_maternity_benefits',
  [ProposalType.timesheet_entry_complaint]: 'proposal_timesheet_entry_complaint',
  [ProposalType.job_transfer]: 'proposal_job_transfer',
  [ProposalType.bulk_job_transfer]: 'proposal_bulk_job_transfer',
  [ProposalType.asset_allocation]: 'proposal_asset_allocation',
  [ProposalType.device_change]: 'proposal_device_change',
  [ProposalType.return_to_work]: 'proposal_return_to_work',
  [ProposalType.statutory_paid_leave]: 'proposal_statutory_leave',
}

/**
 * Lấy subject quyền của một loại đề xuất, để gate màn dùng chung bằng đúng mã mà lượt tải dữ liệu
 * của màn đó gọi tới. Trả `null` khi chưa biết loại — chỗ gọi nên coi đó là KHÔNG có quyền.
 */
export function getProposalPermissionSubject(proposalType: ProposalType | null): string | null {
  if (!proposalType) return null

  return PROPOSAL_PERMISSION_SUBJECT[proposalType] || null
}

/**
 * Get proposal detail query key based on proposal type
 */
export function getProposalDetailQueryKey(
  proposalType: ProposalType | null,
  id: number
): unknown[] | null {
  if (!proposalType) return null

  const queryKeyMap: Record<ProposalType, (id: number) => unknown[]> = {
    [ProposalType.unpaid_leave]: (id) => QUERY_KEYS.HRM.PROPOSALS_UNPAID_LEAVE.DETAIL(id),
    [ProposalType.paid_leave]: (id) => QUERY_KEYS.HRM.PROPOSALS_PAID_LEAVE.DETAIL(id),
    [ProposalType.overtime_work]: (id) => QUERY_KEYS.HRM.PROPOSALS_OVERTIME_WORK.DETAIL(id),
    [ProposalType.late_exemption]: (id) => QUERY_KEYS.HRM.PROPOSALS_LATE_EXEMPTION.DETAIL(id),
    [ProposalType.maternity_leave]: (id) => QUERY_KEYS.HRM.PROPOSALS_MATERNITY_LEAVE.DETAIL(id),
    [ProposalType.post_maternity_benefits]: (id) =>
      QUERY_KEYS.HRM.PROPOSALS_POST_MATERNITY_BENEFITS.DETAIL(id),
    [ProposalType.timesheet_entry_complaint]: (id) =>
      QUERY_KEYS.HRM.PROPOSALS_TIMESHEET_ENTRY_COMPLAINT.DETAIL(id),
    [ProposalType.job_transfer]: (id) => QUERY_KEYS.HRM.PROPOSALS_JOB_TRANSFER.DETAIL(id),
    [ProposalType.bulk_job_transfer]: (id) => QUERY_KEYS.HRM.PROPOSALS_BULK_JOB_TRANSFER.DETAIL(id),
    [ProposalType.asset_allocation]: (id) => QUERY_KEYS.HRM.PROPOSALS_ASSET_ALLOCATION.DETAIL(id),
    [ProposalType.device_change]: (id) => QUERY_KEYS.HRM.PROPOSALS_DEVICE_CHANGE.DETAIL(id),
    [ProposalType.return_to_work]: (id) => QUERY_KEYS.HRM.PROPOSALS_RETURN_TO_WORK.DETAIL(id),
    [ProposalType.statutory_paid_leave]: (id) =>
      QUERY_KEYS.HRM.PROPOSALS_STATUTORY_LEAVE.DETAIL(id),
  } as const

  const getQueryKey = queryKeyMap[proposalType]
  return getQueryKey ? getQueryKey(id) : null
}

/**
 * Get proposal list query key based on proposal type
 */
export function getProposalListQueryKey(proposalType: ProposalType): unknown[] {
  const queryKeyMap: Record<ProposalType, unknown[]> = {
    [ProposalType.unpaid_leave]: ['hrm', 'proposals', 'unpaid-leave', 'list'],
    [ProposalType.paid_leave]: ['hrm', 'proposals', 'paid-leave', 'list'],
    [ProposalType.overtime_work]: ['hrm', 'proposals', 'overtime-work', 'list'],
    [ProposalType.late_exemption]: ['hrm', 'proposals', 'late-exemption', 'list'],
    [ProposalType.maternity_leave]: ['hrm', 'proposals', 'maternity-leave', 'list'],
    [ProposalType.post_maternity_benefits]: ['hrm', 'proposals', 'post-maternity-benefits', 'list'],
    [ProposalType.timesheet_entry_complaint]: [
      'hrm',
      'proposals',
      'timesheet-entry-complaint',
      'list',
    ],
    [ProposalType.job_transfer]: ['hrm', 'proposals', 'job-transfer', 'list'],
    [ProposalType.bulk_job_transfer]: ['hrm', 'proposals', 'bulk-job-transfer', 'list'],
    [ProposalType.asset_allocation]: ['hrm', 'proposals', 'asset-allocation', 'list'],
    [ProposalType.device_change]: ['hrm', 'proposals', 'device-change', 'list'],
    [ProposalType.return_to_work]: ['hrm', 'proposals', 'return-to-work', 'list'],
    [ProposalType.statutory_paid_leave]: ['hrm', 'proposals', 'statutory-leave', 'list'],
  } as const

  return queryKeyMap[proposalType] || ['hrm', 'proposals', 'list']
}

/**
 * Get proposal resource name based on proposal type
 */
export function getProposalResourceName(proposalType: ProposalType): string {
  const resourceNameMap: Record<ProposalType, string> = {
    [ProposalType.unpaid_leave]: 'proposal_unpaid_leave',
    [ProposalType.paid_leave]: 'proposal_paid_leave',
    [ProposalType.overtime_work]: 'proposal_overtime_work',
    [ProposalType.late_exemption]: 'proposal_late_exemption',
    [ProposalType.maternity_leave]: 'proposal_maternity_leave',
    [ProposalType.post_maternity_benefits]: 'proposal_post_maternity_benefits',
    [ProposalType.timesheet_entry_complaint]: 'proposal_timesheet_entry_complaint',
    [ProposalType.job_transfer]: 'proposal_job_transfer',
    [ProposalType.bulk_job_transfer]: 'proposal_bulk_job_transfer',
    [ProposalType.asset_allocation]: 'proposal_asset_allocation',
    [ProposalType.device_change]: 'proposal_device_change',
    [ProposalType.return_to_work]: 'proposal_return_to_work',
    [ProposalType.statutory_paid_leave]: 'proposal_statutory_leave',
  } as const

  return resourceNameMap[proposalType] || 'proposal'
}

/**
 * Get proposal detail path builder based on proposal type
 */
export function getProposalDetailPathBuilder(proposalType: ProposalType): (id: number) => string {
  const pathBuilderMap: Record<ProposalType, (id: number) => string> = {
    [ProposalType.unpaid_leave]: (id) =>
      APP_PATH.PROPOSAL_UNPAID_LEAVE_DETAIL.replace(':id', String(id)),
    [ProposalType.paid_leave]: (id) =>
      APP_PATH.PROPOSAL_PAID_LEAVE_DETAIL.replace(':id', String(id)),
    [ProposalType.overtime_work]: (id) =>
      APP_PATH.PROPOSAL_OVERTIME_WORK_DETAIL.replace(':id', String(id)),
    [ProposalType.late_exemption]: (id) =>
      APP_PATH.PROPOSAL_LATE_EXEMPTION_DETAIL.replace(':id', String(id)),
    [ProposalType.maternity_leave]: (id) =>
      APP_PATH.PROPOSAL_MATERNITY_LEAVE_DETAIL.replace(':id', String(id)),
    [ProposalType.post_maternity_benefits]: (id) =>
      APP_PATH.PROPOSAL_POST_MATERNITY_BENEFIT_DETAIL.replace(':id', String(id)),
    [ProposalType.timesheet_entry_complaint]: (id) =>
      APP_PATH.ATTENDANCE_TIMESHEET_COMPLAINT_DETAIL.replace(':id', String(id)),
    [ProposalType.job_transfer]: (id) =>
      APP_PATH.PROPOSAL_JOB_TRANSFER_DETAIL.replace(':id', String(id)),
    [ProposalType.bulk_job_transfer]: (id) =>
      APP_PATH.PROPOSAL_BULK_JOB_TRANSFER_DETAIL.replace(':id', String(id)),
    [ProposalType.asset_allocation]: (id) =>
      APP_PATH.PROPOSAL_ASSET_ALLOCATION_DETAIL.replace(':id', String(id)),
    [ProposalType.device_change]: (id) =>
      APP_PATH.PROPOSAL_DEVICE_CHANGE_DETAIL.replace(':id', String(id)),
    [ProposalType.return_to_work]: (id) =>
      APP_PATH.PROPOSAL_RETURN_TO_WORK_DETAIL.replace(':id', String(id)),
    [ProposalType.statutory_paid_leave]: (id) =>
      APP_PATH.PROPOSAL_STATUTORY_LEAVE_DETAIL.replace(':id', String(id)),
  } as const

  return pathBuilderMap[proposalType] || ((id) => `/proposals/${id}`)
}
