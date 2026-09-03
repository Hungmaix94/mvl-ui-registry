import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSubmitOnce } from './useSubmitOnce'

/** Promise mở, cho phép test giữ handler ở trạng thái "đang bay". */
function createDeferred<T = void>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useSubmitOnce', () => {
  it('bỏ qua lần submit thứ hai khi lần đầu chưa trả về', async () => {
    // Arrange
    const deferred = createDeferred()
    const handler = vi.fn(() => deferred.promise)
    const { result } = renderHook(() => useSubmitOnce(handler))

    // Act — hai cú click liên tiếp, chưa hề chờ React render lại
    await act(async () => {
      void result.current.submit()
      void result.current.submit()
    })

    // Assert
    expect(handler).toHaveBeenCalledTimes(1)
    expect(result.current.isSubmitting).toBe(true)

    await act(async () => {
      deferred.resolve()
      await deferred.promise
    })
  })

  it('chặn cú click thứ hai kể cả khi React chưa kịp disable nút', async () => {
    // Arrange — mô phỏng đúng bug: cả 2 click dùng cùng một snapshot render
    const deferred = createDeferred()
    const handler = vi.fn(() => deferred.promise)
    const { result } = renderHook(() => useSubmitOnce(handler))
    const submitFromFirstRender = result.current.submit

    // Act
    await act(async () => {
      void submitFromFirstRender()
      void submitFromFirstRender()
      void submitFromFirstRender()
    })

    // Assert
    expect(handler).toHaveBeenCalledTimes(1)

    await act(async () => {
      deferred.resolve()
      await deferred.promise
    })
  })

  it('cho phép submit lại sau khi lần trước đã hoàn tất', async () => {
    // Arrange
    const handler = vi.fn(async () => {})
    const { result } = renderHook(() => useSubmitOnce(handler))

    // Act
    await act(async () => {
      await result.current.submit()
    })
    await act(async () => {
      await result.current.submit()
    })

    // Assert
    expect(handler).toHaveBeenCalledTimes(2)
    expect(result.current.isSubmitting).toBe(false)
  })

  it('mở lại cửa và ném lỗi ra ngoài khi handler thất bại', async () => {
    // Arrange
    const error = new Error('API 500')
    const handler = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useSubmitOnce(handler))

    // Act
    await act(async () => {
      await expect(result.current.submit()).rejects.toThrow('API 500')
    })

    // Assert — không bị kẹt cờ in-flight, user submit lại được
    expect(result.current.isSubmitting).toBe(false)
    await act(async () => {
      await result.current.submit()
    })
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('truyền nguyên vẹn tham số cho handler', async () => {
    // Arrange
    const handler = vi.fn(async (_values: { id: number }) => {})
    const { result } = renderHook(() => useSubmitOnce(handler))

    // Act
    await act(async () => {
      await result.current.submit({ id: 7 })
    })

    // Assert
    expect(handler).toHaveBeenCalledWith({ id: 7 })
  })
})
