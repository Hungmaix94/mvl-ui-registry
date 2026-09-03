import { FC } from 'react'
import { useSearchParams } from 'react-router-dom'
import SaleAllocationTransactionTable from '@/features/project/sale-allocations/components/SaleAllocationTransactionTable'
import { useSalesAllocationDealsList } from '@/features/project/sale-allocations/services/sales-allocation-service'

interface SaleAllocationDealsProps {
  saleAllocationId: number
}

const SaleAllocationDeals: FC<SaleAllocationDealsProps> = ({ saleAllocationId }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1
  const pageSize = searchParams.get('page_size') ? Number(searchParams.get('page_size')) : 25

  const { data, isLoading, error } = useSalesAllocationDealsList(saleAllocationId, {
    page,
    page_size: pageSize,
  } as any)

  return (
    <SaleAllocationTransactionTable
      data={data?.results || []}
      isLoading={isLoading}
      error={error}
      pageCount={data?.count ? Math.ceil(data.count / pageSize) : 1}
      totalRecords={data?.count ?? 0}
      currentPage={page}
      pageSize={pageSize}
      onPageChange={(p, newPageSize) => {
        setSearchParams((prev) => {
          prev.set('page', String(p))
          if (newPageSize) {
            prev.set('page_size', String(newPageSize))
          }
          return prev
        })
      }}
      className="px-0 pb-0"
    />
  )
}

export default SaleAllocationDeals
