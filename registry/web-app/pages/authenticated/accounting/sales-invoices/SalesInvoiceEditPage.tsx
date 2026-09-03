import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { useAbility } from '@/lib/ability.ts'
import { isNotFoundError } from '@/utils/error-utils.ts'
import { useSalesInvoice } from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import SalesInvoiceForm from '@/features/accounting/sales-invoices/_shares/components/SalesInvoiceForm'

const SalesInvoiceEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const invoiceId = id ? parseInt(id, 10) : 0
  const ability = useAbility()

  const { data: invoice, isLoading, error } = useSalesInvoice(invoiceId)

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !invoice
  }, [isLoading, error, invoice])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle idLabel={invoice?.code || ''} enableBackButton />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('update', 'salesinvoice')}
      >
        <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
          <div className="bg-white">
            <SalesInvoiceForm invoiceId={invoiceId} />
          </div>
        </div>
      </DetailPageWrapper>
    </div>
  )
}

export default SalesInvoiceEditPage
