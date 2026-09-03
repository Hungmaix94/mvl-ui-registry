import { PageTitle } from '@/components/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KPICriteriaTable } from '@/features/kpi/criteria'
import { usePayrollKPICriteria } from '@/features/kpi/services/kpi-criteria-service'
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { useAbility } from '@/lib/ability'

const KPICriteriaPage = () => {
  const ability = useAbility()
  const canView = ability.can('list', 'kpi_criterion')
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = searchParams.get('target') || 'sales'
  const { data, isLoading, error, refetch } = usePayrollKPICriteria({
    target: currentTab,
  })

  const handleTabChange = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('target', value)
        return next
      })
    },
    [setSearchParams]
  )

  const handleRefetch = useCallback(() => {
    refetch()
  }, [refetch])

  return (
    <div className="bg-background-1 flex h-full flex-col">
      <PageTitle title="Tiêu chí KPI" />
      <div className="flex-1 overflow-hidden px-10 pb-16">
        <Tabs value={currentTab} onValueChange={handleTabChange} className="h-full">
          <div className="flex items-center">
            <TabsList className="w-full justify-start rounded-none bg-transparent px-0">
              <TabsTrigger value="sales">Khối Kinh doanh</TabsTrigger>
              <TabsTrigger value="backoffice">Khối Hỗ trợ</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="sales" className="mt-6 h-full">
            <DetailPageWrapper
              isLoading={isLoading}
              isError={!!error}
              isNotFound={!isLoading && !data?.results?.length}
              hasPermission={canView}
            >
              <KPICriteriaTable
                data={data?.results || []}
                isLoading={isLoading}
                refetch={handleRefetch}
              />
            </DetailPageWrapper>
          </TabsContent>

          <TabsContent value="backoffice" className="mt-6 h-full">
            <DetailPageWrapper
              isLoading={isLoading}
              isError={!!error}
              isNotFound={!isLoading && !data?.results?.length}
              hasPermission={canView}
            >
              <KPICriteriaTable
                data={data?.results || []}
                isLoading={isLoading}
                refetch={handleRefetch}
              />
            </DetailPageWrapper>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default KPICriteriaPage
