import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { TestNote } from '../../components/ui/TestNote'
import { useTitle } from '../../hooks/useTitle'
import { formatDate, formatPrice } from '../../lib/format'
import { useAppStore } from '../../store/useAppStore'
import type { CheckoutForm, DeliveryMethod, Order } from '../../types'
import styles from './Checkout.module.scss'

const deliveries: { id: DeliveryMethod; name: string; note: string }[] = [
  { id: 'courier', name: 'Курьер', note: 'По городу' },
  { id: 'pickup', name: 'Самовывоз', note: 'Пункт выдачи' },
  { id: 'post', name: 'Почта', note: 'По Беларуси' },
]

export function CheckoutPage() {
  useTitle('Оформление')
  const navigate = useNavigate()
  const cart = useAppStore((state) => state.cart)
  const profile = useAppStore((state) => state.profile)
  const placeOrder = useAppStore((state) => state.placeOrder)
  const [form, setForm] = useState<CheckoutForm>({
    name: profile.name,
    phone: profile.phone,
    email: profile.email,
    delivery: 'courier',
    address: profile.city ? `${profile.city}, ` : '',
  })
  const [done, setDone] = useState<Order | null>(null)
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart])
  const valid =
    Boolean(form.name.trim() && form.phone.trim() && form.email.trim()) &&
    (form.delivery === 'pickup' || Boolean(form.address.trim()))

  if (!cart.length && !done) return <Navigate to="/cart" replace />

  if (done) {
    return (
      <div className={styles.page}>
        <p className={styles.kicker}>Готово</p>
        <h1>Заказ {done.number}</h1>
        <p className={styles.lead}>
          Тестовый заказ принят {formatDate(done.createdAt)}. Печать и оплата не запускаются — это демонстрация сценария.
        </p>
        <dl className={styles.facts}>
          <div>
            <dt>Имя</dt>
            <dd>{done.name}</dd>
          </div>
          <div>
            <dt>Контакты</dt>
            <dd>
              {done.phone}
              <br />
              {done.email}
            </dd>
          </div>
          <div>
            <dt>Доставка</dt>
            <dd>
              {deliveries.find((item) => item.id === done.delivery)?.name ?? done.delivery}
              <br />
              {done.address}
            </dd>
          </div>
          <div>
            <dt>Сумма</dt>
            <dd>{formatPrice(done.total)}</dd>
          </div>
        </dl>
        <div className={styles.actions}>
          <Button onClick={() => navigate('/profile')}>К заказам</Button>
          <Link to="/" className={styles.link}>
            На главную
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header>
        <h1>Оформление</h1>
        <p>Демонстрационная форма. Данные остаются на этом устройстве.</p>
        <TestNote />
      </header>

      <section className={styles.summary}>
        <h2>Состав</h2>
        <ul>
          {cart.map((item) => (
            <li key={item.id}>
              <span>{item.title}</span>
              <em>
                {item.qty > 1 ? `${item.qty} × ` : ''}
                {formatPrice(item.price * item.qty)}
              </em>
            </li>
          ))}
        </ul>
        <div className={styles.total}>
          <span>Итого</span>
          <strong>{formatPrice(total)}</strong>
        </div>
      </section>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          const order = placeOrder(form)
          if (order) setDone(order)
        }}
      >
        <label>
          Имя
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </label>
        <label>
          Телефон
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
        </label>

        <fieldset>
          <legend>Доставка</legend>
          <div className={styles.delivery}>
            {deliveries.map((item) => (
              <button
                key={item.id}
                type="button"
                data-active={form.delivery === item.id}
                onClick={() => setForm({ ...form, delivery: item.id })}
              >
                <strong>{item.name}</strong>
                <small>{item.note}</small>
              </button>
            ))}
          </div>
        </fieldset>

        {form.delivery !== 'pickup' ? (
          <label>
            Адрес
            <textarea
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              rows={3}
              required
            />
          </label>
        ) : (
          <p className={styles.pickup}>Самовывоз из демонстрационного пункта. Адрес не нужен.</p>
        )}

        <Button full type="submit" disabled={!valid}>
          Подтвердить заказ
        </Button>
      </form>
    </div>
  )
}
