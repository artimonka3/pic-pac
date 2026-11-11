import styles from './TestNote.module.scss'

export function TestNote({ children = 'Тестовые данные. Не является офертой.' }: { children?: string }) {
  return <p className={styles.note}>{children}</p>
}
