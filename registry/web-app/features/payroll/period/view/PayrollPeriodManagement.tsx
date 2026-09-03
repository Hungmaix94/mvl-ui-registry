import { Flex } from '@radix-ui/themes'
import PayrollPeriodTable from './PayrollPeriodTable'
import { SalaryPeriodList } from '@/services'

export interface PayrollPeriodManagementProps {
  data: SalaryPeriodList[]
  isLoading?: boolean
  page: number
  pageSize: number
  totalRecords: number
  onPaginationChange: (page: number, pageSize: number) => void
}

const PayrollPeriodManagement = ({
  data,
  isLoading,
  page,
  pageSize,
  totalRecords,
  onPaginationChange,
}: PayrollPeriodManagementProps) => {
  return (
    <Flex direction="column" className="h-full w-full gap-4">
      <div className="flex-1 overflow-hidden bg-white">
        <PayrollPeriodTable
          data={data}
          isLoading={!!isLoading}
          pageCount={Math.ceil(totalRecords / pageSize)}
          pageSize={pageSize}
          currentPage={page}
          totalRecords={totalRecords}
          onPaginationChange={onPaginationChange}
        />
      </div>
    </Flex>
  )
}

export default PayrollPeriodManagement
