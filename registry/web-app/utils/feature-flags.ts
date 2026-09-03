import { FEATURE_KEYS, FEATURE_PATH_PREFIXES, type FeatureKey } from '@/constants/feature-flags'

const VALID_FEATURE_KEYS: ReadonlySet<string> = new Set<string>(FEATURE_KEYS)

function isFeatureKey(value: string): value is FeatureKey {
  return VALID_FEATURE_KEYS.has(value)
}

/** Bỏ dấu `/` thừa ở cuối để `/elibrary/` và `/elibrary` được coi là một. */
function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return normalizePathname(pathname.slice(0, -1))
  }
  return pathname
}

/**
 * Tách giá trị thô của `VITE_FORBIDDEN_FEATURES` thành tập key hợp lệ.
 * Chuỗi rỗng, khoảng trắng thừa và key không tồn tại đều được bỏ qua thay vì ném lỗi —
 * cấu hình sai ở môi trường không được phép làm sập app.
 */
export function parseForbiddenFeatures(rawValue: string | undefined | null): Set<FeatureKey> {
  if (!rawValue) {
    return new Set()
  }

  const parsedKeys = rawValue
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(isFeatureKey)

  return new Set(parsedKeys)
}

/**
 * Tìm cụm tính năng sở hữu một đường dẫn, theo luật **tiền tố dài nhất thắng**.
 *
 * So khớp trên ranh giới segment nên `/chatbot` không bị coi là thuộc `/chat`.
 * Trả về `undefined` khi đường dẫn không thuộc cụm nào (không bị quản lý bởi feature flag).
 */
export function resolveFeatureKeyByPath(pathname: string): FeatureKey | undefined {
  const normalizedPath = normalizePathname(pathname)
  let matchedKey: FeatureKey | undefined
  let matchedLength = -1

  FEATURE_KEYS.forEach((featureKey) => {
    FEATURE_PATH_PREFIXES[featureKey].forEach((prefix) => {
      const isMatch = normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
      if (isMatch && prefix.length > matchedLength) {
        matchedKey = featureKey
        matchedLength = prefix.length
      }
    })
  })

  return matchedKey
}

/** Đường dẫn có thuộc một cụm tính năng đang bị tắt hay không. */
export function isPathForbidden(
  pathname: string,
  forbiddenFeatures: ReadonlySet<FeatureKey>
): boolean {
  if (forbiddenFeatures.size === 0) {
    return false
  }

  const featureKey = resolveFeatureKeyByPath(pathname)
  return featureKey !== undefined && forbiddenFeatures.has(featureKey)
}
