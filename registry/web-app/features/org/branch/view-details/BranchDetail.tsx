import { Flex } from '@radix-ui/themes'
import { formatDate } from '@/utils/date-utils.ts'
import type { Branch } from '@/features/org/services/branch-service'
import { Text } from '@/components/ui'
import DetailRow from '@/components/commons/DetailRow.tsx'
import {
  parseLeadershipCsv,
  parseHrContactCsv,
} from '@/features/org/branch/_shares/utils/branchLeadershipHrCsv.ts'
import BranchLeadershipSection from './BranchLeadershipSection.tsx'
import BranchHrContactInfoCsvSection from './BranchHrContactInfoCsvSection.tsx'
import BranchContactInfoSection from './BranchContactInfoSection.tsx'

type BranchDetailWrapperProps = {
  branch: Branch
}

const BranchDetail = ({ branch }: BranchDetailWrapperProps) => {
  // Format dates
  const createdDate = formatDate(branch.created_at)
  const updatedDate = formatDate(branch.updated_at)

  const leadershipRows = parseLeadershipCsv(branch.leadership_info_csv)
  const hrContactRows = parseHrContactCsv(branch.hr_contact_info_csv)

  return (
    <Flex direction="column" gap="5" px="7" className="py-6">
      {/* Section Title */}
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin chi nhánh</Text>

      {/* Detail Information */}
      <Flex direction="column" className="bg-background-1">
        <DetailRow label="Tên chi nhánh" value={branch.name} />
        <DetailRow label="Mã Chi nhánh" value={branch.code} />
        <DetailRow label="Địa chỉ đường phố" value={branch.address} />
        <DetailRow label="Phường/Xã" value={branch.administrative_unit?.name || '-'} />
        <DetailRow label="Tỉnh" value={branch.province?.name || '-'} />
        <DetailRow
          label="Giám đốc chi nhánh"
          value={
            branch.director ? (
              <div className="flex flex-col gap-1">
                <span>{branch.director.code || '-'}</span>
                <span>{branch.director.fullname || '-'}</span>
              </div>
            ) : (
              '-'
            )
          }
        />
        <DetailRow label="Số điện thoại" value={branch.phone} />
        <DetailRow label="Email" value={branch.email} />
        <DetailRow label="Mô tả" value={branch.description || '-'} />
        <DetailRow label="Ngày tạo" value={createdDate} />
        <DetailRow label="Ngày cập nhật cuối cùng" value={updatedDate} />
      </Flex>

      <BranchLeadershipSection rows={leadershipRows} />

      <BranchHrContactInfoCsvSection rows={hrContactRows} />

      <BranchContactInfoSection branchId={branch.id} />
    </Flex>
  )
}

export default BranchDetail
