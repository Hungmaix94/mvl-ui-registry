/** Backend caps list `page_size` at 100; larger requests are silently truncated. */
export const HRM_LIST_PAGE_SIZE_MAX = 100

/** Max pages fetched in parallel — keeps us under browser/host connection limits. */
const DEFAULT_CONCURRENCY = 6
/** Retry attempts per failed page before the whole fetch is considered failed. */
const DEFAULT_MAX_RETRIES = 3

type PaginatedSlice<T> = {
  count?: number | null
  results?: T[] | null
  next?: string | null
}

export type FetchAllProgress = {
  /** Records fetched so far */
  loaded: number
  /** Total records reported by the API (`count` of the first page) */
  total: number
}

export type FetchAllOptions = {
  /** Max concurrent page requests (default 6). Set to 1 to force sequential. */
  concurrency?: number
  /** Retry attempts per failed page before giving up (default 3). */
  maxRetries?: number
}

/**
 * Loads every page of a paginated API and returns the flattened results.
 *
 * The first page is fetched to learn the total `count`; the remaining pages are
 * then fetched concurrently through a bounded worker pool. Any page that fails
 * is retried in isolation (up to `maxRetries`) without re-fetching the pages
 * that already succeeded. Results are reassembled in page order so the
 * backend `ordering` is preserved.
 *
 * `onProgress` fires after each page resolves so callers can render a progress
 * bar. Pass React Query's `signal` so a superseded/unmounted fetch stops
 * issuing requests instead of walking the whole dataset in the background.
 *
 * Falls back to sequential `next`-following when the API omits `count`.
 */
export async function fetchAllPaginatedResults<T>(
  fetchPage: (page: number) => Promise<PaginatedSlice<T>>,
  onProgress?: (progress: FetchAllProgress) => void,
  signal?: AbortSignal,
  options?: FetchAllOptions
): Promise<T[]> {
  const concurrency = Math.max(1, options?.concurrency ?? DEFAULT_CONCURRENCY)
  const maxRetries = Math.max(0, options?.maxRetries ?? DEFAULT_MAX_RETRIES)

  signal?.throwIfAborted()

  // First page tells us the total count → how many pages remain.
  const firstPage = await fetchPage(1)
  const firstResults = (firstPage.results ?? []) as T[]
  const total = firstPage.count ?? firstResults.length

  let loaded = firstResults.length
  onProgress?.({ loaded, total })

  const pageSize = firstResults.length

  // Single page, empty result, or all records already in hand → done.
  if (!firstPage.next || pageSize === 0) {
    return firstResults
  }

  // Count-less API: fall back to following `next` sequentially.
  if (firstPage.count == null) {
    const all = [...firstResults]
    let page = 1
    let hasNext = !!firstPage.next
    while (hasNext) {
      signal?.throwIfAborted()
      page += 1
      const res = await fetchPage(page)
      const results = (res.results ?? []) as T[]
      all.push(...results)
      loaded = all.length
      onProgress?.({ loaded, total: loaded })
      hasNext = !!res.next
    }
    return all
  }

  const totalPages = Math.ceil(total / pageSize)

  // Page index (1-based) → its results. Page 1 is already loaded.
  const pageResults: T[][] = new Array(totalPages)
  pageResults[0] = firstResults

  // Fetch a single page, retrying that page alone on failure.
  const fetchPageWithRetry = async (page: number): Promise<T[]> => {
    let lastError: unknown
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      signal?.throwIfAborted()
      try {
        const res = await fetchPage(page)
        return (res.results ?? []) as T[]
      } catch (error) {
        lastError = error
      }
    }
    throw lastError
  }

  // Bounded worker pool: each worker pulls the next page off a shared cursor.
  const pendingPages: number[] = []
  for (let page = 2; page <= totalPages; page++) pendingPages.push(page)

  let cursor = 0
  let hardFailed = false
  const worker = async (): Promise<void> => {
    // Stop pulling new pages once any page has exhausted its retries — the whole
    // fetch is going to reject anyway, so other workers shouldn't keep hitting
    // the network or pushing stale progress updates.
    while (!hardFailed && cursor < pendingPages.length) {
      const page = pendingPages[cursor++]
      try {
        const results = await fetchPageWithRetry(page)
        pageResults[page - 1] = results
        loaded += results.length
        onProgress?.({ loaded, total })
      } catch (error) {
        hardFailed = true
        throw error
      }
    }
  }

  const workerCount = Math.min(concurrency, pendingPages.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))

  // Flatten in page order so the backend `ordering` is preserved.
  return pageResults.flat()
}
