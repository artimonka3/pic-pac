import { Link } from 'react-router-dom'
import styles from './Logo.module.scss'

export function Logo() {
  return (
    <Link to="/" className={styles.logo}>
      PicPac
    </Link>
  )
}
