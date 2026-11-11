import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTitle } from '../../hooks/useTitle'
import { getBook } from '../../data/products'
import { formatDate } from '../../lib/format'
import { statusLabel, useAppStore } from '../../store/useAppStore'
import styles from './Projects.module.scss'

export function ProjectsPage() {
  useTitle('Проекты')
  const projects = useAppStore((state) => state.projects)
  const removeProject = useAppStore((state) => state.removeProject)
  const [pending, setPending] = useState<string | null>(null)
  const sorted = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <div className={styles.page}>
      <header>
        <h1>Проекты</h1>
        <p>Сохранены в localStorage на этом устройстве.</p>
      </header>
      {sorted.length === 0 ? (
        <div className={styles.empty}>
          <p>Пока нет макетов.</p>
          <Link to="/create">Создать фотокнигу</Link>
        </div>
      ) : (
        <ul>
          {sorted.map((project) => {
            const product = getBook(project.productId)
            return (
              <li key={project.id}>
                <div className={styles.row}>
                  <span className={styles.cover}>{project.cover ? <img src={project.cover} alt="" /> : null}</span>
                  <div className={styles.meta}>
                    <strong>{project.title}</strong>
                    <small>
                      {product?.name ?? 'Книга'} · {project.size}
                    </small>
                    <small>Изменён {formatDate(project.updatedAt)}</small>
                    <span className={styles.status} data-status={project.status}>
                      {statusLabel(project.status)}
                    </span>
                  </div>
                </div>
                <div className={styles.actions}>
                  <Link to={`/editor/${project.id}`}>Продолжить</Link>
                  {pending === project.id ? (
                    <button type="button" className={styles.delete} onClick={() => removeProject(project.id)}>
                      Точно удалить
                    </button>
                  ) : (
                    <button type="button" className={styles.delete} onClick={() => setPending(project.id)}>
                      Удалить
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
