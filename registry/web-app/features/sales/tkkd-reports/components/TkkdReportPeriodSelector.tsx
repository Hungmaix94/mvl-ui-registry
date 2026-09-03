import { Flex } from '@radix-ui/themes'
import { Button } from '@/components/ui/button'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import WeekSelect from '@/features/sales/tkkd-reports/components/WeekSelect'
import { formatWeekRangeText } from '@/utils/date-utils'
import type { TkkdReportFiltersController } from '@/features/sales/tkkd-reports/hooks/useTkkdReportFilters'

type Props = {
  filters: TkkdReportFiltersController
}

/**
 * Primary period axis of the TKKD reports — `month` (accounting period) or `week`.
 * Lives in `PageTitle.toolbarLeftContent` because it is the report's required axis,
 * not an optional filter: the optional ones sit in the filter dialog
 * ([TkkdReportFilterForm]) behind `handleFilter` + `filterBadgeCount`.
 */
export default function TkkdReportPeriodSelector({ filters }: Props) {
  const { periodType, week, periods, activePeriodId, patch } = filters

  return (
    <Flex gap="3" align="center">
      <Flex gap="1" align="center">
        <Button
          type="button"
          variant={periodType === 'month' ? 'primary' : 'secondary-border'}
          size="small"
          onClick={() => patch({ period_type: null })}
        >
          Tháng
        </Button>
        <Button
          type="button"
          variant={periodType === 'week' ? 'primary' : 'secondary-border'}
          size="small"
          onClick={() => patch({ period_type: 'week' })}
        >
          Tuần
        </Button>
      </Flex>

      {periodType === 'month' ? (
        <AccountingPeriodSelect
          periods={periods}
          selectedPeriodId={activePeriodId}
          onSelect={(periodId) => {
            const period = periods.find((p) => p.id === periodId)
            if (period) patch({ year: period.year, month: period.month })
          }}
        />
      ) : (
        // Ô chọn tuần + khoảng Mon–Sun nằm CÙNG một hàng: nếu hiển thị khoảng ở dòng thứ
        // hai (caption) thì hàng toolbar chỉ cao thêm ở chế độ Tuần, làm ô chọn bị đẩy lên
        // lệch hẳn so với cặp nút Tháng/Tuần.
        <Flex gap="2" align="center">
          <div className="w-[180px]">
            <WeekSelect value={week} onChange={(weekStart) => patch({ week: weekStart ?? null })} />
          </div>
          {week && (
            <span className="text-content-dark-3 typo-body-sm-regular whitespace-nowrap">
              {formatWeekRangeText(week)}
            </span>
          )}
        </Flex>
      )}
    </Flex>
  )
}
