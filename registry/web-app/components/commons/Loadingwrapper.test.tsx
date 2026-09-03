import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingWrapper from './Loadingwrapper'

describe('LoadingWrapper — khung xương thay cho vòng xoay', () => {
  it('có khung xương thì dựng khung xương, KHÔNG dựng vòng xoay nữa', () => {
    render(
      <LoadingWrapper isLoading loadingSkeleton={<div data-testid="skeleton" />}>
        <p>nội dung thật</p>
      </LoadingWrapper>
    )

    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
    expect(screen.queryByText('nội dung thật')).not.toBeInTheDocument()
  })

  /**
   * Khung xương tự dựng đúng chiều cao của khối thật. Bọc nó vào hộp `containerHeight` +
   * căn giữa là cắt cụt hoặc chừa thừa đúng thứ nó vừa dựng cho khớp — mà `containerHeight`
   * ở đây là 140 trong khi lưới thẻ thật cao gấp mấy lần.
   */
  it('KHÔNG bọc khung xương vào hộp cao cố định của vòng xoay', () => {
    render(
      <LoadingWrapper
        isLoading
        containerHeight={140}
        loadingSkeleton={<div data-testid="skeleton" />}
      >
        <p>nội dung thật</p>
      </LoadingWrapper>
    )

    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('loading-spinner-box')).not.toBeInTheDocument()
  })

  it('không truyền khung xương thì giữ nguyên hành vi cũ — vẫn là hộp cao cố định', () => {
    render(
      <LoadingWrapper isLoading containerHeight={140}>
        <p>nội dung thật</p>
      </LoadingWrapper>
    )

    expect(screen.queryByText('nội dung thật')).not.toBeInTheDocument()
    expect(screen.getByTestId('loading-spinner-box')).toHaveStyle({ height: '140px' })
  })

  it('tải xong thì trả lại nội dung thật, khung xương biến mất', () => {
    render(
      <LoadingWrapper isLoading={false} loadingSkeleton={<div data-testid="skeleton" />}>
        <p>nội dung thật</p>
      </LoadingWrapper>
    )

    expect(screen.getByText('nội dung thật')).toBeInTheDocument()
    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
  })
})
