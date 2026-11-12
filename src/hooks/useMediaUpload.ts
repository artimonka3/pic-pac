import { useEffect, useState } from 'react'
import { errorCode, photoPatch, readPhoto, retryPhoto, uploadPhoto } from '../lib/api'
import { uid } from '../lib/format'
import { PHOTO_LIMIT, useAppStore } from '../store/useAppStore'
import type { LocalPhoto, MediaService } from '../types'

const inFlight = new Set<string>()

function currentDraft(service: MediaService) {
  const state = useAppStore.getState()
  return service === 'book' ? state.draft : state.printDraft
}

export function useMediaUpload(service: MediaService) {
  const [message, setMessage] = useState('')
  const { updatePhoto, stagePhotos, removePhoto } = useAppStore.getState()

  useEffect(() => {
    let stopped = false
    let timer: number
    async function poll() {
      const draft = currentDraft(service)
      const pending = draft.photos.filter((photo) => {
        const status = photo.verification?.status
        return (status === 'pending' || status === 'uploading') && !inFlight.has(photo.id)
      })
      await Promise.all(pending.map(async (photo) => {
        try {
          const result = await readPhoto(photo.id)
          if (!stopped) updatePhoto(service, draft.mediaDraftId, photo.id, photoPatch(photo.id, result))
        } catch (error) {
          const code = errorCode(error)
          if (!stopped && code !== photo.verification?.code) {
            updatePhoto(service, draft.mediaDraftId, photo.id, {
              src: photo.src,
              verification: { status: code === 'CONNECTION' ? 'pending' : 'upload_failed', code },
            })
          }
        }
      }))
      if (!stopped) timer = window.setTimeout(poll, 650)
    }
    void poll()
    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [service, updatePhoto])

  async function pick(files: File[], replaceId?: string) {
    if (!files.length) return
    const photos = files.map<LocalPhoto>((file) => ({
      id: uid(), name: file.name, src: '', verification: { status: 'uploading' },
    }))
    const staged = stagePhotos(service, photos, replaceId)
    setMessage(!replaceId && staged.photos.length < files.length ? `Можно добавить до ${PHOTO_LIMIT} фотографий.` : '')
    staged.photos.forEach(({ id }) => inFlight.add(id))
    for (const [index, { id }] of staged.photos.entries()) {
      try {
        const draft = currentDraft(service)
        if (draft.mediaDraftId !== staged.draftId || !draft.photos.some((photo) => photo.id === id)) continue
        const result = await uploadPhoto(staged.draftId, id, service, files[index])
        updatePhoto(service, staged.draftId, id, photoPatch(id, result))
      } catch (error) {
        const code = errorCode(error)
        // After a dropped response the server may already have accepted the original.
        if (code === 'CONNECTION') {
          try {
            const result = await readPhoto(id)
            updatePhoto(service, staged.draftId, id, photoPatch(id, result))
            continue
          } catch {
            // The picker can replace the file if the upload never reached the server.
          }
        }
        updatePhoto(service, staged.draftId, id, { src: '', verification: { status: 'upload_failed', code } })
      } finally {
        inFlight.delete(id)
      }
    }
  }

  async function retry(id: string) {
    const draft = currentDraft(service)
    const photo = draft.photos.find((item) => item.id === id)
    if (!photo?.verification?.canRetry || inFlight.has(id)) return
    inFlight.add(id)
    updatePhoto(service, draft.mediaDraftId, id, { src: photo.src, verification: { status: 'uploading' } })
    try {
      const result = await retryPhoto(id)
      updatePhoto(service, draft.mediaDraftId, id, photoPatch(id, result))
    } catch (error) {
      const code = errorCode(error)
      updatePhoto(service, draft.mediaDraftId, id, {
        src: photo.src,
        verification: { status: 'failed', code, canRetry: code === 'CONNECTION' },
      })
    } finally {
      inFlight.delete(id)
    }
  }

  return { message, pick, retry, remove: (id: string) => removePhoto(service, id) }
}
