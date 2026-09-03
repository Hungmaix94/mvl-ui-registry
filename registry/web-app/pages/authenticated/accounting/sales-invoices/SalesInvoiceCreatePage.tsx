import { PageTitle } from '@/components/ui'
import SalesInvoiceForm from '@/features/accounting/sales-invoices/_shares/components/SalesInvoiceForm'

const SalesInvoiceCreatePage = () => {
  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle title="Tạo hóa đơn" />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
        <div className="bg-white">
          <SalesInvoiceForm />
        </div>
      </div>
    </div>
  )
}

export default SalesInvoiceCreatePage
