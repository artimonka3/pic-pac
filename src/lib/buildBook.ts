import { library } from '../data/library'
import { getBook } from '../data/products'
import { themeById } from '../data/themes'
import type { Book, BookPage, Frame, LayoutId, LocalPhoto, Paper, Slot, StyleId, ThemeId } from '../types'
import { photoFrame, textFrame } from './book'
import { uid } from './format'

type BookOptions = {
  productId: string
  themeId: ThemeId
  styleId: StyleId
  wishes: string
  photos: LocalPhoto[]
  title?: string
  meta?: string
  size: string
  pages: number
}

type ContentLayout = 'hero' | 'stack' | 'bleed' | 'aside' | 'trio'

const layouts: Record<StyleId, ContentLayout[]> = {
  quiet: ['hero', 'bleed', 'stack', 'aside'],
  film: ['aside', 'stack', 'hero', 'bleed'],
  editorial: ['trio', 'bleed', 'aside', 'stack'],
  minimal: ['bleed', 'hero', 'aside'],
}

const papers: Record<StyleId, Paper> = {
  quiet: 'white',
  film: 'sand',
  editorial: 'cool',
  minimal: 'white',
}

export function resolveTitle(themeId: ThemeId, wishes: string) {
  const title = wishes.match(/(?:название|заголовок)\s*:\s*[«"“]?([^\n»"”]+)/iu)?.[1]?.trim()
  return title?.slice(0, 80) || themeById(themeId).name
}

export function buildBook(options: BookOptions): Book {
  const { themeId, styleId, wishes, photos, size } = options
  const title = options.title ?? resolveTitle(themeId, wishes)
  const meta = options.meta ?? [getBook(options.productId)?.name, size].filter(Boolean).join(' · ')
  const sources = photos.length ? photos.map((photo) => photo.src) : library[themeId]
  const pattern = layouts[styleId]
  const pageCount = Math.max(4, Math.ceil(options.pages / 2) * 2)
  let photoIndex = 0

  function nextPhoto(slot: Slot) {
    const src = sources[photoIndex % sources.length]
    photoIndex += 1
    return photoFrame(slot, src)
  }

  function page(layout: LayoutId, pageNumber: number | null, frames: Frame[]): BookPage {
    return { id: uid(), layout, paper: papers[styleId], style: styleId, pageNumber, frames }
  }

  const cover = page('cover', null, [nextPhoto('a'), textFrame('b', 'title', title), textFrame('c', 'meta', meta)])
  const opener = page('opener', 1, [
    textFrame('a', 'title', title),
    textFrame('b', 'body', wishes.trim().slice(0, 280)),
  ])
  const content = Array.from({ length: pageCount - 3 }, (_, index) => {
    const layout = pattern[index % pattern.length]
    const frames = [nextPhoto('a')]
    if (layout === 'stack' || layout === 'trio') frames.push(nextPhoto('b'))
    if (layout === 'trio') frames.push(nextPhoto('c'))
    if (layout === 'hero' || layout === 'aside') frames.push(textFrame('b', 'caption', ''))
    return page(layout, index + 2, frames)
  })
  const colophon = page('colophon', null, [textFrame('a', 'title', title), textFrame('b', 'meta', meta)])
  return { title, pages: [cover, opener, ...content, colophon] }
}
