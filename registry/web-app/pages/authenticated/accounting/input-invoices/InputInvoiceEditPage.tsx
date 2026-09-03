import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { useAbility } from '@/lib/ability.ts'
import { isNotFoundError } from '@/utils/error-utils.ts'
import { useInputInvoice } from '@/features/accounting/input-invoices/services/input-invoice-service'
import InputInvoiceForm from '@/features/accounting/input-invoices/_shares/components/InputInvoiceForm'

const InputInvoiceEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const invoiceId = id ? parseInt(id, 10) : 0
  const ability = useAbility()

  const { data: invoice, isLoading, error } = useInputInvoice(invoiceId)

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !invoice
  }, [isLoading, error, invoice])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const title = invoice
    ? `Chỉnh sửa hóa đơn — ${invoice.code ?? invoiceId}`
    : 'Chỉnh sửa hóa đơn đầu vào'

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle title={title} enableBackButton />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('update', 'inputinvoice')}
      >
        <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
          <div className="bg-white">
            <InputInvoiceForm invoiceId={invoiceId} />
          </div>
        </div>
      </DetailPageWrapper>
    </div>
  )
}

export default InputInvoiceEditPage
