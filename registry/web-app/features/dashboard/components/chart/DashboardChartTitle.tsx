import { cn } from '@/utils'
import Button from '../../../../components/ui/button/Button.tsx'
import { IconDownloadsimple, IconFunnel } from '@/assets/icons'
import { Link } from 'react-router-dom'
import { TAppPath } from '@/types'
import { Flex, Text } from '@radix-ui/themes'
import AmountBadge from '@/components/ui/badge/amount-badge.tsx'
import type { RecruitmentDashboardFilterFormValues } from '../recruitment/RecruitmentDashboardFilterForm.tsx'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { useMemo } from 'react'

const DashboardChartTitle = ({
  title,
  reportLink,
  handleDownloadChart,
  isDownloading,
  handleFilter,
  filterCount,
  subTitle,
  filterParams,
}: {
  title: string
  /** Bỏ trống khi khối không có màn báo cáo đầy đủ để trỏ tới — tiêu đề khi đó là chữ thường. */
  reportLink?: TAppPath
  /** Bỏ trống để ẩn hẳn nút tải xuống (vd: người dùng không có quyền xuất Excel). */
  handleDownloadChart?: () => Promise<void> | void
  /** Khoá nút tải xuống trong lúc file đang được tạo. */
  isDownloading?: boolean
  handleFilter: () => void
  filterCount: number
  subTitle: string
  filterParams?: RecruitmentDashboardFilterFormValues | null
}) => {
  const url = useMemo(() => {
    if (!reportLink) return null

    const searchParams = new URLSearchParams()

    if (filterParams?.dateRange?.from) {
      const fromDate = formatDateToApi(filterParams.dateRange.from)
      if (fromDate) {
        searchParams.set('from_date', fromDate)
      }
    }

    if (filterParams?.dateRange?.to) {
      const toDate = formatDateToApi(filterParams.dateRange.to)
      if (toDate) {
        searchParams.set('to_date', toDate)
      }
    }

    if (filterParams?.branch) {
      searchParams.set('branch', String(filterParams.branch))
    }

    const queryString = searchParams.toString()

    return queryString ? `${reportLink}?${queryString}` : reportLink
  }, [filterParams?.dateRange?.from, filterParams?.dateRange?.to, filterParams?.branch, reportLink])

  return (
    <>
      <div className="flex items-start justify-between">
        <Flex direction={'column'} align={'start'} gap={'1'}>
          {url ? (
            <Link
              to={url}
              className={cn(
                'typo-body-lg-semibold',
                'text-content-dark-1 hover:text-action-primary-red-default',
                'transition-colors',
                'cursor-pointer'
              )}
            >
              {title}
            </Link>
          ) : (
            <h2 className={cn('typo-body-lg-semibold', 'text-content-dark-1')}>{title}</h2>
          )}
          <Text className={cn('typo-body-sm', 'text-content-dark-3')}>{subTitle}</Text>
        </Flex>

        <Flex gap={'1'}>
          {handleDownloadChart && (
            <Button
              variant="secondary-border"
              size="large"
              iconOnly
              className={'border-content-light-2 size-10'}
              onClick={handleDownloadChart}
              disabled={isDownloading}
              aria-label={isDownloading ? 'Đang xuất...' : 'Tải xuống'}
            >
              <IconDownloadsimple size={20} />
            </Button>
          )}
          <Button
            variant={'secondary-border'}
            size={'small'}
            iconOnly
            onClick={handleFilter}
            aria-label="Bộ lọc"
            leftIcon={<IconFunnel size={20} />}
            rightIcon={
              filterCount && filterCount > 0 ? (
                <>
                  <AmountBadge amount={filterCount} />
                </>
              ) : null
            }
            className={cn(
              'border-content-light-2',
              'hover:bg-data-light-grey-hover',
              'h-10',
              filterCount &&
                filterCount > 0 &&
                'bg-action-primary-red-activated border-action-primary-red-default text-action-primary-red-default hover:text-action-primary-red-default'
            )}
          />
        </Flex>
      </div>
    </>
  )
}

export default DashboardChartTitle
