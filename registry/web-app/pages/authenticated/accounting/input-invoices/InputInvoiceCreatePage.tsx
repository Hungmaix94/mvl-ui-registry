import { PageTitle } from '@/components/ui'
import InputInvoiceForm from '@/features/accounting/input-invoices/_shares/components/InputInvoiceForm'

const InputInvoiceCreatePage = () => {
  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle title="Tạo hóa đơn đầu vào" enableBackButton />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
        <div className="bg-white">
          <InputInvoiceForm />
        </div>
      </div>
    </div>
  )
}

export default InputInvoiceCreatePage
