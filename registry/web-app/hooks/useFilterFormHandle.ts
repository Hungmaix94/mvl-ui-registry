import { useImperativeHandle, useState, type Ref } from 'react'
import type { FieldValues, UseFormGetValues, UseFormReset } from 'react-hook-form'

export type FilterFormHandle<TValues> = {
  /** "Xoá bộ lọc" in the dialog footer — empties the form without touching the URL. */
  clearForm: () => void
  /** "Xác nhận" reads the form through this; the page writes the URL itself. */
  getValues: () => TValues
}

type Options<TValues extends FieldValues> = {
  reset: UseFormReset<TValues>
  getValues: UseFormGetValues<TValues>
  /** Written on "Xoá bộ lọc" — every field explicitly `undefined`. Keep it module-level. */
  emptyValues: TValues
}

/**
 * Shared plumbing for the `<AppDialog variant="filter">` forms of the report pages.
 *
 * Deliberately has **no effect re-syncing `initialValues`**: every page remounts the whole form
 * via `key={filterDialogOpenKey}` on each dialog open, so `defaultValues` is always fresh and the
 * props cannot go stale while mounted. An effect here would only fire once per mount to `reset()`
 * back to the values RHF already holds.
 *
 * Returns:
 * - `formKey` — bump-to-remount key for children that keep their own internal state and therefore
 *   ignore an RHF `reset` (DateRangePicker, the org cascade).
 * - `hasCleared` — tells those children to drop their `initialValues` for the rest of this dialog
 *   session, so a remount lands them empty instead of back on the URL values.
 */
export function useFilterFormHandle<TValues extends FieldValues>(
  ref: Ref<FilterFormHandle<TValues>>,
  { reset, getValues, emptyValues }: Options<TValues>
) {
  const [formKey, setFormKey] = useState(0)
  const [hasCleared, setHasCleared] = useState(false)

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        setHasCleared(true)
        setFormKey((prev) => prev + 1)
        reset(emptyValues)
      },
      getValues: () => getValues(),
    }),
    [emptyValues, getValues, reset]
  )

  return { formKey, hasCleared }
}

export default useFilterFormHandle
