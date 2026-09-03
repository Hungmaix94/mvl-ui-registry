import { createRef } from 'react'
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  /** Props of every `CascadeSelectGroupOrganization` render, newest last. */
  cascadeProps: [] as Array<Record<string, any>>,
  /** Incremented on each cascade MOUNT — proves the `formKey` remount actually happened. */
  cascadeMounts: 0,
  /** `{ name, fieldProps }` of every `FormController` render, newest last. */
  fields: [] as Array<{ name: string; fieldProps: Record<string, any> }>,
}))

// The cascade fetches the whole org chart on mount; stub it and record what it is handed.
vi.mock('@/components/commons/filters/CascadeSelectGroupOrganization', async () => {
  const { useEffect } = await import('react')
  return {
    CascadeSelectGroupOrganization: (props: Record<string, any>) => {
      h.cascadeProps.push(props)
      useEffect(() => {
        h.cascadeMounts += 1
      }, [])
      return null
    },
  }
})

// FormController owns the RHF <-> DateRangePicker plumbing; stub it so the test can fire
// `onChange` directly and assert what lands in form state. `name` is captured too — the
// form now has more than one DateRangePicker field, so "the last one rendered" is no
// longer a safe way to address a specific one.
vi.mock('@/components/ui/form/FormController', () => ({
  default: (props: Record<string, any>) => {
    h.fields.push({ name: props.name, fieldProps: props.fieldProps })
    return null
  },
}))

import TkkdReportFilterForm, { type TkkdReportFilterFormRef } from './TkkdReportFilterForm'

const latestCascade = () => h.cascadeProps[h.cascadeProps.length - 1]
/** Latest render of the field bound to `name`. */
const field = (name: string) => {
  const matches = h.fields.filter((f) => f.name === name)
  return matches[matches.length - 1].fieldProps
}

beforeEach(() => {
  h.cascadeProps.length = 0
  h.fields.length = 0
  h.cascadeMounts = 0
})

describe('TkkdReportFilterForm', () => {
  it('hydrates from initialValues so reopening the dialog shows what is in the URL', () => {
    const ref = createRef<TkkdReportFilterFormRef>()
    render(
      <TkkdReportFilterForm
        ref={ref}
        initialValues={{
          contractDateFrom: new Date(2026, 6, 1),
          contractDateTo: new Date(2026, 6, 31),
          branch: '3',
          block: '5',
        }}
      />
    )

    expect(ref.current?.getValues()).toEqual({
      contractDateFrom: new Date(2026, 6, 1),
      contractDateTo: new Date(2026, 6, 31),
      transactionSheetDateFrom: undefined,
      transactionSheetDateTo: undefined,
      branch: '3',
      block: '5',
      department: undefined,
    })
    // The cascade cannot read RHF state — it must be handed the same values separately.
    expect(latestCascade().initialValues).toMatchObject({ branch: '3', block: '5' })
  })

  it('hydrates the transaction-sheet date range independently from the contract sign-date range', () => {
    const ref = createRef<TkkdReportFilterFormRef>()
    render(
      <TkkdReportFilterForm
        ref={ref}
        initialValues={{
          contractDateFrom: new Date(2026, 6, 1),
          contractDateTo: new Date(2026, 6, 31),
          transactionSheetDateFrom: new Date(2026, 7, 1),
          transactionSheetDateTo: new Date(2026, 7, 15),
        }}
      />
    )

    expect(ref.current?.getValues()).toMatchObject({
      contractDateFrom: new Date(2026, 6, 1),
      contractDateTo: new Date(2026, 6, 31),
      transactionSheetDateFrom: new Date(2026, 7, 1),
      transactionSheetDateTo: new Date(2026, 7, 15),
    })
    expect(field('transactionSheetDateFrom').label).toBe('Ngày làm phiếu TTGD')
    expect(field('transactionSheetDateFrom').value).toEqual({
      from: new Date(2026, 7, 1),
      to: new Date(2026, 7, 15),
    })
    // The contract sign-date range field must be unaffected.
    expect(field('contractDateFrom').value).toEqual({
      from: new Date(2026, 6, 1),
      to: new Date(2026, 6, 31),
    })
  })

  it('normalises the numeric org ids the cascade emits into the string ids the URL stores', () => {
    const ref = createRef<TkkdReportFilterFormRef>()
    render(<TkkdReportFilterForm ref={ref} />)

    act(() => {
      latestCascade().onFormChange({ branch_id: 3, block_id: 5, department_id: 9 })
    })

    expect(ref.current?.getValues()).toMatchObject({
      branch: '3',
      block: '5',
      department: '9',
    })
  })

  it('treats a cleared org level as absent rather than the string "0"', () => {
    const ref = createRef<TkkdReportFilterFormRef>()
    render(<TkkdReportFilterForm ref={ref} initialValues={{ branch: '3', block: '5' }} />)

    act(() => {
      latestCascade().onFormChange({ branch_id: 3, block_id: undefined })
    })

    expect(ref.current?.getValues()).toMatchObject({ branch: '3', block: undefined })
  })

  // The cascade re-emits on every one of its own renders. Writing identical values back
  // would bounce it, so `useOrgCascadeSync` must no-op on an unchanged emission.
  it('does not re-render the cascade when it re-emits the values already in state', () => {
    const ref = createRef<TkkdReportFilterFormRef>()
    render(<TkkdReportFilterForm ref={ref} />)

    act(() => {
      latestCascade().onFormChange({ branch_id: 3 })
    })
    const rendersAfterFirstEmit = h.cascadeProps.length

    act(() => {
      latestCascade().onFormChange({ branch_id: 3 })
      latestCascade().onFormChange({ branch_id: 3 })
    })

    expect(h.cascadeProps.length).toBe(rendersAfterFirstEmit)
    expect(ref.current?.getValues()).toMatchObject({ branch: '3' })
  })

  it('writes both ends of the contract sign-date range from a single picker change', () => {
    const ref = createRef<TkkdReportFilterFormRef>()
    render(<TkkdReportFilterForm ref={ref} />)

    act(() => {
      field('contractDateFrom').onChange({ from: new Date(2026, 6, 1), to: new Date(2026, 6, 31) })
    })

    expect(ref.current?.getValues()).toMatchObject({
      contractDateFrom: new Date(2026, 6, 1),
      contractDateTo: new Date(2026, 6, 31),
    })
  })

  it('writes both ends of the transaction-sheet date range from a single picker change', () => {
    const ref = createRef<TkkdReportFilterFormRef>()
    render(<TkkdReportFilterForm ref={ref} />)

    act(() => {
      field('transactionSheetDateFrom').onChange({
        from: new Date(2026, 7, 1),
        to: new Date(2026, 7, 15),
      })
    })

    expect(ref.current?.getValues()).toMatchObject({
      transactionSheetDateFrom: new Date(2026, 7, 1),
      transactionSheetDateTo: new Date(2026, 7, 15),
    })
  })

  it('keeps the contract sign-date range and the transaction-sheet date range independent when both are set', () => {
    const ref = createRef<TkkdReportFilterFormRef>()
    render(<TkkdReportFilterForm ref={ref} />)

    act(() => {
      field('contractDateFrom').onChange({ from: new Date(2026, 6, 1), to: new Date(2026, 6, 31) })
      field('transactionSheetDateFrom').onChange({
        from: new Date(2026, 7, 1),
        to: new Date(2026, 7, 15),
      })
    })

    expect(ref.current?.getValues()).toMatchObject({
      contractDateFrom: new Date(2026, 6, 1),
      contractDateTo: new Date(2026, 6, 31),
      transactionSheetDateFrom: new Date(2026, 7, 1),
      transactionSheetDateTo: new Date(2026, 7, 15),
    })
  })

  it('clears every field AND remounts the cascade empty on "Xoá bộ lọc"', () => {
    const ref = createRef<TkkdReportFilterFormRef>()
    render(
      <TkkdReportFilterForm
        ref={ref}
        initialValues={{
          contractDateFrom: new Date(2026, 6, 1),
          transactionSheetDateFrom: new Date(2026, 7, 1),
          branch: '3',
          block: '5',
        }}
      />
    )
    const mountsBefore = h.cascadeMounts

    act(() => ref.current?.clearForm())

    expect(ref.current?.getValues()).toEqual({
      contractDateFrom: undefined,
      contractDateTo: undefined,
      transactionSheetDateFrom: undefined,
      transactionSheetDateTo: undefined,
      branch: undefined,
      block: undefined,
      department: undefined,
    })
    // Clearing RHF state is not enough — the cascade keeps its own selection, so it has to
    // remount, and it must not be re-seeded with the values the user just cleared.
    expect(h.cascadeMounts).toBe(mountsBefore + 1)
    expect(latestCascade().initialValues).toBeUndefined()
  })

  it('keeps the cascade empty when it re-emits after a clear', () => {
    const ref = createRef<TkkdReportFilterFormRef>()
    render(<TkkdReportFilterForm ref={ref} initialValues={{ branch: '3' }} />)

    act(() => ref.current?.clearForm())
    act(() => {
      latestCascade().onFormChange({ branch_id: undefined })
    })

    expect(ref.current?.getValues().branch).toBeUndefined()
  })
})
