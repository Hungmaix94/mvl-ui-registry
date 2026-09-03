import { Flex, Text } from '@radix-ui/themes'
import { DetailRow } from '@/components/commons'
import { Chip } from '@/components/ui'
import type { Block } from '@/features/org/services/block-service'
import { useMemo } from 'react'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatDate } from '@/utils/date-utils.ts'

type BlockDetailWrapperProps = {
  block: Block
}

const BlockDetailWrapper = ({ block }: BlockDetailWrapperProps) => {
  const isBusiness = block.block_type === 'business'

  const { keysMap } = useAppConstant({ module: 'hrm', keys: [APP_CONSTANT_KEY.BLOCK.TYPE] })
  const blockTypeLabel = useMemo(() => {
    if (!keysMap.has(APP_CONSTANT_KEY.BLOCK.TYPE)) {
      return isBusiness ? 'Kinh doanh' : 'Hỗ trợ'
    }

    return keysMap.get(APP_CONSTANT_KEY.BLOCK.TYPE)?.[block.block_type] || block.block_type
  }, [block.block_type, keysMap])

  // Format dates
  const createdDate = formatDate(block.created_at)
  const updatedDate = formatDate(block.updated_at)

  return (
    <Flex direction="column" gap="5" px="7" className="py-6">
      {/* Section Title */}
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin chi tiết khối</Text>

      {/* Detail Information */}
      <Flex direction="column" className="bg-background-1">
        <DetailRow label="Tên khối" value={block.name} />
        <DetailRow label="Mã khối" value={block.code} />
        <DetailRow
          label="Loại khối"
          value={
            <Chip
              label={blockTypeLabel}
              variant={isBusiness ? ColoredValueVariant.BLUE : ColoredValueVariant.GREEN}
              size="small"
            />
          }
        />
        <DetailRow label="Chi nhánh" value={block.branch?.name || '-'} />
        <DetailRow
          label="Giám đốc khối"
          value={
            block.director ? (
              <div className="flex flex-col gap-1">
                <span>{block.director.code || '-'}</span>
                <span>{block.director.fullname || '-'}</span>
              </div>
            ) : (
              '-'
            )
          }
        />
        <DetailRow label="Mô tả" value={block.description} />
        <DetailRow label="Ngày tạo" value={createdDate} />
        <DetailRow label="Ngày cập nhật cuối cùng" value={updatedDate} />
      </Flex>
    </Flex>
  )
}

export default BlockDetailWrapper
