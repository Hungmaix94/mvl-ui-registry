import { Flex } from '@radix-ui/themes'
import type { RecruitmentChannel } from '@/features/recruitment/services/recruitment-channel-service'
import { Chip, Text } from '@/components/ui'
import DetailRow from '@/components/commons/DetailRow.tsx'
import { useMemo } from 'react'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { formatDate } from '@/utils/date-utils.ts'

type RecruitmentChannelDetailWrapperProps = {
  channel: RecruitmentChannel
}

const RecruitmentChannelDetail = ({ channel }: RecruitmentChannelDetailWrapperProps) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.RECRUITMENT.CHANNEL.BELONG_TO],
  })
  const getBelongToMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.RECRUITMENT.CHANNEL.BELONG_TO)
      ? keysMap.get(APP_CONSTANT_KEY.RECRUITMENT.CHANNEL.BELONG_TO) || []
      : []
  }, [keysMap])

  // Format dates
  const createdDate = formatDate(channel.created_at)
  const updatedDate = formatDate(channel.updated_at)

  // Get belong_to display label and chip variant using constants
  const belongToLabel = useMemo(() => {
    if (!channel.belong_to) return '-'
    return getBelongToMapping[channel.belong_to] || '-'
  }, [channel.belong_to, getBelongToMapping])

  const belongToVariant = useMemo(() => {
    if (!channel.belong_to) return 'GREY'
    // NOTE: API needs to be consistent with constants || update later
    // Map belong_to values to chip variants
    const variantMapping: Record<string, string> = {
      job_website: 'GREEN',
      marketing: 'BLUE',
      hunt: 'ORANGE',
      school: 'PURPLE',
      other: 'GREY',
    }
    return (variantMapping[channel.belong_to] || 'GREY') as any
  }, [channel.belong_to])

  return (
    <Flex direction="column" gap="5" px="7" className="py-6">
      {/* Section Title */}
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin kênh tuyển dụng</Text>

      {/* Detail Information */}
      <Flex direction="column" className="bg-background-1">
        <DetailRow label="Mã kênh" value={channel.code} />
        <DetailRow label="Tên kênh" value={channel.name} />
        <DetailRow label="Mô tả" value={channel.description} />

        {/* Belong To with Chip */}
        <Flex
          direction="row"
          gap="5"
          align="center"
          py="4"
          className="border-border-1 border-b last:border-b-0"
        >
          <Text className="typo-body-base-medium text-content-dark-3 w-[168px] shrink-0">
            Thuộc
          </Text>
          <div className="flex-1">
            {channel.belong_to ? (
              <Chip label={belongToLabel} variant={belongToVariant} size="small" />
            ) : (
              <Text className="typo-body-lg-regular text-content-dark-1">-</Text>
            )}
          </div>
        </Flex>

        <DetailRow label="Ngày tạo" value={createdDate} />
        <DetailRow label="Ngày cập nhật cuối cùng" value={updatedDate} />
      </Flex>
    </Flex>
  )
}

export default RecruitmentChannelDetail
