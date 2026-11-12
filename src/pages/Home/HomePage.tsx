import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Logo } from '../../components/brand/Logo'
import { ProductShot } from '../../components/product/ProductShot'
import { useTitle } from '../../hooks/useTitle'
import { bookProducts, getBook } from '../../data/products'
import { formatPrice } from '../../lib/format'
import { statusLabel, useAppStore } from '../../store/useAppStore'
import styles from './Home.module.scss'

const heroImage = '/photos/travel-coast.jpg'

export function HomePage() {
  useTitle('PicPac')
  const navigate = useNavigate()
  const projects = useAppStore((state) => state.projects)
  const draft = useAppStore((state) => state.draft)
  const beginCreate = useAppStore((state) => state.beginCreate)
  const books = bookProducts()
  const hasProgress = draft.photos.length > 0 || draft.wishes.trim().length > 0 || draft.step > 0
  const ordered = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.heroPhoto}>
          <img src={heroImage} alt="" />
        </div>
        <div className={styles.heroPanel}>
          <div className={styles.wordmark}>
            <Logo />
          </div>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>PicPac · Фотокниги</span>
            <h1>
              Ваши фотографии.
              <em>Настоящая книга.</em>
            </h1>
            <p>Загрузите снимки. PicPac проверит качество файлов и соберёт макет, который можно отредактировать.</p>
            <div className={styles.actions}>
              <button className={styles.primary} onClick={() => navigate('/create')} type="button">
                Создать фотокнигу
              </button>
              <button className={styles.link} type="button" onClick={() => navigate('/print')}>
                Напечатать фотографии
                <ArrowRight size={16} strokeWidth={1.5} />
              </button>
              {hasProgress ? (
                <button
                  className={styles.quiet}
                  type="button"
                  onClick={() => {
                    beginCreate()
                    navigate('/create')
                  }}
                >
                  Начать заново
                </button>
              ) : null}
            </div>
            <div className={styles.proof}>
              <span>
                <strong>2 минуты</strong>
                до первого макета
              </span>
              <span>
                <strong>12 разворотов</strong>
                уже оформлены
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.strip}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.index}>01</span>
            <h2>Ваши истории</h2>
          </div>
          <Link to="/projects">Все</Link>
        </div>
        {ordered.length === 0 ? (
          <p className={styles.empty}>Здесь появятся ваши макеты.</p>
        ) : (
          <div className={styles.rail}>
            {ordered.slice(0, 4).map((project) => (
              <Link key={project.id} to={`/editor/${project.id}`} className={styles.project}>
                <span className={styles.cover}>
                  <i />
                  {project.cover ? <img src={project.cover} alt="" /> : <b />}
                </span>
                <strong>{project.title}</strong>
                <span>
                  {getBook(project.productId)?.name ?? 'Книга'} · {statusLabel(project.status)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className={styles.books}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.index}>02</span>
            <h2>Выберите характер</h2>
          </div>
          <span>Цены тестовые</span>
        </div>
        <div className={styles.bookRail}>
          {books.map((product) => (
            <Link key={product.id} to={`/catalog/${product.id}`} className={styles.book}>
              <ProductShot product={product} />
              <strong>{product.name}</strong>
              <span>{product.summary}</span>
              <em>от {formatPrice(product.basePrice)}</em>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
