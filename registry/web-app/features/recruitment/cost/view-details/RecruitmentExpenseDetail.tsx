import { useMemo } from 'react'
import { Flex, Separator } from '@radix-ui/themes'
import type { RecruitmentExpense } from '@/features/recruitment/services/recruitment-expense-service'
import { Chip, Text } from '@/components/ui'
import DetailRow from '@/components/commons/DetailRow.tsx'
import { formatDate } from '@/utils/date-utils.ts'
import { formatCurrencyVND } from '@/utils/common.ts'
import { MONTH_FORMAT } from '@/constants/date-format.ts'
import { cn } from '@/lib/utils.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import { IS_VALID_CHIP } from '@/constants/recruitment-expense-filter.ts'
import { RecruitmentExpensePaymentStatus } from '@/constants/api-schema-aliases'

type RecruitmentExpenseDetailProps = {
  expense: RecruitmentExpense
}

const RecruitmentExpenseDetail = ({ expense }: RecruitmentExpenseDetailProps) => {
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.RECRUITMENT.EXPENSE.RecruitmentExpensePaymentStatus],
  })

  const paymentStatusLabelMap = useMemo(() => {
    const constantsOptions =
      keysMapOptions.get(APP_CONSTANT_KEY.RECRUITMENT.EXPENSE.RecruitmentExpensePaymentStatus) || []
    return new Map(constantsOptions.map((o) => [String(o.value), String(o.label)]))
  }, [keysMapOptions])

  const hasPaymentStatus = !!expense.payment_status

  const paymentStatusLabel = hasPaymentStatus
    ? (paymentStatusLabelMap.get(String(expense.payment_status)) ?? String(expense.payment_status))
    : '-'

  const paymentStatusVariant = useMemo(() => {
    const paymentStatusValue = expense.payment_status
    if (!paymentStatusValue) return ColoredValueVariant.GREY

    const variantMap: Record<string, ColoredValueVariant> = {
      [String(RecruitmentExpensePaymentStatus.EXPECTED)]: ColoredValueVariant.GREY,
      [String(RecruitmentExpensePaymentStatus.PAID)]: ColoredValueVariant.GREEN,
    }

    return variantMap[String(paymentStatusValue)] ?? ColoredValueVariant.GREY
  }, [expense.payment_status])

  const createdDate = formatDate(expense.created_at)
  const updatedDate = formatDate(expense.updated_at)
  const formattedDate = formatDate(expense.date, MONTH_FORMAT)

  return (
    <Flex direction="column" gap="5" px="7" className="py-6">
      {/* Section Title */}
      <Text className="typo-body-xl-semibold text-content-dark-1">
        Thông tin chi phí tuyển dụng
      </Text>

      {/* Detail Information */}
      <Flex direction="column" className="bg-background-1">
        <div className={cn('grid grid-cols-1 gap-5 md:grid-cols-2')}>
          <Flex direction={'column'}>
            <DetailRow label="Thời gian" value={formattedDate} />
            <DetailRow label="Nguồn tuyển dụng" value={expense.recruitment_source?.name} />
            <DetailRow label="Kênh tuyển dụng" value={expense.recruitment_channel?.name} />
            <DetailRow label="Chi nhánh" value={expense.branch?.name} />
            <DetailRow label="Ghi chú" value={expense.note} />
          </Flex>
          <Flex direction={'column'}>
            <DetailRow
              label="Tổng chi phí"
              value={`${formatCurrencyVND(expense.total_cost)} VNĐ`}
              labelClassName={'w-[240px]'}
            />
            <DetailRow
              label="Trạng thái"
              value={
                hasPaymentStatus ? (
                  <Chip label={paymentStatusLabel} variant={paymentStatusVariant} size="small" />
                ) : (
                  '-'
                )
              }
              labelClassName={'w-[240px]'}
            />
            <DetailRow
              label="Hợp lệ"
              value={
                expense.is_valid === null || expense.is_valid === undefined ? (
                  '-'
                ) : (
                  <Chip
                    label={IS_VALID_CHIP[expense.is_valid ? 'true' : 'false'].label}
                    variant={IS_VALID_CHIP[expense.is_valid ? 'true' : 'false'].variant}
                    size="small"
                    type="outlined"
                  />
                )
              }
              labelClassName={'w-[240px]'}
            />
            <DetailRow
              label="Người chi"
              value={expense.payer?.fullname || '-'}
              labelClassName={'w-[240px]'}
            />
            <DetailRow
              label="Hoạt động (nội dung tuyển dụng)"
              value={expense.activity}
              labelClassName={'w-[240px]'}
            />
            <DetailRow label="Ngày tạo" value={createdDate} labelClassName={'w-[240px]'} />
            <DetailRow
              label="Ngày cập nhật cuối cùng"
              value={updatedDate}
              labelClassName={'w-[240px]'}
            />
          </Flex>
        </div>

        <Separator orientation={'horizontal'} className={'!w-full'} />

        {(expense.referee || expense.referrer) && (
          <>
            <Separator orientation={'horizontal'} className={'!w-full'} />

            <Text className={'typo-body-xl-semibold text-content-dark-1 mt-4'}>
              Thông tin ứng viên
            </Text>

            <div className={cn('grid grid-cols-1 gap-5 md:grid-cols-2')}>
              {expense.referee && (
                <Flex direction={'column'}>
                  <DetailRow
                    label="Người được giới thiệu"
                    value={expense.referee.fullname}
                    labelClassName={'!font-bold'}
                  />
                  <DetailRow label="Chi nhánh" value={expense.referee?.branch?.name} />
                  <DetailRow label="Khối" value={expense.referee?.block?.name} />
                  <DetailRow label="Phòng ban" value={expense.referee?.department?.name} />
                </Flex>
              )}
              {expense.referrer && (
                <Flex direction={'column'}>
                  <DetailRow
                    label="Người giới thiệu"
                    value={expense.referrer.fullname}
                    labelClassName={'w-[240px] !font-bold'}
                  />
                  <DetailRow
                    label="Chi nhánh"
                    value={expense.referrer?.branch?.name}
                    labelClassName={'w-[240px]'}
                  />
                  <DetailRow
                    label="Khối"
                    value={expense.referrer?.block?.name}
                    labelClassName={'w-[240px]'}
                  />
                  <DetailRow
                    label="Phòng ban"
                    value={expense.referrer?.department?.name}
                    labelClassName={'w-[240px]'}
                  />
                </Flex>
              )}
            </div>
          </>
        )}
      </Flex>
    </Flex>
  )
}

export default RecruitmentExpenseDetail
