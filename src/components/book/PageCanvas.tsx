import type { BookPage, Frame } from '../../types'
import styles from './PageCanvas.module.scss'

type Props = {
  page: BookPage
  side: 'left' | 'right'
  quiet?: boolean
  selected?: boolean
  selectedFrameId?: string | null
  editingFrameId?: string | null
  onPage?: (pageId: string) => void
  onFrame?: (pageId: string, frame: Frame) => void
  onText?: (frameId: string, value: string) => void
}

export function PageCanvas({
  page,
  side,
  quiet = false,
  selected = false,
  selectedFrameId,
  editingFrameId,
  onPage,
  onFrame,
  onText,
}: Props) {
  return (
    <article
      className={styles.page}
      data-layout={page.layout}
      data-side={side}
      data-paper={page.paper}
      data-style={page.style}
      data-quiet={quiet ? 'true' : 'false'}
      data-selected={selected ? 'true' : 'false'}
      onClick={(event) => {
        event.stopPropagation()
        onPage?.(page.id)
      }}
    >
      {page.frames.map((frame) => {
        const isSelected = selectedFrameId === frame.id
        const editing = editingFrameId === frame.id && frame.kind === 'text'
        return (
          <div
            key={frame.id}
            className={frame.kind === 'photo' ? `${styles.frame} ${styles.photoSlot}` : `${styles.frame} ${styles.textSlot}`}
            data-slot={frame.slot}
            data-selected={isSelected ? 'true' : 'false'}
            tabIndex={quiet || editing ? -1 : 0}
            onClick={(event) => {
              event.stopPropagation()
              onFrame?.(page.id, frame)
            }}
            onKeyDown={(event) => {
              if (quiet || editing) return
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onFrame?.(page.id, frame)
              }
            }}
          >
            {frame.kind === 'photo' ? (
              <img
                src={frame.src}
                alt=""
                draggable={false}
                style={{ objectPosition: `${frame.focusX ?? 50}% ${frame.focusY ?? 50}%` }}
              />
            ) : editing ? (
              <textarea
                className={styles.editor}
                value={frame.text ?? ''}
                autoFocus
                maxLength={280}
                aria-label="Текст страницы"
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => onText?.(frame.id, event.target.value)}
              />
            ) : (
              <p className={styles[frame.role ?? 'body']}>{frame.text}</p>
            )}
          </div>
        )
      })}
    </article>
  )
}
