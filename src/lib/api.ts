import type { CheckoutForm, LocalPhoto, MediaService, Order, OrderSelection } from '../types'

export class ApiError extends Error {
  constructor(readonly code: string) {
    super(code)
  }
}

let session: Promise<void> | undefined
let hasSession = false

async function ensureSession() {
  const start = async () => {
    const response = await fetch('/api/session', { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout?.(15_000) })
    if (!response.ok) throw new ApiError('CONNECTION')
    hasSession = true
  }
  const startWithLock = async () => {
    if (navigator.locks) await navigator.locks.request('picpac-session', start)
    else await start()
  }
  session ??= startWithLock().finally(() => { session = undefined })
  await session
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const send = () => fetch(`/api${path}`, {
    cache: 'no-store', ...options,
    signal: AbortSignal.timeout?.(options?.body instanceof Blob ? 90_000 : 20_000),
  })
  let response: Response
  try {
    response = await send()
    if (response.status === 401) {
      await ensureSession()
      response = await send()
    }
  } catch {
    throw new ApiError('CONNECTION')
  }

  const data = await response.json().catch(() => null)
  if (!response.ok || !data) {
    throw new ApiError(data?.detail?.code ?? (response.status >= 500 ? 'CONNECTION' : 'INVALID_REQUEST'))
  }
  return data
}

type MediaResult = {
  media_id: string
  status: 'pending' | 'passed' | 'needs_replacement' | 'failed'
  reason_code: string | null
  warning_code: string | null
  can_retry: boolean
  preview_url: string
}

export async function uploadPhoto(draftId: string, mediaId: string, service: MediaService, file: File) {
  if (!hasSession) await ensureSession()
  return request<MediaResult>(`/drafts/${draftId}/media/${mediaId}?service=${service}`, {
    method: 'PUT',
    body: file,
  })
}

export function readPhoto(mediaId: string) {
  return request<MediaResult>(`/media/${mediaId}`)
}

export function retryPhoto(mediaId: string) {
  return request<MediaResult>(`/media/${mediaId}/retry`, { method: 'POST' })
}

export function photoPatch(id: string, result: MediaResult): Pick<LocalPhoto, 'src' | 'verification'> {
  if (id !== result.media_id) throw new ApiError('INVALID_REQUEST')
  return {
    src: result.preview_url,
    verification: {
      status: result.status,
      code: result.reason_code ?? result.warning_code ?? undefined,
      canRetry: result.can_retry,
    },
  }
}

export type OrderPayload = CheckoutForm & {
  items: (OrderSelection & { qty: number; title?: string })[]
}

export function confirmOrder(payload: OrderPayload, key: string) {
  return request<{ id: string; number: string; created_at: string; total: number }>('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify(payload),
  })
}

export type OrderSummary = Pick<Order, 'id' | 'number' | 'createdAt' | 'total' | 'delivery'>

export async function orderHistory(): Promise<OrderSummary[]> {
  const orders = await request<{
    id: string
    number: string
    created_at: string
    total: number
    details: Pick<CheckoutForm, 'delivery'>
  }[]>('/orders')
  return orders.map(({ id, number, created_at, total, details }) => ({
    id, number, createdAt: created_at, total, delivery: details.delivery,
  }))
}

const messages: Record<string, string> = {
  FILE_TOO_LARGE: 'Файл больше 12 МБ. Выберите другой файл.',
  TOO_MANY_PIXELS: 'Фото больше 24 мегапикселей. Выберите меньший оригинал.',
  UNSUPPORTED_FORMAT: 'Подойдут фотографии в формате JPEG или PNG.',
  INVALID_IMAGE: 'Файл не открывается. Выберите другой оригинал.',
  LOW_RESOLUTION: 'Слишком маленькое разрешение. Загрузите оригинал большего размера.',
  BLURRY: 'Кадр может быть смазан. Если переснимаете, удерживайте камеру неподвижно.',
  TOO_DARK: 'Кадр очень тёмный. Можно заменить его снимком при лучшем освещении.',
  TOO_BRIGHT: 'Кадр сильно засвечен. Можно заменить его снимком с меньшей экспозицией.',
  CHECK_FAILED: 'Не удалось проверить фото.',
  RETRY_LIMIT: 'Попытки проверки закончились. Замените фото.',
  MEDIA_NOT_FOUND: 'Фото недоступно. Загрузите оригинал заново.',
  DRAFT_NOT_FOUND: 'Черновик недоступен. Удалите снимки из него и загрузите оригиналы заново.',
  MEDIA_NOT_PASSED: 'Часть фото ещё не прошла проверку. Проверьте снимки в заказе.',
  LEGACY_PHOTOS: 'В корзине есть позиция со старыми загрузками. Удалите её и добавьте заново с проверенными оригиналами.',
  CONNECTION: 'Нет связи с сервером. Попробуйте ещё раз.',
}

export function errorCode(error: unknown) {
  return error instanceof ApiError ? error.code : 'CONNECTION'
}

export function apiMessage(code: string) {
  return messages[code] ?? 'Не удалось обработать запрос. Проверьте данные и попробуйте ещё раз.'
}

export function photosPassed(photos: LocalPhoto[]) {
  return photos.every((photo) => photo.verification?.status === 'passed')
}
