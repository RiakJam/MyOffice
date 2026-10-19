import { Capacitor, registerPlugin } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'

const SaveDocument = registerPlugin<{
  save(options: { sourceUri: string; filename: string; mimeType: string }): Promise<{ saved: boolean }>
}>('SaveDocument')

/** Save through Android's document picker, or use a normal desktop download. */
export async function saveFile(blob: Blob, filename: string): Promise<void> {
  if (Capacitor.getPlatform() === 'android') {
    const bytes = new Uint8Array(await blob.arrayBuffer())
    let binary = ''
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
    }
    const path = `exports/${Date.now()}-${filename.replace(/[^\w. -]/g, '-')}`
    const result = await Filesystem.writeFile({ path, data: btoa(binary), directory: Directory.Cache, recursive: true })
    await SaveDocument.save({ sourceUri: result.uri, filename, mimeType: blob.type || 'application/octet-stream' })
    return
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}
