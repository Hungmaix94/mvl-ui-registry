import { Flex, Text, Separator } from '@radix-ui/themes'
import { DetailRow } from '@/components/commons'
import { Chip } from '@/components/ui'
import type { Exchange } from '@/services/realestate-service.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatDate } from '@/utils/date-utils.ts'
import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection.tsx'

type ExchangeDetailWrapperProps = {
  exchange: Exchange
}

const ExchangeDetailWrapper = ({ exchange }: ExchangeDetailWrapperProps) => {
  const createdDate = formatDate(exchange.created_at)
  const updatedDate = formatDate(exchange.updated_at)

  return (
    <Flex direction="column" gap="5" px="7" className="py-6">
      <Text className="typo-body-xl-semibold text-content-dark-1">
        Thông tin chi tiết sàn giao dịch
      </Text>

      <Flex direction="column" className="bg-background-1">
        <DetailRow label="Mã sàn" value={exchange.code} />
        <DetailRow label="Tên sàn" value={exchange.name} />
        <DetailRow label="Người liên hệ" value={exchange.contact_person || '-'} />
        <DetailRow label="Số điện thoại" value={exchange.phone || '-'} />
        <DetailRow label="Email" value={exchange.email || '-'} />
        <DetailRow label="Mã số thuế" value={exchange.tax_code || '-'} />
        <DetailRow
          label="Ngày thành lập"
          value={exchange.established_date ? formatDate(exchange.established_date) : '-'}
        />
        <DetailRow label="Địa chỉ" value={exchange.address || '-'} />
        <DetailRow label="Ghi chú" value={exchange.note || '-'} />
        <DetailRow
          label="Trạng thái hoạt động"
          value={
            <Chip
              label={exchange.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
              variant={exchange.is_active ? ColoredValueVariant.GREEN : ColoredValueVariant.RED}
              size="small"
            />
          }
        />
        <DetailRow label="Ngày tạo" value={createdDate} />
        <DetailRow label="Ngày cập nhật cuối cùng" value={updatedDate} />
      </Flex>

      <Separator orientation="horizontal" className="!w-full" />

      <AttachmentSection
        attachments={
          exchange.attachments
            ? exchange.attachments.map((file: Exchange['attachments'][0]) => ({
                id: file.id,
                file_name: file.file_name,
                file_path: file.file_path,
                size: file.size,
                download_url: file.download_url,
              }))
            : []
        }
        isRequired={false}
      />
    </Flex>
  )
}

export default ExchangeDetailWrapper
