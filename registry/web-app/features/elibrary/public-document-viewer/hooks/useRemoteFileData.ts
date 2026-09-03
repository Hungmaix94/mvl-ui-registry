import { useEffect, useState } from 'react'

type RemoteDataKind = 'arrayBuffer' | 'blob' | 'text'

export type RemoteFileData<T> = {
  data: T | null
  isLoading: boolean
  error: unknown
}

/**
 * Tải nội dung file từ presigned `download_url` (S3, public, CORS đã mở) về dạng
 * `arrayBuffer | blob | text` để các renderer client-side (PDF/DOCX/XLSX/Text)
 * dùng. Dùng `credentials: 'omit'` (giống `downloadFile`) và tự huỷ khi unmount.
 */
export function useRemoteFileData(
  url: string | undefined,
  as: 'arrayBuffer'
): RemoteFileData<ArrayBuffer>
export function useRemoteFileData(url: string | undefined, as: 'blob'): RemoteFileData<Blob>
export function useRemoteFileData(url: string | undefined, as: 'text'): RemoteFileData<string>
export function useRemoteFileData(
  url: string | undefined,
  as: RemoteDataKind
): RemoteFileData<ArrayBuffer | Blob | string> {
  const [state, setState] = useState<RemoteFileData<ArrayBuffer | Blob | string>>({
    data: null,
    isLoading: !!url,
    error: null,
  })

  useEffect(() => {
    if (!url) {
      setState({ data: null, isLoading: false, error: null })
      return
    }

    let cancelled = false
    const controller = new AbortController()
    setState({ data: null, isLoading: true, error: null })

    fetch(url, { credentials: 'omit', signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Tải nội dung tệp thất bại (HTTP ${res.status})`)
        if (as === 'arrayBuffer') return res.arrayBuffer()
        if (as === 'blob') return res.blob()
        return res.text()
      })
      .then((data) => {
        if (!cancelled) setState({ data, isLoading: false, error: null })
      })
      .catch((error: unknown) => {
        if (cancelled || (error as { name?: string })?.name === 'AbortError') return
        setState({ data: null, isLoading: false, error })
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [url, as])

  return state
}
