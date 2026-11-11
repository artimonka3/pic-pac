import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductShot } from '../../components/product/ProductShot'
import { TestNote } from '../../components/ui/TestNote'
import { useTitle } from '../../hooks/useTitle'
import { products, type Product } from '../../data/products'
import { formatPrice } from '../../lib/format'
import styles from './Catalog.module.scss'

const filters = [
  { id: 'all', label: 'Все' },
  { id: 'lite', label: 'Lite' },
  { id: 'classic', label: 'Classic' },
  { id: 'premium', label: 'Premium' },
  { id: 'print', label: 'Фотопечать' },
] as const

type FilterId = (typeof filters)[number]['id']

function matches(product: Product, filter: FilterId) {
  if (filter === 'all') return true
  if (filter === 'print') return product.kind === 'print'
  return product.id === filter
}

export function CatalogPage() {
  useTitle('Каталог')
  const [filter, setFilter] = useState<FilterId>('all')
  const visible = products.filter((product) => matches(product, filter))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Каталог</h1>
        <p>Форматы книг и печать фотографий.</p>
        <TestNote>Цены и характеристики — тестовые данные.</TestNote>
      </header>
      <div className={styles.tabs} role="tablist" aria-label="Категории">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            data-active={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className={styles.grid}>
        {visible.map((product) => (
          <Link key={product.id} to={`/catalog/${product.id}`} className={styles.card}>
            <span className={styles.plate}>
              <ProductShot product={product} />
            </span>
            <h2>{product.name}</h2>
            <p>{product.summary}</p>
            <strong>{product.kind === 'book' ? `от ${formatPrice(product.basePrice)}` : formatPrice(product.price)}</strong>
          </Link>
        ))}
      </div>
    </div>
  )
}
