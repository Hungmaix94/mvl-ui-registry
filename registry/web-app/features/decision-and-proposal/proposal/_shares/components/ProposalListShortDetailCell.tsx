import { useMemo } from 'react'
import { Flex } from '@radix-ui/themes'
import type { ProposalCombined } from '@/features/decision-and-proposal/services/proposal-base-service'
import { formatDate } from '@/utils/date-utils'
import { formatNumber } from '@/utils/common'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { ProposalType } from '@/constants/api-schema-aliases'

type ProposalListShortDetailCellProps = {
  record: ProposalCombined
}

type DetailRow = {
  label: string
  value: string
  /** Full value for tooltip (e.g. when value is truncated) */ title?: string
}

function formatDateRange(from: string | null | undefined, to: string | null | undefined): string {
  if (from && to) return `${formatDate(from)} - ${formatDate(to)}`
  if (from) return formatDate(from)
  if (to) return formatDate(to)
  return '-'
}

function DetailLines({ rows }: { rows: DetailRow[] }) {
  if (rows.length === 0) return <span className="text-content-dark-1 text-sm">-</span>
  return (
    <Flex direction="column" gap="1" className="min-w-0">
      {rows.map((row, i) => (
        <span key={i} className="text-content-dark-2 min-w-0 shrink-0">
          <b>{row.label}:&nbsp;</b>
          <span
            className="text-content-dark-1 min-w-0 text-sm"
            title={(row.title ?? row.value) || undefined}
          >
            {row.value || '-'}
          </span>
        </span>
      ))}
    </Flex>
  )
}

export default function ProposalListShortDetailCell({ record }: ProposalListShortDetailCellProps) {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.PROPOSAL_PAID_LEAVE_SHIFT_CHOICES,
      APP_CONSTANT_KEY.HRM.PROPOSAL_UNPAID_LEAVE_SHIFT_CHOICES,
      APP_CONSTANT_KEY.HRM.PROPOSAL_ASSET_UNIT_TYPE_CHOICES,
      APP_CONSTANT_KEY.HRM.LATE_EXEMPTION_DURATION_TYPE,
    ],
  })

  const assetUnitTypeMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.PROPOSAL_ASSET_UNIT_TYPE_CHOICES)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_ASSET_UNIT_TYPE_CHOICES) as Record<
          string,
          string
        > | null) || {}
      : {}
  }, [keysMap])

  const paidShiftMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.PROPOSAL_PAID_LEAVE_SHIFT_CHOICES)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_PAID_LEAVE_SHIFT_CHOICES) as Record<
          string,
          string
        >) || {}
      : {}
  }, [keysMap])

  const unpaidShiftMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.PROPOSAL_UNPAID_LEAVE_SHIFT_CHOICES)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_UNPAID_LEAVE_SHIFT_CHOICES) as Record<
          string,
          string
        >) || {}
      : {}
  }, [keysMap])

  const lateExemptionDurationTypeMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.LATE_EXEMPTION_DURATION_TYPE)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.LATE_EXEMPTION_DURATION_TYPE) as Record<
          string,
          string
        >) || {}
      : {}
  }, [keysMap])

  const platformLabel = (p: string | null | undefined): string => {
    if (!p) return ''
    const map: Record<string, string> = { ios: 'iOS', android: 'Android', web: 'Web' }
    return map[p] || p
  }

  const type = record.proposal_type
  let rows: DetailRow[] = []

  switch (type) {
    case ProposalType.unpaid_leave: {
      rows = [
        {
          label: 'Ngày',
          value: formatDateRange(record.unpaid_leave_start_date, record.unpaid_leave_end_date),
        },
        {
          label: 'Buổi',
          value: record.unpaid_leave_shift
            ? unpaidShiftMapping[record.unpaid_leave_shift] || record.unpaid_leave_shift
            : '-',
        },
        { label: 'Lý do', value: record.unpaid_leave_reason?.trim() ?? '-' },
      ].filter((r) => r.value !== '-')
      if (rows.length === 0) rows = [{ label: 'Nội dung', value: '-' }]
      break
    }
    case ProposalType.paid_leave: {
      rows = [
        {
          label: 'Ngày',
          value: formatDateRange(record.paid_leave_start_date, record.paid_leave_end_date),
        },
        {
          label: 'Buổi',
          value: record.paid_leave_shift
            ? paidShiftMapping[record.paid_leave_shift] || record.paid_leave_shift
            : '-',
        },
        { label: 'Lý do', value: record.paid_leave_reason?.trim() ?? '-' },
      ].filter((r) => r.value !== '-')
      if (rows.length === 0) rows = [{ label: 'Nội dung', value: '-' }]
      break
    }
    case ProposalType.overtime_work: {
      const entries = record.overtime_entries ?? []
      const count = entries.length
      const totalHours = entries.reduce((sum, e) => sum + (e.duration_hours ?? 0), 0)
      rows = [
        { label: 'Số ca', value: count > 0 ? String(count) : '-' },
        {
          label: 'Tổng giờ',
          value:
            count > 0
              ? `${formatNumber(totalHours, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} giờ`
              : '-',
        },
      ]
      if (rows.every((r) => r.value === '-')) rows = [{ label: 'Nội dung', value: '-' }]
      break
    }
    case ProposalType.late_exemption: {
      const durationTypeLabel = record.late_exemption_duration_type
        ? lateExemptionDurationTypeMapping[record.late_exemption_duration_type] ||
          record.late_exemption_duration_type
        : '-'
      rows = [
        {
          label: 'Loại',
          value: durationTypeLabel,
        },
        {
          label: 'Ngày',
          value: formatDateRange(record.late_exemption_start_date, record.late_exemption_end_date),
        },
        {
          label: 'Số phút/ngày',
          value:
            record.late_exemption_minutes != null ? `${record.late_exemption_minutes} phút` : '-',
        },
      ].filter((r) => r.value !== '-')
      if (rows.length === 0) rows = [{ label: 'Nội dung', value: '-' }]
      break
    }
    case ProposalType.maternity_leave: {
      rows = [
        {
          label: 'Ngày nghỉ',
          value: formatDateRange(
            record.maternity_leave_start_date,
            record.maternity_leave_end_date
          ),
        },
        {
          label: 'Dự kiến sinh',
          value: record.maternity_leave_estimated_due_date
            ? formatDate(record.maternity_leave_estimated_due_date)
            : '-',
        },
        {
          label: 'Người thay thế',
          value: record.maternity_leave_replacement_employee?.fullname ?? '-',
        },
      ].filter((r) => r.value !== '-')
      if (rows.length === 0) rows = [{ label: 'Nội dung', value: '-' }]
      break
    }
    case ProposalType.post_maternity_benefits: {
      const range = formatDateRange(
        record.post_maternity_benefits_start_date,
        record.post_maternity_benefits_end_date
      )
      rows =
        range !== '-'
          ? [{ label: 'Ngày', value: range }]
          : [{ label: 'Nội dung', value: record.short_description?.trim() ?? '-' }]
      break
    }
    case ProposalType.timesheet_entry_complaint: {
      const date = record.timesheet_entry_complaint_complaint_date
        ? formatDate(record.timesheet_entry_complaint_complaint_date)
        : '-'
      const inTime = record.timesheet_entry_complaint_proposed_check_in_time ?? ''
      const outTime = record.timesheet_entry_complaint_proposed_check_out_time ?? ''
      rows = [
        { label: 'Ngày xác nhận công', value: date },
        {
          label: 'Lý do',
          value: record.timesheet_entry_complaint_complaint_reason?.trim() ?? '-',
        },
        {
          label: 'Giờ đề xuất',
          value: inTime || outTime ? `${inTime} - ${outTime}` : '-',
        },
      ].filter((r) => r.value !== '-')
      if (rows.length === 0) rows = [{ label: 'Nội dung', value: '-' }]
      break
    }
    case ProposalType.job_transfer: {
      const dept = record.job_transfer_new_department?.name
      const block = record.job_transfer_new_block?.name
      const branch = record.job_transfer_new_branch?.name
      const target = [branch, block, dept].filter(Boolean).join(' / ') || '-'
      rows = [
        { label: 'Điều chuyển đến', value: target },
        {
          label: 'Ngày hiệu lực',
          value: record.job_transfer_effective_date
            ? formatDate(record.job_transfer_effective_date)
            : '-',
        },
        { label: 'Lý do', value: record.job_transfer_reason?.trim() ?? '-' },
      ].filter((r) => r.value !== '-')
      if (rows.length === 0) rows = [{ label: 'Nội dung', value: '-' }]
      break
    }
    case ProposalType.bulk_job_transfer: {
      // ProposalCombined (generic manage list) doesn't serialize job_transfer_lines — only the
      // shared header field is available here; see the dedicated detail page for per-line data.
      rows = [
        {
          label: 'Ngày hiệu lực',
          value: record.job_transfer_effective_date
            ? formatDate(record.job_transfer_effective_date)
            : '-',
        },
      ].filter((r) => r.value !== '-')
      if (rows.length === 0)
        rows = [{ label: 'Nội dung', value: record.short_description?.trim() ?? '-' }]
      break
    }
    case ProposalType.asset_allocation: {
      // Hide assets HR removed during approval (flagged, not deleted, for audit).
      const assets = (record.assets ?? []).filter((asset) => !asset.removed_on_approval)
      const n = assets.length
      if (n === 0) {
        rows = [{ label: 'Nội dung', value: '-' }]
      } else {
        rows = [{ label: 'Số mục', value: String(n) }]
        assets.forEach((asset, index) => {
          const name = asset.name?.trim() || `Tài sản ${index + 1}`
          const unitLabel = asset.unit_type
            ? assetUnitTypeMapping[asset.unit_type] || asset.unit_type
            : '-'
          const qty = asset.quantity ?? 0
          const valuePart = `${unitLabel} × ${qty}`
          const notePart = asset.note?.trim() ? ` — ${asset.note.trim()}` : ''
          rows.push({ label: name, value: valuePart + notePart })
        })
      }
      break
    }
    case ProposalType.device_change: {
      const DEVICE_ID_MAX_LEN = 10
      const truncateDeviceId = (
        s: string | null | undefined
      ): { value: string; title?: string } => {
        const full = s ?? '-'
        if (full === '-') return { value: full }
        if (full.length <= DEVICE_ID_MAX_LEN) return { value: full }
        return { value: full.slice(0, DEVICE_ID_MAX_LEN) + '...', title: full }
      }
      const oldDisplay = truncateDeviceId(record.device_change_old_device_id)
      const newDisplay = truncateDeviceId(record.device_change_new_device_id)
      const platform = platformLabel(record.device_change_new_platform)
      rows = [
        { label: 'Thiết bị cũ', value: oldDisplay.value, title: oldDisplay.title },
        { label: 'Thiết bị mới', value: newDisplay.value, title: newDisplay.title },
        { label: 'Nền tảng', value: platform || '-' },
      ].filter((r) => r.value !== '-')
      if (rows.length === 0) rows = [{ label: 'Nội dung', value: '-' }]
      break
    }
    case ProposalType.return_to_work: {
      const rawDate = record.return_to_work_date
      const returnToWorkDate = rawDate && typeof rawDate === 'string' ? formatDate(rawDate) : '-'
      rows =
        returnToWorkDate !== '-'
          ? [{ label: 'Ngày quay lại làm việc', value: returnToWorkDate }]
          : [{ label: 'Nội dung', value: record.short_description?.trim() ?? '-' }]
      break
    }
    case ProposalType.statutory_paid_leave: {
      const rawStart = record.statutory_leave_start_date
      const rawEnd = record.statutory_leave_end_date
      const startDate = rawStart && typeof rawStart === 'string' ? formatDate(rawStart) : '-'
      const endDate = rawEnd && typeof rawEnd === 'string' ? formatDate(rawEnd) : '-'
      rows =
        startDate !== '-' || endDate !== '-'
          ? [
              { label: 'Ngày bắt đầu nghỉ', value: startDate },
              { label: 'Ngày kết thúc nghỉ', value: endDate },
            ].filter((r) => r.value !== '-')
          : [{ label: 'Nội dung', value: record.short_description?.trim() ?? '-' }]
      break
    }
    default:
      rows = [{ label: 'Nội dung', value: record.short_description?.trim() ?? '-' }]
  }

  return (
    <div className="text-content-dark-1 max-w-full min-w-0 text-sm">
      <DetailLines rows={rows} />
    </div>
  )
}
