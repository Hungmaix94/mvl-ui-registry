import { Flex, Text } from '@radix-ui/themes'
import { DetailRow } from '@/components/commons'
import { Chip } from '@/components/ui'
import type { LibraryCategoryRead } from '@/services/elibrary-service'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatDate } from '@/utils/date-utils.ts'

type CategoryDetailWrapperProps = {
  category: LibraryCategoryRead
}

const CategoryDetailWrapper = ({ category }: CategoryDetailWrapperProps) => {
  const createdDate = formatDate(category.created_at)
  const updatedDate = formatDate(category.updated_at)

  return (
    <Flex direction="column" gap="5" px="7" className="py-6">
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin chi tiết danh mục</Text>

      <Flex direction="column" className="bg-background-1">
        <DetailRow label="Tên danh mục" value={category.name} />
        <DetailRow label="Mô tả" value={category.description || '-'} />
        <DetailRow label="Số lượng tài liệu" value={String(category.files_count)} />
        <DetailRow
          label="Trạng thái hoạt động"
          value={
            <Chip
              label={category.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
              variant={category.is_active ? ColoredValueVariant.GREEN : ColoredValueVariant.RED}
              size="small"
            />
          }
        />
        <DetailRow label="Ngày tạo" value={createdDate} />
        <DetailRow label="Ngày cập nhật cuối cùng" value={updatedDate} />
      </Flex>
    </Flex>
  )
}

export default CategoryDetailWrapper
