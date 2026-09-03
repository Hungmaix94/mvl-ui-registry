import { Flex, Text, Grid } from '@radix-ui/themes'
import { DetailRow } from '@/components'

interface AssessmentResultSummaryProps {
  managerScore?: string | null
  managerGrade?: string | null
  managerOpinion?: string | null
  hrmGrade?: string | null
  hrmNote?: string | null
}

export const AssessmentResultSummary = ({
  managerScore,
  managerGrade,
  managerOpinion,
  hrmGrade,
  hrmNote,
}: AssessmentResultSummaryProps) => {
  return (
    <Grid columns="2" gap="5" className="w-full">
      {/* Đánh giá của cấp trên trực tiếp */}
      <Flex direction="column" gap="1" className="pr-10">
        <Text className="text-content-dark-1 typo-body-xl-semibold">
          Đánh giá của cấp trên trực tiếp
        </Text>
        <Flex direction="column" className="w-full">
          <DetailRow label="Kết quả đánh giá" value={managerScore} />
          <DetailRow label="Xếp loại" value={managerGrade} />
          <DetailRow label="Ý kiến" value={managerOpinion} />
        </Flex>
      </Flex>

      {/* Đánh giá của phòng nhân sự */}
      <Flex direction="column" gap="1" className="pl-5">
        <Text className="text-content-dark-1 typo-body-xl-semibold">
          Đánh giá của phòng nhân sự
        </Text>
        <Flex direction="column" className="w-full">
          <DetailRow label="Xếp loại KPI" value={hrmGrade} />
          <DetailRow label="Ghi chú" value={hrmNote} />
        </Flex>
      </Flex>
    </Grid>
  )
}
