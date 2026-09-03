import type { components } from '@/api/schema'

/**
 * Thông tin file trả về từ endpoint public `elibrary_public_library_retrieve`
 * (resolve share token → metadata + presigned `download_url`).
 */
export type PublicLibraryFile = components['schemas']['LibraryPublicAccess']
