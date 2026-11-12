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
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID()
  return formatUuid(globalThis.crypto.getRandomValues(new Uint8Array(16)))
}

export function formatUuid(bytes: Uint8Array) {
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
}
