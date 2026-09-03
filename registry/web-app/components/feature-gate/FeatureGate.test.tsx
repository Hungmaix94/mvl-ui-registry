import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import FeatureGate from '@/components/feature-gate/FeatureGate'
import { FEATURE_KEY } from '@/constants/feature-flags'

afterEach(() => {
  vi.unstubAllEnvs()
})

function setForbiddenFeatures(rawValue: string) {
  vi.stubEnv('VITE_FORBIDDEN_FEATURES', rawValue)
}

describe('FeatureGate', () => {
  it('render children khi không tắt cụm nào', () => {
    setForbiddenFeatures('')
    render(
      <FeatureGate feature={FEATURE_KEY.ACCOUNTING}>
        <div>Khối kế toán</div>
      </FeatureGate>
    )

    expect(screen.getByText('Khối kế toán')).toBeInTheDocument()
  })

  it('ẩn children khi cụm của nó bị tắt', () => {
    setForbiddenFeatures('accounting')
    render(
      <FeatureGate feature={FEATURE_KEY.ACCOUNTING}>
        <div>Khối kế toán</div>
      </FeatureGate>
    )

    expect(screen.queryByText('Khối kế toán')).not.toBeInTheDocument()
  })

  it('không ẩn nhầm khi cụm khác bị tắt', () => {
    setForbiddenFeatures('elibrary,chat')
    render(
      <FeatureGate feature={FEATURE_KEY.ACCOUNTING}>
        <div>Khối kế toán</div>
      </FeatureGate>
    )

    expect(screen.getByText('Khối kế toán')).toBeInTheDocument()
  })

  it('render fallback thay cho children khi cụm bị tắt', () => {
    setForbiddenFeatures('project-secretary')
    render(
      <FeatureGate feature={FEATURE_KEY.PROJECT_SECRETARY} fallback={<div>Đã tắt</div>}>
        <div>Tổng quan Sales</div>
      </FeatureGate>
    )

    expect(screen.getByText('Đã tắt')).toBeInTheDocument()
    expect(screen.queryByText('Tổng quan Sales')).not.toBeInTheDocument()
  })

  it('bỏ qua key rác trong biến môi trường, không ẩn nhầm', () => {
    setForbiddenFeatures('khong-ton-tai,accounting')
    render(
      <>
        <FeatureGate feature={FEATURE_KEY.PROJECT_SECRETARY}>
          <div>Tổng quan Sales</div>
        </FeatureGate>
        <FeatureGate feature={FEATURE_KEY.ACCOUNTING}>
          <div>Khối kế toán</div>
        </FeatureGate>
      </>
    )

    expect(screen.getByText('Tổng quan Sales')).toBeInTheDocument()
    expect(screen.queryByText('Khối kế toán')).not.toBeInTheDocument()
  })
})
