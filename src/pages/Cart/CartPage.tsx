import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus } from 'lucide-react'
import { TestNote } from '../../components/ui/TestNote'
import { Button } from '../../components/ui/Button'
import { useTitle } from '../../hooks/useTitle'
import { formatPrice } from '../../lib/format'
import { useAppStore } from '../../store/useAppStore'
import styles from './Cart.module.scss'

export function CartPage() {
  useTitle('Корзина')
  const navigate = useNavigate()
  const cart = useAppStore((state) => state.cart)
  const setCartQty = useAppStore((state) => state.setCartQty)
  const removeCartItem = useAppStore((state) => state.removeCartItem)
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0)

  return (
    <div className={styles.page}>
      <header>
        <h1>Корзина</h1>
      </header>
      {cart.length === 0 ? (
        <div className={styles.empty}>
          <p>Пока пусто.</p>
          <Link to="/catalog">Перейти в каталог</Link>
        </div>
      ) : (
        <>
          <ul>
            {cart.map((item) => (
              <li key={item.id}>
                <span className={styles.cover}>{item.cover ? <img src={item.cover} alt="" /> : null}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.spec}</small>
                  <em>{formatPrice(item.price * item.qty)}</em>
                </div>
                <div className={styles.qty}>
                  <button type="button" onClick={() => setCartQty(item.id, item.qty - 1)} disabled={item.qty <= 1} aria-label="Меньше">
                    <Minus size={14} />
                  </button>
                  <span>{item.qty}</span>
                  <button type="button" onClick={() => setCartQty(item.id, item.qty + 1)} aria-label="Больше">
                    <Plus size={14} />
                  </button>
                </div>
                <button type="button" className={styles.remove} onClick={() => removeCartItem(item.id)}>
                  Удалить
                </button>
              </li>
            ))}
          </ul>
          <div className={styles.checkout}>
            <div className={styles.line}>
              <span>Итого</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            <TestNote />
            <Button full onClick={() => navigate('/checkout')}>
              К оформлению
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
