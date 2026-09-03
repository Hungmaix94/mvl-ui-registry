export async function downloadFile(url: string, filename: string): Promise<void> {
  const response = await fetch(url, { credentials: 'omit' })
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`)
  }
  const blob = await response.blob()
  const objectUrl = window.URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  window.URL.revokeObjectURL(objectUrl)
}
