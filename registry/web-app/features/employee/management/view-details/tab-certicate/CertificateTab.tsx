import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Chip, ColumnDef, TableAction } from '@/components/ui'
import { IconEye } from '@/assets/icons'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { APP_PATH } from '@/routes'
import {
  type EmployeeCertificate,
  useEmployeeCertificates,
} from '@/features/employee/services/employee-certificate-service'
import { ColoredValueVariant } from '@/api/schema.ts'

type CertificateTabProps = {
  employee?: { id: number }
}

const CertificateTab = ({ employee }: CertificateTabProps) => {
  const navigate = useNavigate()

  // Fetch certificates for the specific employee
  const { data: certificatesData, isLoading } = useEmployeeCertificates({
    employee: employee?.id,
  })

  const certificates = useMemo(() => certificatesData?.results || [], [certificatesData?.results])

  // Define table columns matching Figma design
  const columns: ColumnDef<EmployeeCertificate>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        id: 'code',
        header: 'Mã chứng chỉ',
        cell: ({ getValue }) => {
          const value = getValue() as string | undefined
          return (
            <span className="text-content-dark-1 truncate text-sm" title={value || '-'}>
              {value || '-'}
            </span>
          )
        },
        meta: { width: 'w-[150px]', sortable: false },
      },
      {
        accessorKey: 'certificate_name',
        id: 'certificate_name',
        header: 'Tên chứng chỉ',
        cell: ({ row }) => {
          const certificateName = row.original.certificate_name
          const certificateTypeDisplay = row.original.certificate_type_display
          const displayValue = certificateName || certificateTypeDisplay || '-'
          return (
            <span className="text-content-dark-1 text-sm text-wrap" title={displayValue}>
              {displayValue}
            </span>
          )
        },
        meta: { width: 'flex-1', sortable: false },
      },
      {
        accessorKey: 'effective_date',
        id: 'effective_date',
        header: 'Ngày hiệu lực',
        cell: ({ getValue }) => {
          const dateString = getValue() as string | null | undefined
          const formattedDate = dateString ? format(new Date(dateString), DATE_FORMAT) : '-'
          return (
            <span className="text-content-dark-1 text-sm" title={formattedDate}>
              {formattedDate}
            </span>
          )
        },
        meta: { width: 'w-[150px]', sortable: false },
      },
      {
        accessorKey: 'expiry_date',
        id: 'expiry_date',
        header: 'Ngày hết hiệu lực',
        cell: ({ getValue }) => {
          const dateString = getValue() as string | null | undefined
          const formattedDate = dateString ? format(new Date(dateString), DATE_FORMAT) : '-'
          return (
            <span className="text-content-dark-1 text-sm" title={formattedDate}>
              {formattedDate}
            </span>
          )
        },
        meta: { width: 'w-[150px]', sortable: false },
      },
      {
        accessorKey: 'colored_status',
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const colored = row.original.colored_status
          const statusDisplay = row.original.status_display

          if (!colored?.value) {
            return (
              <Chip label="-" variant={ColoredValueVariant.GREY} size="small" type="outlined" />
            )
          }

          return (
            <Chip
              label={statusDisplay || colored.value}
              variant={colored.variant as ColoredValueVariant}
              size="small"
              type="outlined"
            />
          )
        },
        meta: { width: 'w-[150px]', sortable: false, align: 'center' },
      },
    ],
    []
  )

  // Define row actions
  const actions: TableAction<EmployeeCertificate>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) => {
          navigate(APP_PATH.EMPLOYEE_CERTIFICATE_DETAIL.replace(':id', String(record.id)))
        },
      },
    ],
    [navigate]
  )

  return (
    <Table
      data={certificates}
      columns={columns}
      showSTT={false}
      showActions
      rowActions={actions}
      enablePagination
      enableSorting={false}
      isLoading={isLoading}
      className="flex-1 px-0"
    />
  )
}

export default CertificateTab
