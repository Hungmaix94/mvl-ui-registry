/** Lấy phần đuôi file (lowercase, không gồm dấu chấm) từ tên file. */
export function getFileExtension(fileName: string | null | undefined): string {
  if (!fileName) return ''
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot < 0 || lastDot === fileName.length - 1) return ''
  return fileName.slice(lastDot + 1).toLowerCase()
}

/** Định dạng dung lượng file ra chuỗi dễ đọc (B/KB/MB/GB). */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes) || bytes < 0) return '—'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}
