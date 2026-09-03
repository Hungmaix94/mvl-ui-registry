import { useState, useEffect } from 'react'

/**
 * Hook for creating controllable state that can be controlled externally or internally
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: {
  value?: T
  defaultValue?: T
  onChange?: (value: T) => void
}) {
  const [internalValue, setInternalValue] = useState<T | undefined>(defaultValue)

  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue

  const setValue = (newValue: T) => {
    if (!isControlled) {
      setInternalValue(newValue)
    }
    onChange?.(newValue)
  }

  // Sync internal value when defaultValue changes
  useEffect(() => {
    if (!isControlled && defaultValue !== undefined) {
      setInternalValue(defaultValue)
    }
  }, [defaultValue, isControlled])

  return [currentValue, setValue] as const
}
