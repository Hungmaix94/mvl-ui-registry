import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDebounceValue } from 'usehooks-ts'
import { useControllableState } from '@/hooks/useControllableState'
import InfiniteScroll from 'react-infinite-scroll-component'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import { Popover, PopoverContentPrimitive, PopoverTrigger } from '@/components/ui/popover'
import { IconCheck } from '@/assets/icons/system-devices'
import { IconCaretdown } from '@/assets/icons/arrows'
import { IconX } from '@/assets/icons'
import useMatchTriggerWidth from '@/hooks/useMatchTriggerWidth'
import { FormCaption } from '@/components/ui/form'
import { PAGE_SIZE } from '@/constants/table.ts'
import { Separator } from '@/components/ui/separator'

const OPTIONS_CONTAINER_ID = 'select-options-scroll'

// Legacy SelectOption type for backward compatibility
export type SelectOption = {
  label: string
  value: string | number
  disabled?: boolean
  /**
   * Optional richer text shown in the dropdown LIST row (and used for search matching). Falls back
   * to `label`. The selected trigger always shows `label`, so a caller can keep a short selected
   * value (e.g. a code) while listing a richer option row.
   */
  optionLabel?: string
}
// Types
export type LoadOptionsParams = {
  query: string
  page: number
  pageSize: number
}

export type LoadOptionsResult<SelectOption> = {
  items: SelectOption[]
  nextPage?: number | null
  hasNextPage?: boolean
}

export type SelectProps<SelectOption> = {
  name?: string
  label?: React.ReactNode
  subtitle?: string
  required?: boolean
  multiple?: boolean
  value?: string | number | (string | number)[] | null
  defaultValue?: string | number | (string | number)[] | null
  onChange?: (next: string | number | (string | number)[] | null) => void
  onChangeOption?: (option: SelectOption | null) => void

  // Data mode A: internal fetch
  loadOptions?: (params: LoadOptionsParams) => Promise<LoadOptionsResult<SelectOption>>
  pageSize?: number

  // Data mode B: external data control
  options?: SelectOption[]
  hasNextPage?: boolean
  isLoading?: boolean
  onLoadMore?: () => void

  // Initial options loading
  loadInitialOptions?: (values: (string | number)[]) => Promise<SelectOption[]>

  // Search
  debounceMs?: number // default 300
  searchPlaceholder?: string
  onSearchChange?: (q: string) => void // for controlled search if needed
  enableSearch?: boolean // auto-enable search when loadOptions is provided

  // Trigger display variants
  triggerVariant?: 'chips' | 'count' | 'custom'
  maxChips?: number // for chips variant
  renderTrigger?: (ctx: {
    selected: SelectOption[]
    open: boolean
    clear: () => void
  }) => React.ReactNode

  placeholder?: string
  className?: string
  wrapperClassName?: string
  iconSize?: number

  disabled?: boolean
  open?: boolean
  error?: string
  onOpenChange?: (open: boolean) => void
  clearable?: boolean
  /**
   * Let the dropdown grow to fit option content (≥ trigger width, capped) instead of matching the
   * trigger width exactly. Useful when option rows are richer/longer than the selected value.
   */
  dropdownAutoWidth?: boolean

  title?: string
  menuFooter?: React.ReactNode
  /**
   * Custom node rendered in the empty state (no matching options and not loading) INSTEAD of the
   * default "No results found." text. Receives the current search query so callers can render a
   * contextual message and/or a "create new" affordance. Shown under the same condition cmdk uses
   * for its default empty row, so existing behavior is unchanged when this prop is omitted.
   */
  renderEmpty?: (query: string) => React.ReactNode
}

// Loading row component
const Select = React.forwardRef<HTMLDivElement, SelectProps<SelectOption>>(
  (
    {
      label,
      name,
      subtitle,
      required,
      multiple = false,
      value,
      defaultValue,
      onChange,
      onChangeOption,
      loadOptions,
      pageSize = PAGE_SIZE,
      options,
      hasNextPage,
      isLoading,
      onLoadMore,
      loadInitialOptions,
      debounceMs = 300,
      searchPlaceholder = 'Search...',
      onSearchChange,
      enableSearch,
      triggerVariant: triggerVariantProp,
      maxChips = 3,
      renderTrigger,
      placeholder = 'Select...',
      className,
      wrapperClassName,
      iconSize = 20,
      disabled = false,
      clearable = true,
      dropdownAutoWidth = false,
      open,
      error,
      onOpenChange,
      title,
      menuFooter,
      renderEmpty,
    },
    ref
  ) => {
    /**
     * Multi-select mặc định hiện CHIP tên đã chọn; chọn đơn giữ nguyên kiểu cũ.
     *
     * Trước đây mặc định `count` cho cả hai, nên ô chọn nhiều chỉ in ra số lượng — người dùng
     * phải mở dropdown ra mới biết mình đang lọc những gì, và chuỗi đó còn là tiếng Anh.
     *
     * KHÔNG đặt `chips` cho chọn đơn: nhánh chips render giá trị thành thẻ tròn kèm dấu ✕, tức
     * là đổi hình dạng của MỌI ô chọn đơn trong toàn app — việc khác hẳn.
     */
    const triggerVariant = triggerVariantProp ?? (multiple ? 'chips' : 'count')

    const { triggerRef, width } = useMatchTriggerWidth<HTMLButtonElement>()
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    const [isOpen, setIsOpen] = useControllableState({
      value: open,
      defaultValue: false,
      onChange: onOpenChange,
    })

    const [query, setQuery] = useState('')
    const [debouncedQuery] = useDebounceValue(query, debounceMs)
    const [focusedIndex, setFocusedIndex] = useState<number>(-1)
    const hasAutoFocusedOnOpenRef = useRef(false)

    const [selectedValues, setSelectedValues] = useControllableState({
      value,
      defaultValue,
      onChange,
    })

    const [selectedOptions, setSelectedOptions] = useState<SelectOption[]>([])

    // 2) Data source
    const [items, setItems] = useState<SelectOption[]>(options || [])
    const [initialOptions, setInitialOptions] = useState<SelectOption[]>([])
    const [currentPage, setCurrentPage] = useState<number>(1)
    const [hasNext, setHasNext] = useState<boolean>(!!hasNextPage)
    const [loading, setLoading] = useState<boolean>(!!isLoading)

    // Combine items and initialOptions for all available options
    const allAvailableOptions = useMemo(() => {
      const itemsArray = Array.isArray(items) ? items : []
      const initialArray = Array.isArray(initialOptions) ? initialOptions : []
      const combined = [...itemsArray, ...initialArray]
      // Remove duplicates by value (items take precedence)
      const seen = new Set<string | number>()
      return combined.filter((option) => {
        if (seen.has(option.value)) {
          return false
        }
        seen.add(option.value)
        return true
      })
    }, [items, initialOptions])

    const allOptionsMap = useMemo(() => {
      const optionMap = new Map<string | number, SelectOption>()
      allAvailableOptions.forEach((option) => optionMap.set(option.value, option))
      return optionMap
    }, [allAvailableOptions])

    // Create a map of items only (not including initialOptions) for detecting missing values
    const itemsMap = useMemo(() => {
      const optionMap = new Map<string | number, SelectOption>()
      const itemsArray = Array.isArray(items) ? items : []
      itemsArray.forEach((option) => optionMap.set(option.value, option))
      return optionMap
    }, [items])

    // Detect missing options and load them via loadInitialOptions
    useEffect(() => {
      if (!loadInitialOptions) return

      const values = Array.isArray(selectedValues)
        ? selectedValues
        : selectedValues !== null && selectedValues !== undefined
          ? [selectedValues]
          : []

      if (values.length === 0) {
        setInitialOptions([])
        return
      }

      // Check what's already loaded in initialOptions
      setInitialOptions((prevInitialOptions) => {
        const initialOptionsValues = new Set(prevInitialOptions.map((opt) => opt.value))

        // Find missing values (values that don't exist in items and haven't been loaded in initialOptions)
        // Check with type conversion (string <-> number) for proper matching
        const missingValues = values.filter((v) => {
          const hasInItems =
            itemsMap.has(v) ||
            (typeof v === 'number'
              ? itemsMap.has(String(v))
              : !isNaN(Number(v))
                ? itemsMap.has(Number(v))
                : false)
          const hasInInitial =
            initialOptionsValues.has(v) ||
            (typeof v === 'number'
              ? initialOptionsValues.has(String(v))
              : !isNaN(Number(v))
                ? initialOptionsValues.has(Number(v))
                : false)
          return !hasInItems && !hasInInitial
        })

        if (missingValues.length > 0) {
          // Load missing options asynchronously
          loadInitialOptions(missingValues)
            .then((fetchedOptions) => {
              setInitialOptions((prev) => {
                // Merge with existing initialOptions, avoiding duplicates
                const existingValues = new Set(prev.map((opt) => opt.value))
                const newOptions = fetchedOptions.filter((opt) => !existingValues.has(opt.value))
                return [...prev, ...newOptions]
              })
            })
            .catch(() => {
              // Error loading initial options - silently fail
            })
        }

        // Return current state (don't modify here, let the next useEffect handle cleanup)
        return prevInitialOptions
      })
    }, [selectedValues, itemsMap, loadInitialOptions])

    // Clean up initialOptions that are no longer needed
    useEffect(() => {
      const values = Array.isArray(selectedValues)
        ? selectedValues
        : selectedValues !== null && selectedValues !== undefined
          ? [selectedValues]
          : []

      setInitialOptions((prev) => {
        const selectedValuesSet = new Set(values)
        // Clear initialOptions that are no longer selected or are now in items
        // Check with type conversion (string <-> number) for proper matching
        return prev.filter((opt) => {
          const isSelected =
            selectedValuesSet.has(opt.value) ||
            (typeof opt.value === 'string' && !isNaN(Number(opt.value))
              ? selectedValuesSet.has(Number(opt.value))
              : false) ||
            (typeof opt.value === 'number' ? selectedValuesSet.has(String(opt.value)) : false)
          const isInItems =
            itemsMap.has(opt.value) ||
            (typeof opt.value === 'string' && !isNaN(Number(opt.value))
              ? itemsMap.has(Number(opt.value))
              : false) ||
            (typeof opt.value === 'number' ? itemsMap.has(String(opt.value)) : false)
          return isSelected && !isInItems
        })
      })
    }, [selectedValues, itemsMap])

    useEffect(() => {
      const values = Array.isArray(selectedValues)
        ? selectedValues
        : selectedValues !== null && selectedValues !== undefined
          ? [selectedValues]
          : []

      const newSelectedOptions = values
        .map((v) => {
          // Try to find option with exact match first
          let foundOption = allOptionsMap.get(v)

          // If not found, try with type conversion (string <-> number)
          if (!foundOption) {
            if (typeof v === 'number') {
              foundOption = allOptionsMap.get(String(v))
            } else if (typeof v === 'string') {
              const numVal = Number(v)
              if (!isNaN(numVal)) {
                foundOption = allOptionsMap.get(numVal)
              }
            }
          }

          // Only show option if it exists in the list; otherwise show placeholder (don't add synthetic option)
          return foundOption ?? null
        })
        .filter((opt): opt is SelectOption => opt != null)

      setSelectedOptions(newSelectedOptions)
    }, [selectedValues, allOptionsMap])

    // Sync with external props
    useEffect(() => {
      if (options) {
        setItems(Array.isArray(options) ? options : [])
      }
    }, [options])

    useEffect(() => {
      if (hasNextPage !== undefined) setHasNext(hasNextPage)
    }, [hasNextPage])

    useEffect(() => {
      if (isLoading !== undefined) setLoading(isLoading)
    }, [isLoading])

    // Internal fetch mode: only fetch when dropdown is open to avoid unnecessary API calls on mount
    useEffect(() => {
      if (!loadOptions || !isOpen) return

      setLoading(true)
      setCurrentPage(1)

      loadOptions({ query: debouncedQuery, page: 1, pageSize })
        .then((result) => {
          setItems(Array.isArray(result.items) ? result.items : [])
          // Store nextPage from API response for next load more call
          // If no nextPage, keep it at 1 (no more pages)
          setCurrentPage(result.nextPage ?? 1)
          setHasNext(!!result.hasNextPage)
        })
        .catch(() => {
          // Error loading options - silently fail
        })
        .finally(() => setLoading(false))
    }, [isOpen, debouncedQuery, loadOptions, pageSize])

    // Load more handler
    const loadMore = useCallback(() => {
      if (loading || !hasNext) {
        return
      }

      if (loadOptions) {
        setLoading(true)

        // Use currentPage which contains the nextPage from previous API response
        // This ensures we use the exact page number from API's next URL
        const pageToLoad = currentPage
        loadOptions({ query: debouncedQuery, page: pageToLoad, pageSize })
          .then((result) => {
            setItems((prev) => [
              ...(Array.isArray(prev) ? prev : []),
              ...(Array.isArray(result.items) ? result.items : []),
            ])
            // Update currentPage with nextPage from API response (parsed from next URL)
            // This ensures we use the exact page number from API for next load
            if (result.nextPage) {
              setCurrentPage(result.nextPage)
            } else {
              // If no nextPage, keep current page (no more pages available)
              setCurrentPage(pageToLoad)
            }
            setHasNext(!!result.hasNextPage)
          })
          .catch(() => {
            // Error loading more options - silently fail
          })
          .finally(() => setLoading(false))
      } else {
        onLoadMore?.()
      }
    }, [loading, hasNext, loadOptions, debouncedQuery, currentPage, pageSize, onLoadMore])

    // Removed useInfiniteScroll hook - now using react-infinite-scroll-component

    // 4) Selection handlers
    const toggleOption = useCallback(
      (option: SelectOption) => {
        if (option.disabled) return
        const optionValue = option.value
        const currentValues = Array.isArray(selectedValues)
          ? selectedValues
          : selectedValues !== null && selectedValues !== undefined
            ? [selectedValues]
            : []
        const isSelected = currentValues.includes(optionValue)

        let newValues: (string | number) | (string | number)[] | null

        if (multiple) {
          if (isSelected) {
            newValues = currentValues.filter((v) => v !== optionValue)
          } else {
            newValues = [...currentValues, optionValue]
          }
          onChangeOption?.(option)
        } else {
          newValues = isSelected ? null : optionValue
          onChangeOption?.(isSelected ? null : option)
          setIsOpen(false) // Close on single select
        }
        setSelectedValues(newValues as any)
      },
      [multiple, onChangeOption, selectedValues, setIsOpen, setSelectedValues]
    )

    const clearSelection = useCallback(() => {
      setSelectedValues(multiple ? [] : null)
      onChangeOption?.(null)
    }, [multiple, onChangeOption, setSelectedValues])

    // 5) Trigger display variants
    const hasSelectedValue = selectedOptions.length > 0
    const showClearButton = clearable && !multiple && hasSelectedValue && !disabled

    const renderTriggerContent = () => {
      const currentSelected = selectedOptions || []

      if (renderTrigger) {
        return renderTrigger({
          selected: currentSelected,
          open: !!isOpen,
          clear: clearSelection,
        })
      }

      if (triggerVariant === 'chips') {
        if (currentSelected.length === 0) {
          return <span className="text-content-light-4">{placeholder}</span>
        }

        const visibleChips = currentSelected.slice(0, maxChips)
        const remainingCount = currentSelected.length - maxChips

        return (
          <div className="flex flex-wrap items-center gap-1">
            {visibleChips.map((item, index) => (
              <span
                key={index}
                className={cn(
                  'inline-flex items-center',
                  'px-2 py-1',
                  'rounded-full',
                  'typo-body-sm',
                  'bg-content-light-2'
                )}
              >
                <IconX
                  size={10}
                  className={'hover:text-content-light-1 cursor-pointer'}
                  onClick={(e) => {
                    e.stopPropagation()
                    const optionValue = item.value
                    const newSelectedValues = (
                      Array.isArray(selectedValues)
                        ? selectedValues
                        : selectedValues !== null && selectedValues !== undefined
                          ? [selectedValues]
                          : []
                    ).filter((v) => v !== optionValue)
                    setSelectedValues(newSelectedValues)
                  }}
                />
                &nbsp;{item.label}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="text-muted-foreground text-xs">+{remainingCount}</span>
            )}
          </div>
        )
      }

      if (triggerVariant === 'count') {
        if (currentSelected.length === 0) {
          return <span className="text-muted-foreground">{placeholder}</span>
        }

        if (multiple) {
          return <span>Đã chọn {currentSelected.length}</span>
        } else {
          return (
            <span className={'block truncate'} title={currentSelected[0]?.label}>
              {currentSelected[0]?.label}
            </span>
          )
        }
      }

      return <span className="text-muted-foreground">{placeholder}</span>
    }

    const handleClearSelection = useCallback(
      (event?: React.SyntheticEvent) => {
        event?.preventDefault()
        event?.stopPropagation()
        clearSelection()
      },
      [clearSelection]
    )

    const handleClearSelectionKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLSpanElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return
        }
        handleClearSelection(event)
      },
      [handleClearSelection]
    )

    // Handle search change
    const handleSearchChange = (newQuery: string) => {
      setQuery(newQuery)
      onSearchChange?.(newQuery)
      setFocusedIndex(-1) // Reset focused index when search changes
    }

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!isOpen || allAvailableOptions.length === 0) return

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault()
            setFocusedIndex((prev) => {
              const next = prev < allAvailableOptions.length - 1 ? prev + 1 : prev
              // Scroll into view
              setTimeout(() => {
                const element = scrollContainerRef.current?.querySelector(
                  `[data-option-index="${next}"]`
                )
                element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
              }, 0)
              return next
            })
            break
          case 'ArrowUp':
            e.preventDefault()
            setFocusedIndex((prev) => {
              const next = prev > 0 ? prev - 1 : 0
              // Scroll into view
              setTimeout(() => {
                const element = scrollContainerRef.current?.querySelector(
                  `[data-option-index="${next}"]`
                )
                element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
              }, 0)
              return next
            })
            break
          case 'Enter':
            e.preventDefault()
            if (focusedIndex >= 0 && focusedIndex < allAvailableOptions.length) {
              const focusedOption = allAvailableOptions[focusedIndex]
              if (!focusedOption.disabled) {
                toggleOption(focusedOption)
              }
            }
            break
          case 'Escape':
            e.preventDefault()
            setIsOpen(false)
            break
        }
      },
      [isOpen, allAvailableOptions, focusedIndex, toggleOption, setIsOpen]
    )

    // Auto-focus selected option once per open session (supports async options).
    useEffect(() => {
      if (!isOpen) {
        setFocusedIndex(-1)
        hasAutoFocusedOnOpenRef.current = false
        return
      }
      if (multiple || hasAutoFocusedOnOpenRef.current || selectedOptions.length === 0) {
        return
      }

      const firstSelectedValue = selectedOptions[0].value
      const index = allAvailableOptions.findIndex((opt) => opt.value === firstSelectedValue)
      if (index === -1) {
        return
      }

      setFocusedIndex(index)
      hasAutoFocusedOnOpenRef.current = true

      setTimeout(() => {
        const element = scrollContainerRef.current?.querySelector(`[data-option-index="${index}"]`)
        element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }, 100)
    }, [isOpen, allAvailableOptions, selectedOptions])

    return (
      <div ref={ref} className={cn(`flex w-full flex-col gap-2`, wrapperClassName)}>
        {(label || subtitle) && (
          <div className="flex flex-col gap-1">
            {label && (
              <div className="flex items-center gap-0.5">
                <label htmlFor={name} className="typo-body-base-semibold text-neutral-90">
                  {label}
                </label>
                {required && (
                  <span className="typo-body-base-semibold text-action-primary-red-default">*</span>
                )}
              </div>
            )}
            {subtitle && <span className="typo-body-sm-regular text-neutral-80">{subtitle}</span>}
          </div>
        )}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={triggerRef}
              type="button"
              variant="secondary-border"
              role="combobox"
              aria-expanded={isOpen}
              disabled={disabled}
              rightIcon={
                <div className="flex items-center gap-1">
                  {showClearButton && (
                    <>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Clear selection"
                        className={cn(
                          !selectedOptions?.length ? 'text-content-light-4' : 'text-content-dark-1',
                          'hover:text-content-dark-3',
                          'focus-visible:text-content-dark-1',
                          'transition-colors',
                          'focus-visible:outline-none'
                        )}
                        onClick={handleClearSelection}
                        onKeyDown={handleClearSelectionKeyDown}
                      >
                        <IconX size={iconSize} />
                      </span>
                      <Separator orientation={'vertical'} />
                    </>
                  )}
                  <IconCaretdown size={iconSize} />
                </div>
              }
              className={cn(
                'w-full justify-between text-left font-normal',
                'border-border-1',
                !selectedOptions?.length && 'text-content-light-4',
                disabled &&
                  '!text-content-dark-4 !bg-data-light-grey-disabled !border-neutral-60 !opacity-100',
                className
              )}
              title={title}
              name={name}
              id={name} // Add id attribute
            >
              {renderTriggerContent()}
            </Button>
          </PopoverTrigger>
          <PopoverContentPrimitive
            align="start"
            style={
              dropdownAutoWidth
                ? { minWidth: width ? `${width}px` : undefined }
                : { width: width ? `${width}px` : undefined }
            }
            className={cn(
              'bg-content-light-1',
              'border-border-1',
              dropdownAutoWidth ? 'w-max max-w-[32rem]' : 'w-full',
              'p-0',
              'z-60'
            )}
            onKeyDown={handleKeyDown}
          >
            <Command className={'p-0'}>
              {(enableSearch || loadOptions || onSearchChange) && (
                <CommandInput
                  placeholder={searchPlaceholder}
                  value={query}
                  onValueChange={handleSearchChange}
                  className={'h-9'}
                  classNameWrapper={cn('bg-content-light-1', 'border-border-1')}
                />
              )}
              <div
                ref={scrollContainerRef}
                id={OPTIONS_CONTAINER_ID}
                className={cn('relative', 'max-h-[300px] overflow-y-auto')}
                onWheel={(e) => {
                  e.stopPropagation()
                }}
                onTouchMove={(e) => {
                  e.stopPropagation()
                }}
              >
                <InfiniteScroll
                  key={isOpen ? 'open' : 'closed'}
                  dataLength={Array.isArray(items) ? items.length : 0}
                  next={loadMore}
                  hasMore={hasNext}
                  loader={<LoadingRow />}
                  scrollableTarget={OPTIONS_CONTAINER_ID}
                  scrollThreshold="100px"
                >
                  {loading && allAvailableOptions.length === 0 ? (
                    <div className="text-content-dark-3 flex items-center justify-center gap-2 py-6">
                      <span className="border-primary h-4 w-4 animate-spin rounded-full border-b-2" />
                      <span className="typo-body-sm-regular">Đang tải…</span>
                    </div>
                  ) : (
                    <CommandEmpty>
                      {renderEmpty ? renderEmpty(query) : 'No results found.'}
                    </CommandEmpty>
                  )}
                  <CommandGroup>
                    {allAvailableOptions.map((option, index) => {
                      const optionValue = option.value
                      const currentSelected = selectedOptions || []
                      const isSelected = currentSelected.some((item) => item.value === optionValue)
                      const isFocused = index === focusedIndex

                      return (
                        <CommandItem
                          key={optionValue}
                          value={String(option.optionLabel ?? option.label)}
                          onSelect={() => !option.disabled && toggleOption(option)}
                          onPointerDown={(e) => {
                            if (multiple) {
                              e.preventDefault()
                            }
                          }}
                          data-option-index={index}
                          className={cn(
                            'cursor-pointer',
                            !multiple && isSelected && 'bg-data-red-default text-content-light-1',
                            isFocused &&
                              !option.disabled &&
                              'bg-action-primary-red-focus text-content-light-1',
                            option.disabled && 'pointer-events-none cursor-not-allowed opacity-40'
                          )}
                        >
                          {multiple && (
                            <IconCheck
                              className={cn(
                                'mr-2 h-4 w-4',
                                isSelected ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                          )}
                          {option.optionLabel ?? option.label}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </InfiniteScroll>
              </div>
              {menuFooter && (
                <>
                  <Separator />
                  <div className="p-0">{menuFooter}</div>
                </>
              )}
            </Command>
          </PopoverContentPrimitive>
        </Popover>
        <FormCaption error={error} disabled={disabled} />
      </div>
    )
  }
)

Select.displayName = 'Select'

function LoadingRow() {
  return (
    <div className="flex items-center justify-center py-2">
      <div className="border-primary h-4 w-4 animate-spin rounded-full border-b-2"></div>
    </div>
  )
}

export default Select
