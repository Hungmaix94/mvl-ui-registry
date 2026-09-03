import { useCallback, useEffect, useState } from 'react'
import { Select } from '@/components/ui'
import { IconPlus, IconMagnifyingglass } from '@/assets/icons'
import { Button } from '@/components/ui/button'
import { Flex } from '@radix-ui/themes'
import { cn } from '@/utils'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { PAGE_SIZE } from '@/constants/table.ts'
import { useCustomerSelect } from '@/hooks/useCustomerSelect'
import {
  getSaleService,
  type GetCustomerDropdownParams,
  type CustomerDropdown,
} from '@/services/sales-service'
import { CustomerFilterDialog } from './CustomerFilterDialog'

type SelectedCustomer = {
  id: number
  full_name: string
  id_number: string
  phone: string
  email?: string
  address_detail?: string
  gender?: string
  date_of_birth?: string
  id_issued_date?: string
  province_name?: string
  ward_name?: string
  business_name?: string
  business_tax_code?: string
  business_representative?: string
  business_representative_title?: string
  business_address?: string
  business_province_name?: string
  business_ward_name?: string
}

type CustomerSelectWithDialogProps = {
  value?: number | null
  onChange?: (value: number | null) => void
  error?: string
  disabled?: boolean
  required?: boolean
  label?: string
  additionalParams?: GetCustomerDropdownParams | (() => GetCustomerDropdownParams)
  customerType?: 'individual' | 'business'
}

const CustomerSelectWithDialog = ({
  value,
  onChange,
  error,
  disabled,
  required,
  label = 'Khách hàng',
  additionalParams,
  customerType,
}: CustomerSelectWithDialogProps) => {
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null)
  const queryClient = useQueryClient()
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const { loadCustomerOptions, loadInitialCustomerOptions, getCachedCustomerById } =
    useCustomerSelect({
      valueType: 'id',
      pageSize: PAGE_SIZE,
      customerType: customerType,
      additionalParams: () => {
        const resolved =
          typeof additionalParams === 'function' ? additionalParams() : additionalParams || {}
        return {
          ...resolved,
          customer_type: customerType,
        }
      },
    })

  const loadInitialOptions = useCallback(async () => {
    if (!value) return

    const customerId = Number(value)
    const cached = getCachedCustomerById(customerId)
    if (cached) {
      const selected = cached as unknown as Record<string, any>
      const isBiz = selected.customer_type === 'business'
      setSelectedCustomer({
        id: selected.id,
        full_name: isBiz ? selected.business_name || '' : selected.full_name || '',
        id_number: isBiz ? selected.business_tax_code || '' : selected.id_number || '',
        phone: selected.phone,
        email: selected.email,
        address_detail: selected.address_detail,
        gender: selected.gender,
        date_of_birth: selected.date_of_birth,
        id_issued_date: selected.id_issued_date,
        province_name: selected.province_detail?.name,
        ward_name: selected.ward_detail?.name,
        business_name: selected.business_name,
        business_tax_code: selected.business_tax_code,
        business_representative: selected.business_representative,
        business_representative_title: selected.business_representative_title,
        business_address: selected.business_address,
        business_province_name: selected.business_province_detail?.name,
        business_ward_name: selected.business_ward_detail?.name,
      })
      return
    }

    try {
      const params = { id__in: String(customerId) as any, page: 1, page_size: 1 }
      const data = await queryClient.fetchQuery({
        queryKey: QUERY_KEYS.SALES.CUSTOMERS.DROPDOWN(params),
        queryFn: () => getSaleService().getCustomerDropdown(params),
        staleTime: 1000 * 60 * 5,
      })
      const customer = data?.results?.[0]
      if (customer) {
        const selected = customer as unknown as Record<string, any>
        const isBiz = selected.customer_type === 'business'
        setSelectedCustomer({
          id: selected.id,
          full_name: isBiz ? selected.business_name || '' : selected.full_name || '',
          id_number: isBiz ? selected.business_tax_code || '' : selected.id_number || '',
          phone: selected.phone,
          email: selected.email,
          address_detail: selected.address_detail,
          gender: selected.gender,
          date_of_birth: selected.date_of_birth,
          id_issued_date: selected.id_issued_date,
          province_name: selected.province_detail?.name,
          ward_name: selected.ward_detail?.name,
          business_name: selected.business_name,
          business_tax_code: selected.business_tax_code,
          business_representative: selected.business_representative,
          business_representative_title: selected.business_representative_title,
          business_address: selected.business_address,
          business_province_name: selected.business_province_detail?.name,
          business_ward_name: selected.business_ward_detail?.name,
        })
      } else {
        const options = await loadInitialCustomerOptions([customerId])
        if (options.length > 0) {
          const option = options[0]
          const match = option.label.match(/^(.+?) - (.+)$/)
          if (match) {
            setSelectedCustomer({
              id: Number(option.value),
              id_number: match[1],
              full_name: match[2]?.trim() || '',
            } as any)
          }
        }
      }
    } catch {
      const options = await loadInitialCustomerOptions([value])
      if (options.length > 0) {
        const option = options[0]
        const match = option.label.match(/^(.+?) - (.+)$/)
        if (match) {
          setSelectedCustomer({
            id: Number(option.value),
            id_number: match[1],
            full_name: match[2]?.trim() || '',
          } as any)
        }
      }
    }
  }, [value, getCachedCustomerById, queryClient, loadInitialCustomerOptions])

  useEffect(() => {
    if (value && (!selectedCustomer || Number(selectedCustomer.id) !== Number(value))) {
      loadInitialOptions()
    } else if (!value && selectedCustomer) {
      setSelectedCustomer(null)
    }
  }, [value, selectedCustomer, loadInitialOptions])

  const handleSelectChange = useCallback(
    (newValue: string | number | (string | number)[] | null) => {
      let customerId: number | null = null
      if (Array.isArray(newValue)) {
        customerId = newValue.length > 0 ? Number(newValue[0]) : null
      } else {
        customerId = newValue ? Number(newValue) : null
      }

      if (customerId) {
        const cached = getCachedCustomerById(customerId)
        if (cached) {
          const selected = cached as unknown as Record<string, any>
          const isBiz = selected.customer_type === 'business'
          setSelectedCustomer({
            id: selected.id,
            full_name: isBiz ? selected.business_name || '' : selected.full_name || '',
            id_number: isBiz ? selected.business_tax_code || '' : selected.id_number || '',
            phone: selected.phone,
            email: selected.email,
            address_detail: selected.address_detail,
            gender: selected.gender,
            date_of_birth: selected.date_of_birth,
            id_issued_date: selected.id_issued_date,
            province_name: selected.province_detail?.name,
            ward_name: selected.ward_detail?.name,
            business_name: selected.business_name,
            business_tax_code: selected.business_tax_code,
            business_representative: selected.business_representative,
            business_representative_title: selected.business_representative_title,
            business_address: selected.business_address,
            business_province_name: selected.business_province_detail?.name,
            business_ward_name: selected.business_ward_detail?.name,
          })
          onChange?.(customerId)
          return
        }

        const params = { id__in: [customerId], page: 1, page_size: 1 }
        queryClient
          .fetchQuery({
            queryKey: QUERY_KEYS.SALES.CUSTOMERS.DROPDOWN(params),
            queryFn: () => getSaleService().getCustomerDropdown(params),
            staleTime: 1000 * 60 * 5,
          })
          .then((data) => {
            const customer = data?.results?.[0]
            if (customer) {
              const selected = customer as unknown as Record<string, any>
              const isBiz = selected.customer_type === 'business'
              setSelectedCustomer({
                id: selected.id,
                full_name: isBiz ? selected.business_name || '' : selected.full_name || '',
                id_number: isBiz ? selected.business_tax_code || '' : selected.id_number || '',
                phone: selected.phone,
                email: selected.email,
                address_detail: selected.address_detail,
                gender: selected.gender,
                date_of_birth: selected.date_of_birth,
                id_issued_date: selected.id_issued_date,
                province_name: selected.province_detail?.name,
                ward_name: selected.ward_detail?.name,
                business_name: selected.business_name,
                business_tax_code: selected.business_tax_code,
                business_representative: selected.business_representative,
                business_representative_title: selected.business_representative_title,
                business_address: selected.business_address,
                business_province_name: selected.business_province_detail?.name,
                business_ward_name: selected.business_ward_detail?.name,
              })
            }
          })
      } else {
        setSelectedCustomer(null)
      }

      onChange?.(customerId)
    },
    [onChange, getCachedCustomerById, queryClient]
  )

  /* openFilterDialog and displayFormContent related logic */
  const applyCustomerSelection = useCallback(
    (customer: CustomerDropdown) => {
      const customerId = customer.id
      if (!customerId) return

      const isBiz = (customer as unknown as Record<string, any>).customer_type === 'business'

      const selected: SelectedCustomer = {
        id: customerId,
        full_name: isBiz
          ? (customer as unknown as Record<string, any>).business_name || ''
          : (customer as unknown as Record<string, any>).full_name || '',
        id_number: isBiz
          ? (customer as unknown as Record<string, any>).business_tax_code || ''
          : (customer as unknown as Record<string, any>).id_number || '',
        phone: (customer as unknown as Record<string, any>).phone || '',
        email: (customer as unknown as Record<string, any>).email ?? undefined,
        gender: (customer as unknown as Record<string, any>).gender ?? undefined,
        date_of_birth: (customer as unknown as Record<string, any>).date_of_birth ?? undefined,
        address_detail: (customer as unknown as Record<string, any>).address ?? undefined,
        province_name: (customer as unknown as Record<string, any>).province?.name ?? undefined,
        ward_name: (customer as unknown as Record<string, any>).ward?.name ?? undefined,
        business_name: isBiz
          ? (customer as unknown as Record<string, any>).business_name
          : undefined,
        business_tax_code: isBiz
          ? (customer as unknown as Record<string, any>).business_tax_code
          : undefined,
        business_representative:
          (customer as unknown as Record<string, any>).business_representative ?? undefined,
        business_representative_title:
          (customer as unknown as Record<string, any>).business_representative_title ?? undefined,
        business_address:
          (customer as unknown as Record<string, any>).business_address ?? undefined,
        business_province_name:
          (customer as unknown as Record<string, any>).business_province?.name ?? undefined,
        business_ward_name:
          (customer as unknown as Record<string, any>).business_ward?.name ?? undefined,
      }

      setSelectedCustomer(selected)
      onChange?.(customerId)
      setIsFilterOpen(false)
    },
    [onChange]
  )

  const openFilterDialog = useCallback(() => {
    if (disabled) return
    setIsFilterOpen(true)
  }, [disabled])

  const handleCreateNew = () => {
    window.open(window.location.origin + APP_PATH.CUSTOMER_MANAGER_CREATE, '_blank')
  }

  const selectValue = selectedCustomer?.id ? String(selectedCustomer.id) : null

  return (
    <Flex direction="column" gap="2" className="w-full" data-invalid={!!error}>
      {label && (
        <div className="flex items-center gap-0.5">
          <label className="typo-body-base-semibold text-content-dark-2">{label}</label>
          {required && (
            <span className="typo-body-base-semibold text-action-primary-red-default">*</span>
          )}
        </div>
      )}
      <Flex gap="2" className="h-fit w-full items-start">
        <div className="flex-1">
          <Select
            value={selectValue}
            onChange={handleSelectChange}
            loadOptions={loadCustomerOptions}
            loadInitialOptions={loadInitialCustomerOptions}
            placeholder={
              customerType === 'business'
                ? 'Nhập/chọn MST hoặc tên doanh nghiệp'
                : 'Nhập/chọn CCCD hoặc họ tên khách hàng'
            }
            searchPlaceholder="Tìm kiếm khách hàng..."
            enableSearch
            pageSize={PAGE_SIZE}
            disabled={disabled}
            className={cn('w-full', error && 'border-data-red-default')}
            menuFooter={
              <Button
                type="button"
                variant="text"
                size={'small'}
                onClick={(e) => {
                  e.stopPropagation()
                  handleCreateNew()
                }}
                className="text-action-primary-red-default hover:bg-action-primary-red-activated h-11 w-full justify-start rounded-none border-none px-4 transition-colors"
                leftIcon={<IconPlus size={16} />}
                childrenClassName="flex-grow-0 typo-body-base-semibold"
              >
                {customerType === 'business' ? 'Tạo mới doanh nghiệp' : 'Tạo mới khách hàng'}
              </Button>
            }
          />
        </div>
        <Button
          type="button"
          variant="secondary-border"
          onClick={openFilterDialog}
          disabled={disabled}
          iconOnly
          className="border-border-1 h-9 w-9 flex-shrink-0"
          title={'Mở bộ lọc Khách hàng'}
        >
          <IconMagnifyingglass size={20} />
        </Button>
      </Flex>
      {error && <span className="text-data-red-default mt-1 text-xs">{error}</span>}

      {isFilterOpen && (
        <CustomerFilterDialog
          isOpen={isFilterOpen}
          setIsOpen={setIsFilterOpen}
          onSelect={applyCustomerSelection}
          customerType={customerType}
        />
      )}
    </Flex>
  )
}

export default CustomerSelectWithDialog
