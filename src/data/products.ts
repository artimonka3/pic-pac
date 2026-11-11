export type BookProduct = {
  kind: 'book'
  id: 'lite' | 'classic' | 'premium'
  name: string
  summary: string
  description: string
  image: string
  spine: string
  basePrice: number
  sizes: string[]
  pageCounts: number[]
  defaultSize: string
  defaultPages: number
  cover: string
  paper: string
  binding: string
}

export type PrintProduct = {
  kind: 'print'
  id: 'p10' | 'p15' | 'p20'
  name: string
  summary: string
  description: string
  image: string
  price: number
  points: string[]
}

export type Product = BookProduct | PrintProduct

export const products: Product[] = [
  {
    kind: 'book',
    id: 'lite',
    name: 'Lite',
    summary: 'Мягкая обложка для короткой истории.',
    description:
      'Небольшая книга на один сезон, поездку или день. Легко начать и не раздувать историю.',
    image: '/photos/flowers.jpg',
    spine: '#8C6A5A',
    basePrice: 2490,
    sizes: ['15×15', '20×20'],
    pageCounts: [16, 24],
    defaultSize: '20×20',
    defaultPages: 24,
    cover: 'Мягкая',
    paper: '170 г/м²',
    binding: 'Скрепление внакидку',
  },
  {
    kind: 'book',
    id: 'classic',
    name: 'Classic',
    summary: 'Твёрдая обложка. Основной формат.',
    description:
      'Книга, которую ставят на полку. Плотные страницы, спокойные поля, место для коротких подписей.',
    image: '/photos/travel-lake.jpg',
    spine: '#2C403D',
    basePrice: 5490,
    sizes: ['20×20', '28×28', '30×30'],
    pageCounts: [24, 36, 48],
    defaultSize: '28×28',
    defaultPages: 36,
    cover: 'Твёрдая',
    paper: '200 г/м²',
    binding: 'Классический переплёт',
  },
  {
    kind: 'book',
    id: 'premium',
    name: 'Premium',
    summary: 'Разворот ложится плоско, без сгиба в корешке.',
    description:
      'Для свадьбы, большого года или серии, где кадр не должен упираться в корешок.',
    image: '/photos/wed-ceremony.jpg',
    spine: '#3A2A2A',
    basePrice: 9900,
    sizes: ['28×28', '30×30'],
    pageCounts: [36, 48, 64],
    defaultSize: '30×30',
    defaultPages: 48,
    cover: 'Твёрдая, layflat',
    paper: '250 г/м²',
    binding: 'Раскладной переплёт',
  },
  {
    kind: 'print',
    id: 'p10',
    name: '10×15',
    summary: 'Карманный отпечаток.',
    description: 'Обычный размер для альбома и конверта. Подходит для большой серии.',
    image: '/photos/travel-city.jpg',
    price: 49,
    points: ['Глянец или матовая бумага', 'Печать без полей', 'Цвет близко к файлу'],
  },
  {
    kind: 'print',
    id: 'p15',
    name: '15×20',
    summary: 'Крупнее, чем карточка.',
    description: 'Удобно, если в кадре важен жест или интерьер, а не только лицо.',
    image: '/photos/travel-coast.jpg',
    price: 89,
    points: ['Глянец или матовая бумага', 'Печать без полей', 'Плотная фотобумага'],
  },
  {
    kind: 'print',
    id: 'p20',
    name: '20×30',
    summary: 'Отпечаток, который уже вешают.',
    description: 'Один сильный кадр. Не серия, а отдельная вещь.',
    image: '/photos/travel-forest.jpg',
    price: 159,
    points: ['Глянец или матовая бумага', 'Печать без полей', 'Подходит для рамки 20×30'],
  },
]

export function isBook(product: Product): product is BookProduct {
  return product.kind === 'book'
}

export function getProduct(id: string) {
  return products.find((product) => product.id === id)
}

export function getBook(id: string) {
  const product = getProduct(id)
  return product && isBook(product) ? product : undefined
}

export function bookProducts() {
  return products.filter(isBook)
}

export function printProducts(): PrintProduct[] {
  return products.filter((product): product is PrintProduct => product.kind === 'print')
}

/** Демонстрационный прайс. Не тариф и не оферта. */
export function quoteBook(product: BookProduct, size: string, pages: number) {
  const baseSize = product.sizes.indexOf(product.defaultSize)
  const basePages = product.pageCounts.indexOf(product.defaultPages)
  const sizeIndex = product.sizes.indexOf(size)
  const pageIndex = product.pageCounts.indexOf(pages)
  const sizeDelta = (sizeIndex < 0 ? baseSize : sizeIndex) - baseSize
  const pageDelta = (pageIndex < 0 ? basePages : pageIndex) - basePages
  return product.basePrice + sizeDelta * 700 + pageDelta * 900
}
