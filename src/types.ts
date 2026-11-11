export type ThemeId = 'travel' | 'family' | 'wedding' | 'childhood' | 'birthday' | 'year'

export type StyleId = 'quiet' | 'film' | 'editorial' | 'minimal'

export type LayoutId =
  | 'cover'
  | 'opener'
  | 'hero'
  | 'stack'
  | 'bleed'
  | 'aside'
  | 'trio'
  | 'colophon'

export type Paper = 'white' | 'sand' | 'cool' | 'sage'

export type Role = 'title' | 'meta' | 'body' | 'caption'

export type Slot = 'a' | 'b' | 'c' | 'd'

export type ProjectStatus = 'draft' | 'ready' | 'in_cart' | 'ordered'

export type Frame = {
  id: string
  slot: Slot
  kind: 'photo' | 'text'
  src?: string
  text?: string
  role?: Role
  /** Кадрирование: горизонталь 0–100 */
  focusX?: number
  /** Кадрирование: вертикаль 0–100 */
  focusY?: number
}

export type BookPage = {
  id: string
  layout: LayoutId
  paper: Paper
  style: StyleId
  pageNumber: number | null
  frames: Frame[]
}

export type Book = {
  title: string
  pages: BookPage[]
}

export type LocalPhoto = {
  id: string
  name: string
  src: string
}

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  id: string
  role: ChatRole
  text: string
}

export type Project = {
  id: string
  title: string
  productId: string
  themeId: ThemeId
  styleId: StyleId
  wishes: string
  size: string
  pages: number
  cover: string
  createdAt: string
  updatedAt: string
  status: ProjectStatus
  book: Book
  messages: ChatMessage[]
  photos: LocalPhoto[]
}

export type CartItem = {
  id: string
  kind: 'book' | 'print'
  projectId?: string
  title: string
  spec: string
  price: number
  qty: number
  cover: string
}

export type DeliveryMethod = 'courier' | 'pickup' | 'post'

export type CheckoutForm = {
  name: string
  phone: string
  email: string
  delivery: DeliveryMethod
  address: string
}

export type Order = {
  id: string
  number: string
  createdAt: string
  name: string
  phone: string
  email: string
  delivery: DeliveryMethod
  address: string
  total: number
  items: CartItem[]
}

export type UserProfile = {
  name: string
  phone: string
  email: string
  city: string
  notifyOrders: boolean
  notifyTips: boolean
}

export type Draft = {
  productId: string
  size: string
  pages: number
  photos: LocalPhoto[]
  themeId: ThemeId
  styleId: StyleId
  wishes: string
  step: number
  armed: boolean
  token: string
}

export type PrintPhoto = LocalPhoto & { qty: number }

export type PrintDraft = {
  formatId: string
  paper: 'Глянец' | 'Матовая'
  photos: PrintPhoto[]
}
