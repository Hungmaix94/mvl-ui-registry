import { Flex, Text } from '@radix-ui/themes'
import { Button } from '../../ui'
import { IconArrowleft } from '../../icons'

interface TableNoDataProps {
  message?: string
  description?: string
  onClearFilter?: () => void
  clearFilterLabel?: string
}

/**
 * TableNoData component - displays when table has no data due to applied filters
 */
function TableNoData({
  message = 'Không tìm thấy dữ liệu',
  description = 'Không có kết quả phù hợp với bộ lọc đã chọn.',
  onClearFilter,
  clearFilterLabel = 'Quay lại danh sách',
}: TableNoDataProps) {
  return (
    <Flex direction={'column'} gap={'20px'} align={'center'} justify={'center'} minHeight={'350px'}>
      <Text className={'typo-h4 text-content-dark-1'}>{message}</Text>
      <Text className={'typo-body-lg text-content-dark-2'}>{description}</Text>
      {onClearFilter && (
        <Button leftIcon={<IconArrowleft />} variant={'primary'} onClick={onClearFilter}>
          {clearFilterLabel}
        </Button>
      )}
    </Flex>
  )
}

export { TableNoData }
