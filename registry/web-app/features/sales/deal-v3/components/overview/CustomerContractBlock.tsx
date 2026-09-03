import React from 'react'
import { Flex } from '@radix-ui/themes'
import { DisplayFieldRow } from '@/components/commons/DisplayField'
import { ReferenceCode } from '@/components/commons'
import Chip from '@/components/ui/chip/Chip'
import { ColoredValueVariant } from '@/api/schema'
import { formatDate } from '@/utils/date-utils'
import { formatCurrencyVND } from '@/utils/common'
import { DealWorkspaceResponse } from '@/features/sales/deals/services/deal-service'
import { resolveCustomerDisplay } from '@/features/sales/utils/customer-display'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { APP_PATH } from '@/routes/AppRoute.constant'

interface CustomerContractBlockProps {
  workspace: DealWorkspaceResponse
}

export const CustomerContractBlock: React.FC<CustomerContractBlockProps> = ({ workspace }) => {
  const overview = workspace?.overview
  const customerInfo = overview?.customer
  const contractInfo = overview?.deposit_contract

  // Khách doanh nghiệp để trống `full_name` / `id_number` — đọc thẳng hai cột đó thì cả
  // hai ô dưới đây hiện `-` (86eyphhtb). Nhãn cũng phải đổi theo loại khách: doanh nghiệp
  // không có CMND/CCCD, thứ tương đương là mã số thuế.
  const customer = resolveCustomerDisplay(customerInfo)

  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [
      APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.STATUS_CHOICES,
      APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.APPROVAL_STATUS_CHOICES,
    ],
  })

  const translatedStatus = contractInfo?.status
    ? keysMap.get(APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.STATUS_CHOICES)?.[contractInfo.status] ||
      contractInfo.status
    : null

  const translatedApprovalStatus = contractInfo?.approval_status
    ? keysMap.get(APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.APPROVAL_STATUS_CHOICES)?.[
        contractInfo.approval_status
      ] || contractInfo.approval_status
    : null

  return (
    <Flex direction="column" gap="4">
      <div className="flex items-center justify-between">
        <Flex align="baseline" gap="2">
          <h3 className="text-content-dark-1 border-none text-lg font-semibold">
            Khách hàng & Hợp đồng cọc
          </h3>
        </Flex>
      </div>

      <div className="bg-surface-primary-default flex flex-col">
        <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
          {/* Row 1 */}
          <DisplayFieldRow
            label={customer.isBusiness ? 'Tên doanh nghiệp' : 'Tên khách hàng'}
            value={customer.name || '-'}
          />
          <DisplayFieldRow
            label="Mã HĐ cọc (HD02)"
            value={
              <ReferenceCode
                code={contractInfo?.code}
                linkTo={
                  contractInfo?.id
                    ? APP_PATH.DEPOSIT_CONTRACT_DETAIL.replace(':id', String(contractInfo.id))
                    : undefined
                }
              />
            }
          />

          {/* Row 2 */}
          <DisplayFieldRow
            label={customer.isBusiness ? 'Mã số thuế' : 'CMND / CCCD'}
            value={customer.identifyNumber || '-'}
          />
          <DisplayFieldRow
            label="Ngày ký cọc"
            value={
              contractInfo?.contract_date
                ? formatDate(contractInfo.contract_date, 'dd/MM/yyyy')
                : '-'
            }
          />

          {/* Row 3 */}
          <DisplayFieldRow label="Số điện thoại" value={customerInfo?.phone || '-'} />
          <DisplayFieldRow
            label="Trạng thái HD02"
            value={
              translatedStatus ? (
                <div className="flex items-center justify-end gap-1.5">
                  <Chip
                    label={String(translatedStatus)}
                    variant={ColoredValueVariant.GREEN}
                    size="small"
                  />
                </div>
              ) : (
                '-'
              )
            }
          />

          {/* Row 4 */}
          <DisplayFieldRow label="Email" value={customerInfo?.email || '-'} />
          <DisplayFieldRow
            label="Số tiền cọc"
            value={
              contractInfo?.registration_amount
                ? `${formatCurrencyVND(parseFloat(contractInfo.registration_amount))} VNĐ`
                : '-'
            }
          />

          {/* Row 5 — approval workflow status (only when known) */}
          {translatedApprovalStatus && (
            <DisplayFieldRow
              label="Trạng thái duyệt"
              value={
                <div className="flex items-center justify-end gap-1.5">
                  <Chip
                    label={String(translatedApprovalStatus)}
                    variant={ColoredValueVariant.BLUE}
                    size="small"
                  />
                </div>
              }
              className="border-b-0 md:col-span-2"
            />
          )}
        </div>
      </div>
    </Flex>
  )
}
