import { Switch } from '@/components/ui'
import { Loading } from '@/components/Loading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Flex, Text } from '@radix-ui/themes'
import { useState, useRef } from 'react'
import PayslipTable, { PayrollSlipData } from '@/features/payroll/period/components/PayslipTable'
import { SimplePagination } from '@/components/ui/table/SimplePagination'
import { useSidebar } from '@/components/ui/sidebar/sidebar.tsx'
import HorizontalScrollBar from '@/components/ui/table/HorizontalScrollBar'
import { cn } from '@/utils'

interface PayrollPeriodDetailProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  period: any
  eligibleEmployees: PayrollSlipData[]
  ineligibleEmployees: PayrollSlipData[]
  onCalculate: () => void
  pagination?: {
    page: number
    pageSize: number
    totalRecords: number
    onPageChange: (page: number) => void
    onPageSizeChange: (pageSize: number) => void
  }
  activeTab?: string
  onTabChange?: (tab: string) => void
  isLoading?: boolean
  onActionSuccess?: () => void
}

const PayrollPeriodDetail = ({
  eligibleEmployees,
  ineligibleEmployees,
  activeTab = 'eligible',
  onTabChange,
  pagination,
  isLoading,
  onActionSuccess,
}: PayrollPeriodDetailProps) => {
  const [showFull, setShowFull] = useState(true)
  const { open: isSidebarOpen } = useSidebar()
  const eligibleContainerRef = useRef<HTMLDivElement>(null)
  const ineligibleContainerRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 py-0">
        <Tabs value={activeTab} onValueChange={onTabChange} className="flex h-full flex-col gap-6">
          <div className="flex items-center justify-between px-10">
            <TabsList className="bg-transparent p-0">
              <TabsTrigger
                value="eligible"
                type="button"
                className="gap-2 rounded-none bg-transparent px-4 pt-3 pb-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Bảng 1: Đủ điều kiện
              </TabsTrigger>
              <TabsTrigger
                value="ineligible"
                type="button"
                className="gap-2 rounded-none bg-transparent px-4 pt-3 pb-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Bảng 2: Không đủ điều kiện
              </TabsTrigger>
            </TabsList>

            <Flex align="center" gap="2" className="pb-3">
              <Text size="2" color="gray" className={'text-nowrap'}>
                Hiển thị đầy đủ
              </Text>
              <Switch checked={showFull} onChange={setShowFull} />
            </Flex>
          </div>

          <TabsContent value="eligible" className="m-0 min-h-0 flex-1">
            {isLoading ? (
              <Loading variant="spinner" size="lg" className="h-full" />
            ) : (
              <div className="flex h-full flex-col pl-10">
                <div
                  ref={eligibleContainerRef}
                  className="scrollbar-hide flex-1 overflow-auto pb-32"
                >
                  <PayslipTable
                    data={eligibleEmployees}
                    showFull={showFull}
                    pagination={pagination}
                    activeTab="eligible"
                    onActionSuccess={onActionSuccess}
                  />
                </div>

                <div
                  className={cn(
                    'fixed bottom-0 z-20 flex flex-col',
                    'bg-content-light-1',
                    isSidebarOpen
                      ? 'left-[var(--sidebar-width)] w-[calc(100%-var(--sidebar-width))]'
                      : 'left-[var(--sidebar-width-icon)] w-[calc(100%-var(--sidebar-width-icon))]'
                  )}
                >
                  <div className="pl-10">
                    <HorizontalScrollBar
                      containerRef={eligibleContainerRef}
                      className="border-border-1 border-x-0 border-b-0"
                    />
                  </div>
                  {pagination && (
                    <SimplePagination
                      currentPage={pagination.page}
                      pageSize={pagination.pageSize}
                      totalRecords={pagination.totalRecords}
                      onPageChange={pagination.onPageChange}
                      onPageSizeChange={pagination.onPageSizeChange}
                      position="static"
                    />
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ineligible" className="m-0 min-h-0 flex-1">
            {isLoading ? (
              <Loading variant="spinner" size="lg" className="h-full" />
            ) : (
              <div className="flex h-full flex-col pl-10">
                <div
                  ref={ineligibleContainerRef}
                  className="scrollbar-hide flex-1 overflow-auto pb-32"
                >
                  <PayslipTable
                    data={ineligibleEmployees}
                    showFull={showFull}
                    activeTab="ineligible"
                    pagination={pagination}
                    onActionSuccess={onActionSuccess}
                  />
                </div>

                <div
                  className={cn(
                    'fixed bottom-0 z-20 flex flex-col',
                    'bg-content-light-1',
                    isSidebarOpen
                      ? 'left-[var(--sidebar-width)] w-[calc(100%-var(--sidebar-width))]'
                      : 'left-[var(--sidebar-width-icon)] w-[calc(100%-var(--sidebar-width-icon))]'
                  )}
                >
                  <div className="pl-10">
                    <HorizontalScrollBar
                      containerRef={ineligibleContainerRef}
                      className="border-border-1 border-x-0 border-b-0"
                    />
                  </div>
                  {pagination && (
                    <SimplePagination
                      currentPage={pagination.page}
                      pageSize={pagination.pageSize}
                      totalRecords={pagination.totalRecords}
                      onPageChange={pagination.onPageChange}
                      onPageSizeChange={pagination.onPageSizeChange}
                      position="static"
                    />
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default PayrollPeriodDetail
