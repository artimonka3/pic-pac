import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getBook, quoteBook } from '../data/products'
import { buildBook } from '../lib/buildBook'
import { coverOf } from '../lib/book'
import { photosLabel, uid } from '../lib/format'
import type {
  Book,
  CartItem,
  ChatMessage,
  CheckoutForm,
  Draft,
  Order,
  PrintDraft,
  Project,
  ProjectStatus,
  StyleId,
  ThemeId,
  UserProfile,
} from '../types'

const PHOTO_LIMIT = 24

function emptyDraft(): Draft {
  return {
    productId: 'classic',
    size: '28×28',
    pages: 36,
    photos: [],
    themeId: 'travel',
    styleId: 'quiet',
    wishes: '',
    step: 0,
    armed: false,
    token: '',
  }
}

function defaultProfile(): UserProfile {
  return {
    name: 'Иван',
    phone: '+375 29 000-00-00',
    email: 'ivan@example.com',
    city: 'Минск',
    notifyOrders: true,
    notifyTips: false,
  }
}

function suggestion(productId: string): { themeId: ThemeId; styleId: StyleId } {
  if (productId === 'premium') return { themeId: 'wedding', styleId: 'editorial' }
  if (productId === 'lite') return { themeId: 'family', styleId: 'minimal' }
  return { themeId: 'travel', styleId: 'quiet' }
}

function greeting(): ChatMessage[] {
  return [
    {
      id: uid(),
      role: 'assistant',
      text: 'Макет собран. Нажмите на текст или напишите, например: «Сделай фон светлее».',
    },
  ]
}

function makeProject(input: {
  id?: string
  createdAt?: string
  updatedAt?: string
  status?: ProjectStatus
  productId: string
  themeId: ThemeId
  styleId: StyleId
  wishes: string
  size: string
  pages: number
  photos: Draft['photos']
  title?: string
  meta?: string
  messages?: ChatMessage[]
}): Project {
  const book = buildBook({
    productId: input.productId,
    themeId: input.themeId,
    styleId: input.styleId,
    wishes: input.wishes,
    photos: input.photos,
    title: input.title,
    meta: input.meta,
    size: input.size,
    pages: input.pages,
  })
  const createdAt = input.createdAt ?? new Date().toISOString()
  return {
    id: input.id ?? uid(),
    title: book.title,
    productId: input.productId,
    themeId: input.themeId,
    styleId: input.styleId,
    wishes: input.wishes,
    size: input.size,
    pages: input.pages,
    cover: coverOf(book),
    createdAt,
    updatedAt: input.updatedAt ?? createdAt,
    status: input.status ?? 'ready',
    book,
    messages: input.messages ?? greeting(),
    photos: input.photos,
  }
}

function normalizeProject(project: Project): Project | null {
  if (!project?.book?.pages?.length) return null
  return {
    ...project,
    updatedAt: project.updatedAt ?? project.createdAt ?? new Date().toISOString(),
    status: project.status ?? 'ready',
    photos: Array.isArray(project.photos) ? project.photos : [],
    messages: Array.isArray(project.messages) ? project.messages : greeting(),
  }
}

const sea = makeProject({
  id: 'seed-sea',
  createdAt: '2026-11-02T10:00:00.000Z',
  updatedAt: '2026-11-11T18:20:00.000Z',
  status: 'ready',
  productId: 'classic',
  themeId: 'travel',
  styleId: 'quiet',
  wishes: '',
  size: '28×28',
  pages: 36,
  photos: [],
  title: 'Море в сентябре',
  meta: 'Сентябрь 2026',
  messages: [
    {
      id: 'seed-sea-hi',
      role: 'assistant',
      text: 'Макет собран. Нажмите на текст, чтобы поправить его, или напишите, что изменить.',
    },
  ],
})

const city = makeProject({
  id: 'seed-city',
  createdAt: '2026-09-14T10:00:00.000Z',
  updatedAt: '2026-11-04T15:00:00.000Z',
  status: 'ready',
  productId: 'premium',
  themeId: 'travel',
  styleId: 'editorial',
  wishes: '',
  size: '30×30',
  pages: 48,
  photos: [
    { id: 'city-1', name: 'Город', src: '/photos/travel-city.jpg' },
    { id: 'city-2', name: 'Дорога', src: '/photos/travel-road.jpg' },
    { id: 'city-3', name: 'Холмы', src: '/photos/travel-hills.jpg' },
    { id: 'city-4', name: 'Кофе', src: '/photos/coffee.jpg' },
    { id: 'city-5', name: 'Стол', src: '/photos/table.jpg' },
    { id: 'city-6', name: 'Цветы', src: '/photos/flowers.jpg' },
    { id: 'city-7', name: 'Лес', src: '/photos/travel-forest.jpg' },
    { id: 'city-8', name: 'Озеро', src: '/photos/travel-lake.jpg' },
  ],
  title: 'Город',
  meta: '2026',
  messages: [
    {
      id: 'seed-city-hi',
      role: 'assistant',
      text: 'Макет собран. Можно попросить крупнее кадры или светлее фон.',
    },
  ],
})

const home = makeProject({
  id: 'seed-home',
  createdAt: '2026-10-28T10:00:00.000Z',
  updatedAt: '2026-11-08T12:00:00.000Z',
  status: 'draft',
  productId: 'lite',
  themeId: 'family',
  styleId: 'minimal',
  wishes: '',
  size: '20×20',
  pages: 24,
  photos: [],
  title: 'Дом',
  meta: '2026',
  messages: [
    {
      id: 'seed-home-hi',
      role: 'assistant',
      text: 'Макет собран. Можно сменить композицию страницы или попросить короче подписи.',
    },
  ],
})

type State = {
  projects: Project[]
  cart: CartItem[]
  orders: Order[]
  draft: Draft
  printDraft: PrintDraft
  profile: UserProfile
}

type Actions = {
  beginCreate: (partial?: Partial<Draft>) => void
  setDraft: (partial: Partial<Draft>) => void
  setProduct: (productId: string) => void
  addPhotos: (photos: Draft['photos']) => number
  removePhoto: (id: string) => void
  armGeneration: () => string
  createFromDraft: (token: string) => Project | null
  updateBook: (projectId: string, book: Book) => void
  addMessage: (projectId: string, message: ChatMessage) => void
  removeProject: (projectId: string) => void
  setProjectStatus: (projectId: string, status: ProjectStatus) => void
  addBookToCart: (projectId: string) => void
  setPrintFormat: (formatId: string) => void
  setPrintPaper: (paper: PrintDraft['paper']) => void
  addPrintPhotos: (photos: Draft['photos']) => void
  setPrintQty: (id: string, qty: number) => void
  removePrintPhoto: (id: string) => void
  addPrintToCart: () => boolean
  setCartQty: (id: string, qty: number) => void
  removeCartItem: (id: string) => void
  placeOrder: (form: CheckoutForm) => Order | null
  setProfile: (partial: Partial<UserProfile>) => void
}

const memory = new Map<string, string>()

const safeStorage = {
  getItem: (name: string) => {
    try {
      return localStorage.getItem(name)
    } catch {
      return memory.get(name) ?? null
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value)
    } catch {
      memory.set(name, value)
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name)
    } catch {
      memory.delete(name)
    }
  },
}

function touch(project: Project, patch: Partial<Project>): Project {
  return { ...project, ...patch, updatedAt: new Date().toISOString() }
}

export const useAppStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      projects: [sea, city, home],
      cart: [],
      orders: [],
      draft: emptyDraft(),
      printDraft: { formatId: 'p10', paper: 'Глянец', photos: [] },
      profile: defaultProfile(),

      beginCreate: (partial) => {
        const next = { ...emptyDraft(), ...partial, photos: [], wishes: partial?.wishes ?? '', armed: false, token: '', step: 0 }
        if (partial?.productId) {
          const suggested = suggestion(partial.productId)
          next.themeId = partial.themeId ?? suggested.themeId
          next.styleId = partial.styleId ?? suggested.styleId
        }
        set({ draft: next })
      },

      setDraft: (partial) => set((state) => ({ draft: { ...state.draft, ...partial, armed: partial.armed ?? false } })),

      setProduct: (productId) => {
        const product = getBook(productId)
        if (!product) return
        set((state) => ({
          draft: {
            ...state.draft,
            productId,
            size: product.defaultSize,
            pages: product.defaultPages,
            armed: false,
          },
        }))
      },

      addPhotos: (photos) => {
        const room = PHOTO_LIMIT - get().draft.photos.length
        const accepted = photos.slice(0, Math.max(0, room))
        set((state) => ({ draft: { ...state.draft, photos: [...state.draft.photos, ...accepted] } }))
        return accepted.length
      },

      removePhoto: (id) =>
        set((state) => ({ draft: { ...state.draft, photos: state.draft.photos.filter((photo) => photo.id !== id) } })),

      armGeneration: () => {
        const token = uid()
        set((state) => ({ draft: { ...state.draft, armed: true, token } }))
        return token
      },

      createFromDraft: (token) => {
        const draft = get().draft
        if (!draft.armed || draft.token !== token) return null
        const project = makeProject({
          productId: draft.productId,
          themeId: draft.themeId,
          styleId: draft.styleId,
          wishes: draft.wishes,
          size: draft.size,
          pages: draft.pages,
          photos: draft.photos,
          status: 'ready',
        })
        set((state) => ({
          projects: [project, ...state.projects],
          draft: emptyDraft(),
        }))
        return project
      },

      updateBook: (projectId, book) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId
              ? touch(project, {
                  book,
                  title: book.title,
                  cover: coverOf(book) || project.cover,
                  status: project.status === 'ready' ? 'draft' : project.status,
                })
              : project,
          ),
          cart: state.cart.map((item) =>
            item.projectId === projectId ? { ...item, title: book.title, cover: coverOf(book) || item.cover } : item,
          ),
        })),

      addMessage: (projectId, message) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId ? touch(project, { messages: [...project.messages, message] }) : project,
          ),
        })),

      removeProject: (projectId) =>
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== projectId),
          cart: state.cart.filter((item) => item.projectId !== projectId),
        })),

      setProjectStatus: (projectId, status) =>
        set((state) => ({
          projects: state.projects.map((project) => (project.id === projectId ? touch(project, { status }) : project)),
        })),

      addBookToCart: (projectId) => {
        const project = get().projects.find((item) => item.id === projectId)
        const product = project ? getBook(project.productId) : undefined
        if (!project || !product) return
        const item: CartItem = {
          id: `book-${project.id}`,
          kind: 'book',
          projectId: project.id,
          title: project.title,
          spec: `${product.name} · ${project.size} · ${project.pages} стр.`,
          price: quoteBook(product, project.size, project.pages),
          qty: 1,
          cover: project.cover,
        }
        set((state) => ({
          cart: state.cart.some((line) => line.id === item.id)
            ? state.cart.map((line) => (line.id === item.id ? { ...item, qty: line.qty } : line))
            : [...state.cart, item],
          projects: state.projects.map((itemProject) =>
            itemProject.id === projectId ? touch(itemProject, { status: 'in_cart' }) : itemProject,
          ),
        }))
      },

      setPrintFormat: (formatId) => set((state) => ({ printDraft: { ...state.printDraft, formatId } })),
      setPrintPaper: (paper) => set((state) => ({ printDraft: { ...state.printDraft, paper } })),
      addPrintPhotos: (photos) =>
        set((state) => ({
          printDraft: {
            ...state.printDraft,
            photos: [...state.printDraft.photos, ...photos.map((photo) => ({ ...photo, qty: 1 }))].slice(0, PHOTO_LIMIT),
          },
        })),
      setPrintQty: (id, qty) =>
        set((state) => ({
          printDraft: {
            ...state.printDraft,
            photos: state.printDraft.photos.map((photo) => (photo.id === id ? { ...photo, qty: Math.max(1, qty) } : photo)),
          },
        })),
      removePrintPhoto: (id) =>
        set((state) => ({
          printDraft: { ...state.printDraft, photos: state.printDraft.photos.filter((photo) => photo.id !== id) },
        })),

      addPrintToCart: () => {
        const { printDraft } = get()
        const count = printDraft.photos.reduce((sum, photo) => sum + photo.qty, 0)
        if (!count) return false
        const prices: Record<string, { name: string; price: number }> = {
          p10: { name: '10×15', price: 49 },
          p15: { name: '15×20', price: 89 },
          p20: { name: '20×30', price: 159 },
        }
        const format = prices[printDraft.formatId] ?? prices.p10
        const item: CartItem = {
          id: uid(),
          kind: 'print',
          title: `Печать ${format.name}`,
          spec: `${photosLabel(count)} · ${printDraft.paper}`,
          price: format.price * count,
          qty: 1,
          cover: printDraft.photos[0]?.src ?? '',
        }
        set((state) => ({
          cart: [...state.cart, item],
          printDraft: { ...state.printDraft, photos: [] },
        }))
        return true
      },

      setCartQty: (id, qty) =>
        set((state) => ({
          cart: state.cart.map((item) => (item.id === id ? { ...item, qty: Math.max(1, qty) } : item)),
        })),

      removeCartItem: (id) => {
        const removed = get().cart.find((item) => item.id === id)
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== id),
          projects: removed?.projectId
            ? state.projects.map((project) =>
                project.id === removed.projectId && project.status === 'in_cart' ? touch(project, { status: 'ready' }) : project,
              )
            : state.projects,
        }))
      },

      placeOrder: (form) => {
        const cart = get().cart
        const name = form.name.trim()
        if (!cart.length || !name || !form.phone.trim() || !form.email.trim()) return null
        if (form.delivery !== 'pickup' && !form.address.trim()) return null
        const order: Order = {
          id: uid(),
          number: `PP-${2400 + Math.floor(Math.random() * 7000)}`,
          createdAt: new Date().toISOString(),
          name,
          phone: form.phone.trim(),
          email: form.email.trim(),
          delivery: form.delivery,
          address: form.delivery === 'pickup' ? 'Самовывоз' : form.address.trim(),
          total: cart.reduce((sum, item) => sum + item.price * item.qty, 0),
          items: cart,
        }
        const orderedIds = new Set(cart.map((item) => item.projectId).filter(Boolean) as string[])
        set((state) => ({
          orders: [order, ...state.orders],
          cart: [],
          projects: state.projects.map((project) =>
            orderedIds.has(project.id) ? touch(project, { status: 'ordered' }) : project,
          ),
          profile: {
            ...state.profile,
            name,
            phone: form.phone.trim(),
            email: form.email.trim(),
          },
        }))
        return order
      },

      setProfile: (partial) => set((state) => ({ profile: { ...state.profile, ...partial } })),
    }),
    {
      name: 'picpac',
      version: 3,
      storage: createJSONStorage(() => safeStorage),
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== 'object') return persisted as State
        const data = persisted as Partial<State>
        return {
          ...data,
          profile: { ...defaultProfile(), ...(data.profile ?? {}) },
          projects: Array.isArray(data.projects)
            ? data.projects.map((project) => normalizeProject(project as Project)).filter(Boolean)
            : [sea, city, home],
        } as State
      },
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== 'object') return current
        const data = persisted as Partial<State>
        const stored = Array.isArray(data.projects)
          ? (data.projects.map((project) => normalizeProject(project as Project)).filter(Boolean) as Project[])
          : current.projects
        const projects = stored.some((project) => project.id === 'seed-city') ? stored : [city, ...stored]
        const orders = Array.isArray(data.orders)
          ? data.orders.map((order) => ({
              ...order,
              phone: order.phone ?? '',
              email: order.email ?? '',
              delivery: order.delivery ?? ('courier' as const),
              address: order.address ?? '',
            }))
          : []
        return {
          ...current,
          cart: Array.isArray(data.cart) ? data.cart : [],
          orders,
          projects: projects.length ? projects : current.projects,
          draft: { ...current.draft, ...(data.draft ?? {}), armed: false, token: '' },
          printDraft: { ...current.printDraft, ...(data.printDraft ?? {}) },
          profile: { ...current.profile, ...(data.profile ?? {}) },
        }
      },
    },
  ),
)

export function statusLabel(status: ProjectStatus) {
  if (status === 'draft') return 'Черновик'
  if (status === 'in_cart') return 'В корзине'
  if (status === 'ordered') return 'Заказан'
  return 'Готов'
}
