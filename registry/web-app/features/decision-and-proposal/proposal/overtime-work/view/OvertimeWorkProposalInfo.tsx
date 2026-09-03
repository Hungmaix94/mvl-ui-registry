import { useCallback, useMemo } from 'react'
import { Grid } from '@radix-ui/themes'
import { type ProposalOvertimeWork } from '@/features/decision-and-proposal/services/proposal-misc-service'
import ProposalInfoRow from '@/features/decision-and-proposal/proposal/_shares/components/ProposalInfoRow.tsx'
import { formatDate } from '@/utils/date-utils.ts'
import { formatNumber } from '@/utils/common'
import { IconFile } from '@/assets/icons'
import { isImageFile } from '@/components/ui/attachment-section/AttachmentSection.tsx'
import { useDialog } from '@/hooks/useDialog.ts'
import { cn } from '@/utils'

type OvertimeWorkProposalInfoProps = {
  proposal: ProposalOvertimeWork
}

type EntryAttachment = {
  url: string
  fileName: string
  isImage: boolean
}

type OvertimeEntryTableData = {
  id: number
  date: string
  proposal_start_time: string
  proposal_end_time: string
  proposal_total_hours: string
  approved_start_time: string
  approved_end_time: string
  approved_total_hours: string
  attachment: EntryAttachment | null
  description: string | null
}

// Neutral vertical rule separating the two column groups (no fill, no text color)
const GROUP_DIVIDER = 'border-border-1 border-l'

const OvertimeWorkProposalInfo = ({ proposal }: OvertimeWorkProposalInfoProps) => {
  const { displayCustom } = useDialog()

  // Mirror TimesheetEntryCheckinTable: open image attachments in a dialog instead of a new tab
  const handlePreviewImage = useCallback(
    (attachment: EntryAttachment, entryDate: string) => {
      displayCustom({
        title: entryDate ? `Ảnh đính kèm ngày ${entryDate}` : 'Ảnh đính kèm',
        size: 'xl',
        hideFooter: true,
        content: (
          <div className="flex w-full items-center justify-center">
            <img
              src={attachment.url}
              alt={attachment.fileName}
              className="max-h-[70vh] w-auto max-w-full rounded object-contain"
            />
          </div>
        ),
      })
    },
    [displayCustom]
  )

  const tableData: OvertimeEntryTableData[] = useMemo(() => {
    return (proposal.overtime_entries || []).map((entry) => {
      const file = entry.attachment
      const attachmentUrl = file?.view_url || file?.download_url || file?.file_path || ''
      const attachment: EntryAttachment | null =
        file && attachmentUrl
          ? {
              url: attachmentUrl,
              fileName: file.file_name || '',
              isImage: isImageFile(file.file_name || ''),
            }
          : null

      const proposalStart = entry.proposal_start_time ?? entry.start_time
      const proposalEnd = entry.proposal_end_time ?? entry.end_time
      const proposalDuration = entry.proposal_duration_hours ?? entry.duration_hours

      return {
        id: entry.id,
        date: formatDate(entry.date),
        proposal_start_time: proposalStart || '-',
        proposal_end_time: proposalEnd || '-',
        proposal_total_hours: proposalDuration != null ? `${formatNumber(proposalDuration, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} giờ` : '-',
        approved_start_time: entry.start_time || '-',
        approved_end_time: entry.end_time || '-',
        approved_total_hours:
          entry.duration_hours != null ? `${formatNumber(entry.duration_hours, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} giờ` : '-',
        attachment,
        description: entry.description || null,
      }
    })
  }, [proposal.overtime_entries])

  const renderAttachment = useCallback(
    (row: OvertimeEntryTableData) => {
      const value = row.attachment
      if (!value) {
        return <span className="text-content-dark-3 text-sm">-</span>
      }
      if (value.isImage) {
        return (
          <button
            type="button"
            onClick={() => handlePreviewImage(value, row.date)}
            className="border-border-1 block h-12 w-12 cursor-pointer overflow-hidden rounded-md border bg-transparent p-0 transition-transform hover:scale-105"
            title={value.fileName}
          >
            <img
              src={value.url}
              alt={value.fileName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </button>
        )
      }
      return (
        <a
          href={value.url}
          target="_blank"
          rel="noreferrer"
          className="text-action-primary-red-default flex items-center gap-1.5 text-sm"
          title={value.fileName}
        >
          <IconFile size={18} />
          <span className="max-w-[160px] truncate">{value.fileName}</span>
        </a>
      )
    },
    [handlePreviewImage]
  )

  return (
    <div className="flex w-full flex-col gap-5">
      <p className="typo-body-xl-semibold text-content-dark-1">Thông tin đề xuất</p>

      {/* Overtime entries table — grouped: staff proposal vs HR approval */}
      <div className="border-border-1 overflow-hidden rounded-xl border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse">
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  scope="col"
                  className="text-content-dark-2 typo-body-sm-semibold px-4 py-3 text-left align-middle"
                >
                  Ngày
                </th>
                <th
                  colSpan={3}
                  scope="colgroup"
                  className={cn(
                    GROUP_DIVIDER,
                    'text-content-dark-1 typo-body-sm-semibold px-4 py-2.5 text-center'
                  )}
                >
                  Nhân sự đề xuất
                </th>
                <th
                  colSpan={3}
                  scope="colgroup"
                  className={cn(
                    GROUP_DIVIDER,
                    'text-content-dark-1 typo-body-sm-semibold px-4 py-2.5 text-center'
                  )}
                >
                  HR duyệt
                </th>
                <th
                  rowSpan={2}
                  scope="col"
                  className={cn(
                    GROUP_DIVIDER,
                    'text-content-dark-2 typo-body-sm-semibold px-4 py-3 text-left align-middle'
                  )}
                >
                  Tệp đính kèm
                </th>
                <th
                  rowSpan={2}
                  scope="col"
                  className="text-content-dark-2 typo-body-sm-semibold px-4 py-3 text-left align-middle"
                >
                  Mô tả
                </th>
              </tr>
              <tr className="text-content-dark-3 typo-body-xs-regular">
                <th scope="col" className={cn(GROUP_DIVIDER, 'px-4 py-2 text-center font-normal')}>
                  Giờ bắt đầu
                </th>
                <th scope="col" className="px-4 py-2 text-center font-normal">
                  Giờ kết thúc
                </th>
                <th scope="col" className="px-4 py-2 text-center font-normal">
                  Tổng số giờ
                </th>
                <th scope="col" className={cn(GROUP_DIVIDER, 'px-4 py-2 text-center font-normal')}>
                  Giờ bắt đầu
                </th>
                <th scope="col" className="px-4 py-2 text-center font-normal">
                  Giờ kết thúc
                </th>
                <th scope="col" className="px-4 py-2 text-center font-normal">
                  Tổng số giờ
                </th>
              </tr>
            </thead>
            <tbody className="text-content-dark-1 typo-body-sm-regular">
              {tableData.map((row) => (
                <tr key={row.id} className="border-border-1 border-t">
                  <td className="typo-body-sm-semibold px-4 py-3 align-middle">{row.date}</td>
                  <td className={cn(GROUP_DIVIDER, 'px-4 py-3 text-center')}>
                    {row.proposal_start_time}
                  </td>
                  <td className="px-4 py-3 text-center">{row.proposal_end_time}</td>
                  <td className="px-4 py-3 text-center font-semibold">
                    {row.proposal_total_hours}
                  </td>
                  <td className={cn(GROUP_DIVIDER, 'px-4 py-3 text-center')}>
                    {row.approved_start_time}
                  </td>
                  <td className="px-4 py-3 text-center">{row.approved_end_time}</td>
                  <td className="px-4 py-3 text-center font-semibold">
                    {row.approved_total_hours}
                  </td>
                  <td className={cn(GROUP_DIVIDER, 'px-4 py-3 align-middle')}>
                    {renderAttachment(row)}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <span className="break-words whitespace-normal">{row.description || '-'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Additional info fields */}
      <Grid columns="2" gap="5" className="w-full">
        <div className="flex flex-col">
          <ProposalInfoRow label="Mã đề xuất" value={proposal.code} />
          {/*<ProposalInfoRowStatus status={proposal.colored_proposal_status} />*/}
          <ProposalInfoRow label="Ghi chú" value={proposal.note} isLast />
        </div>
        <div className="flex flex-col pl-6">
          <ProposalInfoRow label="Ngày tạo đề xuất" value={formatDate(proposal.created_at)} />
          <ProposalInfoRow
            label="Ngày cập nhật cuối cùng"
            value={formatDate(proposal.updated_at)}
            isLast
          />
        </div>
      </Grid>
    </div>
  )
}

export default OvertimeWorkProposalInfo
