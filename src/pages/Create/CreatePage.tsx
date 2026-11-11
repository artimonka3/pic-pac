import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PhotoField } from '../../components/upload/PhotoField'
import { Button } from '../../components/ui/Button'
import { TestNote } from '../../components/ui/TestNote'
import { useTitle } from '../../hooks/useTitle'
import { getBook, quoteBook, bookProducts } from '../../data/products'
import { styleById, styles as styleOptions, themeById, themes } from '../../data/themes'
import { formatPrice, photosLabel } from '../../lib/format'
import { filesToPhotos } from '../../lib/photos'
import { useAppStore } from '../../store/useAppStore'
import styles from './Create.module.scss'

const steps = [
  { title: 'Формат', text: 'Выберите книгу. Размер и число страниц можно поменять.' },
  { title: 'Фотографии', text: 'Можно выбрать несколько снимков сразу.' },
  { title: 'Тематика', text: 'От неё зависят подписи и ритм разворотов.' },
  { title: 'Стиль', text: 'Стиль задаёт бумагу, шрифт и плотность кадров.' },
  { title: 'Пожелания', text: 'Необязательно. Короткий текст попадёт на первый разворот.' },
  { title: 'Проверка', text: 'Дальше соберём демонстрационный макет прямо в браузере.' },
]

const hints = ['Короткие подписи', 'Крупные портреты', 'По порядку, как снимали', 'Больше пустого места']

export function CreatePage() {
  useTitle('Новая книга')
  const navigate = useNavigate()
  const draft = useAppStore((state) => state.draft)
  const setDraft = useAppStore((state) => state.setDraft)
  const setProduct = useAppStore((state) => state.setProduct)
  const addPhotos = useAppStore((state) => state.addPhotos)
  const removePhoto = useAppStore((state) => state.removePhoto)
  const armGeneration = useAppStore((state) => state.armGeneration)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const step = Math.min(draft.step, steps.length - 1)
  const current = steps[step]
  const product = getBook(draft.productId)

  function go(next: number) {
    setDraft({ step: next })
  }

  async function pick(files: File[]) {
    if (!files.length) return
    setBusy(true)
    setMessage('')
    const result = await filesToPhotos(files)
    const added = addPhotos(result.photos)
    const notes: string[] = []
    if (result.skipped) notes.push('Часть файлов не открылась. Подойдут JPEG и PNG.')
    if (added < result.photos.length) notes.push('Для макета берём не больше 24 фотографий.')
    if (!draft.photos.length && added === 0 && result.photos.length === 0) {
      notes.push('Не удалось открыть эти файлы.')
    }
    setMessage(notes.join(' '))
    setBusy(false)
  }

  function generate() {
    const token = armGeneration()
    navigate('/generate', { state: { token } })
  }

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <button type="button" className={styles.back} onClick={() => (step === 0 ? navigate('/') : go(step - 1))}>
          <ChevronLeft size={20} strokeWidth={1.5} />
          Назад
        </button>
        <span>{String(step + 1).padStart(2, '0')} / 06</span>
      </header>
      <div className={styles.progress} aria-hidden="true">
        {steps.map((item, index) => (
          <button key={item.title} type="button" data-on={index <= step} disabled={index > step} onClick={() => go(index)} />
        ))}
      </div>

      <div className={styles.layout}>
        <div className={styles.copy}>
          <h1>{current.title}</h1>
          <p>{current.text}</p>
        </div>
        <div className={styles.body} key={step}>
          {step === 0 && product ? (
            <div className={styles.stack}>
              {bookProducts().map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.choice}
                  data-active={item.id === draft.productId}
                  onClick={() => {
                    if (item.id !== draft.productId) setProduct(item.id)
                  }}
                >
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.summary}</small>
                  </span>
                  <em>от {formatPrice(item.basePrice)}</em>
                </button>
              ))}
              <fieldset>
                <legend>Размер</legend>
                <div className={styles.options}>
                  {product.sizes.map((size) => (
                    <button key={size} type="button" data-active={size === draft.size} onClick={() => setDraft({ size })}>
                      {size}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Страницы</legend>
                <div className={styles.options}>
                  {product.pageCounts.map((count) => (
                    <button
                      key={count}
                      type="button"
                      data-active={count === draft.pages}
                      onClick={() => setDraft({ pages: count })}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </fieldset>
              <TestNote />
            </div>
          ) : null}

          {step === 1 ? (
            <div className={styles.stack}>
              <PhotoField photos={draft.photos} busy={busy} message={message} onPick={(files) => void pick(files)} onRemove={removePhoto} />
              {draft.photos.length === 0 ? (
                <p className={styles.hint}>Без своих фотографий соберём макет на демонстрационных снимках.</p>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className={styles.themes}>
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  data-active={theme.id === draft.themeId}
                  onClick={() => setDraft({ themeId: theme.id })}
                >
                  <img src={theme.image} alt="" />
                  <strong>{theme.name}</strong>
                  <span>{theme.note}</span>
                </button>
              ))}
            </div>
          ) : null}

          {step === 3 ? (
            <div className={styles.styles}>
              {styleOptions.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  data-active={style.id === draft.styleId}
                  onClick={() => setDraft({ styleId: style.id })}
                >
                  <i className={styles.sketch} data-style={style.id} />
                  <span>
                    <strong>{style.name}</strong>
                    <small>{style.note}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {step === 4 ? (
            <div className={styles.stack}>
              <textarea
                className={styles.wishes}
                value={draft.wishes}
                placeholder="Например: хронология по дням, меньше текста, крупнее лица."
                onChange={(event) => setDraft({ wishes: event.target.value })}
              />
              <div className={styles.hints}>
                {hints.map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => setDraft({ wishes: draft.wishes.trim() ? `${draft.wishes.trim()}. ${hint}` : hint })}
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 5 && product ? (
            <div className={styles.summary}>
              <div>
                <span>Формат</span>
                <strong>
                  {product.name} · {draft.size} · {draft.pages} стр.
                </strong>
              </div>
              <div>
                <span>Фотографии</span>
                <strong>{draft.photos.length ? photosLabel(draft.photos.length) : 'Демонстрационные'}</strong>
              </div>
              <div>
                <span>Тема и стиль</span>
                <strong>
                  {themeById(draft.themeId).name} · {styleById(draft.styleId).name}
                </strong>
              </div>
              <div>
                <span>Пожелания</span>
                <strong>{draft.wishes.trim() || 'Нет'}</strong>
              </div>
              <div>
                <span>Стоимость</span>
                <strong>{formatPrice(quoteBook(product, draft.size, draft.pages))}</strong>
              </div>
              <TestNote />
            </div>
          ) : null}
        </div>
      </div>

      <footer className={styles.footer}>
        <button type="button" className={styles.footerBack} onClick={() => (step === 0 ? navigate('/') : go(step - 1))}>
          Назад
        </button>
        {step < 5 ? (
          <Button onClick={() => go(step + 1)} disabled={busy}>
            Далее
          </Button>
        ) : (
          <Button onClick={generate} disabled={busy || !product}>
            Создать фотокнигу
          </Button>
        )}
      </footer>
    </div>
  )
}
