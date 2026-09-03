import React, { useCallback, useEffect, useState } from 'react'
import { useDebounceValue } from 'usehooks-ts'
import InfiniteScroll from 'react-infinite-scroll-component'
import { cn } from '@/lib/utils'
import { Command, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { TextField } from '@/components/ui'
import useMatchTriggerWidth from '@/hooks/useMatchTriggerWidth'
import { FormCaption } from '@/components/ui/form'
import { SearchIcon, X } from 'lucide-react'
import { useControllableState } from '@/hooks/useControllableState.ts'

const OPTIONS_CONTAINER_ID = 'searchable-input-options-scroll'

export type Suggestion = {
  label: string
  value: string | number
}

export type LoadSuggestionsParams = {
  query: string
  cursor?: string | number | null
  page?: number
  pageSize?: number
}

export type LoadSuggestionsResult<Suggestion> = {
  items: Suggestion[]
  nextCursor?: string | number | null
  hasNextPage?: boolean
}

export type SearchableInputProps<Suggestion> = {
  name?: string
  label?: string
  subtitle?: string
  required?: boolean
  onChange?: (next: string | number | null) => void
  onSelect?: (item: Suggestion) => void

  loadSuggestions?: (params: LoadSuggestionsParams) => Promise<LoadSuggestionsResult<Suggestion>>
  pageSize?: number

  debounceMs?: number
  searchPlaceholder?: string
  onSearchChange?: (q: string) => void

  className?: string
  wrapperClassName?: string
  disabled?: boolean
  error?: string
  value?: string
  clearable?: boolean
  onClear?: () => void
}

const SearchableInput = React.forwardRef<HTMLDivElement, SearchableInputProps<Suggestion>>(
  (
    {
      label,
      name,
      subtitle,
      required,
      onChange,
      onSelect,
      loadSuggestions,
      pageSize = 20,
      debounceMs = 300,
      searchPlaceholder = 'Search...',
      onSearchChange,
      className,
      wrapperClassName,
      disabled = false,
      error,
      value,
      clearable,
      onClear,
    },
    ref
  ) => {
    const { triggerRef, width } = useMatchTriggerWidth<HTMLInputElement>()

    const [query, setQuery] = useControllableState({ defaultValue: value })
    const [debouncedQuery] = useDebounceValue(query, debounceMs)

    const [items, setItems] = useState<Suggestion[]>([])
    const [cursor, setCursor] = useState<string | number | null>(null)
    const [hasNext, setHasNext] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)

    useEffect(() => {
      if (!loadSuggestions) return

      setLoading(true)
      setCursor(null)

      loadSuggestions({ query: debouncedQuery || '', page: 1, pageSize })
        .then((result) => {
          setItems(result.items)
          setCursor(result.nextCursor ?? null)
          setHasNext(!!result.hasNextPage)
        })
        .catch((error) => {
          console.error('Error loading suggestions:', error)
        })
        .finally(() => setLoading(false))
    }, [debouncedQuery, loadSuggestions, pageSize])

    const loadMore = useCallback(() => {
      if (loading || !hasNext || !loadSuggestions) {
        return
      }

      setLoading(true)

      loadSuggestions({ query: debouncedQuery || '', cursor, pageSize })
        .then((result) => {
          setItems((prev) => [...prev, ...result.items])
          setCursor(result.nextCursor ?? null)
          setHasNext(!!result.hasNextPage)
        })
        .catch((error) => {
          console.error('Error loading more suggestions:', error)
        })
        .finally(() => setLoading(false))
    }, [loading, hasNext, loadSuggestions, debouncedQuery, cursor, pageSize])

    const [isOpen, setIsOpen] = useState(false)

    const handleFocus = () => {
      setIsOpen(true)
    }

    const handleBlur = () => {
      // Delay closing to allow for click events on suggestions
      setTimeout(() => {
        setIsOpen(false)
      }, 200)
    }

    const handleSelect = (item: Suggestion) => {
      setQuery(item.label)
      onChange?.(item.value)
      onSelect?.(item)
      setIsOpen(false)
    }

    const handleSearchChange = (newQuery: string) => {
      setQuery(newQuery)
      onSearchChange?.(newQuery)
      if (!isOpen) {
        setIsOpen(true)
      }
    }

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation()
      setQuery('')
      onChange?.(null)
      onSearchChange?.('')
      onClear?.()
    }

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
        <div className="relative">
          <TextField
            ref={triggerRef}
            placeholder={searchPlaceholder}
            value={query}
            onChange={handleSearchChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn('h-9', className)}
            disabled={disabled}
            name={name}
            id={name}
            suffix={
              <div className="flex items-center gap-1.5">
                {clearable && query && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="hover:bg-neutral-20 text-neutral-80 rounded-full p-0.5 transition-colors"
                  >
                    <X className="size-4 shrink-0" />
                  </button>
                )}
                <SearchIcon className="size-4 shrink-0 opacity-50" />
              </div>
            }
          />
          {isOpen && (
            <div
              className={cn(
                'bg-content-light-1 border-border-1 absolute top-full z-50 mt-1 w-full rounded-md border p-0 shadow-md'
              )}
            >
              <Command className={'w-full p-0'}>
                <div
                  id={OPTIONS_CONTAINER_ID}
                  className={cn('relative', 'max-h-[300px] overflow-y-auto')}
                  style={{ width: width ? `${width}px` : undefined }}
                >
                  <InfiniteScroll
                    dataLength={items.length}
                    next={loadMore}
                    hasMore={hasNext}
                    loader={<LoadingRow />}
                    scrollableTarget={OPTIONS_CONTAINER_ID}
                    scrollThreshold="100px"
                  >
                    {loading && items.length === 0 ? (
                      <LoadingRow />
                    ) : (
                      <>
                        <CommandEmpty>Không tìm thấy bản ghi</CommandEmpty>
                        <CommandGroup>
                          {items.map((item) => (
                            <CommandItem
                              key={item.value}
                              value={String(item.label)}
                              onSelect={() => handleSelect(item)}
                              className="cursor-pointer overflow-hidden"
                            >
                              <span className="block w-full truncate">{item.label}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </InfiniteScroll>
                </div>
              </Command>
            </div>
          )}
        </div>
        <FormCaption error={error} disabled={disabled} />
      </div>
    )
  }
)

SearchableInput.displayName = 'SearchableInput'

function LoadingRow() {
  return (
    <div className="flex items-center justify-center py-2">
      <div className="border-primary h-4 w-4 animate-spin rounded-full border-b-2"></div>
    </div>
  )
}

export default SearchableInput
