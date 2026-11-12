import type { Book, BookPage, Frame } from '../types'
import { applyLayout, isLockedLayout, photoPool, setPagePaper } from './book'

type EditContext = {
  spreadIndex: number
  pageId: string | null
  frameId: string | null
}

type EditResult = { book: Book; reply: string; focusSpread?: number }

function updatePage(book: Book, updated: BookPage): Book {
  return { ...book, pages: book.pages.map((page) => page.id === updated.id ? updated : page) }
}

function swapPhotos(book: Book, page: BookPage, context: EditContext): EditResult {
  const photos = (item: BookPage) => item.frames.filter((frame) => frame.kind === 'photo' && frame.src)
  const spread = book.pages.slice(context.spreadIndex * 2, context.spreadIndex * 2 + 2)
  const frames = [...photos(page), ...spread.filter((item) => item !== page).flatMap(photos)]
  const first = frames.find((frame) => frame.id === context.frameId) ?? frames[0]
  const second = frames.find((frame) => frame.id !== first?.id && frame.src !== first?.src)
  if (!first || !second) return { book, reply: 'Для обмена нужны два разных снимка на развороте.' }

  function withPhoto(frame: Frame, source: Frame): Frame {
    return { ...frame, src: source.src, focusX: source.focusX, focusY: source.focusY }
  }

  const pages = book.pages.map((item) => {
    if (!item.frames.some((frame) => frame === first || frame === second)) return item
    const frames = item.frames.map((frame) => {
      if (frame === first) return withPhoto(frame, second)
      if (frame === second) return withPhoto(frame, first)
      return frame
    })
    return { ...item, frames }
  })
  return { book: { ...book, pages }, reply: 'Поменял снимки местами.' }
}

export function applyPrompt(book: Book, prompt: string, context: EditContext): EditResult {
  const command = prompt.trim().toLocaleLowerCase('ru')
  const page = book.pages.find((item) => item.id === context.pageId) ?? book.pages[context.spreadIndex * 2]

  if (/обложк/u.test(command) && /минимал/u.test(command)) {
    const coverIndex = book.pages.findIndex((item) => item.layout === 'cover')
    if (coverIndex < 0) return { book, reply: 'В этой книге нет обложки.' }
    const cover = book.pages[coverIndex]
    return {
      book: updatePage(book, {
        ...cover,
        style: 'minimal',
        paper: 'white',
        frames: cover.frames.filter((frame) => frame.role !== 'meta'),
      }),
      reply: 'Оставил на обложке фотографию и название.',
      focusSpread: Math.floor(coverIndex / 2),
    }
  }

  if (!page) return { book, reply: 'Выберите страницу для правки.' }

  if (/убер|удал/u.test(command) && /текст|подпис/u.test(command)) {
    const frames = page.frames.filter((frame) => frame.kind !== 'text')
    if (frames.length === page.frames.length) return { book, reply: 'На этой странице уже нет текста.' }
    return { book: updatePage(book, { ...page, frames }), reply: 'Убрал текст со страницы.' }
  }

  if (/фон|бумаг/u.test(command) && /светл|бел/u.test(command)) {
    return { book: setPagePaper(book, page.id, 'white'), reply: 'Выбрал белый фон для страницы.' }
  }

  if (/поменя|перестав/u.test(command) && /мест|фото|сним/u.test(command)) {
    return swapPhotos(book, page, context)
  }

  if (/крупн/u.test(command) && /фото|кадр|сним/u.test(command)) {
    const pages = book.pages.map((item) =>
      !isLockedLayout(item.layout) && item.frames.some((frame) => frame.kind === 'photo')
        ? applyLayout(item, item.frames.some((frame) => frame.text?.trim()) ? 'hero' : 'bleed', photoPool(book, item))
        : item,
    )
    if (pages.every((item, index) => item === book.pages[index])) {
      return { book, reply: 'Фотографии уже занимают максимум места в этих макетах.' }
    }
    return { book: { ...book, pages }, reply: 'Сделал фотографии крупнее на страницах с кадрами.' }
  }

  return { book, reply: 'Попробуйте попросить осветлить фон, убрать текст, увеличить или поменять местами фотографии.' }
}
