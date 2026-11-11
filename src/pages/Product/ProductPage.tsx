import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ProductShot } from '../../components/product/ProductShot'
import { Button } from '../../components/ui/Button'
import { TestNote } from '../../components/ui/TestNote'
import { useTitle } from '../../hooks/useTitle'
import { getProduct, quoteBook } from '../../data/products'
import { formatPrice } from '../../lib/format'
import { useAppStore } from '../../store/useAppStore'
import styles from './Product.module.scss'

export function ProductPage() {
  const { productId = '' } = useParams()
  const product = getProduct(productId)
  useTitle(product?.name ?? 'Продукт')
  const navigate = useNavigate()
  const setDraft = useAppStore((state) => state.setDraft)
  const draft = useAppStore((state) => state.draft)
  const [size, setSize] = useState(product?.kind === 'book' ? product.defaultSize : '')
  const [pages, setPages] = useState(product?.kind === 'book' ? product.defaultPages : 0)

  useEffect(() => {
    const current = getProduct(productId)
    if (current?.kind !== 'book') return
    setSize(current.defaultSize)
    setPages(current.defaultPages)
  }, [productId])

  if (!product) return <Navigate to="/catalog" replace />

  const price = product.kind === 'book' ? quoteBook(product, size, pages) : product.price

  function startBook() {
    if (product?.kind !== 'book') return
    const fresh = draft.photos.length === 0 && !draft.wishes.trim()
    setDraft({
      productId: product.id,
      size,
      pages,
      step: 0,
      ...(fresh
        ? product.id === 'premium'
          ? { themeId: 'wedding' as const, styleId: 'editorial' as const }
          : product.id === 'lite'
            ? { themeId: 'family' as const, styleId: 'minimal' as const }
            : { themeId: 'travel' as const, styleId: 'quiet' as const }
        : {}),
    })
    navigate('/create')
  }

  return (
    <div className={styles.page}>
      <div className={styles.shot}>
        <div className={styles.shotInner}>
          <ProductShot product={product} />
        </div>
      </div>
      <div className={styles.info}>
        <p className={styles.kicker}>{product.kind === 'book' ? 'Фотокнига' : 'Фотопечать'}</p>
        <h1>{product.name}</h1>
        <p className={styles.description}>{product.description}</p>
        <p className={styles.price}>{product.kind === 'book' ? `от ${formatPrice(price)}` : `${formatPrice(price)} за снимок`}</p>
        <TestNote />

        {product.kind === 'book' ? (
          <>
            <dl className={styles.facts}>
              <div>
                <dt>Обложка</dt>
                <dd>{product.cover}</dd>
              </div>
              <div>
                <dt>Бумага</dt>
                <dd>{product.paper}</dd>
              </div>
              <div>
                <dt>Переплёт</dt>
                <dd>{product.binding}</dd>
              </div>
            </dl>
            <fieldset>
              <legend>Размер</legend>
              <div className={styles.options}>
                {product.sizes.map((item) => (
                  <button key={item} type="button" data-active={item === size} onClick={() => setSize(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Страницы</legend>
              <div className={styles.options}>
                {product.pageCounts.map((item) => (
                  <button key={item} type="button" data-active={item === pages} onClick={() => setPages(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        ) : (
          <ul className={styles.points}>
            {product.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        )}

        <div className={styles.buy}>
          <div>
            <strong>{product.kind === 'book' ? formatPrice(price) : formatPrice(product.price)}</strong>
            <span>Тестовая цена</span>
          </div>
          {product.kind === 'book' ? (
            <Button onClick={startBook}>Создать фотокнигу</Button>
          ) : (
            <Button onClick={() => navigate(`/print?format=${product.id}`)}>Печатать фотографии</Button>
          )}
        </div>
      </div>
    </div>
  )
}
