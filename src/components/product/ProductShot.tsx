import type { Product } from '../../data/products'
import styles from './ProductShot.module.scss'

export function ProductShot({ product }: { product: Product }) {
  if (product.kind === 'print') {
    return (
      <div className={styles.print}>
        <img src={product.image} alt="" />
      </div>
    )
  }

  return (
    <div className={styles.book}>
      <span className={styles.spine} style={{ background: product.spine }} />
      <img src={product.image} alt="" />
    </div>
  )
}
