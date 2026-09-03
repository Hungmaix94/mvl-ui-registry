import { useMemo } from 'react'
import { Flex, Grid } from '@radix-ui/themes'
import { type Contract } from '@/features/contract/services/contract-service'
import { type ContractAppendixList } from '@/features/contract/services/contract-appendix-service'
import { useEmployee } from '@/features/employee/services/employee-service'
import { type ColoredValue } from '@/types/hrm-types'
import { formatCurrencyVND } from '@/utils/common.ts'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { Chip } from '@/components/ui'
import { EmployeeProfileLink } from '@/components/commons'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection.tsx'
import { useContractAppendices } from '@/features/contract/services/contract-appendix-service'
import { Table } from '@/components/ui'
import { ColumnDef } from '@/components/ui'
import { formatDate } from '@/utils/date-utils.ts'
import { CONTRACT_INSURANCE_TYPE_LABELS } from '@/features/contract/manage/_shares/schemas/contract-schema.ts'
import type { ContractInsurance_types } from '@/api/schema.ts'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'

type ContractDetailProps = {
  contract: Contract
}

const ContractDetail = ({ contract }: ContractDetailProps) => {
  const { keysMapOptions, keysMap } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_DURATION_TYPE,
      APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_TAX_CALCULATION_METHOD,
      APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_NET_PERCENTAGE,
      APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS,
      APP_CONSTANT_KEY.HRM.CONTRACT_EMPLOYEE_TYPE_CHOICES,
    ],
  })

  // Nhãn Loại nhân viên dịch từ app-constant (BE colored value trả giá trị thô)
  const employeeTypeLabel = useMemo(() => {
    const raw = contract.employee_type || contract.colored_employee_type?.value
    if (!raw) return '-'
    const map = keysMap.get(APP_CONSTANT_KEY.HRM.CONTRACT_EMPLOYEE_TYPE_CHOICES) || {}
    return map[raw] || raw
  }, [contract.employee_type, contract.colored_employee_type?.value, keysMap])

  // Fetch employee detail for full information
  const { data: employee } = useEmployee(contract.employee?.id || 0)

  // Fetch contract appendices for this contract
  const { data: contractAppendicesData } = useContractAppendices({
    parent_contract: contract.id,
    page_size: 100, // Get all appendices
  })

  const contractAppendices = useMemo(() => {
    return contractAppendicesData?.results || []
  }, [contractAppendicesData])

  // Map enum values to labels
  const durationTypeLabel = useMemo(() => contract.duration_display, [contract.duration_display])

  const taxCalculationMethodLabel = useMemo(() => {
    if (
      !keysMap.has(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_TAX_CALCULATION_METHOD) ||
      !contract.colored_tax_calculation_method.value ||
      !contract.tax_calculation_method
    ) {
      return '-'
    }
    return (
      keysMap.get(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_TAX_CALCULATION_METHOD)[
        contract.colored_tax_calculation_method.value || contract.tax_calculation_method
      ] ||
      contract.colored_tax_calculation_method.value ||
      contract.tax_calculation_method ||
      '-'
    )
  }, [contract.tax_calculation_method, keysMap, contract.colored_tax_calculation_method.value])

  const netPercentageLabel = useMemo(() => {
    if (!contract.net_percentage) {
      return '-'
    }
    if (!keysMapOptions.has(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_NET_PERCENTAGE)) {
      return String(contract.net_percentage)
    }
    const options = keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_NET_PERCENTAGE) || []
    const option = options.find(
      (opt: { value: string; label: string }) => opt.value === String(contract.net_percentage)
    )
    return option?.label || String(contract.net_percentage)
  }, [contract.net_percentage, keysMapOptions])

  const contractHasSocialInsuranceLabel = useMemo(() => {
    return contract.has_social_insurance ? 'Có đóng BHXH' : 'Không đóng BHXH'
  }, [contract.has_social_insurance])

  const insuranceTypesDisplay = useMemo(() => {
    const types = contract.insurance_types
    if (!types || types.length === 0) return '-'
    return types
      .map((t) => CONTRACT_INSURANCE_TYPE_LABELS[t as ContractInsurance_types] ?? t)
      .join(', ')
  }, [contract])

  // Map contract status to label from constants
  const contractStatusLabel = useMemo(() => {
    if (!keysMap.has(APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS)) {
      return contract.colored_status?.value || contract.status || '-'
    }
    const keys = keysMap.get(APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS) || {}
    return keys[contract.colored_status?.value] || keys[contract.status] || '-'
  }, [contract.status, keysMap, contract.colored_status?.value])

  const mapContractStatus = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS),
    [keysMap]
  )

  // Format dates
  const signDate = contract.sign_date ? format(new Date(contract.sign_date), DATE_FORMAT) : '-'
  const effectiveDate = contract.effective_date
    ? format(new Date(contract.effective_date), DATE_FORMAT)
    : '-'
  const expirationDate = contract.expiration_date
    ? format(new Date(contract.expiration_date), DATE_FORMAT)
    : '-'
  const createdDate = contract.created_at ? format(new Date(contract.created_at), DATE_FORMAT) : '-'
  const updatedDate = contract.updated_at ? format(new Date(contract.updated_at), DATE_FORMAT) : '-'

  // Format currency values
  const baseSalary = contract.base_salary
    ? formatCurrencyVND(parseFloat(contract.base_salary))
    : '-'
  const kpiSalary = contract.kpi_salary ? formatCurrencyVND(parseFloat(contract.kpi_salary)) : '-'
  const lunchAllowance = contract.lunch_allowance
    ? formatCurrencyVND(parseFloat(contract.lunch_allowance))
    : '-'
  const phoneAllowance = contract.phone_allowance
    ? formatCurrencyVND(parseFloat(contract.phone_allowance))
    : '-'
  const otherAllowance = contract.other_allowance
    ? formatCurrencyVND(parseFloat(contract.other_allowance))
    : '-'

  // Format duration months
  const durationMonths = contract.duration_months
    ? `${contract.duration_months} tháng`
    : contract.duration_type === 'indefinite'
      ? 'Không xác định thời hạn'
      : '-'

  // Detail row component
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
          <p className="typo-body-lg-regular text-content-dark-1">{value || '-'}</p>
        </div>
      </div>
      {!isLast && <SeparatorHorizontal />}
    </>
  )

  // Contract appendices table columns
  const contractAppendixColumns: ColumnDef<ContractAppendixList>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã phụ lục',
        cell: ({ row }) => (
          <div className="flex items-center">
            <p className="typo-body-base-regular text-content-dark-1">{row.original.code || '-'}</p>
          </div>
        ),
      },
      {
        accessorKey: 'contract_number',
        header: 'Số phụ lục',
      },
      {
        accessorKey: 'sign_date',
        header: 'Ngày ký',
        cell: ({ row }) => (
          <div className="flex items-center">
            <p className="typo-body-base-regular text-content-dark-1">
              {row.original.sign_date ? formatDate(row.original.sign_date) : '-'}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'effective_date',
        header: 'Ngày hiệu lực',
        cell: ({ row }) => (
          <div className="flex items-center">
            <p className="typo-body-base-regular text-content-dark-1">
              {row.original.effective_date ? formatDate(row.original.effective_date) : '-'}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'colored_status',
        header: 'Trạng thái',
        meta: {
          align: 'center',
        },
        cell: ({ getValue }) => {
          const contractStatus = getValue() as ColoredValue
          return (
            <div className="flex w-full items-center justify-center">
              <Chip
                label={mapContractStatus[contractStatus.value]}
                variant={contractStatus.variant}
                size="small"
              />
            </div>
          )
        },
      },
    ],
    [mapContractStatus]
  )

  return (
    <Flex direction="column" gap="6" className="w-full py-6">
      {/* Thông tin nhân viên */}
      <Flex direction="column" gap="4">
        <p className="typo-body-xl-semibold text-content-dark-1">Thông tin nhân viên</p>

        <Flex direction="column" gap="5">
          <Grid columns="2" gap="6">
            {/* Left column */}
            <Flex direction="column" className="pr-6">
              <DetailRow
                label="Tên nhân viên"
                value={
                  <EmployeeProfileLink employeeId={contract.employee?.id}>
                    {contract.employee?.fullname || '-'}
                  </EmployeeProfileLink>
                }
              />
              <DetailRow
                label="Mã nhân viên"
                value={
                  <EmployeeProfileLink employeeId={contract.employee?.id}>
                    {contract.employee?.code || '-'}
                  </EmployeeProfileLink>
                }
              />
              <DetailRow label="CCCD" value={employee?.citizen_id || '-'} />
              <DetailRow label="Địa chỉ thường trú" value={employee?.permanent_address || '-'} />
              <DetailRow
                label="Thông tin tài khoản ngân hàng"
                value={
                  employee?.default_bank_account
                    ? `${employee.default_bank_account.bank?.name || ''} - ${employee.default_bank_account.account_number || ''}`
                    : '-'
                }
                isLast
              />
            </Flex>

            {/* Right column */}
            <Flex direction="column" className="pl-6">
              <DetailRow label="Chức vụ" value={employee?.position?.name || '-'} />
              <DetailRow label="Chi nhánh" value={employee?.branch?.name || '-'} />
              <DetailRow label="Khối" value={employee?.block?.name || '-'} />
              <DetailRow label="Phòng ban" value={employee?.department?.name || '-'} isLast />
            </Flex>
          </Grid>
        </Flex>
      </Flex>

      {/* Separator */}
      <SeparatorHorizontal />

      {/* Thông tin hợp đồng */}
      <Flex direction="column" gap="4">
        <p className="typo-body-xl-semibold text-content-dark-1">Thông tin hợp đồng</p>

        <Flex direction="column" gap="5">
          <Grid columns="2" gap="6">
            {/* Left column */}
            <Flex direction="column" className="pr-6">
              <DetailRow label="Mã hợp đồng" value={contract.code || '-'} />
              <DetailRow label="Số hợp đồng" value={contract.contract_number || '-'} />
              <DetailRow label="Loại hợp đồng" value={contract.contract_type?.name || '-'} />
              <div className="flex w-full items-center gap-5 py-4">
                <p className="typo-body-base-medium text-content-dark-3 w-[168px] shrink-0">
                  Loại nhân viên
                </p>
                <div className="flex-1">
                  <Chip
                    label={employeeTypeLabel}
                    variant={contract.colored_employee_type?.variant}
                    size="small"
                  />
                </div>
              </div>
              <div className="bg-border-1 h-px w-full" />
              <div className="flex w-full items-center gap-5 py-4">
                <p className="typo-body-base-medium text-content-dark-3 w-[168px] shrink-0">
                  Thời hạn hợp đồng
                </p>
                <div className="flex flex-1 items-center gap-2">
                  <Chip
                    label={durationTypeLabel}
                    variant={contract.colored_duration_type.variant}
                    size="small"
                  />
                  {contract.duration_type === 'fixed' && (
                    <p className="typo-body-lg-regular text-content-dark-1">{durationMonths}</p>
                  )}
                </div>
              </div>
              <SeparatorHorizontal />
              <DetailRow
                label="Số ngày nghỉ phép"
                value={contract.annual_leave_days?.toString() || '-'}
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
              <DetailRow label="Mức lương cơ bản" value={baseSalary} />
              <DetailRow label="Mức lương KPI" value={kpiSalary} />
              <div className="flex w-full items-center gap-5 py-4">
                <p className="typo-body-base-medium text-content-dark-3 w-[168px] shrink-0">
                  Cách tính thuế
                </p>
                <div className="flex-1">
                  <Chip
                    label={taxCalculationMethodLabel}
                    variant={contract.colored_tax_calculation_method.variant}
                    size="small"
                  />
                </div>
              </div>
              <SeparatorHorizontal />
              <DetailRow
                label="Phần trăm lương thực nhận trong thời gian thử việc"
                value={netPercentageLabel}
              />
              <div className="flex w-full items-center gap-5 py-4">
                <p className="typo-body-base-medium text-content-dark-3 w-[168px] shrink-0">
                  Bảo hiểm xã hội
                </p>
                <div className="flex-1">
                  <Chip
                    label={contractHasSocialInsuranceLabel}
                    variant={contract.colored_has_social_insurance.variant}
                    size="small"
                  />
                </div>
              </div>
              <SeparatorHorizontal />
              <DetailRow label="Loại bảo hiểm" value={insuranceTypesDisplay} />
              <div className="flex w-full items-center gap-5 py-4">
                <p className="typo-body-base-medium text-content-dark-3 w-[168px] shrink-0">
                  Trạng thái
                </p>
                <div className="flex-1">
                  <Chip
                    label={contractStatusLabel}
                    variant={contract.colored_status.variant}
                    size="small"
                  />
                </div>
              </div>
              <SeparatorHorizontal />
              <DetailRow label="Ghi chú" value={contract.note || '-'} />
              <DetailRow label="Ngày tạo" value={createdDate} />
              <DetailRow label="Ngày cập nhật cuối cùng" value={updatedDate} isLast />
            </Flex>
          </Grid>
        </Flex>
      </Flex>

      {/* Separator */}
      <SeparatorHorizontal />

      {/* File đính kèm */}
      <div className="pb-6">
        <AttachmentSection
          attachments={contract.attachment ? [contract.attachment] : []}
          isRequired={false}
        />
      </div>

      {/* Separator */}
      <SeparatorHorizontal />

      {/* Phụ lục hợp đồng đi kèm */}
      <Flex direction="column" gap="4">
        <p className="typo-body-xl-semibold text-content-dark-1">Phụ lục hợp đồng đi kèm</p>

        {contractAppendices.length > 0 ? (
          <Table
            data={contractAppendices}
            columns={contractAppendixColumns}
            isLoading={false}
            enablePagination={false}
            className={'px-0'}
          />
        ) : (
          <p className="typo-body-lg-regular text-content-dark-3">Không có phụ lục hợp đồng</p>
        )}
      </Flex>
    </Flex>
  )
}

export default ContractDetail
