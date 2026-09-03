import { useState } from 'react'
import { Table as RadixTable } from '@radix-ui/themes'
import PageTitle from '@/components/ui/page-title/PageTitle'
import { Button } from '@/components/ui/button'
import { LoadingWrapper } from '@/components'
import { IconDownloadsimple } from '@/assets/icons'
import { useAbility } from '@/lib/ability'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import toastService from '@/services/toast-service'
import {
  getCustomerCashFlowService,
  useCustomerCashDetail,
  type CustomerCashFlowParams,
} from '../services/customer-cash-flow-service'

/**
 * Chứng từ đứng sau từng ô của pivot.
 *
 * Không phải màn phụ: một ô tiền không bấm xuống được là con số kế toán phải tin
 * mà không kiểm được — và báo cáo này ra đời chính vì trước đó không kiểm được.
 */

const KIND_LABELS: Record<string, string> = {
  booking_in: 'Thu đặt chỗ',
  deposit_in: 'Thu cọc',
  booking_refund_out: 'Chi hoàn đặt chỗ',
  deposit_refund_out: 'Chi hoàn cọc',
}

const CUSTODY_LABELS: Record<string, string> = {
  mv: 'TK MaiVietLand',
  investor: 'Thẳng CĐT',
  custom: 'TK khác',
  unknown: 'Chưa xác định',
}

type Props = {
  params?: CustomerCashFlowParams
}

export const CustomerCashDetailView = ({ params }: Props) => {
  const ability = useAbility()
  const [isExporting, setIsExporting] = useState(false)
  const { data, isLoading, error } = useCustomerCashDetail(params)

  const canExport = ability.can('get', 'reports.customercashdetail')
  const rows = data?.results ?? []

  const handleExport = async () => {
    if (!params) return
    try {
      setIsExporting(true)
      await getCustomerCashFlowService().exportDetail(params)
    } catch {
      toastService.error('Không xuất được Excel')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Thu - Chi tiền khách: chứng từ chi tiết"
        customActions={
          canExport ? (
            <Button
              variant="secondary-border"
              size="small"
              onClick={handleExport}
              disabled={isExporting || isLoading || !params}
            >
              <span className="flex items-center gap-2">
                <IconDownloadsimple size={16} />
                {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
              </span>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-1 flex-col gap-4 overflow-auto p-6">
        {error ? (
          <div className="border-border-1 bg-content-light-1 flex flex-1 items-center justify-center rounded-md border p-6 text-red-500">
            Có lỗi xảy ra khi tải dữ liệu: {(error as Error)?.message || 'Unknown error'}
          </div>
        ) : (
          <LoadingWrapper isLoading={isLoading} containerHeight={300}>
            <RadixTable.Root size="2" variant="surface">
              <RadixTable.Header>
                <RadixTable.Row>
                  <RadixTable.ColumnHeaderCell>Loại</RadixTable.ColumnHeaderCell>
                  <RadixTable.ColumnHeaderCell>Mã chứng từ</RadixTable.ColumnHeaderCell>
                  <RadixTable.ColumnHeaderCell>Ngày</RadixTable.ColumnHeaderCell>
                  <RadixTable.ColumnHeaderCell>Khách hàng</RadixTable.ColumnHeaderCell>
                  <RadixTable.ColumnHeaderCell>Dự án</RadixTable.ColumnHeaderCell>
                  <RadixTable.ColumnHeaderCell>Chi nhánh</RadixTable.ColumnHeaderCell>
                  <RadixTable.ColumnHeaderCell>Tài khoản nhận</RadixTable.ColumnHeaderCell>
                  <RadixTable.ColumnHeaderCell align="right">Số tiền</RadixTable.ColumnHeaderCell>
                </RadixTable.Row>
              </RadixTable.Header>
              <RadixTable.Body>
                {rows.length === 0 ? (
                  <RadixTable.Row>
                    <RadixTable.Cell colSpan={8}>
                      <p className="text-content-dark-3 py-6 text-center text-sm">
                        Không có chứng từ trong kỳ
                      </p>
                    </RadixTable.Cell>
                  </RadixTable.Row>
                ) : (
                  rows.map((row) => {
                    const amount = Number(row.amount)
                    return (
                      <RadixTable.Row key={`${row.kind}-${row.code}`}>
                        <RadixTable.Cell>{KIND_LABELS[row.kind] ?? row.kind}</RadixTable.Cell>
                        <RadixTable.Cell className="font-medium">{row.code}</RadixTable.Cell>
                        <RadixTable.Cell>{formatDate(row.occurred_on)}</RadixTable.Cell>
                        <RadixTable.Cell>{row.customer}</RadixTable.Cell>
                        <RadixTable.Cell>{row.project}</RadixTable.Cell>
                        <RadixTable.Cell>{row.unit}</RadixTable.Cell>
                        <RadixTable.Cell
                          className={row.custody === 'unknown' ? 'text-amber-700' : ''}
                        >
                          {CUSTODY_LABELS[row.custody] ?? row.custody}
                        </RadixTable.Cell>
                        {/* Chi mang dấu âm — BE trả sẵn để tổng cột cộng thẳng ra dòng tiền ròng. */}
                        <RadixTable.Cell
                          align="right"
                          className={amount < 0 ? 'text-red-600' : undefined}
                        >
                          {formatCurrencyVND(amount)}
                        </RadixTable.Cell>
                      </RadixTable.Row>
                    )
                  })
                )}
              </RadixTable.Body>
            </RadixTable.Root>
          </LoadingWrapper>
        )}
      </div>
    </div>
  )
}

export default CustomerCashDetailView
