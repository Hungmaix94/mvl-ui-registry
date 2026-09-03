import { Flex, Text } from '@radix-ui/themes'
import type { AuditLog } from '@/services/audit-log-service.ts'
import DetailRow from '@/components/commons/DetailRow.tsx'
import { Table, type ColumnDef } from '@/components/ui'
import { DATE_TIME_FULL_FORMAT } from '@/constants/date-format'
import { useMemo } from 'react'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { formatDate } from '@/utils/date-utils.ts'

type UserActionTrackingDetailWrapperProps = {
  auditLog: AuditLog
}

type ChangeTableRow = {
  field: string
  old_value: string | null
  new_value: string | null
}

type ChangeTableData = {
  headers: string[]
  rows: ChangeTableRow[]
}

const isChangeTableData = (data: unknown): data is ChangeTableData => {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>
  return (
    Array.isArray(obj.headers) &&
    Array.isArray(obj.rows) &&
    obj.rows.every(
      (row) =>
        typeof row === 'object' &&
        row !== null &&
        'field' in row &&
        ('old_value' in row || 'new_value' in row)
    )
  )
}

const formatValue = (value: string | null): string => {
  if (value === null || value === undefined) return '-'

  // Try to parse as date (ISO format or similar)
  const dateRegex = /^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}/
  if (typeof value === 'string' && dateRegex.test(value)) {
    try {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        return formatDate(date, DATE_TIME_FULL_FORMAT)
      }
    } catch {
      // If parsing fails, return original value
    }
  }

  return value
}

const UserActionTrackingDetailWrapper = ({ auditLog }: UserActionTrackingDetailWrapperProps) => {
  const { keysMap } = useAppConstant({
    module: 'audit_logging',
    keys: [APP_CONSTANT_KEY.AUDIT_LOG.LOG_ACTION, APP_CONSTANT_KEY.AUDIT_LOG.OBJECT_TYPE],
  })

  const logActionMapping = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.AUDIT_LOG.LOG_ACTION) || {},
    [keysMap]
  )

  const objectTypeMapping = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.AUDIT_LOG.OBJECT_TYPE) || {},
    [keysMap]
  )

  const time = auditLog.timestamp ? formatDate(auditLog.timestamp, DATE_TIME_FULL_FORMAT) : '-'

  const changeMessage = auditLog.change_message
  let parsedChangeMessage: unknown = changeMessage

  // Try to parse if it's a string
  if (typeof changeMessage === 'string') {
    try {
      parsedChangeMessage = JSON.parse(changeMessage)
    } catch {
      // If parsing fails, keep as string
      parsedChangeMessage = changeMessage
    }
  }

  const isTableData = isChangeTableData(parsedChangeMessage)
  const tableData: ChangeTableData | null = isTableData
    ? (parsedChangeMessage as ChangeTableData)
    : null

  const columns: ColumnDef<ChangeTableRow>[] = useMemo(
    () => [
      {
        accessorKey: 'field',
        header: 'Trường',
        meta: {
          width: 'w-48',
          align: 'left',
          headerClassName: '!typo-body-xl',
        },
      },
      {
        accessorKey: 'old_value',
        header: 'Giá trị cũ',
        meta: {
          width: 'w-64',
          align: 'left',
          headerClassName: '!typo-body-xl',
        },
        cell: ({ row }) => {
          return <span className="text-content-dark-2">{formatValue(row.original.old_value)}</span>
        },
      },
      {
        accessorKey: 'new_value',
        header: 'Giá trị mới',
        meta: {
          width: 'w-64',
          align: 'left',
          headerClassName: '!typo-body-xl',
        },
        cell: ({ row }) => {
          return <span className="text-content-dark-2">{formatValue(row.original.new_value)}</span>
        },
      },
    ],
    []
  )

  const changeMessages = useMemo(() => {
    if (!changeMessage) return '-'

    if (tableData) {
      return (
        <div className="w-full">
          <Table<ChangeTableRow>
            data={tableData.rows}
            columns={columns}
            showSTT={false}
            enableSorting={false}
            enablePagination={false}
            enableFiltering={false}
            className="!px-0 !pb-0"
            density="compact"
            emptyMessage="Không có dữ liệu"
          />
        </div>
      )
    }

    // Fallback to original behavior
    if (typeof changeMessage === 'string') {
      return changeMessage
    }

    if (changeMessage && typeof changeMessage === 'object' && 'message' in changeMessage) {
      return changeMessage.message as string
    }

    return JSON.stringify(changeMessage)
  }, [changeMessage, columns])

  return (
    <Flex direction="column" gap="5" px="7" className="py-6">
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin chi nhánh</Text>

      <Flex direction="column" className="bg-background-1">
        <DetailRow label="Mã NV" value={auditLog.employee_code || '-'} />
        <DetailRow
          label="Họ tên người thực hiện"
          value={auditLog.full_name?.trim() || auditLog.username || '-'}
        />
        <DetailRow
          label="Hành động"
          value={logActionMapping[auditLog.action || ''] || auditLog.action || '-'}
        />
        <DetailRow
          label="Đối tượng bị tác động"
          value={objectTypeMapping[auditLog.object_type || ''] || auditLog.object_type || '-'}
        />
        <DetailRow label="Thời gian" value={time} />
        {/* <DetailRow label="URL" value={url} /> */}
        <DetailRow label="IP" value={auditLog.ip_address || '-'} />
        <DetailRow label="User Agent" value={auditLog.user_agent || '-'} />
        <DetailRow
          label="Nội dung thay đổi"
          value={changeMessages}
          isDisplayInlineRow={typeof changeMessages === 'string'}
        />
      </Flex>
    </Flex>
  )
}

export default UserActionTrackingDetailWrapper
