import { Flex } from '@radix-ui/themes'
import { Text, Chip } from '@/components/ui'
import DetailRow from '@/components/commons/DetailRow.tsx'
import { formatCurrencyVND } from '@/utils/common.ts'
import type { RecoveryVoucher } from '@/features/payroll/services/recovery-voucher-service'
import useReceveryVoucherOptions from '@/features/payroll/recovery-voucher/_shares/hooks/useReceveryVoucherOptions.ts'
import {
  getStatusVariant,
  getVoucherTypeVariant,
} from '@/features/payroll/recovery-voucher/_shares/utils/recovery-voucher-colors.ts'

const RecoveryVoucherDetail = ({ voucher }: { voucher: RecoveryVoucher }) => {
  const { voucherType: voucherTypeOptions, statusOptions } = useReceveryVoucherOptions()
  const employeeName = voucher.employee?.fullname + ' - ' + voucher.employee?.code || '-'

  // Build label lookup from options
  const voucherTypeLabel =
    voucherTypeOptions.find((opt) => opt.value === voucher.voucher_type)?.label ||
    voucher.voucher_type ||
    '-'

  const statusLabel =
    statusOptions.find((opt) => opt.value === voucher.status)?.label || voucher.status || '-'

  return (
    <Flex direction="column" gap="5" px="7" className="py-6">
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin phiếu</Text>

      <Flex direction="column" className="bg-background-1">
        <DetailRow label="Mã" value={voucher.code} />
        <DetailRow label="Tên phiếu" value={voucher.name} />
        <DetailRow
          label="Loại phiếu"
          value={
            voucher.voucher_type ? (
              <Chip
                label={voucherTypeLabel}
                variant={getVoucherTypeVariant(voucher.voucher_type)}
                size="small"
              />
            ) : (
              '-'
            )
          }
        />
        <DetailRow label="Nhân viên" value={employeeName} />
        <DetailRow
          label="Số tiền"
          value={voucher.amount ? formatCurrencyVND(voucher.amount) : '-'}
        />
        <DetailRow label="Kỳ tính lương" value={voucher.month} />
        <DetailRow
          label="Trạng thái"
          value={
            voucher.status ? (
              <Chip label={statusLabel} variant={getStatusVariant(voucher.status)} size="small" />
            ) : (
              '-'
            )
          }
        />
        <DetailRow label="Ghi chú" value={voucher.note} />
      </Flex>
    </Flex>
  )
}

export default RecoveryVoucherDetail
