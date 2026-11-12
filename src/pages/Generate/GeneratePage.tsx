import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { library } from '../../data/library'
import { useTitle } from '../../hooks/useTitle'
import { resolveTitle } from '../../lib/buildBook'
import { useAppStore } from '../../store/useAppStore'
import styles from './Generate.module.scss'

const steps = [
  { title: 'Подготовка фотографий', text: 'Подбираем кадры для макета.' },
  { title: 'Создание структуры', text: 'Делим историю на развороты.' },
  { title: 'Компоновка страниц', text: 'Собираем сетку и поля.' },
  { title: 'Оформление обложки', text: 'Ставим кадр и заголовок.' },
  { title: 'Проверка результата', text: 'Сверяем подписи и нумерацию.' },
]

export function GeneratePage() {
  useTitle('Сборка макета')
  const navigate = useNavigate()
  const location = useLocation()
  const draft = useAppStore((state) => state.draft)
  const [step, setStep] = useState(0)
  const token = (location.state as { token?: string } | null)?.token
  const title = resolveTitle(draft.themeId, draft.wishes)
  const cover = draft.photos[0]?.src ?? library[draft.themeId][0]

  useEffect(() => {
    const current = useAppStore.getState().draft
    if (!token || token !== current.token || !current.armed) {
      navigate('/create', { replace: true })
      return
    }
    const timers = [1, 2, 3, 4].map((index) => window.setTimeout(() => setStep(index), index * 1200))
    timers.push(
      window.setTimeout(() => {
        const project = useAppStore.getState().createFromDraft(token)
        navigate(project ? `/editor/${project.id}` : '/create', { replace: true })
      }, 5 * 1200),
    )
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [navigate, token])

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={() => navigate('/create')}>
        Назад
      </button>
      <div className={styles.center}>
        <p className={styles.kicker}>Сборка макета</p>
        <h1>{title}</h1>
        <div className={styles.plate}>
          <span />
          <img src={cover} alt="" style={{ opacity: 0.28 + step * 0.14 }} />
        </div>
        <div className={styles.bar} aria-hidden="true">
          <i style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <ol>
          {steps.map((item, index) => {
            const state = index < step ? 'done' : index === step ? 'now' : 'wait'
            return (
              <li key={item.title} data-state={state}>
                <i />
                <span>{item.title}</span>
                {state === 'now' ? <small>{item.text}</small> : null}
              </li>
            )
          })}
        </ol>
        <p className={styles.note}>Демонстрация. Макет собирается в браузере, без внешних сервисов.</p>
      </div>
    </div>
  )
}
