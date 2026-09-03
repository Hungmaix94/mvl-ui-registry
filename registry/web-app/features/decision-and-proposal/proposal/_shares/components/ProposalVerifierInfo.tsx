import { Chip, ColumnDef, Table } from '@/components/ui'
import { type Employee } from '@/features/employee/services/employee-service'
import { type ColoredValue } from '@/types/hrm-types'
import { type ProposalVerifier } from '@/features/decision-and-proposal/services/proposal-base-service'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { useMemo } from 'react'
import { Flex } from '@radix-ui/themes'

const ProposalVerifierInfo = ({
  proposalVerifiers,
}: {
  proposalVerifiers: Array<ProposalVerifier> | unknown[]
}) => {
  const verifiers = useMemo(() => proposalVerifiers as ProposalVerifier[], [proposalVerifiers])

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS],
  })

  const statusMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS) as Record<string, string>) || {}
      : {}
  }, [keysMap])

  // Define columns
  const columns: ColumnDef<ProposalVerifier>[] = useMemo(
    () => [
      {
        accessorKey: 'employee.fullname',
        header: 'Họ tên',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return (
            <span className="typo-body-base-regular text-content-dark-1" title={value}>
              {value || '-'}
            </span>
          )
        },
        meta: {
          width: 'flex-1',
        },
      },
      {
        accessorKey: 'employee',
        header: 'Phòng ban',
        cell: ({ getValue }) => {
          const value = getValue() as Employee
          const title = value?.department?.name
            ? `${value?.branch?.name} | ${value?.block?.name} | ${value?.department?.name}`
            : '-'
          return (
            <>
              <Flex
                title={title}
                direction="column"
                gap={'1'}
                className="typo-body-base-regular text-content-dark-1"
              >
                <span>{value?.branch?.name || '-'}</span>
                <span>{value?.block?.name || '-'}</span>
                <span>{value?.department?.name || '-'}</span>
              </Flex>
            </>
          )
        },
        meta: {
          width: 'flex-1',
        },
      },
      {
        accessorKey: 'employee.position',
        header: 'Chức vụ',
        cell: ({ getValue }) => {
          const value = getValue() as Employee['position']
          return (
            <span
              className="typo-body-base-regular text-content-dark-1"
              title={value?.name || undefined}
            >
              {value?.name || '-'}
            </span>
          )
        },
        meta: {
          width: 'flex-1',
        },
      },
      {
        accessorKey: 'verified_time',
        header: 'Thời gian',
        cell: ({ getValue }) => {
          const value = getValue() as string | null
          const formatted = value ? format(new Date(value), DATE_FORMAT) : '-'
          return (
            <span className="typo-body-base-regular text-content-dark-1" title={formatted}>
              {formatted}
            </span>
          )
        },
        meta: {
          width: 'w-[120px]',
          align: 'center',
        },
      },
      {
        accessorKey: 'colored_status',
        header: 'Trạng thái',
        cell: ({ getValue }) => {
          const status = getValue() as ColoredValue
          if (!status) {
            return <span className="typo-body-base-regular text-content-dark-1">-</span>
          }
          return (
            <Chip
              label={statusMapping[status.value] || status.value}
              variant={status.variant}
              size="small"
            />
          )
        },
        meta: {
          width: 'flex-1',
          align: 'center',
        },
      },
      {
        accessorKey: 'note',
        header: 'Ghi chú',
        cell: ({ getValue }) => {
          const value = getValue() as string | null
          if (!value) {
            return <span className="typo-body-base-regular text-content-dark-1">-</span>
          }
          return (
            <span className="typo-body-base-regular text-content-dark-1 leading-relaxed break-words whitespace-normal">
              {value}
            </span>
          )
        },
        meta: {
          width: 'flex-1',
        },
      },
    ],
    [statusMapping]
  )

  if (!verifiers || verifiers.length === 0) {
    return (
      <div className="flex w-full flex-col gap-5">
        <p className="typo-body-xl-semibold text-content-dark-1">Thông tin người xác nhận</p>
        <div className="flex w-full items-center justify-center py-8">
          <span className="text-content-dark-3">Không có thông tin</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <p className="typo-body-xl-semibold text-content-dark-1">Thông tin người xác nhận</p>
      <Table
        data={verifiers}
        columns={columns}
        showSTT={false}
        showActions={false}
        enablePagination={false}
        enableSorting={false}
        className="px-0 pb-4"
      />
    </div>
  )
}

export default ProposalVerifierInfo
