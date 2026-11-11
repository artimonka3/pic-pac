import { Home, Images, LayoutGrid, ShoppingBag, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import styles from './BottomNav.module.scss'

const items = [
  { to: '/', label: 'Главная', icon: Home, end: true },
  { to: '/catalog', label: 'Каталог', icon: LayoutGrid, end: false },
  { to: '/projects', label: 'Проекты', icon: Images, end: false },
  { to: '/cart', label: 'Корзина', icon: ShoppingBag, end: false },
  { to: '/profile', label: 'Профиль', icon: User, end: false },
]

export function BottomNav() {
  const count = useAppStore((state) => state.cart.reduce((sum, item) => sum + item.qty, 0))

  return (
    <nav className={styles.bar} aria-label="Разделы">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
          >
            <Icon size={22} strokeWidth={1.5} />
            <span>
              {item.label}
              {item.to === '/cart' && count > 0 ? <sup>{count}</sup> : null}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}
