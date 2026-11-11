import { Link } from 'react-router-dom'
import { useTitle } from '../../hooks/useTitle'
import { formatDate, formatPrice } from '../../lib/format'
import { useAppStore } from '../../store/useAppStore'
import styles from './Profile.module.scss'

const deliveryLabel = {
  courier: 'Курьер',
  pickup: 'Самовывоз',
  post: 'Почта',
} as const

export function ProfilePage() {
  useTitle('Профиль')
  const profile = useAppStore((state) => state.profile)
  const orders = useAppStore((state) => state.orders)
  const setProfile = useAppStore((state) => state.setProfile)

  return (
    <div className={styles.page}>
      <p className={styles.kicker}>Профиль</p>
      <h1>{profile.name}</h1>
      <p className={styles.lead}>Локальный профиль прототипа. Хранится только в браузере.</p>

      <section>
        <h2>Контакты</h2>
        <label>
          Имя
          <input value={profile.name} onChange={(event) => setProfile({ name: event.target.value })} />
        </label>
        <label>
          Телефон
          <input value={profile.phone} onChange={(event) => setProfile({ phone: event.target.value })} />
        </label>
        <label>
          Email
          <input value={profile.email} onChange={(event) => setProfile({ email: event.target.value })} />
        </label>
        <label>
          Город
          <input value={profile.city} onChange={(event) => setProfile({ city: event.target.value })} />
        </label>
      </section>

      <section>
        <h2>Настройки</h2>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={profile.notifyOrders}
            onChange={(event) => setProfile({ notifyOrders: event.target.checked })}
          />
          Уведомления о заказах
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={profile.notifyTips}
            onChange={(event) => setProfile({ notifyTips: event.target.checked })}
          />
          Подсказки по макету
        </label>
        <p className={styles.note}>Переключатели демонстрационные. Письма не отправляются.</p>
      </section>

      <section>
        <div className={styles.head}>
          <h2>Заказы</h2>
          <Link to="/projects">К проектам</Link>
        </div>
        {orders.length === 0 ? (
          <p className={styles.empty}>Заказов пока нет.</p>
        ) : (
          <ul>
            {orders.map((order) => (
              <li key={order.id}>
                <strong>{order.number}</strong>
                <span>
                  {formatDate(order.createdAt)} · {formatPrice(order.total)}
                  <br />
                  {deliveryLabel[order.delivery] ?? order.delivery}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Поддержка</h2>
        <p className={styles.support}>
          По вопросам прототипа: <a href="mailto:hello@picpac.demo">hello@picpac.demo</a>
        </p>
        <p className={styles.note}>Это демо-контакт. Реальная поддержка не подключена.</p>
      </section>
    </div>
  )
}
