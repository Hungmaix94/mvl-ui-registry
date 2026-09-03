import HistoryDetail from '@/features/object-history/components/HistoryDetail.tsx'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { Flex, Text } from '@radix-ui/themes'
import { Table } from '@/components/ui'
import type { ColumnDef } from '@tanstack/react-table'

type HistoryDetailProps = {
  historyDetail: Record<string, any>
  objectName?: (objectName?: string | null) => void
}

const BaseHistoryDetailWrapper = ({ historyDetail, objectName }: HistoryDetailProps) => {
  const items = [
    { label: 'Mã NV', value: historyDetail.employee_code ?? '-' },
    {
      label: 'Người thực hiện',
      value: historyDetail.full_name?.trim() || historyDetail.username || '-',
    },
    { label: 'Hành động', value: historyDetail.action },
    { label: 'Loại đối tượng', value: historyDetail.object_type },
    { label: 'Đối tượng bị tác động', value: historyDetail.object_name },
    {
      label: 'Thời gian',
      value: historyDetail.timestamp ? formatDateToApi(new Date(historyDetail.timestamp)) : '-',
    },
  ]

  if (objectName) {
    objectName(historyDetail.object_name ?? null)
  }

  const changeMsg = historyDetail.change_message
  if (changeMsg && typeof changeMsg === 'object' && 'message' in changeMsg) {
    items.push({ label: 'Nội dung thay đổi', value: changeMsg.message })
  }

  const renderChangeMessage = () => {
    if (!historyDetail.change_message) return null

    const changeMsg = historyDetail.change_message

    if (typeof changeMsg === 'object' && 'headers' in changeMsg && 'rows' in changeMsg) {
      type ChangeRow = Record<string, string | string[]>
      const data: ChangeRow[] = changeMsg.rows
      const columns: ColumnDef<ChangeRow>[] = changeMsg.headers.map((header: string) => ({
        accessorKey: header,
        header,
        cell: (info: any) => {
          const value = info.getValue() as string | string[] | undefined
          if (Array.isArray(value)) return value.join(', ')
          return value || '-'
        },
        meta: {
          align: 'left',
          cellClassName: 'px-4 py-2 typo-body-base text-content-dark-2',
          headerClassName: 'px-4 py-2 typo-body-base-semibold text-content-dark-1',
        },
      }))

      return (
        <Flex direction="column" gap="3" px="7" className="pb-6">
          <Text className="typo-body-xl-semibold text-content-dark-1">Nội dung thay đổi</Text>
          <Table
            data={data}
            columns={columns}
            enablePagination={false}
            showSTT={false}
            density="spacious"
            className="px-0"
          />
        </Flex>
      )
    }

    return null
  }

  return (
    <>
      <HistoryDetail items={items} />
      {renderChangeMessage()}
    </>
  )
}

export default BaseHistoryDetailWrapper
