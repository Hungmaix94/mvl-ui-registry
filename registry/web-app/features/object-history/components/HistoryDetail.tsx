import { Flex, Text } from '@radix-ui/themes'
import DetailRow from '@/components/commons/DetailRow.tsx'

export type BaseHistoryDetailItem = {
  label: string
  value?: string | number | null
}

type BaseHistoryDetailProps = {
  title?: string
  items: BaseHistoryDetailItem[]
}

const HistoryDetail = ({ title = 'Thông tin chi tiết', items }: BaseHistoryDetailProps) => {
  return (
    <Flex direction="column" gap="5" px="7" className="py-6">
      <Text className="typo-body-xl-semibold text-content-dark-1">{title}</Text>

      <Flex direction="column" gap="3">
        {items.map((item, i) => (
          <DetailRow key={i} label={item.label} value={item.value ?? '-'} />
        ))}
      </Flex>
    </Flex>
  )
}

export default HistoryDetail
