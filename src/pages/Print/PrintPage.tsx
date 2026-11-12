import { useEffect } from 'react'
import { Minus, Plus } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PhotoField } from '../../components/upload/PhotoField'
import { Button } from '../../components/ui/Button'
import { TestNote } from '../../components/ui/TestNote'
import { useTitle } from '../../hooks/useTitle'
import { useMediaUpload } from '../../hooks/useMediaUpload'
import { printProducts } from '../../data/products'
import { formatPrice, photosLabel } from '../../lib/format'
import { photosPassed } from '../../lib/api'
import { useAppStore } from '../../store/useAppStore'
import styles from './Print.module.scss'

export function PrintPage() {
  useTitle('Фотопечать')
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const formats = printProducts()
  const draft = useAppStore((state) => state.printDraft)
  const setPrintFormat = useAppStore((state) => state.setPrintFormat)
  const setPrintPaper = useAppStore((state) => state.setPrintPaper)
  const setPrintQty = useAppStore((state) => state.setPrintQty)
  const addPrintToCart = useAppStore((state) => state.addPrintToCart)
  const upload = useMediaUpload('print')
  const busy = draft.photos.some((photo) => ['uploading', 'pending'].includes(photo.verification?.status ?? ''))
  const format = formats.find((item) => item.id === draft.formatId) ?? formats[0]
  const copies = draft.photos.reduce((sum, photo) => sum + photo.qty, 0)
  const total = copies * format.price

  useEffect(() => {
    const id = params.get('format')
    if (id === 'p10' || id === 'p15' || id === 'p20') setPrintFormat(id)
  }, [params, setPrintFormat])

  return (
    <div className={styles.page}>
      <header>
        <h1>Печать фотографий</h1>
        <p>Выберите формат, бумагу и снимки.</p>
        <TestNote>Цены тестовые. Печать не отправляется в лабораторию.</TestNote>
      </header>

      <fieldset>
        <legend>Формат</legend>
        {formats.map((item) => (
          <button key={item.id} type="button" data-active={item.id === format.id} onClick={() => setPrintFormat(item.id)}>
            <span>
              <strong>{item.name}</strong>
              <small>{item.summary}</small>
            </span>
            <em>{formatPrice(item.price)}</em>
          </button>
        ))}
      </fieldset>

      <fieldset>
        <legend>Бумага</legend>
        <div className={styles.paper}>
          {(['Глянец', 'Матовая'] as const).map((paper) => (
            <button key={paper} type="button" data-active={draft.paper === paper} onClick={() => setPrintPaper(paper)}>
              {paper}
            </button>
          ))}
        </div>
      </fieldset>

      <PhotoField
        photos={draft.photos} busy={busy} message={upload.message}
        onPick={upload.pick} onRemove={upload.remove} onRetry={upload.retry}
      />

      {draft.photos.length > 0 ? (
        <ul className={styles.list}>
          {draft.photos.map((photo) => (
            <li key={photo.id}>
              {photo.src ? <img src={photo.src} alt="" /> : <span aria-hidden="true" />}
              <span>{photo.name}</span>
              <div>
                <button type="button" onClick={() => setPrintQty(photo.id, photo.qty - 1)} disabled={photo.qty <= 1} aria-label="Меньше">
                  <Minus size={14} />
                </button>
                <b>{photo.qty}</b>
                <button type="button" onClick={() => setPrintQty(photo.id, photo.qty + 1)} disabled={photo.qty >= 999} aria-label="Больше">
                  <Plus size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <footer>
        <div>
          <strong>{copies ? formatPrice(total) : formatPrice(format.price)}</strong>
          <span>{copies ? photosLabel(copies) : 'Цена за один снимок'}</span>
        </div>
        <Button
          disabled={!copies || !photosPassed(draft.photos)}
          onClick={() => {
            if (addPrintToCart()) navigate('/cart')
          }}
        >
          В корзину
        </Button>
      </footer>
    </div>
  )
}
