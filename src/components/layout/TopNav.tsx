import { NavLink, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { Logo } from '../brand/Logo'
import styles from './TopNav.module.scss'

const links = [
  { to: '/', label: 'Главная', end: true },
  { to: '/catalog', label: 'Каталог', end: false },
  { to: '/projects', label: 'Проекты', end: false },
  { to: '/profile', label: 'Профиль', end: false },
]

export function TopNav() {
  const count = useAppStore((state) => state.cart.reduce((sum, item) => sum + item.qty, 0))
  const home = useLocation().pathname === '/'

  return (
    <header className={styles.bar} data-overlay={home ? 'true' : 'false'}>
      <Logo />
      <nav className={styles.nav} aria-label="Разделы">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <NavLink to="/cart" className={({ isActive }) => (isActive ? `${styles.cart} ${styles.active}` : styles.cart)}>
        Корзина
        {count > 0 ? <span>{count}</span> : null}
      </NavLink>
    </header>
  )
}
