import { useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Crop,
  Image as ImageIcon,
  LayoutTemplate,
  MessageSquare,
  Palette,
  Redo2,
  ShoppingBag,
  Type,
  Undo2,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageCanvas } from '../../components/book/PageCanvas'
import { SpreadView } from '../../components/book/SpreadView'
import { useTitle } from '../../hooks/useTitle'
import { styleById } from '../../data/themes'
import { applyPrompt } from '../../lib/aiEdit'
import { addTextBlock, applyLayout, isLockedLayout, photoPool, setFrame, setPagePaper } from '../../lib/book'
import { uid } from '../../lib/format'
import { useAppStore } from '../../store/useAppStore'
import type { Book, BookPage, Frame, LayoutId, Paper } from '../../types'
import { ChatPanel } from './ChatPanel'
import styles from './Editor.module.scss'

const layouts: { id: LayoutId; name: string }[] = [
  { id: 'bleed', name: 'На всю' },
  { id: 'hero', name: 'Кадр и подпись' },
  { id: 'stack', name: 'Два кадра' },
  { id: 'trio', name: 'Три кадра' },
  { id: 'aside', name: 'Поле с текстом' },
  { id: 'opener', name: 'Текстовая' },
]

const papers: { id: Paper; name: string }[] = [
  { id: 'white', name: 'Белый' },
  { id: 'sand', name: 'Песочный' },
  { id: 'cool', name: 'Холодный' },
  { id: 'sage', name: 'Шалфей' },
]

type Panel = 'chat' | 'layout' | 'photo' | 'paper' | 'crop' | null

function folio(page: BookPage) {
  if (page.layout === 'cover') return 'Обложка'
  if (page.layout === 'colophon') return 'Конец'
  return page.pageNumber ? String(page.pageNumber) : ''
}

function thumbImage(page: BookPage) {
  const src = page.frames.find((frame) => frame.kind === 'photo' && frame.src)?.src
  return src ? `url("${src}")` : 'none'
}

function sourcesOf(book: Book, uploads: { src: string }[]) {
  const list: string[] = []
  const push = (src?: string) => {
    if (src && !list.includes(src)) list.push(src)
  }
  uploads.forEach((photo) => push(photo.src))
  book.pages.forEach((page) => page.frames.forEach((frame) => push(frame.src)))
  return list
}

export function EditorPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const project = useAppStore((state) => state.projects.find((item) => item.id === projectId))
  const updateBook = useAppStore((state) => state.updateBook)
  const addMessage = useAppStore((state) => state.addMessage)
  const addBookToCart = useAppStore((state) => state.addBookToCart)
  const inCart = useAppStore((state) => state.cart.some((item) => item.projectId === projectId))
  const [spreadIndex, setSpreadIndex] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [view, setView] = useState<'spread' | 'page'>('spread')
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [turn, setTurn] = useState({ n: 0, dir: 1 })
  const [hydrated, setHydrated] = useState(() => useAppStore.persist.hasHydrated())
  const undoStack = useRef<Book[]>([])
  const redoStack = useRef<Book[]>([])
  const point = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)
  const goRef = useRef<(delta: number) => void>(() => {})

  useTitle(project?.title ?? 'Редактор')

  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) setHydrated(true)
    return useAppStore.persist.onFinishHydration(() => setHydrated(true))
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const current = useAppStore.getState().projects.find((item) => item.id === projectId)
    if (!current) {
      navigate('/', { replace: true })
      return
    }
    setSpreadIndex(0)
    setPageIndex(0)
    setView('spread')
    setSelectedPageId(current.book.pages[1]?.id ?? current.book.pages[0]?.id ?? null)
    setSelectedFrameId(null)
    setEditingId(null)
    setPanel(null)
    undoStack.current = []
    redoStack.current = []
    setCanUndo(false)
    setCanRedo(false)
  }, [hydrated, navigate, projectId])

  const book = project?.book
  const spreadCount = Math.max(1, Math.ceil((book?.pages.length ?? 1) / 2))
  const spread = Math.min(spreadIndex, spreadCount - 1)
  const pageCursor = Math.min(pageIndex, Math.max(0, (book?.pages.length ?? 1) - 1))
  const left = book?.pages[spread * 2]
  const right = book?.pages[spread * 2 + 1]
  const activePage = book?.pages.find((page) => page.id === selectedPageId) ?? right ?? left ?? null
  const selectedFrame = activePage?.frames.find((frame) => frame.id === selectedFrameId) ?? null

  function pushUndo(snapshot: Book) {
    undoStack.current.push(snapshot)
    if (undoStack.current.length > 25) undoStack.current.shift()
    redoStack.current = []
    setCanUndo(true)
    setCanRedo(false)
  }

  function undo() {
    const current = useAppStore.getState().projects.find((item) => item.id === projectId)
    const prev = undoStack.current.pop()
    setCanUndo(undoStack.current.length > 0)
    if (!prev || !current) return
    redoStack.current.push(current.book)
    setCanRedo(true)
    updateBook(projectId, prev)
    setEditingId(null)
  }

  function redo() {
    const current = useAppStore.getState().projects.find((item) => item.id === projectId)
    const next = redoStack.current.pop()
    setCanRedo(redoStack.current.length > 0)
    if (!next || !current) return
    undoStack.current.push(current.book)
    setCanUndo(true)
    updateBook(projectId, next)
    setEditingId(null)
  }

  function go(delta: number) {
    if (!book) return
    if (view === 'spread') {
      const next = Math.min(spreadCount - 1, Math.max(0, spread + delta))
      if (next === spread) return
      setTurn((current) => ({ n: current.n + 1, dir: delta }))
      setSpreadIndex(next)
      setPageIndex(next * 2)
      const page = book.pages[next * 2 + 1] ?? book.pages[next * 2]
      if (page) setSelectedPageId(page.id)
    } else {
      const next = Math.min(book.pages.length - 1, Math.max(0, pageCursor + delta))
      if (next === pageCursor) return
      setTurn((current) => ({ n: current.n + 1, dir: delta }))
      setPageIndex(next)
      setSpreadIndex(Math.floor(next / 2))
      const page = book.pages[next]
      if (page) setSelectedPageId(page.id)
    }
    setSelectedFrameId(null)
    setEditingId(null)
  }

  goRef.current = go

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea')) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (event.key === 'ArrowRight') goRef.current(1)
      if (event.key === 'ArrowLeft') goRef.current(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!project || !book || !left || !right) return null
  const activeProject = project
  const activeBook = book
  const spreadLeft = left
  const spreadRight = right

  function selectPage(pageId: string) {
    if (swiped.current) {
      swiped.current = false
      return
    }
    setSelectedPageId(pageId)
    setSelectedFrameId(null)
    setEditingId(null)
  }

  function selectFrame(pageId: string, frame: Frame) {
    if (swiped.current) {
      swiped.current = false
      return
    }
    setSelectedPageId(pageId)
    setSelectedFrameId(frame.id)
    if (frame.kind === 'text') {
      if (editingId !== frame.id) pushUndo(activeProject.book)
      setEditingId(frame.id)
      return
    }
    setEditingId(null)
  }

  function onText(frameId: string, value: string) {
    const current = useAppStore.getState().projects.find((item) => item.id === projectId)
    if (!current) return
    updateBook(projectId, setFrame(current.book, frameId, { text: value }))
  }

  function chooseLayout(layout: LayoutId) {
    const current = useAppStore.getState().projects.find((item) => item.id === projectId)
    const page = current?.book.pages.find((item) => item.id === (activePage?.id ?? ''))
    if (!current || !page || isLockedLayout(page.layout)) return
    pushUndo(current.book)
    const pages = current.book.pages.map((item) =>
      item.id === page.id ? applyLayout(item, layout, photoPool(current.book, item)) : item,
    )
    updateBook(projectId, { ...current.book, pages })
    setSelectedFrameId(null)
    setEditingId(null)
    setPanel(null)
  }

  function ensurePhotoSelected() {
    const current = useAppStore.getState().projects.find((item) => item.id === projectId)
    if (!current) return null
    const candidates = [activePage, left, right].filter((page): page is BookPage => Boolean(page))
    const existing = candidates.flatMap((page) => page.frames).find((frame) => frame.id === selectedFrameId && frame.kind === 'photo')
    const frame = existing ?? candidates.flatMap((page) => page.frames).find((item) => item.kind === 'photo')
    if (!frame) return null
    const owner = current.book.pages.find((page) => page.frames.some((item) => item.id === frame.id))
    if (owner) setSelectedPageId(owner.id)
    setSelectedFrameId(frame.id)
    setEditingId(null)
    return frame
  }

  function openPhoto() {
    if (!ensurePhotoSelected()) return
    setPanel('photo')
  }

  function replacePhoto(src: string) {
    const current = useAppStore.getState().projects.find((item) => item.id === projectId)
    if (!current || !selectedFrameId) return
    pushUndo(current.book)
    updateBook(projectId, setFrame(current.book, selectedFrameId, { src }))
  }

  function setFocus(axis: 'focusX' | 'focusY', value: number) {
    const current = useAppStore.getState().projects.find((item) => item.id === projectId)
    if (!current || !selectedFrameId) return
    if (!undoStack.current.length || undoStack.current[undoStack.current.length - 1] !== current.book) {
      // first slider move in a crop session snapshots once via explicit begin in openCrop
    }
    updateBook(projectId, setFrame(current.book, selectedFrameId, { [axis]: value }))
  }

  function beginCropSession() {
    const current = useAppStore.getState().projects.find((item) => item.id === projectId)
    if (!current) return
    pushUndo(current.book)
  }

  function choosePaper(paper: Paper) {
    const current = useAppStore.getState().projects.find((item) => item.id === projectId)
    const page = current?.book.pages.find((item) => item.id === (activePage?.id ?? ''))
    if (!current || !page) return
    pushUndo(current.book)
    updateBook(projectId, setPagePaper(current.book, page.id, paper))
  }

  function addCaption() {
    const current = useAppStore.getState().projects.find((item) => item.id === projectId)
    const page = current?.book.pages.find((item) => item.id === (activePage?.id ?? ''))
    if (!current || !page) return
    pushUndo(current.book)
    const next = addTextBlock(current.book, page.id, 'Новая подпись')
    updateBook(projectId, next)
    const updated = next.pages.find((item) => item.id === page.id)
    const textFrame = updated?.frames.find((frame) => frame.kind === 'text' && frame.role !== 'meta')
    if (textFrame) {
      setSelectedFrameId(textFrame.id)
      setEditingId(textFrame.id)
    }
    setPanel(null)
  }

  function openText() {
    const pages = (view === 'page' ? [activeBook.pages[pageCursor]] : [spreadLeft, spreadRight]).filter(
      (page): page is BookPage => Boolean(page),
    )
    const frames = pages.flatMap((page) => page.frames)
    const frame = frames.find((item) => item.id === selectedFrameId && item.kind === 'text') ?? frames.find((item) => item.kind === 'text')
    if (!frame) {
      addCaption()
      return
    }
    const owner = activeBook.pages.find((page) => page.frames.some((item) => item.id === frame.id))
    if (!owner) return
    if (editingId !== frame.id) pushUndo(activeProject.book)
    setSelectedPageId(owner.id)
    setSelectedFrameId(frame.id)
    setEditingId(frame.id)
    setPanel(null)
  }

  function send(text: string) {
    const current = useAppStore.getState().projects.find((item) => item.id === projectId)
    if (!current) return
    addMessage(projectId, { id: uid(), role: 'user', text })
    if (/^(отмена|назад)$/i.test(text)) {
      const prev = undoStack.current.pop()
      setCanUndo(undoStack.current.length > 0)
      if (prev) {
        redoStack.current.push(current.book)
        setCanRedo(true)
        updateBook(projectId, prev)
      }
      addMessage(projectId, {
        id: uid(),
        role: 'assistant',
        text: prev ? 'Вернул предыдущий вариант.' : 'Возвращать пока нечего.',
      })
      return
    }
    const result = applyPrompt(current.book, text, {
      spreadIndex: spread,
      pageId: activePage?.id ?? null,
      frameId: selectedFrameId,
    })
    if (result.book !== current.book) {
      pushUndo(current.book)
      updateBook(projectId, result.book)
    }
    addMessage(projectId, { id: uid(), role: 'assistant', text: result.reply })
    if (typeof result.focusSpread === 'number') {
      setSpreadIndex(result.focusSpread)
      setPageIndex(result.focusSpread * 2)
      setView('spread')
    }
  }

  function changeView(next: 'spread' | 'page') {
    if (next === 'page') {
      const index = activeBook.pages.findIndex((page) => page.id === activePage?.id)
      setPageIndex(index >= 0 ? index : spread * 2)
    } else {
      setSpreadIndex(Math.floor(pageCursor / 2))
    }
    setView(next)
    setEditingId(null)
  }

  const subtitle = editingId
    ? 'Текст правится на странице'
    : selectedFrame?.kind === 'photo'
      ? 'Можно заменить или кадрировать снимок'
      : `${project.size} · ${styleById(project.styleId).name} · ${book.pages.length} стр.`
  const single = book.pages[pageCursor]
  const photoSources = sourcesOf(book, project.photos)
  const locked = activePage ? isLockedLayout(activePage.layout) : true
  const sheetOpen = panel === 'layout' || panel === 'photo' || panel === 'paper' || panel === 'crop'

  return (
    <div className={styles.editor}>
      <header className={styles.head}>
        <button type="button" className={styles.iconBtn} onClick={() => navigate('/projects')} aria-label="К проектам">
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>
        <div className={styles.titles}>
          <h1>{project.title}</h1>
          <p>{subtitle}</p>
        </div>
        <button type="button" className={styles.iconBtn} onClick={undo} disabled={!canUndo} aria-label="Отменить">
          <Undo2 size={18} strokeWidth={1.5} />
        </button>
        <button type="button" className={styles.iconBtn} onClick={redo} disabled={!canRedo} aria-label="Повторить">
          <Redo2 size={18} strokeWidth={1.5} />
        </button>
        <button type="button" className={styles.cart} data-in={inCart} onClick={() => (inCart ? navigate('/cart') : addBookToCart(project.id))}>
          <ShoppingBag size={20} strokeWidth={1.5} />
          <span>{inCart ? 'В корзине' : 'В корзину'}</span>
        </button>
      </header>

      <div className={styles.workspace}>
        <div className={styles.thumbs}>
          {Array.from({ length: spreadCount }, (_, index) => {
            const thumbLeft = book.pages[index * 2]
            const thumbRight = book.pages[index * 2 + 1]
            if (!thumbLeft || !thumbRight) return null
            return (
              <button
                key={thumbLeft.id}
                type="button"
                className={styles.thumb}
                data-active={index === spread}
                aria-label={`Разворот ${index + 1}`}
                onClick={() => {
                  setTurn((current) => ({ n: current.n + 1, dir: index >= spread ? 1 : -1 }))
                  setSpreadIndex(index)
                  setPageIndex(index * 2)
                  setSelectedPageId(thumbRight.id)
                  setSelectedFrameId(null)
                  setEditingId(null)
                }}
              >
                <span className={styles.mini} aria-hidden="true">
                  <i style={{ backgroundImage: thumbImage(thumbLeft) }} />
                  <i style={{ backgroundImage: thumbImage(thumbRight) }} />
                </span>
              </button>
            )
          })}
        </div>

        <div className={styles.center}>
          <div className={styles.switcher}>
            <button type="button" data-active={view === 'spread'} onClick={() => changeView('spread')}>
              Разворот
            </button>
            <button type="button" data-active={view === 'page'} onClick={() => changeView('page')}>
              Страница
            </button>
          </div>
          <div
            className={styles.stage}
            onClick={() => {
              if (swiped.current) {
                swiped.current = false
                return
              }
              setSelectedFrameId(null)
              setEditingId(null)
            }}
            onPointerDown={(event) => {
              const target = event.target as HTMLElement
              if (target.closest('textarea, input, button')) return
              point.current = { x: event.clientX, y: event.clientY }
            }}
            onPointerUp={(event) => {
              if (!point.current) return
              const dx = event.clientX - point.current.x
              const dy = event.clientY - point.current.y
              point.current = null
              if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return
              swiped.current = true
              go(dx < 0 ? 1 : -1)
            }}
          >
            <button
              type="button"
              className={`${styles.navBtn} ${styles.prev}`}
              onClick={() => go(-1)}
              disabled={view === 'spread' ? spread === 0 : pageCursor === 0}
              aria-label="Назад"
            >
              <ChevronLeft size={22} strokeWidth={1.5} />
            </button>
            {view === 'spread' ? (
              <div key={turn.n} className={styles.bookBlock} data-dir={turn.dir}>
                <div className={styles.book}>
                  <SpreadView
                    left={left}
                    right={right}
                    selectedPageId={selectedPageId}
                    selectedFrameId={selectedFrameId}
                    editingFrameId={editingId}
                    onPage={selectPage}
                    onFrame={selectFrame}
                    onText={onText}
                  />
                </div>
                <div className={styles.folios}>
                  <span>{folio(left)}</span>
                  <span>{folio(right)}</span>
                </div>
              </div>
            ) : single ? (
              <div key={turn.n} className={styles.bookBlock} data-dir={turn.dir}>
                <div className={styles.single}>
                  <PageCanvas
                    page={single}
                    side={pageCursor % 2 === 0 ? 'left' : 'right'}
                    selected
                    selectedFrameId={selectedFrameId}
                    editingFrameId={editingId}
                    onPage={selectPage}
                    onFrame={selectFrame}
                    onText={onText}
                  />
                </div>
                <p className={styles.singleFolio}>{folio(single)}</p>
              </div>
            ) : null}
            <button
              type="button"
              className={`${styles.navBtn} ${styles.next}`}
              onClick={() => go(1)}
              disabled={view === 'spread' ? spread === spreadCount - 1 : pageCursor === book.pages.length - 1}
              aria-label="Дальше"
            >
              <ChevronRight size={22} strokeWidth={1.5} />
            </button>
          </div>
          {selectedFrame?.kind === 'photo' ? (
            <div className={styles.context}>
              <span>Снимок</span>
              <button type="button" onClick={openPhoto}>
                Заменить
              </button>
              <button
                type="button"
                onClick={() => {
                  beginCropSession()
                  setPanel('crop')
                }}
              >
                Кадрировать
              </button>
            </div>
          ) : selectedFrame?.kind === 'text' ? (
            <div className={styles.context}>
              <span>Текст можно править прямо на странице</span>
            </div>
          ) : (
            <div className={styles.context}>
              <span>{activePage ? folio(activePage) : 'Страница'}</span>
              <button type="button" onClick={() => setPanel(panel === 'paper' ? null : 'paper')}>
                Фон
              </button>
              <button type="button" onClick={() => setPanel(panel === 'layout' ? null : 'layout')}>
                Макет
              </button>
              <button type="button" onClick={addCaption}>
                Текст
              </button>
            </div>
          )}
        </div>

        <div className={styles.tools}>
          <button type="button" data-on={panel === 'layout'} onClick={() => setPanel(panel === 'layout' ? null : 'layout')}>
            <LayoutTemplate size={18} strokeWidth={1.5} />
            Макет
          </button>
          <button type="button" data-on={panel === 'photo'} onClick={openPhoto}>
            <ImageIcon size={18} strokeWidth={1.5} />
            Фото
          </button>
          <button type="button" data-on={panel === 'paper'} onClick={() => setPanel(panel === 'paper' ? null : 'paper')}>
            <Palette size={18} strokeWidth={1.5} />
            Фон
          </button>
          <button
            type="button"
            data-on={panel === 'crop'}
            onClick={() => {
              if (!ensurePhotoSelected()) return
              beginCropSession()
              setPanel('crop')
            }}
          >
            <Crop size={18} strokeWidth={1.5} />
            Кадр
          </button>
          <button type="button" onClick={openText}>
            <Type size={18} strokeWidth={1.5} />
            Текст
          </button>
          <button type="button" data-on={panel === 'chat'} onClick={() => setPanel(panel === 'chat' ? null : 'chat')}>
            <MessageSquare size={18} strokeWidth={1.5} />
            Чат
          </button>
        </div>

        <ChatPanel open={panel === 'chat'} messages={project.messages} onSend={send} onClose={() => setPanel(null)} />
      </div>

      {sheetOpen ? <button type="button" className={styles.backdrop} aria-label="Закрыть" onClick={() => setPanel(null)} /> : null}

      {panel === 'layout' ? (
        <section className={styles.sheet} role="dialog" aria-label="Макет страницы">
          <header>
            <h2>Макет страницы</h2>
            <button type="button" onClick={() => setPanel(null)} aria-label="Закрыть">
              <span />
            </button>
          </header>
          {locked ? (
            <p className={styles.sheetNote}>Обложку и последнюю страницу лучше править текстом или через чат.</p>
          ) : (
            <div className={styles.layoutGrid}>
              {layouts.map((layout) => (
                <button key={layout.id} type="button" data-active={activePage?.layout === layout.id} onClick={() => chooseLayout(layout.id)}>
                  <i data-layout={layout.id} />
                  {layout.name}
                </button>
              ))}
            </div>
          )}
          <button type="button" className={styles.sheetAction} onClick={addCaption}>
            Добавить текстовый блок
          </button>
        </section>
      ) : null}

      {panel === 'photo' ? (
        <section className={styles.sheet} role="dialog" aria-label="Замена снимка">
          <header>
            <h2>Заменить снимок</h2>
            <button type="button" onClick={() => setPanel(null)} aria-label="Закрыть">
              <span />
            </button>
          </header>
          <div className={styles.photoGrid}>
            {photoSources.map((src) => (
              <button key={src} type="button" data-active={selectedFrame?.src === src} onClick={() => replacePhoto(src)}>
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {panel === 'paper' ? (
        <section className={styles.sheet} role="dialog" aria-label="Фон страницы">
          <header>
            <h2>Фон страницы</h2>
            <button type="button" onClick={() => setPanel(null)} aria-label="Закрыть">
              <span />
            </button>
          </header>
          <div className={styles.paperGrid}>
            {papers.map((paper) => (
              <button key={paper.id} type="button" data-paper={paper.id} data-active={activePage?.paper === paper.id} onClick={() => choosePaper(paper.id)}>
                <i />
                {paper.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {panel === 'crop' && selectedFrame?.kind === 'photo' ? (
        <section className={styles.sheet} role="dialog" aria-label="Кадрирование">
          <header>
            <h2>Кадрирование</h2>
            <button type="button" onClick={() => setPanel(null)} aria-label="Закрыть">
              <span />
            </button>
          </header>
          <div className={styles.cropPreview}>
            <img
              src={selectedFrame.src}
              alt=""
              style={{ objectPosition: `${selectedFrame.focusX ?? 50}% ${selectedFrame.focusY ?? 50}%` }}
            />
          </div>
          <label className={styles.slider}>
            Горизонталь
            <input
              type="range"
              min={0}
              max={100}
              value={selectedFrame.focusX ?? 50}
              onChange={(event) => setFocus('focusX', Number(event.target.value))}
            />
          </label>
          <label className={styles.slider}>
            Вертикаль
            <input
              type="range"
              min={0}
              max={100}
              value={selectedFrame.focusY ?? 50}
              onChange={(event) => setFocus('focusY', Number(event.target.value))}
            />
          </label>
        </section>
      ) : null}
    </div>
  )
}
