import type { LocalPhoto } from '../types'
import { uid } from './format'

const MAX_EDGE = 900

async function fileToPhoto(file: File): Promise<LocalPhoto> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()

    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is unavailable')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return { id: uid(), name: file.name, src: canvas.toDataURL('image/jpeg', 0.72) }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function filesToPhotos(files: File[]) {
  const photos: LocalPhoto[] = []
  for (const file of files) {
    try {
      photos.push(await fileToPhoto(file))
    } catch {
      // The picker reports files the browser could not decode.
    }
  }
  return { photos, skipped: files.length - photos.length }
}
