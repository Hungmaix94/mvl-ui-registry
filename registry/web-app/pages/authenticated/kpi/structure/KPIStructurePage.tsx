import { PageTitle } from '@/components/ui'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KPICriteria } from '@/features/kpi/kpi-structure/KPICriteria'
import { KPIControlRate } from '@/features/kpi/kpi-structure/KPIControlRate'
const KPIStructurePage = () => {
  const [activeTab, setActiveTab] = useState<string>('KPI_criteria')

  const tabItems = [
    {
      value: 'KPI_criteria',
      label: 'Danh sách xếp loại KPI',
      component: KPICriteria,
    },
    {
      value: 'KPI_control_rate',
      label: 'Tỉ lệ khống chế KPI',
      component: KPIControlRate,
    },
  ]
  return (
    <>
      <PageTitle title="Cấu trúc KPI" />
      <div className="flex flex-col gap-6 px-10 pb-[80px]">
        <Tabs value={activeTab}>
          <TabsList>
            {tabItems.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabItems.map((tab) => {
            const TabComponent = tab.component
            return (
              <TabsContent key={tab.value} value={tab.value} className="mt-6">
                <TabComponent />
              </TabsContent>
            )
          })}
        </Tabs>
      </div>
    </>
  )
}

export default KPIStructurePage
