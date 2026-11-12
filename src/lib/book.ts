import type { Book, BookPage, Frame, LayoutId, Paper, Role, Slot } from '../types'
import { uid } from './format'

export function textFrame(slot: Slot, role: Role, text: string): Frame {
  return { id: uid(), slot, kind: 'text', role, text }
}

export function photoFrame(slot: Slot, src: string): Frame {
  return { id: uid(), slot, kind: 'photo', src }
}

export function coverOf(book: Book) {
  const photos = (page: BookPage) => page.frames.find((frame) => frame.kind === 'photo' && frame.src)?.src
  const cover = book.pages.find((page) => page.layout === 'cover')
  return (cover && photos(cover)) || book.pages.map(photos).find(Boolean) || ''
}

export function isLockedLayout(layout: LayoutId) {
  return layout === 'cover' || layout === 'colophon'
}

export function photoPool(book: Book, page: BookPage) {
  const photos = [page, ...book.pages.filter((item) => item.id !== page.id)]
    .flatMap((item) => item.frames.flatMap((frame) => frame.kind === 'photo' && frame.src ? [frame.src] : []))
  return [...new Set(photos)]
}

export function applyLayout(page: BookPage, layout: LayoutId, sources: string[]): BookPage {
  if (isLockedLayout(page.layout) || layout === 'cover' || layout === 'colophon' || page.layout === layout) return page
  const existingPhotos = page.frames.filter((frame) => frame.kind === 'photo')
  const existingText = page.frames.filter((frame) => frame.kind === 'text')

  function text(slot: Slot, role: Role, index: number) {
    const existing = existingText[index]
    return existing ? { ...existing, slot, role } : textFrame(slot, role, '')
  }

  const photos = (slots: Slot[]) => {
    const used = new Set(existingPhotos.map((frame) => frame.src))
    return slots.flatMap((slot, index) => {
      if (existingPhotos[index]?.src) return [{ ...existingPhotos[index], slot }]
      const src = sources.find((item) => !used.has(item)) ?? sources[index % (sources.length || 1)]
      if (!src) return []
      used.add(src)
      return [photoFrame(slot, src)]
    })
  }

  const framesByLayout = {
    opener: () => [text('a', 'title', 0), text('b', 'body', 1)],
    bleed: () => photos(['a']),
    hero: () => [...photos(['a']), text('b', 'caption', 0)],
    aside: () => [...photos(['a']), text('b', 'body', 0)],
    stack: () => photos(['a', 'b']),
    trio: () => photos(['a', 'b', 'c']),
  }
  return { ...page, layout, frames: framesByLayout[layout]() }
}

export function setFrame(book: Book, frameId: string, patch: Partial<Pick<Frame, 'src' | 'text' | 'focusX' | 'focusY'>>): Book {
  const page = book.pages.find((item) => item.frames.some((frame) => frame.id === frameId))
  if (!page) return book
  const frames = page.frames.map((frame) => frame.id === frameId ? { ...frame, ...patch } : frame)
  const title = page.layout === 'cover'
    ? frames.find((frame) => frame.role === 'title')?.text?.trim() || book.title
    : book.title
  return { ...book, title, pages: book.pages.map((item) => item === page ? { ...page, frames } : item) }
}

export function setPagePaper(book: Book, pageId: string, paper: Paper): Book {
  if (!book.pages.some((page) => page.id === pageId && page.paper !== paper)) return book
  return { ...book, pages: book.pages.map((page) => page.id === pageId ? { ...page, paper } : page) }
}

export function addTextBlock(book: Book, pageId: string, value: string): Book {
  const page = book.pages.find((item) => item.id === pageId)
  if (!page || page.frames.some((frame) => frame.kind === 'text' && frame.role !== 'meta')) return book

  const next = isLockedLayout(page.layout) ? page : applyLayout(page, 'hero', photoPool(book, page))
  const text = next.frames.find((frame) => frame.kind === 'text' && frame.role !== 'meta')
  const frames = text
    ? next.frames.map((frame) => frame.id === text.id ? { ...frame, text: value } : frame)
    : [...next.frames, textFrame(page.layout === 'cover' ? 'b' : 'a', 'caption', value)]
  return { ...book, pages: book.pages.map((item) => item === page ? { ...next, frames } : item) }
}
