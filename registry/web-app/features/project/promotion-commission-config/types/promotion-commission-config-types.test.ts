import { describe, it, expect } from 'vitest'

import {
  buildConfigRequest,
  getInvalidContributionGroups,
  mapConfigToForm,
  type PromotionConfigFormValues,
} from './promotion-commission-config-types'
import type { ProjectPromotionCommissionConfig } from '@/features/project/promotion-commission-config/services/promotion-commission-config-service'

const emptyForm: PromotionConfigFormValues = {
  pct_promotion_revenue: '',
  pct_relationship: null,
  pct_planning: null,
  pct_packaging: null,
  pct_sales_support: null,
  pct_coordination: null,
  note: '',
  groups: [
    { pct_type: 'pct_relationship', recipients: [] },
    { pct_type: 'pct_planning', recipients: [] },
    { pct_type: 'pct_packaging', recipients: [] },
    { pct_type: 'pct_sales_support', recipients: [] },
    { pct_type: 'pct_coordination', recipients: [] },
  ],
}

describe('buildConfigRequest', () => {
  it('flattens groups into recipients with the correct pct_type and strips display-only *_name fields', () => {
    const values: PromotionConfigFormValues = {
      ...emptyForm,
      pct_relationship: '10',
      groups: emptyForm.groups.map((g) =>
        g.pct_type === 'pct_relationship'
          ? {
              pct_type: 'pct_relationship',
              recipients: [
                {
                  department: 5,
                  department_name: 'Phòng A',
                  contribution_level: '50',
                },
              ],
            }
          : g
      ),
    }

    const req = buildConfigRequest(values)

    expect(req.recipients).toHaveLength(1)
    // Only the smallest chosen org level (department) is persisted; branch/block are dropped.
    expect(req.recipients?.[0]).toEqual({
      pct_type: 'pct_relationship',
      contribution_level: '50',
      department: 5,
    })
    // department_name must not leak into the request body
    expect(req.recipients?.[0]).not.toHaveProperty('department_name')
  })

  it('persists only the smallest chosen org level (drops branch/block when department is set)', () => {
    const values: PromotionConfigFormValues = {
      ...emptyForm,
      groups: emptyForm.groups.map((g) =>
        g.pct_type === 'pct_relationship'
          ? {
              pct_type: 'pct_relationship',
              recipients: [
                { branch: 3, block: 7, department: 5, position: 60, contribution_level: '100' },
              ],
            }
          : g
      ),
    }
    const req = buildConfigRequest(values)
    expect(req.recipients?.[0]).toEqual({
      pct_type: 'pct_relationship',
      contribution_level: '100',
      position: 60,
      department: 5,
    })
  })

  it('coerces a numeric pct_promotion_revenue to a string', () => {
    const req = buildConfigRequest({ ...emptyForm, pct_promotion_revenue: 5 })
    expect(req.pct_promotion_revenue).toBe('5')
  })

  it('defaults an empty pct_promotion_revenue to "0"', () => {
    const req = buildConfigRequest({ ...emptyForm, pct_promotion_revenue: '' })
    expect(req.pct_promotion_revenue).toBe('0')
  })

  it('converts empty pct_* fields to null', () => {
    const req = buildConfigRequest({ ...emptyForm, pct_relationship: '' })
    expect(req.pct_relationship).toBeNull()
  })

  it('drops recipients that carry no org target', () => {
    const values: PromotionConfigFormValues = {
      ...emptyForm,
      groups: emptyForm.groups.map((g) =>
        g.pct_type === 'pct_planning'
          ? {
              pct_type: 'pct_planning',
              recipients: [
                {
                  contribution_level: '100',
                  department: null,
                  branch: null,
                  block: null,
                  position: null,
                  employee: null,
                },
              ],
            }
          : g
      ),
    }
    const req = buildConfigRequest(values)
    expect(req.recipients).toHaveLength(0)
  })
})

describe('mapConfigToForm', () => {
  it('builds groups in the fixed pct_type order and partitions recipients', () => {
    const config = {
      id: 1,
      project: 7,
      pct_promotion_revenue: '12',
      pct_relationship: '10',
      pct_planning: null,
      pct_packaging: null,
      pct_sales_support: null,
      pct_coordination: null,
      note: 'hello',
      recipients: [
        { id: 2, pct_type: 'pct_planning', department: 9, contribution_level: '40' },
        { id: 3, pct_type: 'pct_relationship', department: 5, contribution_level: '60' },
      ],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } as unknown as ProjectPromotionCommissionConfig

    const form = mapConfigToForm(config)

    expect(form.groups.map((g) => g.pct_type)).toEqual([
      'pct_relationship',
      'pct_planning',
      'pct_packaging',
      'pct_sales_support',
      'pct_coordination',
    ])
    expect(form.pct_promotion_revenue).toBe('12')
    expect(form.note).toBe('hello')

    const relationship = form.groups.find((g) => g.pct_type === 'pct_relationship')
    expect(relationship?.recipients).toHaveLength(1)
    expect(relationship?.recipients[0]).toMatchObject({
      id: 3,
      department: 5,
      contribution_level: '60',
    })

    const planning = form.groups.find((g) => g.pct_type === 'pct_planning')
    expect(planning?.recipients).toHaveLength(1)
    expect(planning?.recipients[0]).toMatchObject({ id: 2, department: 9 })
  })

  it('returns all five empty groups when config is null', () => {
    const form = mapConfigToForm(null)
    expect(form.groups).toHaveLength(5)
    expect(form.groups.every((g) => g.recipients.length === 0)).toBe(true)
    expect(form.pct_promotion_revenue).toBe('')
  })
})

describe('getInvalidContributionGroups', () => {
  const withGroup = (
    pctType: PromotionConfigFormValues['groups'][number]['pct_type'],
    recipients: { contribution_level: string | number }[]
  ): PromotionConfigFormValues => ({
    ...emptyForm,
    groups: emptyForm.groups.map((g) =>
      g.pct_type === pctType ? { pct_type: pctType, recipients } : g
    ),
  })

  it('skips groups with no recipients', () => {
    expect(getInvalidContributionGroups(emptyForm)).toEqual([])
  })

  it('flags a group whose contribution total is not 100', () => {
    const values = withGroup('pct_relationship', [{ contribution_level: '5.1' }])
    expect(getInvalidContributionGroups(values)).toEqual(['pct_relationship'])
  })

  it('accepts a group whose contributions sum to exactly 100 (across multiple recipients)', () => {
    const values = withGroup('pct_planning', [
      { contribution_level: '60' },
      { contribution_level: '40' },
    ])
    expect(getInvalidContributionGroups(values)).toEqual([])
  })
})
