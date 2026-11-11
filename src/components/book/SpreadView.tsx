import type { BookPage, Frame } from '../../types'
import { PageCanvas } from './PageCanvas'
import styles from './SpreadView.module.scss'

type Props = {
  left: BookPage
  right: BookPage
  quiet?: boolean
  selectedPageId?: string | null
  selectedFrameId?: string | null
  editingFrameId?: string | null
  onPage?: (pageId: string) => void
  onFrame?: (pageId: string, frame: Frame) => void
  onText?: (frameId: string, value: string) => void
}

export function SpreadView({ left, right, selectedPageId, ...rest }: Props) {
  return (
    <div className={styles.spread}>
      <PageCanvas page={left} side="left" selected={selectedPageId === left.id} {...rest} />
      <PageCanvas page={right} side="right" selected={selectedPageId === right.id} {...rest} />
    </div>
  )
}
