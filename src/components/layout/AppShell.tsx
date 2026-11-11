import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { TopNav } from './TopNav'
import styles from './AppShell.module.scss'

export function AppShell() {
  const { pathname } = useLocation()
  const studio = pathname.startsWith('/generate') || pathname.startsWith('/editor')
  const chrome = studio || pathname.startsWith('/create') ? 'off' : 'on'
  const home = pathname === '/'

  return (
    <div className={styles.shell} data-studio={studio ? 'true' : 'false'} data-chrome={chrome} data-home={home ? 'true' : 'false'}>
      {chrome === 'on' ? <TopNav /> : null}
      <main className={styles.main}>
        <div key={pathname} className={styles.scene}>
          <Outlet />
        </div>
      </main>
      {chrome === 'on' ? <BottomNav /> : null}
    </div>
  )
}
