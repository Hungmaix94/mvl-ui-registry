import { Flex } from '@radix-ui/themes'
import { IconCaretright } from '@/assets/icons'
import { cn } from '@/lib/utils.ts'
import Button from '@/components/ui/button/Button.tsx'

type ManagerDashboardCardColor = 'purple' | 'orange' | 'blue' | 'green' | 'red' | 'yellow' | 'irish'

const COUNT_COLOR_CLASS: Record<ManagerDashboardCardColor, string> = {
  purple: 'text-[var(--color-data-purple-default)]',
  orange: 'text-[var(--color-data-orange-default)]',
  blue: 'text-[var(--color-data-blue-default)]',
  green: 'text-[var(--color-data-green-default)]',
  red: 'text-[var(--color-data-red-default)]',
  yellow: 'text-[var(--color-data-yellow-default)]',
  irish: 'text-[var(--color-data-irish-default)]',
}

type ManagerDashboardCardProps = {
  title: string
  count: number
  label: string
  countColor: ManagerDashboardCardColor
  onViewAll: () => void
  disabled?: boolean
}

function ManagerDashboardCard({
  title,
  count,
  label,
  countColor,
  onViewAll,
  disabled = false,
}: ManagerDashboardCardProps) {
  return (
    <Flex
      className={cn('bg-background-1', 'border-border-1 border', 'px-6 py-4', 'w-full')}
      direction="column"
      gap="4"
    >
      <p className="typo-body-lg-semibold text-content-dark-1" title={title}>
        {title}
      </p>

      <Flex justify="between" align="center">
        <Flex gap="2" align="end">
          <p className={cn('typo-h4', COUNT_COLOR_CLASS[countColor])}>{count}</p>
          <p className="typo-body-extra-semibold text-content-dark-3">{label}</p>
        </Flex>

        <Button
          variant={'text'}
          onClick={onViewAll}
          disabled={disabled}
          rightIcon={<IconCaretright size={16} className="text-action-primary-red-default" />}
        >
          Xem tất cả
        </Button>
      </Flex>
    </Flex>
  )
}

export default ManagerDashboardCard
