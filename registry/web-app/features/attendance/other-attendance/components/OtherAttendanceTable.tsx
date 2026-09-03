import { useMemo, useEffect } from 'react'
import { ColumnDef, Table, Button } from '@/components/ui'
import { IconEye, IconCheck, IconX, IconClockcounterclockwise } from '@/assets/icons'
import type { AttendanceRecord } from '@/features/attendance/services/attendance-record-service'
import { DATETIME_FORMAT } from '@/constants/date-format'
import { cn } from '@/utils'
import AttendanceApprovalStatusBadge from './AttendanceApprovalStatusBadge'
import AttendanceConfirmationStatusBadge from './AttendanceConfirmationStatusBadge'
import { useOtherAttendanceActions } from '../hooks/useOtherAttendanceActions'
import { Flex } from '@radix-ui/themes'
import { formatDate } from '@/utils/date-utils.ts'
import { useAbility } from '@/lib/ability.ts'
import {
  AttendanceApproveStatus,
  AttendanceConfirmationStatus,
} from '@/constants/api-schema-aliases'
type OtherAttendanceTableProps = {
  data: AttendanceRecord[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

/**
 * Get image URL from attendance record
 */
function getImageUrl(record: AttendanceRecord): string | null {
  return record.image?.view_url || null
}

const OtherAttendanceTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onClearFilter,
  hasFilter,
}: OtherAttendanceTableProps) => {
  const ability = useAbility()

  const {
    handleViewDetail,
    handleReject,
    handleApprove,
    handleConfirmConfirmation,
    handleRejectConfirmation,
    handleEdit,
    handleViewHistory,
  } = useOtherAttendanceActions()

  const columns: ColumnDef<AttendanceRecord>[] = useMemo(
    () => [
      {
        accessorKey: 'employee.fullname',
        header: 'Nhân viên',
        cell: ({ row }) => {
          const employee = row.original.employee
          const branch = employee?.branch?.name || '-'
          const block = employee?.block?.name || '-'
          const department = employee?.department?.name || '-'
          return (
            <div className="flex flex-col gap-1">
              <span className="typo-body-sm-semibold text-content-dark-1">
                {employee?.fullname || '-'}
              </span>
              <span className="typo-body-sm text-content-dark-3">Mã: {employee?.code || '-'}</span>
              {(branch !== '-' || block !== '-' || department !== '-') && (
                <Flex direction="column" className={'typo-body-xs-regular text-content-dark-3'}>
                  <span> • Chi nhánh: {branch}</span>
                  <span> • Khối: {block}</span>
                  <span> • Phòng ban: {department}</span>
                </Flex>
              )}
            </div>
          )
        },
        meta: {
          width: '200px',
          sortable: false,
          frozen: true,
        },
      },
      {
        accessorKey: 'address_text',
        header: 'Chi tiết chấm công',
        cell: ({ row }) => {
          const location = row.original.address_text || '-'
          const datetime = formatDate(row.original.timestamp, DATETIME_FORMAT)
          const date = datetime.split(' ')[0]
          const time = datetime.split(' ')[1]
          const lat = row.original.latitude
          const lng = row.original.longitude
          const mapsUrl =
            lat != null && lng != null
              ? `https://www.google.com/maps?q=${lat},${lng}`
              : location !== '-'
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
                : null
          return (
            <Flex
              direction={'column'}
              align={'start'}
              justify={'center'}
              gap={'2'}
              className={'typo-body-sm-medium text-content-dark-1'}
            >
              {mapsUrl ? (
                <Button
                  variant="link"
                  size="small"
                  className={cn(
                    'typo-body-sm-medium h-auto p-0 text-left',
                    'text-action-primary-red-default no-underline',
                    'hover:text-action-primary-red-default hover:no-underline'
                  )}
                  onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}
                  title={`Ấn để xem '${location}' trên bản đồ`}
                >
                  {location}
                </Button>
              ) : (
                <div>{location}</div>
              )}
              <div>{date}</div>
              <div>{time}</div>
            </Flex>
          )
        },
        meta: {
          width: '160px',
          align: 'left',
          sortable: false,
        },
      },
      {
        accessorKey: 'description',
        id: 'description',
        header: 'Lý do',
        cell: ({ getValue }) => {
          const value = getValue() as string | undefined | null
          const text = value?.trim() || '-'
          return (
            <span
              className="typo-body-sm-medium text-content-dark-1 block"
              title={text !== '-' ? text : undefined}
            >
              {text}
            </span>
          )
        },
        meta: {
          width: '100px',
          align: 'left',
          sortable: false,
        },
      },
      {
        id: 'image',
        header: 'Ảnh chấm công',
        cell: ({ row }) => {
          const imageUrl = getImageUrl(row.original)
          if (!imageUrl) {
            return (
              <div className="flex items-center justify-center">
                <span className="typo-body-base-regular text-content-dark-3">-</span>
              </div>
            )
          }
          return (
            <div className="flex items-center justify-center">
              <img
                src={imageUrl}
                alt="Ảnh chấm công"
                className="h-[120px] w-[80px] rounded object-cover"
                loading="lazy"
              />
            </div>
          )
        },
        meta: {
          width: '150px',
          align: 'center',
          sortable: false,
        },
      },
      {
        id: 'confirmation_status',
        header: 'Trạng thái xác nhận',
        cell: ({ row }) => {
          const confirmer = row.original.confirmed_by
          const fullName = confirmer?.fullname?.trim() || ''
          const code = confirmer?.code?.trim() || ''
          const confirmedAt = row.original.confirmed_at
            ? formatDate(row.original.confirmed_at, DATETIME_FORMAT)
            : ''
          return (
            <Flex
              direction={'column'}
              justify={'center'}
              align={'start'}
              gap={'2'}
              className={'typo-body-sm-medium text-content-dark-1'}
            >
              <AttendanceConfirmationStatusBadge
                status={row.original.colored_confirmation_status}
              />
              {row.original.confirmation_status !== AttendanceConfirmationStatus.PENDING ? (
                fullName && code ? (
                  <Flex direction={'column'} gap={'1'}>
                    <div
                      className={'typo-body-sm-semibold'}
                      title={`Tên trưởng phòng: ${fullName}`}
                    >
                      {fullName || '-'}
                    </div>
                    <div title={`Mã trưởng phòng: ${code}`}>{code || '-'}</div>
                  </Flex>
                ) : (
                  '-'
                )
              ) : null}
              {confirmedAt && (
                <Flex
                  direction={'column'}
                  gap={'2'}
                  align={'start'}
                  justify={'center'}
                  className={'typo-body-sm-medium'}
                >
                  <div>{confirmedAt.split(' ')[0]}</div>
                  <div>{confirmedAt.split(' ')[1]}</div>
                </Flex>
              )}
            </Flex>
          )
        },
        meta: {
          width: '160px',
          align: 'left',
          sortable: false,
        },
      },
      {
        accessorKey: 'confirmation_note',
        header: 'Ghi chú (trưởng phòng)',
        cell: ({ getValue }) => {
          const value = getValue() as string | undefined | null
          const text = value?.trim() || '-'
          return (
            <span
              className="typo-body-sm-medium text-content-dark-1 block"
              title={text !== '-' ? text : undefined}
            >
              {text}
            </span>
          )
        },
        meta: {
          width: '160px',
          align: 'left',
          sortable: false,
        },
      },
      {
        header: 'Trạng thái duyệt',
        cell: ({ row }) => {
          const approver = row.original.approved_by
          const fullName = approver?.fullname?.trim() || ''
          const code = approver?.code?.trim() || ''
          const approvedAt = row.original.approved_at
            ? formatDate(row.original.approved_at, DATETIME_FORMAT)
            : ''
          return (
            <>
              <Flex
                direction={'column'}
                justify={'center'}
                align={'start'}
                gap={'2'}
                className={'typo-body-sm-medium text-content-dark-1'}
              >
                <AttendanceApprovalStatusBadge status={row.original.colored_approve_status} />
                {row.original.approve_status !== AttendanceApproveStatus.PENDING ? (
                  fullName && code ? (
                    <Flex direction={'column'} gap={'1'}>
                      <div
                        className={'typo-body-sm-semibold'}
                        title={`Tên người xử lý: ${fullName}`}
                      >
                        {fullName || '-'}
                      </div>
                      <div title={`Mã người xử lý: ${code}`}>{code || '-'}</div>
                    </Flex>
                  ) : (
                    '-'
                  )
                ) : null}
                {approvedAt && (
                  <Flex
                    direction={'column'}
                    gap={'2'}
                    align={'start'}
                    justify={'center'}
                    className={'typo-body-sm-medium'}
                  >
                    <div>{approvedAt.split(' ')[0]}</div>
                    <div>{approvedAt.split(' ')[1]}</div>
                  </Flex>
                )}
              </Flex>
            </>
          )
        },
        meta: {
          width: '130px',
          align: 'left',
          sortable: false,
        },
      },
      {
        accessorKey: 'notes',
        header: 'Ghi chú (NV)',
        cell: ({ getValue }) => {
          const value = getValue() as string | undefined | null
          const text = value?.trim() || '-'
          return (
            <span
              className="typo-body-sm-medium text-content-dark-1 block"
              title={text !== '-' ? text : undefined}
            >
              {text}
            </span>
          )
        },
        meta: {
          width: 'flex-1',
          align: 'left',
          sortable: false,
        },
      },
      {
        accessorKey: 'approval_note',
        header: 'Ghi chú (HR)',
        cell: ({ getValue }) => {
          const value = getValue() as string | undefined | null
          const text = value?.trim() || '-'
          return (
            <span
              className="typo-body-sm-medium text-content-dark-1 block"
              title={text !== '-' ? text : undefined}
            >
              {text}
            </span>
          )
        },
        meta: {
          width: 'flex-1',
          align: 'left',
          sortable: false,
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const record = row.original
          const isPending = record.is_pending
          const isApproved = record.approve_status === AttendanceApproveStatus.APPROVED
          const isConfirmationPending =
            record.confirmation_status === AttendanceConfirmationStatus.PENDING
          return (
            <div className="flex w-full flex-col items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleViewDetail(record)}
                className={cn(
                  'flex items-center justify-center gap-2 px-3 py-2 text-sm transition-colors',
                  'hover:bg-data-light-grey-hover',
                  'hover:cursor-pointer',
                  'focus:outline-action-outline-default'
                )}
                title="Xem chi tiết"
                aria-label="Xem chi tiết"
              >
                <span className="flex h-4 w-4 items-center justify-center">
                  <IconEye size={16} />
                </span>
              </button>
              {isConfirmationPending && ability.can('confirm', 'attendance_record') && (
                <>
                  <button
                    type="button"
                    onClick={() => handleRejectConfirmation(record)}
                    className={cn(
                      'bg-data-red-disabled text-data-red-default',
                      'hover:bg-data-red-hover hover:text-content-light-1',
                      'rounded',
                      'p-2',
                      'transition-colors'
                    )}
                    title="Từ chối xác nhận (Trưởng phòng)"
                    aria-label="Từ chối xác nhận chấm công"
                  >
                    <IconX size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmConfirmation(record)}
                    className={cn(
                      'bg-data-green-disabled text-data-green-default',
                      'hover:bg-data-green-hover hover:text-content-light-1',
                      'rounded',
                      'p-2',
                      'transition-colors'
                    )}
                    title="Xác nhận (Trưởng phòng)"
                    aria-label="Xác nhận chấm công"
                  >
                    <IconCheck size={16} />
                  </button>
                </>
              )}
              {isPending && ability.can('other_bulk_approve', 'attendance_record') && (
                <>
                  <button
                    type="button"
                    onClick={() => handleReject(record)}
                    disabled={!isPending}
                    className={cn(
                      'bg-data-red-disabled text-data-red-default',
                      'hover:bg-data-red-hover hover:text-content-light-1',
                      'rounded',
                      'p-2',
                      'transition-colors',
                      'disabled:cursor-not-allowed disabled:opacity-50'
                    )}
                    title="Từ chối"
                    aria-label="Từ chối"
                  >
                    <IconX size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(record)}
                    disabled={!isPending}
                    className={cn(
                      'bg-data-green-disabled text-data-green-default',
                      'hover:bg-data-green-hover hover:text-content-light-1',
                      'rounded',
                      'p-2',
                      'transition-colors',
                      'disabled:cursor-not-allowed disabled:opacity-50'
                    )}
                    title="Duyệt"
                    aria-label="Duyệt"
                  >
                    <IconCheck size={16} />
                  </button>
                </>
              )}
              {isApproved && ability.can('reject', 'attendance_record') && (
                <button
                  type="button"
                  onClick={() => handleEdit(record)}
                  className={cn(
                    'bg-data-red-disabled text-data-red-default',
                    'hover:bg-data-red-hover hover:text-content-light-1',
                    'rounded',
                    'p-2',
                    'transition-colors',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                  title="Từ chối"
                  aria-label="Từ chối"
                >
                  <IconX size={16} />
                </button>
              )}
              {!isPending && ability.can('history_detail', 'attendance_record') && (
                <button
                  type="button"
                  onClick={() => handleViewHistory(record)}
                  className={cn(
                    'bg-data-light-grey-disabled text-content-dark-2',
                    'hover:bg-data-light-grey-hover hover:text-content-dark-1',
                    'rounded',
                    'p-2',
                    'transition-colors'
                  )}
                  title="Xem lịch sử thay đổi"
                  aria-label="Xem lịch sử thay đổi"
                >
                  <IconClockcounterclockwise size={16} />
                </button>
              )}
            </div>
          )
        },
        meta: {
          width: 'flex-1',
          align: 'center',
          sortable: false,
          frozen: true,
        },
      },
    ],
    [
      handleViewDetail,
      handleReject,
      handleApprove,
      handleEdit,
      handleViewHistory,
      handleConfirmConfirmation,
      handleRejectConfirmation,
      ability,
    ]
  )

  // Sticky header logic - align with list page scroll container
  useEffect(() => {
    let cleanup: (() => void) | null = null

    const timeoutId = setTimeout(() => {
      const scrollContainer = document.querySelector(
        '[class*="overflow-x-auto"][class*="overflow-y-auto"]'
      ) as HTMLElement | null
      if (!scrollContainer) return

      const table = scrollContainer.querySelector('table') as HTMLElement | null
      if (!table) return

      const thead = table.querySelector('thead') as HTMLElement | null
      if (!thead) return

      const navBar = document.querySelector('[data-name="Header"]') as HTMLElement | null

      const updateStickyTop = () => {
        if (!scrollContainer || !navBar) return

        const scrollContainerRect = scrollContainer.getBoundingClientRect()
        const navBarRect = navBar.getBoundingClientRect()
        const scrollContainerTop = scrollContainerRect.top
        const navBarBottom = navBarRect.bottom

        let topOffset = 0
        if (scrollContainerTop < navBarBottom) {
          topOffset = Math.max(0, navBarBottom - scrollContainerTop)
        } else {
          topOffset = 0
        }

        thead.style.top = `${topOffset}px`
      }

      updateStickyTop()

      const scrollHandler = () => {
        updateStickyTop()
      }

      scrollContainer.addEventListener('scroll', scrollHandler)
      window.addEventListener('scroll', scrollHandler)
      window.addEventListener('resize', updateStickyTop)

      cleanup = () => {
        scrollContainer.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('resize', updateStickyTop)
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      if (cleanup) {
        cleanup()
      }
    }
  }, [data])

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-content-dark-3">Có lỗi xảy ra khi tải dữ liệu</span>
      </div>
    )
  }

  return (
    <Table
      data={data}
      columns={columns}
      showSTT
      enableSorting
      manualSorting
      manualPagination
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      onSortingChange={onSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      className="flex-1"
      disableInnerOverflow={true}
      paginationPosition="static"
    />
  )
}

export default OtherAttendanceTable
