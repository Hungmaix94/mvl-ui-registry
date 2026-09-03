import { useMemo, useCallback, useEffect } from 'react'
import { ColumnDef, Table, TableAction, Chip } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconPencilsimple, IconTrash, IconCopy, IconArrowright } from '@/assets/icons'
import { ColoredValueVariant } from '@/api/schema.ts'
import { useAbility } from '@/lib/ability.ts'
import { useStartWorkingDialog } from '@/features/employee/management/_shares/hooks/useStartWorkingDialog.tsx'
import {
  type Employee,
  useEmployees,
  type GetEmployeesParams,
} from '@/features/employee/services/employee-service'
import { useNationalities } from '@/services/common-service'
import { type ColoredValue } from '@/types/hrm-types'
import { formatDate } from '@/utils/date-utils'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { useColumnConfig } from '@/hooks/useColumnConfig.ts'
import type { ColumnConfig } from '@/types/table.ts'
import { Avatar as RadixAvatar } from '@radix-ui/themes'
import UserAvatar from '@/components/ui/avatar/DefaultAvatar.tsx'
import { EmployeeStatus } from '@/constants/api-schema-aliases'

// Cột "Ngày sinh" mặc định ẩn. Khi điều hướng từ widget sinh nhật ở Dashboard
// (URL có `birthday_month`), ta ép hiện cột này ở vị trí thứ 3.
const BIRTHDAY_COLUMN_ID = 'date_of_birth'
const BIRTHDAY_FORCED_POSITION = 3

type EmployeeTableProps = {
  onDeleteEmployee?: (employee: Employee) => void
  isShowTableColumnConfig?: boolean
  // URL-driven props
  apiParams?: GetEmployeesParams
  currentPage: number
  pageSize: number
  onPaginationChange: (pageIndex: number, pageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onClearFilter?: () => void
  hasFilter?: boolean
  isUrlReady?: boolean
  // Ép hiện cột "Ngày sinh" (dùng khi đến từ widget sinh nhật Dashboard)
  forceBirthdayColumn?: boolean
}

const EmployeeTable = ({
  onDeleteEmployee,
  isShowTableColumnConfig,
  apiParams,
  currentPage,
  pageSize,
  onPaginationChange,
  onSortingChange,
  onClearFilter,
  hasFilter = false,
  isUrlReady = false,
  forceBirthdayColumn = false,
}: EmployeeTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()
  const { openStartWorkingDialog } = useStartWorkingDialog()

  // Fetch employee status constants
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.EMPLOYEE.STATUS,
      APP_CONSTANT_KEY.EMPLOYEE.GENDER,
      APP_CONSTANT_KEY.EMPLOYEE.MARITAL_STATUS,
      APP_CONSTANT_KEY.EMPLOYEE.RESIGNATION_REASON,
      APP_CONSTANT_KEY.HRM.EMPLOYEE_EMPLOYEE_TYPE_CHOICES,
      APP_CONSTANT_KEY.HRM.DOCUMENT_SUBMISSION_STATUS,
    ],
  })

  const statusMap = keysMap.get(APP_CONSTANT_KEY.EMPLOYEE.STATUS) as
    | Record<string, string>
    | undefined
  const genderMap = keysMap.get(APP_CONSTANT_KEY.EMPLOYEE.GENDER) as
    | Record<string, string>
    | undefined
  const maritalStatusMap = keysMap.get(APP_CONSTANT_KEY.EMPLOYEE.MARITAL_STATUS) as
    | Record<string, string>
    | undefined
  const resignationReasonMap = keysMap.get(APP_CONSTANT_KEY.EMPLOYEE.RESIGNATION_REASON) as
    | Record<string, string>
    | undefined
  const employeeTypeMap = keysMap.get(APP_CONSTANT_KEY.HRM.EMPLOYEE_EMPLOYEE_TYPE_CHOICES) as
    | Record<string, string>
    | undefined
  const documentSubmissionStatusMap = keysMap.get(
    APP_CONSTANT_KEY.HRM.DOCUMENT_SUBMISSION_STATUS
  ) as Record<string, string> | undefined

  // Fetch employees data from API with URL-derived params
  const { data: employeesResponse, isLoading, error } = useEmployees(apiParams, isUrlReady)
  const { data: nationalities } = useNationalities()

  const nationalityMap = useMemo(() => {
    if (!nationalities?.length) {
      return {}
    }

    return nationalities.reduce(
      (map, nationality) => {
        if (!nationality) {
          return map
        }

        const id = (nationality as { id?: number | string }).id
        const name = (nationality as { name?: string }).name

        if (id !== undefined && id !== null) {
          map[String(id)] = name ?? ''
        }

        return map
      },
      {} as Record<string, string>
    )
  }, [nationalities])

  // Use API data
  const { employees, totalRecords, pageCount } = useMemo(() => {
    const totalCount = employeesResponse?.count ?? 0
    return {
      employees: employeesResponse?.results || [],
      totalRecords: totalCount,
      pageCount: totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0,
    }
  }, [employeesResponse?.results, employeesResponse?.count, pageSize])

  // Define all columns according to Figma design (33 total columns)
  const allColumnDefs: ColumnDef<Employee>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã nhân viên',
        cell: ({ row, getValue }) => {
          const code = getValue() as string
          const employee = row.original
          const avatarUrl = employee?.avatar?.view_url || undefined

          return (
            <div className="flex items-center gap-2" title={code}>
              <RadixAvatar
                size="2"
                src={avatarUrl}
                fallback={<UserAvatar />}
                radius="full"
                variant="soft"
                className="shrink-0"
              />
              {code || '-'}
            </div>
          )
        },
        meta: {
          width: 'w-[150px]',
          sortable: true,
          align: 'center',
        },
      },
      {
        accessorKey: 'fullname',
        header: 'Họ và tên',
        meta: {
          width: 'w-[207px]',
        },
      },
      {
        accessorKey: 'attendance_code',
        header: 'Mã chấm công',
        meta: {
          width: 'w-[130px]',
        },
      },
      {
        accessorKey: 'colored_status',
        header: 'Trạng thái',
        cell: ({ getValue }) => {
          const coloredStatus = getValue() as ColoredValue
          const statusValue = coloredStatus?.value
          const statusLabel = statusValue ? (statusMap?.[statusValue] ?? statusValue) : '-'

          return <Chip label={statusLabel} variant={coloredStatus.variant} size="small" />
        },
        meta: {
          width: '200px',
        },
      },
      {
        accessorKey: 'colored_document_submission_status',
        header: 'Trạng thái nộp hồ sơ',
        cell: ({ getValue }) => {
          const coloredStatus = getValue() as ColoredValue | null | undefined
          const statusValue = coloredStatus?.value
          if (!statusValue) {
            return <span className="text-content-dark-3 text-sm">-</span>
          }
          const label = documentSubmissionStatusMap?.[statusValue] ?? statusValue
          return <Chip label={label} variant={coloredStatus.variant} size="small" />
        },
        meta: {
          width: 'w-[180px]',
        },
      },
      {
        accessorKey: 'start_date',
        header: 'Ngày bắt đầu',
        cell: ({ getValue }) => formatDate(getValue() as string) ?? '-',
        meta: {
          width: 'w-[130px]',
        },
      },
      {
        accessorKey: 'resignation_reason',
        header: 'Lý do nghỉ việc',
        cell: ({ getValue }) => {
          const resignationValue = getValue() as string | null | undefined
          const label =
            resignationValue && resignationValue !== ''
              ? (resignationReasonMap?.[resignationValue] ?? resignationValue)
              : '-'

          return (
            <span
              className="text-content-dark-1 text-sm break-words"
              title={label !== '-' ? label : undefined}
            >
              {label}
            </span>
          )
        },
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        accessorKey: 'resignation_start_date',
        header: 'Ngày nghỉ việc',
        cell: ({ getValue }) => formatDate(getValue() as string) ?? '-',
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        accessorKey: 'handover_completed',
        header: 'Bàn giao nghỉ việc',
        cell: ({ row, getValue }) => {
          const isResigned = row.original.colored_status?.value === EmployeeStatus.Resigned
          if (!isResigned) {
            return <span className="text-content-dark-3 text-sm">-</span>
          }
          const completed = getValue() as boolean | null | undefined
          return (
            <Chip
              label={completed ? 'Đã hoàn tất' : 'Chưa hoàn tất'}
              variant={completed ? ColoredValueVariant.GREEN : ColoredValueVariant.RED}
              size="small"
            />
          )
        },
        meta: {
          width: 'w-[160px]',
        },
      },
      {
        accessorKey: 'contract_type',
        header: 'Loại hợp đồng',
        cell: ({ getValue }) => {
          const contractType = getValue() as { name?: string } | null | undefined
          const label = contractType?.name ?? '-'
          return (
            <span
              className="text-content-dark-1 text-sm break-words"
              title={label !== '-' ? label : undefined}
            >
              {label}
            </span>
          )
        },
        meta: {
          width: 'w-[130px]',
        },
      },
      {
        accessorKey: 'employee_type',
        header: 'Loại nhân viên',
        cell: ({ getValue }) => {
          const employeeTypeValue = getValue() as string | null | undefined
          const label =
            employeeTypeValue && employeeTypeValue !== ''
              ? (employeeTypeMap?.[employeeTypeValue] ?? employeeTypeValue)
              : '-'
          return (
            <span
              className="text-content-dark-1 text-sm break-words"
              title={label !== '-' ? label : undefined}
            >
              {label}
            </span>
          )
        },
        meta: {
          width: 'w-[130px]',
        },
      },
      {
        accessorKey: 'position',
        header: 'Chức vụ',
        cell: ({ getValue }) => {
          const position = getValue() as any
          return (
            <span className="text-content-dark-1 text-sm break-words" title={position?.name || '-'}>
              {position?.name || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[130px]',
        },
      },
      {
        accessorKey: 'branch',
        header: 'Chi nhánh',
        cell: ({ getValue }) => {
          const branch = getValue() as any
          return (
            <span className="text-content-dark-1 text-sm break-words" title={branch?.name || '-'}>
              {branch?.name || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[130px]',
        },
      },
      {
        accessorKey: 'block',
        header: 'Khối',
        cell: ({ getValue }) => {
          const block = getValue() as any
          return (
            <span className="text-content-dark-1 text-sm break-words" title={block?.name || '-'}>
              {block?.name || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[130px]',
        },
      },
      {
        accessorKey: 'department',
        header: 'Phòng ban',
        cell: ({ getValue }) => {
          const department = getValue() as any
          return (
            <span
              className="text-content-dark-1 text-sm break-words"
              title={department?.name || '-'}
            >
              {department?.name || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[130px]',
        },
      },
      {
        accessorKey: 'phone',
        header: 'Số điện thoại',
        meta: {
          width: 'w-[130px]',
        },
      },
      {
        accessorKey: 'personal_email',
        header: 'Email cá nhân',
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        accessorKey: 'default_bank_account',
        header: 'Tài khoản ngân hàng mặc định',
        cell: ({ getValue }) => {
          const default_bank_account = getValue() as any
          return (
            <span
              className="text-content-dark-1 text-sm break-words"
              title={default_bank_account?.account_number || '-'}
            >
              {default_bank_account?.account_number || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        accessorKey: 'tax_code',
        header: 'Mã số thuế',
        meta: {
          width: 'w-[130px]',
        },
      },
      {
        accessorKey: 'emergency_contact_name',
        header: 'Người liên hệ khẩn cấp',
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        accessorKey: 'emergency_contact_phone',
        header: 'SĐT người liên hệ khẩn cấp',
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        accessorKey: 'gender',
        header: 'Giới tính',
        cell: ({ getValue }) => {
          const genderValue = getValue() as string | null | undefined
          const label =
            genderValue && genderValue !== '' ? (genderMap?.[genderValue] ?? genderValue) : '-'

          return (
            <span
              className="text-content-dark-1 text-sm break-words"
              title={label !== '-' ? label : undefined}
            >
              {label}
            </span>
          )
        },
        meta: {
          width: 'w-[100px]',
        },
      },
      {
        accessorKey: 'date_of_birth',
        header: 'Ngày sinh',
        cell: ({ getValue }) => formatDate(getValue() as string) ?? '-',
        meta: {
          width: 'w-[120px]',
        },
      },
      {
        accessorKey: 'place_of_birth',
        header: 'Nơi sinh',
        meta: {
          width: 'w-[130px]',
        },
      },
      {
        accessorKey: 'marital_status',
        header: 'Tình trạng hôn nhân',
        cell: ({ getValue }) => {
          const maritalStatusValue = getValue() as string | null | undefined
          const label =
            maritalStatusValue && maritalStatusValue !== ''
              ? (maritalStatusMap?.[maritalStatusValue] ?? maritalStatusValue)
              : '-'

          return (
            <span
              className="text-content-dark-1 text-sm break-words"
              title={label !== '-' ? label : undefined}
            >
              {label}
            </span>
          )
        },
        meta: {
          width: 'w-[130px]',
        },
      },
      {
        accessorKey: 'nationality',
        header: 'Quốc tịch',
        cell: ({ getValue }) => {
          const nationalityValue = getValue() as any

          let label = '-'

          if (nationalityValue && typeof nationalityValue === 'object') {
            const name = nationalityValue.name
            const id = nationalityValue.id

            if (name && name.trim().length > 0) {
              label = name
            } else if (id !== undefined && id !== null) {
              label = nationalityMap[String(id)] ?? '-'
            }
          } else if (
            typeof nationalityValue === 'number' ||
            (typeof nationalityValue === 'string' && nationalityValue.trim().length > 0)
          ) {
            label =
              nationalityMap[String(nationalityValue)] ??
              (typeof nationalityValue === 'string' ? nationalityValue : `${nationalityValue}`)
          }

          return (
            <span
              className="text-content-dark-1 text-sm break-words"
              title={label !== '-' ? label : undefined}
            >
              {label}
            </span>
          )
        },
        meta: {
          width: 'w-[120px]',
        },
      },
      {
        accessorKey: 'ethnicity',
        header: 'Dân tộc',
        meta: {
          width: 'w-[120px]',
        },
      },
      {
        accessorKey: 'religion',
        header: 'Tôn giáo',
        meta: {
          width: 'w-[120px]',
        },
      },
      {
        accessorKey: 'citizen_id',
        header: 'Số CCCD/CMND',
        meta: {
          width: 'w-[130px]',
        },
      },
      {
        accessorKey: 'citizen_id_issued_date',
        header: 'Ngày cấp CCCD/CMND',
        cell: ({ getValue }) => formatDate(getValue() as string) ?? '-',
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        accessorKey: 'citizen_id_issued_place',
        header: 'Nơi cấp CCCD/CMND',
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        accessorKey: 'residential_address',
        header: 'Địa chỉ cư trú',
        meta: {
          width: 'w-[200px]',
        },
      },
      {
        accessorKey: 'permanent_address',
        header: 'Địa chỉ thường trú',
        meta: {
          width: 'w-[200px]',
        },
      },
      {
        accessorKey: 'username',
        header: 'Tài khoản đăng nhập',
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        accessorKey: 'recruitment_candidate',
        header: 'Ứng viên liên kết',
        cell: ({ getValue }) => {
          const candidate = getValue() as
            | { id?: number; name?: string; code?: string }
            | null
            | undefined
          const label =
            candidate?.code && candidate?.name ? `${candidate.code} - ${candidate.name}` : '-'
          return (
            <span
              className="text-content-dark-1 text-sm break-words"
              title={label !== '-' ? label : undefined}
            >
              {label}
            </span>
          )
        },
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        id: 'recruitment_candidate_contact_person',
        accessorKey: 'recruitment_candidate',
        header: 'Người liên hệ',
        cell: ({ getValue }) => {
          const label =
            (getValue() as Employee['recruitment_candidate'])?.contact_person?.trim() || '-'
          return (
            <span
              className="text-content-dark-1 text-sm break-words"
              title={label !== '-' ? label : undefined}
            >
              {label}
            </span>
          )
        },
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        id: 'recruitment_candidate_referrer',
        accessorKey: 'recruitment_candidate',
        header: 'Người giới thiệu',
        cell: ({ getValue }) => {
          const label = (getValue() as Employee['recruitment_candidate'])?.referrer?.trim() || '-'
          return (
            <span
              className="text-content-dark-1 text-sm break-words"
              title={label !== '-' ? label : undefined}
            >
              {label}
            </span>
          )
        },
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        id: 'recruitment_source',
        accessorKey: 'recruitment_source_type_display',
        header: 'Nguồn',
        cell: ({ getValue }) => {
          const label = (getValue() as string | null | undefined)?.trim() || '-'
          return (
            <span
              className="text-content-dark-1 text-sm break-words"
              title={label !== '-' ? label : undefined}
            >
              {label}
            </span>
          )
        },
        meta: {
          width: 'w-[120px]',
        },
      },
      {
        accessorKey: 'note',
        header: 'Ghi chú',
        meta: {
          width: 'w-[200px]',
        },
      },
    ],
    [keysMap]
  )

  // Default column configuration (7 visible columns matching current implementation)
  const defaultColumnConfig: ColumnConfig[] = useMemo(
    () => [
      { id: 'code', label: 'Mã nhân viên', visible: true, order: 0 },
      { id: 'fullname', label: 'Họ và tên', visible: true, order: 1 },
      { id: 'position', label: 'Chức vụ', visible: true, order: 2 },
      { id: 'branch', label: 'Chi nhánh', visible: true, order: 3 },
      { id: 'block', label: 'Khối', visible: true, order: 4 },
      { id: 'department', label: 'Phòng ban', visible: true, order: 5 },
      { id: 'colored_status', label: 'Trạng thái', visible: true, order: 6 },
      {
        id: 'colored_document_submission_status',
        label: 'Trạng thái nộp hồ sơ',
        visible: false,
        order: 38,
      },
      { id: 'attendance_code', label: 'Mã chấm công', visible: false, order: 7 },
      { id: 'start_date', label: 'Ngày bắt đầu', visible: false, order: 8 },
      { id: 'resignation_reason', label: 'Lý do nghỉ việc', visible: false, order: 9 },
      { id: 'resignation_start_date', label: 'Ngày nghỉ việc', visible: false, order: 10 },
      { id: 'handover_completed', label: 'Bàn giao nghỉ việc', visible: false, order: 11 },
      { id: 'employee_type', label: 'Loại nhân viên', visible: false, order: 12 },
      { id: 'contract_type', label: 'Loại hợp đồng', visible: false, order: 13 },
      { id: 'phone', label: 'Số điện thoại', visible: false, order: 14 },
      { id: 'personal_email', label: 'Email cá nhân', visible: false, order: 15 },
      { id: 'email', label: 'Email', visible: false, order: 16 },
      {
        id: 'default_bank_account',
        label: 'Tài khoản ngân hàng mặc định',
        visible: false,
        order: 17,
      },
      { id: 'tax_code', label: 'Mã số thuế', visible: false, order: 18 },
      { id: 'emergency_contact_name', label: 'Người liên hệ khẩn cấp', visible: false, order: 19 },
      {
        id: 'emergency_contact_phone',
        label: 'SĐT người liên hệ khẩn cấp',
        visible: false,
        order: 20,
      },
      { id: 'gender', label: 'Giới tính', visible: false, order: 21 },
      { id: 'date_of_birth', label: 'Ngày sinh', visible: false, order: 22 },
      { id: 'place_of_birth', label: 'Nơi sinh', visible: false, order: 23 },
      { id: 'marital_status', label: 'Tình trạng hôn nhân', visible: false, order: 24 },
      { id: 'nationality', label: 'Quốc tịch', visible: false, order: 25 },
      { id: 'ethnicity', label: 'Dân tộc', visible: false, order: 26 },
      { id: 'religion', label: 'Tôn giáo', visible: false, order: 27 },
      { id: 'citizen_id', label: 'Số CCCD/CMND', visible: false, order: 28 },
      { id: 'citizen_id_issued_date', label: 'Ngày cấp CCCD/CMND', visible: false, order: 29 },
      { id: 'citizen_id_issued_place', label: 'Nơi cấp CCCD/CMND', visible: false, order: 30 },
      { id: 'residential_address', label: 'Địa chỉ cư trú', visible: false, order: 31 },
      { id: 'permanent_address', label: 'Địa chỉ thường trú', visible: false, order: 32 },
      { id: 'username', label: 'Tài khoản đăng nhập', visible: false, order: 33 },
      { id: 'recruitment_candidate', label: 'Ứng viên liên kết', visible: false, order: 34 },
      {
        id: 'recruitment_candidate_contact_person',
        label: 'Người liên hệ',
        visible: false,
        order: 35,
      },
      {
        id: 'recruitment_candidate_referrer',
        label: 'Người giới thiệu',
        visible: false,
        order: 36,
      },
      { id: 'note', label: 'Ghi chú', visible: false, order: 37 },
      { id: 'recruitment_source', label: 'Nguồn', visible: false, order: 39 },
    ],
    []
  )

  // Use column configuration hook
  const { columns: columnConfig, handleApply, handleReset } = useColumnConfig(defaultColumnConfig)

  // Override TẠM THỜI: khi đến từ widget sinh nhật mà user chưa bật cột "Ngày sinh",
  // ép hiện nó ở vị trí thứ 3. Không ghi localStorage → cấu hình cột đã lưu của user
  // giữ nguyên, và dialog cấu hình cột vẫn phản ánh config gốc (dùng `columnConfig`).
  const effectiveColumnConfig = useMemo(() => {
    const birthday = columnConfig.find((c) => c.id === BIRTHDAY_COLUMN_ID)
    if (!forceBirthdayColumn || !birthday || birthday.visible) {
      return columnConfig
    }

    const visibleSorted = columnConfig.filter((c) => c.visible).sort((a, b) => a.order - b.order)

    // Chèn vào giữa cột hiển thị thứ 2 và thứ 3 để "Ngày sinh" trở thành cột thứ 3.
    const prevOrder = visibleSorted[BIRTHDAY_FORCED_POSITION - 2]?.order
    const nextOrder = visibleSorted[BIRTHDAY_FORCED_POSITION - 1]?.order
    const forcedOrder =
      prevOrder == null
        ? birthday.order // không đủ cột phía trước → giữ order gốc
        : nextOrder == null
          ? prevOrder + 0.5 // chỉ đủ cột đứng trước → nối tiếp làm cột cuối
          : (prevOrder + nextOrder) / 2 // chèn vào giữa hai cột

    return columnConfig.map((c) =>
      c.id === BIRTHDAY_COLUMN_ID ? { ...c, visible: true, order: forcedOrder } : c
    )
  }, [columnConfig, forceBirthdayColumn])

  // Filter and order columns based on config
  const visibleColumns = useMemo(() => {
    return effectiveColumnConfig
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order)
      .map((c) =>
        allColumnDefs.find((d) => (d as any).id === c.id || (d as any).accessorKey === c.id)
      )
      .filter(Boolean) as ColumnDef<Employee>[]
  }, [effectiveColumnConfig, allColumnDefs])

  // Helper to preserve list URL when navigating
  const getNavigationState = useCallback(() => {
    return {
      from: window.location.pathname + window.location.search,
    }
  }, [])

  // Handle copy employee - navigate to create page with initial data
  const handleCopyEmployee = useCallback(
    (employee: Employee) => {
      navigate(APP_PATH.EMPLOYEE_MANAGEMENT_CREATE, {
        state: {
          copyFrom: employee,
          ...getNavigationState(),
        },
      })
    },
    [navigate, getNavigationState]
  )

  // Handle delete employee with refresh callback
  const handleDeleteEmployee = useCallback(
    (employee: Employee) => {
      onDeleteEmployee?.(employee)
    },
    [onDeleteEmployee]
  )

  // Define row actions
  const actions: TableAction<Employee>[] = useMemo(
    () => [
      // Start working (onboarding only, permission-gated)
      {
        label: 'Bắt đầu làm việc',
        icon: <IconArrowright size={16} />,
        onClick: (record) => openStartWorkingDialog(record),
        show: (record) =>
          ability.can('active', 'employee') &&
          record.colored_status?.value === EmployeeStatus.Onboarding,
      },
      // View detail
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', String(record.id))}`, {
            state: getNavigationState(),
          }),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.EMPLOYEE_MANAGEMENT_EDIT.replace(':id', String(record.id))}`, {
            state: getNavigationState(),
          }),
      },
      {
        label: 'Tạo bản sao',
        icon: <IconCopy size={16} />,
        onClick: (record) => {
          handleCopyEmployee(record)
        },
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          handleDeleteEmployee(record)
        },
      },
    ],
    [
      ability,
      navigate,
      handleCopyEmployee,
      handleDeleteEmployee,
      getNavigationState,
      openStartWorkingDialog,
    ]
  )

  // Handle pagination change - delegate to parent
  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      onPaginationChange(pageIndex, newPageSize)
    },
    [onPaginationChange]
  )

  // Handle sorting change - delegate to parent
  const handleSortingChange = useCallback(
    (field: string, direction: 'asc' | 'desc' | null) => {
      onSortingChange(field, direction)
    },
    [onSortingChange]
  )

  // Sticky header logic - similar to TimesheetTable
  // Find scroll container from page level (it's an ancestor of the table)
  useEffect(() => {
    let cleanup: (() => void) | null = null

    // Use a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      // Find the table element - look for table within overflow container
      // The scroll container at page level will have overflow-x-auto class
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

        // Calculate top offset: header should stick right below navbar
        // When scroll container is at initial position, offset = distance from container top to navbar bottom
        // When scrolling, adjust so header stays below navbar
        let topOffset = 0
        if (scrollContainerTop < navBarBottom) {
          // Scroll container is below or overlapping navbar
          // Offset should be the distance from container top to navbar bottom
          topOffset = Math.max(0, navBarBottom - scrollContainerTop)
        } else {
          // Scroll container is above navbar (scrolled past)
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

      // Store cleanup function
      cleanup = () => {
        scrollContainer.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('resize', updateStickyTop)
      }
    }, 100)

    // Cleanup timeout and event listeners
    return () => {
      clearTimeout(timeoutId)
      if (cleanup) {
        cleanup()
      }
    }
  }, [employees])

  if (error) {
    return <TableError />
  }

  return (
    <Table
      columns={visibleColumns}
      data={employees}
      isLoading={isLoading}
      onSortingChange={handleSortingChange}
      showActions
      rowActions={actions}
      emptyMessage="Không có dữ liệu nhân viên"
      isShowTableColumnConfig={isShowTableColumnConfig}
      columnConfig={columnConfig}
      onColumnConfigApply={handleApply}
      onColumnConfigReset={handleReset}
      showSTT
      sttFrozen
      enableSorting
      manualSorting
      enablePagination
      manualPagination
      disableInnerOverflow={true}
      pageCount={pageCount}
      pageSize={pageSize}
      totalRecords={totalRecords}
      currentPageIndex={currentPage - 1}
      onPaginationChange={handlePaginationChange}
      onClearFilter={onClearFilter}
      hasFilter={hasFilter}
      paginationPosition="static"
    />
  )
}

export default EmployeeTable
