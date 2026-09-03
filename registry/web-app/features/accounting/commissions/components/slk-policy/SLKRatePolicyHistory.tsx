import { Card, Flex, Text } from '@radix-ui/themes'
import { IconClock } from '@/assets/icons'
import { useAuditLogSearch } from '@/services/audit-log-service'
import { formatDate } from '@/utils/date-utils'

export const SLKRatePolicyHistory = () => {
  const {
    data: searchData,
    isLoading,
    error,
  } = useAuditLogSearch({
    object_types: ['LinkedExchangeRevenueRule'],
    page_size: 5, // Just fetch the last 5 logs
  })

  const renderAction = (action?: string | null) => {
    switch (action) {
      case 'CREATE':
        return 'đã tạo mức target'
      case 'UPDATE':
      case 'CHANGE':
        return 'đã cập nhật mức target'
      case 'DELETE':
        return 'đã xóa mức target'
      default:
        return 'đã thay đổi'
    }
  }

  const logs = searchData?.results || []

  return (
    <Card className="border-border-1 rounded-lg border bg-white p-5 shadow-sm">
      <Flex direction="column" gap="4">
        <Flex gap="2" align="center">
          <IconClock className="h-5 w-5 text-neutral-500" />
          <Text className="typo-h6 text-neutral-900">Lịch sử thay đổi quy định</Text>
        </Flex>

        <div className="flex flex-col gap-2 pl-4">
          {isLoading ? (
            <div className="text-sm text-neutral-500">Đang tải lịch sử...</div>
          ) : error ? (
            <div className="text-sm text-red-500">Lỗi tải lịch sử</div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-neutral-500">Chưa có lịch sử thay đổi nào</div>
          ) : (
            logs.map((log) => (
              <div key={log.log_id} className="text-sm text-neutral-600">
                • {formatDate(log.timestamp, 'dd/MM/yyyy HH:mm')} —{' '}
                <b>{log.full_name || log.username || 'System'}</b> {renderAction(log.action)}{' '}
                <b>{log.object_repr}</b>
              </div>
            ))
          )}
        </div>
      </Flex>
    </Card>
  )
}
