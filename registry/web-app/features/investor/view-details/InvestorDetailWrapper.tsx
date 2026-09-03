import { Flex, Text, Separator } from '@radix-ui/themes'
import { DetailRow } from '@/components/commons'
import { Chip } from '@/components/ui'
import type { Investor } from '@/services/realestate-service.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatDate } from '@/utils/date-utils.ts'
import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection.tsx'

type InvestorDetailWrapperProps = {
  investor: Investor
}

const InvestorDetailWrapper = ({ investor }: InvestorDetailWrapperProps) => {
  const createdDate = formatDate(investor.created_at)
  const updatedDate = formatDate(investor.updated_at)

  return (
    <Flex direction="column" gap="5" px="7" className="py-6">
      <Text className="typo-body-xl-semibold text-content-dark-1">
        Thông tin chi tiết chủ đầu tư
      </Text>

      <Flex direction="column" className="bg-background-1">
        <DetailRow label="Mã chủ đầu tư" value={investor.code} />
        <DetailRow label="Tên chủ đầu tư" value={investor.name} />
        <DetailRow label="Người liên hệ" value={investor.contact_person || '-'} />
        <DetailRow label="Số điện thoại" value={investor.phone || '-'} />
        <DetailRow label="Email" value={investor.email || '-'} />
        <DetailRow label="Mã số thuế" value={investor.tax_code || '-'} />
        {/* "Ngày sinh nhật" chỉ ở màn CĐT — hai màn sàn vẫn là "Ngày thành lập". Cùng một cột
            `established_date`. Quyết định nghiệp vụ của user 26/08/2026. */}
        <DetailRow
          label="Ngày sinh nhật"
          value={investor.established_date ? formatDate(investor.established_date) : '-'}
        />
        <DetailRow label="Địa chỉ" value={investor.address || '-'} />
        <DetailRow label="Ghi chú" value={investor.note || '-'} />
        <DetailRow
          label="Trạng thái hoạt động"
          value={
            <Chip
              label={investor.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
              variant={investor.is_active ? ColoredValueVariant.GREEN : ColoredValueVariant.RED}
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
          investor.attachments
            ? investor.attachments.map((file) => ({
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

export default InvestorDetailWrapper
