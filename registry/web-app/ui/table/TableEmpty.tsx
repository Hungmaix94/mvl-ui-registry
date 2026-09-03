import { Flex, Text } from '@radix-ui/themes'
interface TableEmptyProps {
  message?: string
  description?: string
}

/**
 * TableEmpty component - displays when table has no data and no filters are applied
 */
function TableEmpty({ message, description = 'Chưa có dữ liệu có sẵn' }: TableEmptyProps) {
  return (
    <Flex direction={'column'} gap={'12px'} align={'center'} justify={'center'} minHeight={'350px'}>
      <Text className={'typo-h4 text-content-dark-1'}>{message}</Text>
      {description && <Text className={'typo-body-lg text-content-dark-2'}>{description}</Text>}
    </Flex>
  )
}

export { TableEmpty }
