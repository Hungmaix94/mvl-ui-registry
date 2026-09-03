import { Flex } from '@radix-ui/themes'
import SalesRevenueChart from '@/features/dashboard/components/chart/SalesRevenueChart.tsx'
import { Separator } from '@radix-ui/themes'
import { useAbility } from '@/lib/ability.ts'

const RevenueDashboard = () => {
  const ability = useAbility()

  if (!ability.can('chart', 'sales_revenue_report')) return null

  return (
    <>
      <Flex direction={'column'} justify={'between'} className={'gap-6 p-10 pt-6 pb-0'}>
        <Flex direction={'column'} align={'start'} gap={'2'}>
          <h1 className="text-2xl font-bold">Doanh thu</h1>
        </Flex>

        <SalesRevenueChart />

        <Separator orientation={'horizontal'} className={'!w-full'} />
      </Flex>
    </>
  )
}

export default RevenueDashboard
