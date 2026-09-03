import { useMemo, useEffect } from 'react'
import { Avatar as RadixAvatar } from '@radix-ui/themes'
import UserAvatar from '@/components/ui/avatar/DefaultAvatar.tsx'
import { Chip, ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconArrowsleftright, IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { type RecruitmentCandidate } from '@/features/recruitment/services/recruitment-candidate-service'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import { useRecruitmentCandidateConvert } from '@/features/recruitment/candidate/_shares/hooks'
import { useAbility } from '@/lib/ability.ts'
import { formatDate } from '@/utils/date-utils.ts'
import { RecruitmentCandidateStatus } from '@/constants/api-schema-aliases'

type RecruitmentCandidateWithExtras = RecruitmentCandidate & {
  recruitment_request_name?: string
  recruitment_source_name?: string
  recruitment_channel_name?: string
}

type RecruitmentCandidateTableProps = {
  data: RecruitmentCandidateWithExtras[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteRecruitmentCandidate?: (record: RecruitmentCandidateWithExtras) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const RecruitmentCandidateTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteRecruitmentCandidate,
  onClearFilter,
  hasFilter,
}: RecruitmentCandidateTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { openConvertDialog } = useRecruitmentCandidateConvert()

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.STATUS,
      APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.EMPLOYEE_TYPE_CHOICES,
    ],
  })
  const statusMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.STATUS)
      ? keysMap.get(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.STATUS) || {}
      : {}
  }, [keysMap])
  const employeeTypeMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.EMPLOYEE_TYPE_CHOICES)
      ? keysMap.get(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.EMPLOYEE_TYPE_CHOICES) || {}
      : {}
  }, [keysMap])

  // Columns
  const columns: ColumnDef<RecruitmentCandidateWithExtras>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã ứng viên',
        meta: { width: 'w-[150px]', sortable: true },
      },
      {
        accessorKey: 'name',
        header: 'Tên ứng viên',
        cell: ({ row, getValue }) => {
          const name = getValue() as string
          const avatarUrl = row.original.avatar?.view_url || undefined
          return (
            <div className="flex items-center gap-2" title={name}>
              <RadixAvatar
                size="2"
                src={avatarUrl}
                fallback={<UserAvatar />}
                radius="full"
                variant="soft"
                className="shrink-0"
              />
              {name || '-'}
            </div>
          )
        },
        meta: { width: 'w-[200px]', sortable: true },
      },
      {
        accessorKey: 'recruitment_request_name',
        header: 'Đề nghị tuyển dụng',
        meta: { width: 'w-[200px]' },
      },
      {
        accessorKey: 'recruitment_source_name',
        header: 'Nguồn',
        meta: { width: 'w-[180px]' },
      },
      {
        accessorKey: 'recruitment_channel_name',
        header: 'Kênh',
        meta: { width: 'w-[140px]' },
      },
      {
        accessorKey: 'employee_type',
        header: 'Loại nhân viên',
        cell: ({ getValue }) => {
          const value = getValue() as string | null | undefined
          const text = value ? employeeTypeMapping[value] || value : '-'
          return (
            <span className="text-content-dark-1 block text-sm" title={text}>
              {text}
            </span>
          )
        },
        meta: { width: 'w-[180px]' },
      },
      {
        accessorKey: 'is_employee_created',
        header: 'Đã chuyển NV',
        cell: ({ getValue }) => {
          const val = getValue() as boolean | undefined
          const isCreated = val === true
          return (
            <Chip
              label={isCreated ? 'Đã chuyển' : 'Chưa chuyển'}
              variant={isCreated ? ColoredValueVariant.GREEN : ColoredValueVariant.RED}
              size="small"
            />
          )
        },
        meta: { width: 'w-[140px]' },
      },
      {
        accessorKey: 'branch',
        header: 'Chi nhánh',
        cell: ({ getValue }) => {
          const branch = getValue() as RecruitmentCandidateWithExtras['branch']
          const text = branch?.name?.trim() || '-'
          return (
            <span className="text-content-dark-1 block text-sm" title={text}>
              {text}
            </span>
          )
        },
        meta: { width: 'w-[160px]' },
      },
      {
        accessorKey: 'department',
        header: 'Phòng ban',
        cell: ({ getValue }) => {
          const department = getValue() as RecruitmentCandidateWithExtras['department']
          const text = department?.name?.trim() || '-'
          return (
            <span className="text-content-dark-1 block text-sm" title={text}>
              {text}
            </span>
          )
        },
        meta: { width: 'w-[160px]' },
      },
      {
        accessorKey: 'contact_person.fullname',
        header: 'Người liên hệ',
        cell: ({ getValue }) => {
          const text =
            (getValue() as RecruitmentCandidateWithExtras['contact_person']['fullname']) || '-'
          return (
            <span className="text-content-dark-1 block text-sm" title={text}>
              {text}
            </span>
          )
        },
        meta: { width: 'w-[180px]' },
      },
      {
        accessorKey: 'referrer_str',
        header: 'Người giới thiệu',
        cell: ({ row }) => {
          const referrerStr = (row.original.referrer_str as string)?.trim()
          const referrer = row.original.referrer
          const text =
            referrerStr ||
            (referrer ? `${referrer.code ?? ''} - ${referrer.fullname ?? ''}`.trim() || '-' : '-')
          return (
            <span className="text-content-dark-1 block text-sm" title={text}>
              {text}
            </span>
          )
        },
        meta: { width: 'w-[180px]' },
      },
      {
        accessorKey: 'phone',
        header: 'SĐT',
        meta: { width: 'w-[120px]' },
      },
      {
        accessorKey: 'submitted_date',
        header: 'Ngày nộp đơn',
        cell: ({ getValue }) => {
          const val = getValue() as RecruitmentCandidateWithExtras['submitted_date']
          const text = val ? formatDate(val) : '-'
          return (
            <span className="text-content-dark-1 block text-sm" title={text}>
              {text}
            </span>
          )
        },
        meta: { width: 'w-[120px]', sortable: true },
      },
      {
        accessorKey: 'onboard_date',
        header: 'Ngày nhận việc',
        cell: ({ getValue }) => {
          const val = getValue() as RecruitmentCandidateWithExtras['onboard_date']
          const text = val ? formatDate(val) : '-'
          return (
            <span className="text-content-dark-1 block text-sm" title={text}>
              {text}
            </span>
          )
        },
        meta: { width: 'w-[120px]', sortable: true },
      },
      {
        accessorKey: 'colored_status',
        header: 'Trạng thái',
        cell: ({ getValue }) => {
          const colored = getValue() as { value?: string; variant?: string } | undefined
          if (!colored?.value)
            return <Chip label="-" variant={ColoredValueVariant.GREY} size="small" />

          const statusLabel = statusMapping[colored.value] || colored.value
          return <Chip label={statusLabel} variant={colored.variant as any} size="small" />
        },
        meta: { width: 'w-[160px]', sortable: true },
      },
    ],
    [statusMapping, employeeTypeMapping]
  )

  // Row actions
  const actions: TableAction<RecruitmentCandidateWithExtras>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.RECRUITMENT_CANDIDATE_DETAIL.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
        show: () => ability.can('retrieve', 'recruitment_candidate'),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.RECRUITMENT_CANDIDATE_EDIT.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
        show: () => ability.can('update', 'recruitment_candidate'),
      },
      {
        label: 'Chuyển thành nhân viên',
        icon: <IconArrowsleftright size={16} />,
        onClick: (record) => {
          openConvertDialog(record.id, record.is_return_candidate)
        },
        show: (row) =>
          ability.can('to_employee', 'recruitment_candidate') && !row.is_employee_created,
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        show: (record) =>
          (record?.colored_status?.value || '').toUpperCase() ===
            RecruitmentCandidateStatus.REJECTED && ability.can('destroy', 'recruitment_candidate'),
        onClick: (record) => onDeleteRecruitmentCandidate?.(record),
      },
    ],
    [navigate, onDeleteRecruitmentCandidate, openConvertDialog, ability]
  )

  // Sticky header logic - find scroll container from page level
  useEffect(() => {
    let cleanup: (() => void) | null = null

    const timeoutId = setTimeout(() => {
      const scrollContainer = document.querySelector(
        '[class*="overflow-x-auto"][class*="overflow-y-auto"]'
      ) as HTMLElement
      if (!scrollContainer) return

      const table = scrollContainer.querySelector('table') as HTMLElement
      if (!table) return

      const thead = table.querySelector('thead') as HTMLElement
      if (!thead) return

      const navBar = document.querySelector('[data-name="Header"]') as HTMLElement

      const updateStickyTop = () => {
        if (!scrollContainer || !navBar) return

        const scrollContainerRect = scrollContainer.getBoundingClientRect()
        const navBarRect = navBar.getBoundingClientRect()
        const scrollContainerTop = scrollContainerRect.top
        const navBarBottom = navBarRect.bottom

        let topOffset = 0
        if (scrollContainerTop < navBarBottom) {
          topOffset = Math.max(0, navBarBottom - scrollContainerTop)
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
    return <TableError />
  }

  return (
    <Table
      data={data}
      columns={columns}
      showSTT
      showActions
      rowActions={actions}
      enableSorting
      enablePagination
      manualPagination
      manualSorting
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      onSortingChange={onSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      disableInnerOverflow={true}
      paginationPosition="static"
      className="flex-1"
    />
  )
}

export default RecruitmentCandidateTable
