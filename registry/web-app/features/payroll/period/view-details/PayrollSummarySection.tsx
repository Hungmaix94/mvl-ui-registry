import { Flex, Text } from '@radix-ui/themes'
import { DetailRow } from '@/components'

interface PayrollSummarySectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  title: string
}

const PayrollSummarySection = ({ data, title }: PayrollSummarySectionProps) => {
  return (
    <Flex direction="column" gap="1">
      <Text className="typo-body-xl-semibold text-content-dark-1 mb-3">{title}</Text>
      <div className="flex flex-col">
        <DetailRow label="Số bản ghi" value={data.total_records} />
        <DetailRow label="Số nhân sự cần truy thu" value={data.arrears_count} />
        <DetailRow label="Số nhân sự bị xử phạt" value={data.penalty_count} />
        <DetailRow label="Số nhân sự đã nộp phạt" value={data.paid_penalty_count} />
        <DetailRow label="Số nhân sự có công tác phí" value={data.travel_expense_count} />
        <DetailRow label="Số nhân sự đã được gửi mail" value={data.emailed_count} />
      </div>
    </Flex>
  )
}

export default PayrollSummarySection
