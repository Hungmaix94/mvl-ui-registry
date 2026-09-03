import { Flex } from '@radix-ui/themes'
import type { RecruitmentSource } from '@/features/recruitment/services/recruitment-source-service'
import { Text } from '@/components/ui'
import DetailRow from '@/components/commons/DetailRow.tsx'
import { formatDate } from '@/utils/date-utils.ts'

type RecruitmentSourceDetailProps = {
  source: RecruitmentSource
}

const RecruitmentSourceDetail = ({ source }: RecruitmentSourceDetailProps) => {
  // Format dates
  const createdDate = formatDate(source.created_at)
  const updatedDate = formatDate(source.updated_at)

  return (
    <Flex direction="column" gap="5" px="7" className="py-6">
      {/* Section Title */}
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin nguồn tuyển dụng</Text>

      {/* Detail Information */}
      <Flex direction="column" className="bg-background-1">
        <DetailRow label="Mã nguồn" value={source.code} />
        <DetailRow label="Tên nguồn" value={source.name} />
        <DetailRow label="Mô tả" value={source.description} />
        <DetailRow label="Ngày tạo" value={createdDate} />
        <DetailRow label="Ngày cập nhật cuối cùng" value={updatedDate} />
      </Flex>
    </Flex>
  )
}

export default RecruitmentSourceDetail
