import { useMemo } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { format } from 'date-fns'

import { EmployeePreviewBox } from '@/features/sales/components/EmployeePreviewBox'
import { SaleAllocationPreviewBox } from '@/features/sales/components/SaleAllocationPreviewBox'
import { PROJECT_ROLE_OPTIONS } from '@/features/project/sale-allocations/constants/sale-allocation-constants'

import { ColoredValueVariant } from '@/api/schema.ts'
import { STATUS_VARIANTS } from '@/features/project/sale-allocations/hooks/useProductOptions'
import DetailRow from '@/components/commons/DetailRow'
import DisplayField from '@/components/commons/DisplayField'
import Chip from '@/components/ui/chip/Chip'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'

import { formatCurrencyVND } from '@/utils/common'
import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection'
import { useBookings, useDepositContracts, useTransactionSheets } from '@/services/sales-service'
import BookingContractTable from '@/features/project/booking-contract/components/BookingContractTable'
import DepositContractTable from '@/features/project/deposit-contract/components/DepositContractTable'
import { TransactionSheetListTable } from '@/pages/authenticated/sales/transaction-sheets/components/TransactionSheetListTable'

import { components } from '@/api/schema'

type ProductInventoryDetailProps = {
  data: components['schemas']['ProductInventory'] & {
    floor?: string
    created_by?: { fullname?: string }
    updated_by?: { fullname?: string }
    project?: components['schemas']['ProductInventory']['project'] & {
      staff_assignments?: any[]
    }
    files?: { attachments?: any[] }
    attachments?: any[]
  }
}

const ProductInventoryDetail = ({ data }: ProductInventoryDetailProps) => {
  const { data: bookingsData, isLoading: isLoadingBookings } = useBookings(
    { product_inventory: data?.id } as any,
    { enabled: !!data?.id }
  )

  const { data: depositContractsData, isLoading: isLoadingDepositContracts } = useDepositContracts(
    { product_inventory: data?.id } as any,
    { enabled: !!data?.id }
  )

  const { data: transactionSheetsData, isLoading: isLoadingTransactionSheets } =
    useTransactionSheets({ product_inventory: data?.id } as any, { enabled: !!data?.id })

  const { keysMapOptions } = useAppConstant({
    module: 'realestate',
    keys: [
      APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_SOURCE_TYPE_CHOICES,
      APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_PRODUCT_TYPE_CHOICES,
      APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_STATUS_CHOICES,
      APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_CONDITION_CHOICES,
      APP_CONSTANT_KEY.REALESTATE.SALES_ALLOCATION_STAFF_ROLE_CHOICES,
    ],
  })

  // Helper functions
  const getLabel = (key: string, val: string) => {
    const options = keysMapOptions.get(key) || []
    const option = options.find((opt: any) => opt.value === val)
    return option ? option.label : val
  }

  const roleOptions = useMemo(() => {
    const opts = keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.SALES_ALLOCATION_STAFF_ROLE_CHOICES)
    return opts && opts.length > 0 ? opts : PROJECT_ROLE_OPTIONS
  }, [keysMapOptions])

  if (!data) return null

  return (
    <Flex direction="column" gap="5">
      {/* SECTION 1: Thông tin bất động sản */}
      <Flex direction="column" gap="4">
        <Text className="text-content-dark-1 typo-body-xl-semibold">Thông tin bất động sản</Text>

        {/* 1.1 Grid Chính (DetailRow) */}
        <div className="bg-background-1 grid grid-cols-1 gap-x-12 md:grid-cols-2">
          {/* Cột 1 */}
          <div className="divide-border-1 border-border-1 flex flex-col divide-y border-b md:border-b-0">
            <DetailRow
              label="Mã bất động sản"
              value={data.unit_number || '-'} // In Figma it's "Mã thông tin bán hàng" but value is PI... which is Mã SP.
            />
            <DetailRow
              label="Tên sản phẩm"
              value={data.project?.name ? `${data.project.name} - ${data.unit_number}` : '-'}
            />
            <DetailRow
              label="Trạng thái"
              value={
                data.status ? (
                  <Chip
                    label={getLabel(
                      APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_STATUS_CHOICES,
                      data.status
                    )}
                    variant={STATUS_VARIANTS[data.status] || ColoredValueVariant.GREY}
                    size="small"
                  />
                ) : (
                  '-'
                )
              }
            />
            <DetailRow label="Sàn liên kết" value={data.distribution_exchange?.name || '-'} />
            <DetailRow label="Toà" value={data.tower || '-'} />
            <DetailRow label="Tầng" value={data.floor || '-'} hideBottomBorder />
          </div>

          {/* Cột 2 */}
          <div className="divide-border-1 flex flex-col divide-y">
            <DetailRow label="Diện tích" value={data.area ? `${data.area} m²` : '-'} />
            <DetailRow
              label="Đơn giá"
              value={
                data.price_per_sqm
                  ? `${formatCurrencyVND(data.price_per_sqm)}/m²`
                  : data.listed_price &&
                      !Number.isNaN(Number(data.listed_price)) &&
                      data.area &&
                      Number(data.area) > 0
                    ? `${formatCurrencyVND(Number(data.listed_price) / Number(data.area))}/m²`
                    : '-'
              }
            />
            <DetailRow
              label="Giá niêm yết"
              value={data.listed_price ? formatCurrencyVND(data.listed_price) : '-'}
            />
            <DetailRow
              label="Giá tạm tính"
              value={
                data.fee_calculation_price ? formatCurrencyVND(data.fee_calculation_price) : '-'
              }
              hideBottomBorder
            />
          </div>
        </div>

        {/* 1.2 Card Nguồn Nhập (Nằm gọn bên trong Thông tin BĐS theo thiết kế) */}
        <SaleAllocationPreviewBox
          saleAllocationData={data.sales_allocation}
          productType={data.product_type}
          sourceType={data.source_type}
          investorName={data.investor?.name}
          sourceExchangeName={data.source_exchange?.name}
        />

        {/* 1.3 Thông tin Ngày tháng và Ghi chú */}
        <div className="mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <DisplayField label="Người tạo" value={data.created_by?.fullname || '-'} />
            <DisplayField
              label="Ngày tạo"
              value={data.created_at ? format(new Date(data.created_at), 'dd/MM/yyyy') : '-'}
            />
            <DisplayField label="Người cập nhật" value={data.updated_by?.fullname || '-'} />
            <DisplayField
              label="Ngày sửa"
              value={data.updated_at ? format(new Date(data.updated_at), 'dd/MM/yyyy') : '-'}
            />
          </div>
          <DisplayField label="Ghi chú" value={data.note || '-'} />
        </div>
      </Flex>

      <SeparatorHorizontal />

      {/* SECTION 2: Booking liên quan (Figma Placeholder) */}
      <Flex direction="column" gap="4">
        <Text className="text-content-dark-1 typo-body-xl-semibold">Booking liên quan</Text>
        <BookingContractTable
          data={bookingsData?.results || []}
          isLoading={isLoadingBookings}
          className="!px-0 !pb-0"
          paginationPosition="inline"
          showProjectColumn={false}
        />
      </Flex>

      <SeparatorHorizontal />

      {/* SECTION 2b: Hợp đồng đặt cọc liên quan */}
      <Flex direction="column" gap="4">
        <Text className="text-content-dark-1 typo-body-xl-semibold">
          Hợp đồng đặt cọc liên quan
        </Text>
        <DepositContractTable
          data={depositContractsData?.results || []}
          isLoading={isLoadingDepositContracts}
          className="!px-0 !pb-0"
          paginationPosition="inline"
        />
      </Flex>

      <SeparatorHorizontal />

      {/* SECTION 2c: Phiếu thông tin giao dịch */}
      <Flex direction="column" gap="4">
        <Text className="text-content-dark-1 typo-body-xl-semibold">Phiếu thông tin giao dịch</Text>
        <div className="overflow-x-auto">
          <TransactionSheetListTable
            data={transactionSheetsData?.results || []}
            isLoading={isLoadingTransactionSheets}
            className={'px-0'}
          />
        </div>
      </Flex>

      <SeparatorHorizontal />

      {/* SECTION 3: Đầu mối dự án */}
      <Flex direction="column" gap="4">
        <Text className="text-content-dark-1 typo-body-xl-semibold">Đầu mối dự án</Text>
        {data.project?.staff_assignments?.length ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.project.staff_assignments.map((assignment: any, index: number) => {
              const roleLabel =
                roleOptions.find((o) => o.value === assignment.role)?.label || assignment.role
              return (
                <EmployeePreviewBox
                  key={index}
                  employeeData={assignment.employee}
                  title={roleLabel}
                />
              )
            })}
          </div>
        ) : (
          <Text className="text-text-tertiary-default italic">
            Chưa có nhân sự nào được phân công.
          </Text>
        )}
      </Flex>
      <SeparatorHorizontal />

      {/* SECTION 4: Tệp đính kèm */}
      <Flex direction="column" gap="4">
        <AttachmentSection
          attachments={data?.files?.attachments || data?.attachments || []}
          isRequired={false}
        />
      </Flex>
    </Flex>
  )
}

export default ProductInventoryDetail
