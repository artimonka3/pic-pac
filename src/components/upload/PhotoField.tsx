import type { DragEvent } from 'react'
import { X } from 'lucide-react'
import { apiMessage } from '../../lib/api'
import { photosLabel } from '../../lib/format'
import type { LocalPhoto } from '../../types'
import styles from './PhotoField.module.scss'

type Props = {
  photos: LocalPhoto[]
  busy?: boolean
  message?: string
  onPick: (files: File[], replaceId?: string) => void
  onRetry: (id: string) => void
  onRemove: (id: string) => void
}

function photoMessage(photo: LocalPhoto) {
  const verification = photo.verification
  if (!verification) return 'Это фото загружено до проверки. Замените его оригиналом.'
  if (verification.code) {
    if (verification.status === 'failed' && !verification.canRetry && verification.code === 'CHECK_FAILED') {
      return apiMessage('RETRY_LIMIT')
    }
    return apiMessage(verification.code)
  }
  if (verification.status === 'uploading') return 'Загружаем фото…'
  if (verification.status === 'pending') return 'Проверяем фото…'
  return ''
}

export function PhotoField({ photos, busy, message, onPick, onRetry, onRemove }: Props) {
  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    onPick(Array.from(event.dataTransfer.files))
  }

  return (
    <div className={styles.wrap}>
      <label className={photos.length ? styles.again : styles.pick} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
        <input
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          multiple
          onChange={(event) => {
            onPick(Array.from(event.target.files ?? []))
            event.target.value = ''
          }}
        />
        {busy ? 'Проверяем фотографии…' : photos.length ? 'Добавить ещё' : 'Выбрать фотографии'}
      </label>
      {photos.length > 0 ? <p className={styles.count}>{photosLabel(photos.length)}</p> : null}
      {message ? <p className={styles.message}>{message}</p> : null}
      {photos.length > 0 ? (
        <ul className={styles.grid}>
          {photos.map((photo, index) => {
            const note = photoMessage(photo)
            return (
              <li key={photo.id}>
                <div className={styles.thumb}>
                  {photo.src ? <img src={photo.src} alt={`Снимок ${index + 1}, ${photo.name}`} /> : null}
                  <button type="button" onClick={() => onRemove(photo.id)} aria-label={`Удалить ${photo.name}`}>
                    <X size={14} strokeWidth={1.5} />
                  </button>
                </div>
                {note ? (
                  <div className={styles.feedback}>
                    <p role="status"><strong>{photo.name}</strong> {note}</p>
                    {photo.verification?.canRetry ? (
                      <button type="button" onClick={() => onRetry(photo.id)}>Повторить проверку</button>
                    ) : null}
                    <label className={styles.replace}>
                      Заменить
                      <input
                        type="file"
                        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                        aria-label={`Заменить ${photo.name}`}
                        onChange={(event) => onPick(Array.from(event.target.files ?? []), photo.id)}
                      />
                    </label>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
