import { useState, useCallback } from 'react'
import { Table, Text } from '@radix-ui/themes'
import { Search } from 'lucide-react'

import { TextField, Select, Button } from '@/components/ui'
import { cn } from '@/utils'
import {
  getSaleService,
  type GetCustomerDropdownParams,
  type CustomerDropdown,
} from '@/services/sales-service'
import { PAGE_SIZE } from '@/constants/table'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog.tsx'

const CUSTOMER_TYPE_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'individual', label: 'Cá nhân' },
  { value: 'business', label: 'Doanh nghiệp' },
]

export type CustomerFilterDialogProps = {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onSelect: (customer: CustomerDropdown) => void
  customerType?: 'individual' | 'business'
  additionalParams?: GetCustomerDropdownParams
}

export const CustomerFilterDialog = ({
  isOpen,
  setIsOpen,
  onSelect,
  customerType,
  additionalParams,
}: CustomerFilterDialogProps) => {
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>(customerType || '')
  const [results, setResults] = useState<CustomerDropdown[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDropdown | null>(null)

  const handleSearch = useCallback(async () => {
    setIsLoading(true)
    setHasSearched(true)
    setSelectedCustomer(null)

    try {
      const params: GetCustomerDropdownParams = {
        page: 1,
        page_size: PAGE_SIZE,
        search: search || undefined,
        ...additionalParams,
      }

      const data = await getSaleService().getCustomerDropdown(params)
      setResults((data?.results as CustomerDropdown[]) || [])
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [search, selectedType, additionalParams])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSearch()
    },
    [handleSearch]
  )

  const closeDialog = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  const isIndividual = (c: CustomerDropdown) =>
    (c as unknown as Record<string, any>).customer_type !== 'business'

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className={cn(
          'DialogContent',
          'z-50',
          'flex flex-col',
          'w-full max-w-[800px]',
          'bg-content-light-1 border-border-1 border shadow-lg sm:rounded-lg',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-in-95'
        )}
        aria-describedby={'customer search'}
      >
        <div className={cn('flex-1', 'flex flex-col', 'min-h-0')}>
          <DialogHeader
            className={cn(
              'flex !flex-row justify-between',
              'border-border-1',
              'border-b-[1px]',
              'flex-shrink-0',
              'px-6 pt-4 pb-[16px]'
            )}
          >
            <DialogTitle className={cn('typo-h6 text-content-dark-1')}>
              Tìm kiếm nâng cao khách hàng
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 overflow-y-auto p-6">
            {/* Search filters */}
            <div className="grid grid-cols-3 gap-3">
              <TextField
                label="Tìm kiếm"
                placeholder="Tên, CCCD, MST, SĐT..."
                value={search}
                onChange={(val) => setSearch(val)}
                onKeyDown={handleKeyDown}
              />
              <Select
                label="Loại khách hàng"
                options={CUSTOMER_TYPE_OPTIONS}
                value={selectedType}
                onChange={(val) => setSelectedType(String(val || ''))}
                disabled={!!customerType}
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSearch}
                  loading={isLoading}
                  leftIcon={<Search className="h-4 w-4" />}
                  className="w-full"
                >
                  Tìm kiếm
                </Button>
              </div>
            </div>

            {/* Results */}
            <div className="border-border-1 overflow-hidden rounded-sm border">
              {!hasSearched ? (
                <div className="text-content-dark-3 flex items-center justify-center py-10">
                  <Text>
                    Nhập từ khoá và bấm <strong>Tìm kiếm</strong>
                  </Text>
                </div>
              ) : isLoading ? (
                <div className="text-content-dark-3 flex items-center justify-center py-10">
                  <Text>Đang tìm kiếm...</Text>
                </div>
              ) : results.length === 0 ? (
                <div className="text-content-dark-3 flex items-center justify-center py-10">
                  <Text>Không tìm thấy kết quả</Text>
                </div>
              ) : (
                <div className="max-h-[320px] overflow-y-auto">
                  <Table.Root className="w-full border-collapse">
                    <Table.Header className="border-border-1 bg-background-2 border-b">
                      <Table.Row>
                        <Table.ColumnHeaderCell className="border-border-1 typo-body-base-medium border-r px-3 py-2 text-left text-[#4B4B4B]">
                          Họ tên / Tên DN
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell
                          className="border-border-1 typo-body-base-medium border-r px-3 py-2 text-left text-[#4B4B4B]"
                          style={{ width: '150px' }}
                        >
                          CCCD / MST
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell
                          className="border-border-1 typo-body-base-medium border-r px-3 py-2 text-left text-[#4B4B4B]"
                          style={{ width: '130px' }}
                        >
                          Số điện thoại
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell
                          className="typo-body-base-medium px-3 py-2 text-left text-[#4B4B4B]"
                          style={{ width: '100px' }}
                        >
                          Loại
                        </Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {results.map((customer) => {
                        const isSelected = selectedCustomer?.id === customer.id
                        const isBiz = !isIndividual(customer)
                        return (
                          <Table.Row
                            key={customer.id}
                            className={cn(
                              'border-border-1 cursor-pointer border-b transition-colors last:border-b-0',
                              isSelected ? 'bg-action-primary-red-activated' : 'hover:bg-neutral-10'
                            )}
                            onClick={() => setSelectedCustomer(customer)}
                            onDoubleClick={() => onSelect(customer)}
                          >
                            <Table.Cell className="border-border-1 typo-body-base-regular border-r px-3 py-2 align-middle">
                              <div className="font-medium">
                                {isBiz
                                  ? (customer as unknown as Record<string, any>).business_name ||
                                    '-'
                                  : (customer as unknown as Record<string, any>).full_name || '-'}
                              </div>
                              {isBiz &&
                                (customer as unknown as Record<string, any>)
                                  .business_representative && (
                                  <div className="typo-body-small-regular text-content-dark-3">
                                    Đại diện:{' '}
                                    {
                                      (customer as unknown as Record<string, any>)
                                        .business_representative
                                    }
                                  </div>
                                )}
                            </Table.Cell>
                            <Table.Cell className="border-border-1 typo-body-base-regular border-r px-3 py-2 align-middle">
                              {isBiz
                                ? (customer as unknown as Record<string, any>).business_tax_code ||
                                  '-'
                                : (customer as unknown as Record<string, any>).id_number || '-'}
                            </Table.Cell>
                            <Table.Cell className="border-border-1 typo-body-base-regular border-r px-3 py-2 align-middle">
                              {(customer as unknown as Record<string, any>).phone || '-'}
                            </Table.Cell>
                            <Table.Cell className="typo-body-base-regular px-3 py-2 align-middle">
                              {isBiz ? 'Doanh nghiệp' : 'Cá nhân'}
                            </Table.Cell>
                          </Table.Row>
                        )
                      })}
                    </Table.Body>
                  </Table.Root>
                </div>
              )}
            </div>

            {/* Footer hint */}
            {results.length > 0 && (
              <Text className="typo-body-small-regular text-content-dark-3 text-center">
                Click để chọn • Double-click để chọn ngay
              </Text>
            )}
          </div>

          <DialogFooter
            className={cn(
              'justify-end',
              'border-border-1 border-t-[1px]',
              'px-6 pt-4 pb-[20px]',
              'flex-shrink-0'
            )}
          >
            <Button
              variant={'secondary-border'}
              size={'small'}
              onClick={closeDialog}
              className="min-w-[120px]"
            >
              Đóng
            </Button>

            <Button
              type="button"
              variant="primary"
              disabled={!selectedCustomer}
              onClick={() => {
                if (selectedCustomer) {
                  onSelect(selectedCustomer)
                  closeDialog()
                }
              }}
              className="bg-action-primary-red-default hover:bg-action-primary-red-hover min-w-[120px] text-white"
              size={'small'}
            >
              Chọn
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CustomerFilterDialog
