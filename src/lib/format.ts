const priceFormat = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})
const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const photoPlural = new Intl.PluralRules('ru')

export function formatPrice(price: number) {
  return priceFormat.format(price)
}

export function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date)
}

export function photosLabel(count: number) {
  const form = photoPlural.select(count)
  const noun = form === 'one' ? 'фотография' : form === 'few' ? 'фотографии' : 'фотографий'
  return `${count} ${noun}`
}

export function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
