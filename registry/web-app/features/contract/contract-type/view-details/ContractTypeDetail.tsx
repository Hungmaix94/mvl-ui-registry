import { useMemo } from 'react'
import { Flex, Grid } from '@radix-ui/themes'
import { type ContractType } from '@/features/contract/services/contract-type-service'
import { formatCurrencyVND } from '@/utils/common.ts'
import { formatFileSize } from '@/features/project/project-documents/helpers'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { IconFile, IconDownloadsimple } from '@/assets/icons'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import { ContractDurationType } from '@/constants/api-schema-aliases'

type ContractTypeDetailProps = {
  contractType: ContractType
}

const ContractTypeDetail = ({ contractType }: ContractTypeDetailProps) => {
  const { keysMapOptions, keysMap } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_DURATION_TYPE,
      APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_TAX_CALCULATION_METHOD,
      APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_WORKING_TIME_TYPE,
      APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_NET_PERCENTAGE,
      APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_EMPLOYEE_TYPE_CHOICES,
    ],
  })

  // Nhãn Loại nhân viên dịch từ app-constant (BE colored value trả giá trị thô)
  const employeeTypeLabel = useMemo(() => {
    const raw = contractType.employee_type || contractType.colored_employee_type?.value
    if (!raw) return '-'
    const map = keysMap.get(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_EMPLOYEE_TYPE_CHOICES) || {}
    return map[raw] || raw
  }, [contractType.employee_type, contractType.colored_employee_type?.value, keysMap])

  // Map enum values to labels
  const durationTypeLabel = useMemo(() => {
    if (!keysMapOptions.has(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_DURATION_TYPE)) {
      return contractType.duration_display || '-'
    }

    if (contractType.duration_type === ContractDurationType.fixed) {
      return `${contractType.duration_display}`
    }

    const options = keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_DURATION_TYPE) || []
    const option = options.find(
      (opt: { value: string; label: string }) => opt.value === contractType.duration_type
    )
    return option?.label || contractType.duration_display || '-'
  }, [contractType.duration_type, contractType.duration_display, keysMapOptions])

  const taxCalculationMethodLabel = useMemo(() => {
    if (!keysMapOptions.has(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_TAX_CALCULATION_METHOD)) {
      return '-'
    }
    const options =
      keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_TAX_CALCULATION_METHOD) || []
    const option = options.find(
      (opt: { value: string; label: string }) => opt.value === contractType.tax_calculation_method
    )
    return option?.label || '-'
  }, [contractType.tax_calculation_method, keysMapOptions])

  const workingTimeTypeLabel = useMemo(() => {
    if (!keysMapOptions.has(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_WORKING_TIME_TYPE)) {
      return '-'
    }
    const options = keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_WORKING_TIME_TYPE) || []
    const option = options.find(
      (opt: { value: string; label: string }) => opt.value === contractType.working_time_type
    )
    return option?.label || '-'
  }, [contractType.working_time_type, keysMapOptions])

  const mapNetPercentageTypeLabel = useMemo(
    () =>
      keysMap.has(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_NET_PERCENTAGE)
        ? keysMap.get(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_NET_PERCENTAGE)
        : {},
    [keysMap]
  )

  // Format dates
  const createdDate = contractType.created_at
    ? format(new Date(contractType.created_at), DATE_FORMAT)
    : '-'
  const updatedDate = contractType.updated_at
    ? format(new Date(contractType.updated_at), DATE_FORMAT)
    : '-'

  // Format currency values
  const baseSalary = contractType.base_salary
    ? formatCurrencyVND(parseFloat(contractType.base_salary))
    : '-'
  const netPercentage = contractType.net_percentage
    ? mapNetPercentageTypeLabel[contractType.net_percentage]
    : '-'
  const lunchAllowance = contractType.lunch_allowance
    ? formatCurrencyVND(parseFloat(contractType.lunch_allowance))
    : '-'
  const phoneAllowance = contractType.phone_allowance
    ? formatCurrencyVND(parseFloat(contractType.phone_allowance))
    : '-'
  const otherAllowance = contractType.other_allowance
    ? formatCurrencyVND(parseFloat(contractType.other_allowance))
    : '-'

  // Render RichText content
  const renderRichText = (htmlContent: string | null | undefined) => {
    if (!htmlContent) return '-'

    return (
      <div
        className="prose prose-sm max-w-none [&_li]:leading-6 [&_p]:mb-2 [&_p]:leading-6 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    )
  }

  // Detail row component
  const DetailRow = ({
    label,
    value,
    isRichText = false,
    isLast = false,
  }: {
    label: string
    value: string | React.ReactNode | null | undefined
    isRichText?: boolean
    isLast?: boolean
  }) => (
    <>
      <div className="flex w-full items-center gap-5 py-4">
        <p className="typo-body-base-medium text-content-dark-3 w-[168px] shrink-0">{label}</p>
        <div className="flex-1">
          {isRichText ? (
            renderRichText(value as string)
          ) : (
            <p className="typo-body-lg-regular text-content-dark-1">{value || '-'}</p>
          )}
        </div>
      </div>
      {!isLast && <SeparatorHorizontal />}
    </>
  )

  // Determine chip variant for tax calculation method
  const getTaxCalculationMethodVariant = (): ColoredValueVariant => {
    return contractType.colored_tax_calculation_method?.variant || ColoredValueVariant.GREY
  }

  // Determine chip variant for social insurance
  const getSocialInsuranceVariant = (): ColoredValueVariant => {
    return contractType.colored_has_social_insurance?.variant || ColoredValueVariant.GREY
  }

  // Variant for intern-evaluation flag (BE does not return a colored_* companion)
  const getInternEvaluationVariant = (): ColoredValueVariant => {
    return contractType.requires_intern_evaluation
      ? ColoredValueVariant.GREEN
      : ColoredValueVariant.GREY
  }

  // Determine chip variant for working time type
  const getWorkingTimeTypeVariant = (): ColoredValueVariant => {
    return contractType.colored_working_time_type?.variant || ColoredValueVariant.GREY
  }

  // Determine chip variant for duration type
  const getDurationTypeVariant = (): ColoredValueVariant => {
    return contractType.colored_duration_type?.variant || ColoredValueVariant.GREY
  }

  // Determine chip variant for employee type
  const getEmployeeTypeVariant = (): ColoredValueVariant => {
    return contractType.colored_employee_type?.variant || ColoredValueVariant.GREY
  }

  const handleDownloadFile = () => {
    if (contractType.template_file?.download_url) {
      window.open(contractType.template_file.download_url, '_blank')
    }
  }

  return (
    <Flex direction="column" gap="9" className="w-full px-10 py-6">
      {/* Thông tin chung */}
      <Flex direction="column" gap="1">
        <p className="typo-body-xl-semibold text-content-dark-1">Thông tin chung</p>

        <Flex direction="column" gap="5" className="mt-5">
          {/* Two column layout */}
          <Grid columns="2" gap="6">
            {/* Left column */}
            <Flex direction="column" className="pr-6">
              <DetailRow label="Mã loại hợp đồng" value={contractType.code} />
              <DetailRow label="Tên loại hợp đồng" value={contractType.name} />
              <DetailRow label="Ký hiệu hợp đồng" value={contractType.symbol || '-'} />
              <DetailRow
                label="Số ngày nghỉ phép"
                value={contractType.annual_leave_days?.toString() || '-'}
              />
              <DetailRow label="Mức lương cơ bản" value={baseSalary} />
              <DetailRow
                label="Phần trăm lương thực nhận trong thời gian thử việc"
                value={netPercentage}
              />
              <DetailRow label="Phụ cấp ăn trưa" value={lunchAllowance} />
              <DetailRow label="Phụ cấp điện thoại" value={phoneAllowance} />
              <DetailRow label="Phụ cấp khác" value={otherAllowance} />
            </Flex>

            {/* Right column */}
            <Flex direction="column" className="pl-6">
              <DetailRow
                label="Cách tính thuế"
                value={
                  <Chip
                    label={taxCalculationMethodLabel}
                    variant={getTaxCalculationMethodVariant()}
                    size="small"
                  />
                }
              />
              <DetailRow
                label="Bảo hiểm xã hội"
                value={
                  <Chip
                    label={contractType.has_social_insurance ? 'Có đóng BHXH' : 'Không đóng BHXH'}
                    variant={getSocialInsuranceVariant()}
                    size="small"
                  />
                }
              />
              <DetailRow
                label="Tự động tạo phiếu đánh giá TTS"
                value={
                  <Chip
                    label={contractType.requires_intern_evaluation ? 'Có' : 'Không'}
                    variant={getInternEvaluationVariant()}
                    size="small"
                  />
                }
              />
              <DetailRow
                label="Thời gian làm việc"
                value={
                  <Chip
                    label={workingTimeTypeLabel}
                    variant={getWorkingTimeTypeVariant()}
                    size="small"
                  />
                }
              />
              <DetailRow
                label="Thời hạn hợp đồng"
                value={
                  <Chip label={durationTypeLabel} variant={getDurationTypeVariant()} size="small" />
                }
              />
              <DetailRow
                label="Loại nhân viên"
                value={
                  <Chip label={employeeTypeLabel} variant={getEmployeeTypeVariant()} size="small" />
                }
              />
              <DetailRow
                label="Đang hoạt động"
                value={
                  <Chip
                    label={contractType.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                    variant={
                      contractType.is_active ? ColoredValueVariant.GREEN : ColoredValueVariant.GREY
                    }
                    size="small"
                  />
                }
              />
              <DetailRow label="Ngày tạo" value={createdDate} />
              <DetailRow label="Ngày cập nhật cuối cùng" value={updatedDate} isLast />
            </Flex>
          </Grid>

          {/* Full width fields */}
          <Flex direction="column" gap="1">
            <DetailRow label="Chế độ làm việc" value={contractType.working_conditions} isRichText />
            <DetailRow
              label="Quyền và nghĩa vụ các bên"
              value={contractType.rights_and_obligations}
              isRichText
            />
            <DetailRow label="Điều khoản" value={contractType.terms} isRichText />
            <DetailRow label="Ghi chú" value={contractType.note || '-'} isLast />
          </Flex>
        </Flex>
      </Flex>

      {/* Separator */}
      <SeparatorHorizontal />

      {/* File mẫu hợp đồng */}
      <Flex direction="column" gap="5">
        <p className="typo-body-xl-semibold text-content-dark-1">File mẫu hợp đồng</p>

        {contractType.template_file ? (
          <Flex gap="2" align="center">
            <Flex gap="4" align="center">
              <div className="bg-data-light-grey-default flex items-center justify-center rounded p-2">
                <IconFile size={20} className="text-content-dark-1" />
              </div>
              <Flex direction="column" gap="0">
                <p className="typo-body-lg-regular text-content-dark-1">
                  {contractType.template_file.file_name || '-'}
                </p>
                <p className="typo-body-sm-regular text-content-dark-2">
                  {formatFileSize(contractType.template_file.size)}
                </p>
              </Flex>
            </Flex>
            <button
              onClick={handleDownloadFile}
              className="flex items-center justify-center p-1 transition-opacity hover:opacity-70"
              title="Tải xuống"
            >
              <IconDownloadsimple size={24} className="text-content-dark-1" />
            </button>
          </Flex>
        ) : (
          <p className="typo-body-lg-regular text-content-dark-3">-</p>
        )}
      </Flex>
    </Flex>
  )
}

export default ContractTypeDetail
