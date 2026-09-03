import { createRef } from 'react'
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  cascadeProps: [] as Array<Record<string, any>>,
  cascadeMounts: 0,
}))

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

import DepositCumulativeFilterForm, {
  type DepositCumulativeFilterFormRef,
} from './DepositCumulativeFilterForm'

const latestCascade = () => h.cascadeProps[h.cascadeProps.length - 1]

beforeEach(() => {
  h.cascadeProps.length = 0
  h.cascadeMounts = 0
})

describe('DepositCumulativeFilterForm', () => {
  it('hydrates the org levels from the URL-backed initialValues', () => {
    const ref = createRef<DepositCumulativeFilterFormRef>()
    render(<DepositCumulativeFilterForm ref={ref} initialValues={{ branch: '3', block: '5' }} />)

    expect(ref.current?.getValues()).toEqual({
      branch: '3',
      block: '5',
      department: undefined,
      transactionSheetDateRange: null,
    })
    expect(latestCascade().initialValues).toMatchObject({ branch: '3', block: '5' })
  })

  it('normalises the numeric org ids the cascade emits into strings', () => {
    const ref = createRef<DepositCumulativeFilterFormRef>()
    render(<DepositCumulativeFilterForm ref={ref} />)

    act(() => {
      latestCascade().onFormChange({ branch_id: 3, block_id: 5, department_id: 9 })
    })

    expect(ref.current?.getValues()).toEqual({
      branch: '3',
      block: '5',
      department: '9',
      transactionSheetDateRange: null,
    })
  })

  it('clears every level AND remounts the cascade empty on "Xoá bộ lọc"', () => {
    const ref = createRef<DepositCumulativeFilterFormRef>()
    render(
      <DepositCumulativeFilterForm
        ref={ref}
        initialValues={{ branch: '3', block: '5', department: '9' }}
      />
    )
    const mountsBefore = h.cascadeMounts

    act(() => ref.current?.clearForm())

    expect(ref.current?.getValues()).toEqual({
      branch: undefined,
      block: undefined,
      department: undefined,
      transactionSheetDateRange: null,
    })
    expect(h.cascadeMounts).toBe(mountsBefore + 1)
    expect(latestCascade().initialValues).toBeUndefined()
  })

  it('never renders the employee/position levels — they are not report filters', () => {
    render(<DepositCumulativeFilterForm />)

    expect(latestCascade()).toMatchObject({
      showEmployee: false,
      showPosition: false,
      skipValidation: true,
    })
  })
})

describe('DepositCumulativeFilterForm — Ngày làm phiếu TTGD (độc lập với tổ chức)', () => {
  it('renders the field labeled "Ngày làm phiếu TTGD"', () => {
    const { getByText } = render(<DepositCumulativeFilterForm />)

    expect(getByText('Ngày làm phiếu TTGD')).toBeInTheDocument()
  })

  it('hydrates transactionSheetDateRange independently from the org levels', () => {
    const ref = createRef<DepositCumulativeFilterFormRef>()
    render(
      <DepositCumulativeFilterForm
        ref={ref}
        initialValues={{
          branch: '3',
          transactionSheetDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 15) },
        }}
      />
    )

    expect(ref.current?.getValues()).toEqual({
      branch: '3',
      block: undefined,
      department: undefined,
      transactionSheetDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 15) },
    })
    // The org cascade must be unaffected by the new field being present too.
    expect(latestCascade().initialValues).toMatchObject({ branch: '3' })
  })

  it('clearForm xoá luôn transactionSheetDateRange, không chỉ tổ chức', () => {
    const ref = createRef<DepositCumulativeFilterFormRef>()
    render(
      <DepositCumulativeFilterForm
        ref={ref}
        initialValues={{
          branch: '3',
          transactionSheetDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 15) },
        }}
      />
    )

    act(() => ref.current?.clearForm())

    expect(ref.current?.getValues().transactionSheetDateRange).toBeNull()
  })
})
