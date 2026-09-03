import { useMemo } from 'react'
import { Flex, Grid } from '@radix-ui/themes'
import { type ContractAppendix } from '@/features/contract/services/contract-appendix-service'
import { useEmployee } from '@/features/employee/services/employee-service'
import { formatCurrencyVND } from '@/utils/common.ts'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { formatDate } from '@/utils/date-utils.ts'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'

type ContractAppendixDetailProps = {
  contractAppendix: ContractAppendix
}

const DetailRow = ({
  label,
  value,
  isLast = false,
}: {
  label: string
  value: string | React.ReactNode | null | undefined
  isLast?: boolean
}) => (
  <>
    <div className="flex w-full items-center gap-5 py-4">
      <p className="typo-body-base-medium text-content-dark-3 w-[168px] shrink-0">{label}</p>
      <div className="flex-1">
        {typeof value === 'string' ? (
          <p className="typo-body-lg-regular text-content-dark-1">{value || '-'}</p>
        ) : (
          value || '-'
        )}
      </div>
    </div>
    {!isLast && <SeparatorHorizontal />}
  </>
)

const ContractAppendixDetail = ({ contractAppendix }: ContractAppendixDetailProps) => {
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS],
  })

  // Fetch employee detail for full information
  const { data: employee } = useEmployee(contractAppendix.employee?.id || 0)

  // Map contract status to label from constants
  const contractStatusLabel = useMemo(() => {
    if (!keysMapOptions.has(APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS)) {
      return contractAppendix.colored_status?.value || contractAppendix.status || '-'
    }
    const options = keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS) || []
    const option = options.find(
      (opt: { value: string; label: string }) => opt.value === contractAppendix.status
    )
    return option?.label || contractAppendix.colored_status?.value || contractAppendix.status || '-'
  }, [contractAppendix.status, contractAppendix.colored_status, keysMapOptions])

  // Get status variant
  const statusVariant = useMemo(() => {
    if (!contractAppendix.colored_status) return ColoredValueVariant.GREY
    return contractAppendix.colored_status.variant === 'RED'
      ? ColoredValueVariant.RED
      : contractAppendix.colored_status.variant === 'GREEN'
        ? ColoredValueVariant.GREEN
        : contractAppendix.colored_status.variant === 'YELLOW'
          ? ColoredValueVariant.YELLOW
          : ColoredValueVariant.GREY
  }, [contractAppendix.colored_status])

  // Format dates
  const signDate = contractAppendix.sign_date
    ? format(new Date(contractAppendix.sign_date), DATE_FORMAT)
    : '-'
  const effectiveDate = contractAppendix.effective_date
    ? format(new Date(contractAppendix.effective_date), DATE_FORMAT)
    : '-'
  const expirationDate = contractAppendix.expiration_date
    ? format(new Date(contractAppendix.expiration_date), DATE_FORMAT)
    : '-'
  const createdDate = formatDate(contractAppendix.created_at)
  const updatedDate = formatDate(contractAppendix.updated_at)

  // Format currency values
  const baseSalary = contractAppendix.base_salary
    ? `${formatCurrencyVND(parseFloat(contractAppendix.base_salary))} VNĐ`
    : '-'
  const kpiSalary = contractAppendix.kpi_salary
    ? `${formatCurrencyVND(parseFloat(contractAppendix.kpi_salary))} VNĐ`
    : '-'
  const lunchAllowance = contractAppendix.lunch_allowance
    ? `${formatCurrencyVND(parseFloat(contractAppendix.lunch_allowance))} VNĐ`
    : '-'
  const phoneAllowance = contractAppendix.phone_allowance
    ? `${formatCurrencyVND(parseFloat(contractAppendix.phone_allowance))} VNĐ`
    : '-'
  const otherAllowance = contractAppendix.other_allowance
    ? `${formatCurrencyVND(parseFloat(contractAppendix.other_allowance))} VNĐ`
    : '-'

  const renderRichText = (htmlContent: string | null | undefined) => {
    if (!htmlContent) return '-'

    return (
      <div
        className="prose prose-sm max-w-none [&_li]:leading-6 [&_p]:mb-2 [&_p]:leading-6 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    )
  }

  return (
    <Flex direction="column" gap="6" className="w-full px-10 py-6">
      {/* Thông tin nhân viên */}
      <Flex direction="column" gap="5">
        <p className="typo-body-xl-semibold text-content-dark-1">Thông tin nhân viên</p>

        <Flex direction="column" gap="5">
          <Grid columns="2" gap="5">
            {/* Left column */}
            <Flex direction="column" className="pr-6">
              <DetailRow label="Tên nhân viên" value={contractAppendix.employee?.fullname || '-'} />
              <DetailRow label="Mã nhân viên" value={contractAppendix.employee?.code || '-'} />
              <DetailRow label="Chức vụ" value={employee?.position?.name || '-'} isLast />
            </Flex>

            {/* Right column */}
            <Flex direction="column" className="pl-6">
              <DetailRow label="Chi nhánh" value={employee?.branch?.name || '-'} />
              <DetailRow label="Khối" value={employee?.block?.name || '-'} />
              <DetailRow label="Phòng ban" value={employee?.department?.name || '-'} isLast />
            </Flex>
          </Grid>
        </Flex>
      </Flex>

      {/* Separator */}
      <SeparatorHorizontal />

      {/* Thông tin phụ lục hợp đồng */}
      <Flex direction="column" gap="5">
        <p className="typo-body-xl-semibold text-content-dark-1">Thông tin phụ lục hợp đồng</p>

        <Flex direction="column" gap="5">
          <Grid columns="2" gap="5">
            {/* Left column */}
            <Flex direction="column" className="pr-6">
              <DetailRow label="Mã phụ lục hợp đồng" value={contractAppendix.code || '-'} />
              <DetailRow
                label="Số hợp đồng tham chiếu"
                value={contractAppendix.parent_contract?.contract_number || '-'}
              />
              <DetailRow
                label="Số phụ lục hợp đồng"
                value={contractAppendix.contract_number || '-'}
              />
              <DetailRow label="Ngày ký" value={signDate} />
              <DetailRow label="Ngày hiệu lực" value={effectiveDate} />
              <DetailRow label="Ngày hết hiệu lực" value={expirationDate} />
              <DetailRow label="Phụ cấp ăn trưa" value={lunchAllowance} />
              <DetailRow label="Phụ cấp điện thoại" value={phoneAllowance} />
              <DetailRow label="Phụ cấp khác" value={otherAllowance} isLast />
            </Flex>

            {/* Right column */}
            <Flex direction="column" className="pl-6">
              <div className="flex w-full items-center gap-5 py-4">
                <p className="typo-body-base-medium text-content-dark-3 w-[168px] shrink-0">
                  Trạng thái
                </p>
                <div className="flex-1">
                  <Chip label={contractStatusLabel} variant={statusVariant} size="small" />
                </div>
              </div>
              <SeparatorHorizontal />
              <DetailRow label="Mức lương cơ bản" value={baseSalary} />
              <DetailRow label="Mức lương KPI" value={kpiSalary} />
              <DetailRow label="Ngày tạo" value={createdDate} />
              <DetailRow label="Ngày cập nhật cuối cùng" value={updatedDate} isLast />
            </Flex>
          </Grid>

          {/* Nội dung thay đổi */}
          <SeparatorHorizontal />
          <div className="flex w-full items-start gap-5 py-4">
            <p className="typo-body-base-medium text-content-dark-3 w-[168px] shrink-0">
              Nội dung thay đổi
            </p>
            <div className="flex-1">{renderRichText(contractAppendix.content)}</div>
          </div>

          {/* Ghi chú */}
          <SeparatorHorizontal />
          <DetailRow label="Ghi chú" value={contractAppendix.note || '-'} isLast />
        </Flex>
      </Flex>
    </Flex>
  )
}

export default ContractAppendixDetail
