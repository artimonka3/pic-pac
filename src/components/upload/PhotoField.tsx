import type { DragEvent } from 'react'
import { X } from 'lucide-react'
import { photosLabel } from '../../lib/format'
import styles from './PhotoField.module.scss'

type Photo = { id: string; src: string; name: string }

type Props = {
  photos: Photo[]
  busy?: boolean
  message?: string
  onPick: (files: File[]) => void
  onRemove: (id: string) => void
}

export function PhotoField({ photos, busy, message, onPick, onRemove }: Props) {
  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    onPick(Array.from(event.dataTransfer.files))
  }

  return (
    <div className={styles.wrap}>
      <label className={photos.length ? styles.again : styles.pick} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => {
            onPick(Array.from(event.target.files ?? []))
            event.target.value = ''
          }}
        />
        {busy ? 'Открываю фотографии…' : photos.length ? 'Добавить ещё' : 'Выбрать фотографии'}
      </label>
      {photos.length > 0 ? <p className={styles.count}>{photosLabel(photos.length)}</p> : null}
      {message ? <p className={styles.message}>{message}</p> : null}
      {photos.length > 0 ? (
        <ul className={styles.grid}>
          {photos.map((photo, index) => (
            <li key={photo.id}>
              <img src={photo.src} alt={`Снимок ${index + 1}, ${photo.name}`} />
              <button type="button" onClick={() => onRemove(photo.id)} aria-label={`Удалить ${photo.name}`}>
                <X size={14} strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
