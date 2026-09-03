import { useMemo } from 'react'
import { Text, Badge } from '@radix-ui/themes'
import { formatCurrencyVND } from '@/utils/common'
import { ReferenceCode } from '@/components/commons'
import { CompositionLine, SourceRole } from './MonthlySummaryConstants'
import { MonthlyBeneficiaryCommissionSummaryDetail } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { getAdvancePitCredit } from '@/features/accounting/commissions/utils/summary-breakdown'
import { IconButton } from '@/components/ui'
import { IconPencilsimple } from '@/assets/icons'

interface MonthlySummaryGrossCompositionProps {
  record: MonthlyBeneficiaryCommissionSummaryDetail
  compositionLines: CompositionLine[]
  preTaxTotal: number
  netPayable: number
  isPaid: boolean
  onEditHold?: () => void
  onEditAdvance?: () => void
}

export const MonthlySummaryGrossComposition = ({
  record,
  compositionLines,
  preTaxTotal,
  netPayable,
  isPaid,
  onEditHold,
  onEditAdvance,
}: MonthlySummaryGrossCompositionProps) => {
  const sources = useMemo(() => {
    let s: any = record.sources
    if (typeof s === 'string') {
      try {
        s = JSON.parse(s)
      } catch (e) {
        s = undefined
      }
    }
    return s || {}
  }, [record.sources])

  const sourcesCount = compositionLines.filter((c) => c.amount !== 0).length

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* THỰC NHẬN HEADER (Merged from NetPayableBox) */}
      <div className="border-b border-green-100 bg-green-50/40 p-5">
        <div className="flex items-start justify-between">
          <div>
            <Text className="mb-1 block text-xs font-semibold tracking-wider text-green-700">
              THỰC NHẬN KỲ NÀY
            </Text>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-green-600">
                {formatCurrencyVND(netPayable).replace(' ₫', '')}
              </span>
              <span className="mb-1 text-lg font-semibold text-green-600">đ</span>
            </div>
            <Text className="mt-2 block text-sm text-gray-500">
              Tổng HH:{' '}
              <span className="font-medium text-gray-700">{formatCurrencyVND(preTaxTotal)}</span> từ{' '}
              {sourcesCount} nguồn
            </Text>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge color={isPaid ? 'green' : 'gray'} variant="soft" size="2">
              {isPaid ? 'Đã chi' : 'Chưa chi'}
            </Badge>
            {isPaid && <Text className="text-xs text-gray-500">PC-2026-0301</Text>}
          </div>
        </div>
      </div>

      <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3">
        <Text className="text-xs font-semibold tracking-wider text-gray-500">
          CẤU THÀNH TỔNG HH
        </Text>
      </div>
      <div className="flex flex-col">
        {compositionLines.map((line, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between border-b border-gray-100 px-5 py-4"
          >
            <div>
              <div className="flex items-center gap-3">
                <Text className="font-medium text-gray-800">{line.label}</Text>
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                {line.amount !== 0 ? (
                  line.link ? (
                    <>
                      <span>Nguồn:</span>
                      <ReferenceCode code={line.link} />
                    </>
                  ) : line.key === SourceRole.BONUS ? (
                    line.amount > 0 ? (
                      'Thưởng ngoài nghiệp vụ sale — chi cùng kỳ'
                    ) : (
                      'Khấu trừ điều chuyển / phạt / thu hồi'
                    )
                  ) : (
                    ''
                  )
                ) : (
                  'Không có'
                )}
              </div>
            </div>
            <Text
              className={`font-semibold ${line.amount !== 0 ? (line.amount < 0 ? 'text-red-500' : 'text-gray-900') : 'text-gray-300'}`}
            >
              {line.amount !== 0 ? formatCurrencyVND(line.amount) : '0 đ'}
            </Text>
          </div>
        ))}

        <div className="flex items-center justify-between px-5 py-4">
          <div className="ml-1 flex items-center gap-2 border-l-2 border-gray-200 pl-4">
            <Text className="text-sm text-gray-500">↳ Tổng HH ghi nhận</Text>
          </div>
          <Text className="font-bold text-gray-900">{formatCurrencyVND(preTaxTotal)}</Text>
        </div>

        <div className="flex items-center justify-between bg-orange-50/30 px-5 py-3">
          <div className="flex items-center gap-2">
            <Text className="font-medium text-gray-800">Tạm giữ HH</Text>
            {onEditHold && (
              <IconButton
                size="small"
                variant="ghost"
                className="text-action-primary-blue-default hover:bg-action-primary-blue-hover/10 h-6 w-6 min-w-0 p-0"
                onClick={onEditHold}
              >
                <IconPencilsimple className="h-3.5 w-3.5" />
              </IconButton>
            )}
          </div>
          <Text className="font-semibold text-orange-500">
            {Number(record.hold_amount) > 0 ? '-' : ''}
            {formatCurrencyVND(Number(record.hold_amount || 0))}
          </Text>
        </div>

        {/* advance_pit_credit: PIT đã tạm giữ khi chi tạm ứng thưởng CĐT — cộng ngược vào
            thực nhận (thuế đã thu tại nguồn, không khấu trừ lần hai). Đọc qua getAdvancePitCredit
            (cast cục bộ tới khi schema.ts regen). */}
        {getAdvancePitCredit(record) > 0 && (
          <div className="flex items-center justify-between bg-teal-50/30 px-5 py-3">
            <div className="flex flex-col">
              <Text className="font-medium text-gray-800">Hoàn thuế đã khấu trừ khi tạm ứng</Text>
              <Text className="mt-0.5 block text-xs text-gray-400">
                Thuế TNCN đã tạm giữ lúc chi tạm ứng thưởng CĐT — không trừ lần hai
              </Text>
            </div>
            <Text className="font-semibold text-teal-600">
              +{formatCurrencyVND(getAdvancePitCredit(record))}
            </Text>
          </div>
        )}

        <div className="flex items-center justify-between bg-purple-50/30 px-5 py-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Text className="font-medium text-gray-800">Trừ hoàn ứng / tạm ứng</Text>
              {onEditAdvance && (
                <IconButton
                  size="small"
                  variant="ghost"
                  className="text-action-primary-blue-default hover:bg-action-primary-blue-hover/10 h-6 w-6 min-w-0 p-0"
                  onClick={onEditAdvance}
                >
                  <IconPencilsimple className="h-3.5 w-3.5" />
                </IconButton>
              )}
            </div>
            <Text className="mt-0.5 block text-xs text-gray-400">Các khoản đã chi trước</Text>
          </div>
          <Text className="font-semibold text-purple-500">
            {Number(record.recovered_advance_amount) > 0 ? '-' : ''}
            {formatCurrencyVND(Number(record.recovered_advance_amount || 0))}
          </Text>
        </div>

        <div className="flex items-center justify-between bg-gray-50/30 px-5 py-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Text className="font-medium text-gray-800">Thưởng khác — chỉ tính thuế</Text>
              <Badge color="gray" variant="soft" size="1">
                không vào tiền mặt
              </Badge>
            </div>
            <Text className="mt-0.5 block text-xs text-gray-400">
              Đã chi ở nơi khác (vinh danh / Tết…) — chỉ cộng vào cơ sở tính thuế, không cộng tiền
              mặt kỳ này
            </Text>
          </div>
          <Text className="font-semibold text-gray-500 italic">
            {formatCurrencyVND(Number(sources?.bonus?.taxable_only_subtotal || 0))}
          </Text>
        </div>

        <div className="flex items-center justify-between bg-red-50/30 px-5 py-3">
          <div>
            <Text className="font-medium text-gray-800">
              {record.beneficiary_type === 'EMPLOYEE'
                ? 'Thuế TNCN (Lũy tiến)'
                : record.beneficiary_type === 'COLLABORATOR'
                  ? 'Thuế TNCN (10%)'
                  : 'Thuế TNCN'}
            </Text>
            <Text className="mt-0.5 block text-xs text-gray-400">
              {record.beneficiary_type === 'EMPLOYEE'
                ? 'Biểu thuế lũy tiến từng phần'
                : record.beneficiary_type === 'COLLABORATOR'
                  ? 'Khấu trừ 10% tại nguồn'
                  : 'Khấu trừ tại nguồn'}
            </Text>
          </div>
          <Text className="font-semibold text-red-500">
            {Number(record.pit_amount) > 0 ? '-' : ''}
            {formatCurrencyVND(Number(record.pit_amount || 0))}
          </Text>
        </div>

        <div className="flex items-center justify-between border-t-2 border-green-500 bg-green-50/10 px-5 py-5">
          <Text className="font-bold tracking-wide text-gray-900">= THỰC NHẬN</Text>
          <Text className="text-xl font-bold text-green-600">{formatCurrencyVND(netPayable)}</Text>
        </div>
      </div>
    </div>
  )
}
