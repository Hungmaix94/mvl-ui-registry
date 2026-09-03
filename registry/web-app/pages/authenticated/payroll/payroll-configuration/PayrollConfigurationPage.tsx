import { PageTitle } from '@/components/ui'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialInsuranceTab } from '@/features/payroll/Configuration/SocialInsuranceTab'
import { PersionalIncomeTaxTab } from '@/features/payroll/Configuration/PersonalIncomeTaxTab'
import { BusinessProgressiveSalaryTab } from '@/features/payroll/Configuration/BusinessProgressiveSalaryTab'
import { KPISalaryTab } from '@/features/payroll/Configuration/KPISalaryTab'
const PayrollConfigurationPage = () => {
  const [activeTab, setActiveTab] = useState<string>('social_insurance')

  const tabItems = [
    {
      value: 'social_insurance',
      label: 'Bảo hiểm xã hội',
      component: SocialInsuranceTab,
    },
    {
      value: 'personal_income_tax',
      label: 'Thuế',
      component: PersionalIncomeTaxTab,
    },
    {
      value: 'business_progressive_salary',
      label: 'Lương kinh doanh lũy tiến',
      component: BusinessProgressiveSalaryTab,
    },
    {
      value: 'KPI_salary',
      label: 'KPI',
      component: KPISalaryTab,
    },
  ]
  return (
    <>
      <PageTitle title="Cấu trúc lương" />
      <div className="flex flex-col gap-6 px-10 pt-6 pb-[80px]">
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

export default PayrollConfigurationPage
