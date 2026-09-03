import { useState, useRef, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import { PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { Flex } from '@radix-ui/themes'
import {
  useKpiCommissionStructures,
  KpiCommissionStructure,
} from '@/features/accounting/kpi-commission-structures/services/kpi-commission-structure-service'
import { CommKPIFilter, CommKPIFilterFormData } from './CommKPIFilter'
import { CommKPIListTable } from './CommKPIListTable'
import { CommKPIDetail } from './CommKPIDetail'

const CommKPI = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const formRef = useRef<any>(null)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  const [detailData, setDetailData] = useState<KpiCommissionStructure | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Khởi tạo URL param mặc định nếu trống
  useEffect(() => {
    const hasPage = searchParams.has('page')
    if (!hasPage) {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    }
    setIsUrlReady(true)
  }, [searchParams, setSearchParams])

  const page = Number(searchParams.get('page')) || 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  // Parse filters từ search params
  const currentFilters = useMemo(() => {
    const filters: CommKPIFilterFormData = {}
    if (searchParams.get('target_role')) filters.target_role = searchParams.get('target_role')!
    if (searchParams.get('status')) filters.status = searchParams.get('status')!
    if (searchParams.get('effective_from'))
      filters.effective_from = searchParams.get('effective_from')!
    return filters
  }, [searchParams])

  const queryParams = {
    ...currentFilters,
    page,
    page_size: pageSize,
    status: currentFilters.status as any,
    target_role: currentFilters.target_role as any,
  }

  const { data, isLoading } = useKpiCommissionStructures(queryParams, { enabled: isUrlReady })

  const handleApplyFilter = () => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return

    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    if (pageSizeFromUrl) newParams.set('page_size', String(pageSizeFromUrl))

    Object.entries(formData).forEach(([key, value]) => {
      if (value) newParams.set(key, String(value))
    })
    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }

  const handleClearFilter = () => {
    formRef.current?.clearForm()
  }

  return (
    <>
      <PageTitle
        title="Quy định hoa hồng theo KPI"
        handleCreateNew={() => {}} // Navigation to create form logic to be implemented
        handleFilter={() => setIsFilterDialogOpen(true)}
      />

      <Flex flexGrow={'1'} direction="column" gap="4" className="pb-6">
        <CommKPIListTable
          data={data?.results ?? []}
          isLoading={isLoading}
          onDetail={(item) => {
            setDetailData(item)
            setIsDetailOpen(true)
          }}
        />
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <CommKPIFilter ref={formRef} initialValues={currentFilters} isOpen={isFilterDialogOpen} />
        }
        onCancel={() => setIsFilterDialogOpen(false)}
        onConfirm={handleApplyFilter}
        onClearFilter={handleClearFilter}
      />

      <CommKPIDetail
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        data={detailData}
      />
    </>
  )
}

export default CommKPI
