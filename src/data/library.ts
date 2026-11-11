import type { ThemeId } from '../types'

const photo = (name: string) => `/photos/${name}.jpg`

export const library: Record<ThemeId, string[]> = {
  travel: [
    photo('travel-coast'),
    photo('travel-lake'),
    photo('travel-road'),
    photo('travel-city'),
    photo('travel-hills'),
    photo('travel-forest'),
  ],
  family: [
    photo('family-walk'),
    photo('friends'),
    photo('table'),
    photo('coffee'),
    photo('flowers'),
    photo('travel-hills'),
  ],
  wedding: [
    photo('wed-ceremony'),
    photo('wed-couple'),
    photo('wed-table'),
    photo('wed-dance'),
    photo('flowers'),
    photo('coffee'),
  ],
  childhood: [
    photo('child'),
    photo('flowers'),
    photo('travel-coast'),
    photo('travel-forest'),
    photo('cake'),
    photo('coffee'),
  ],
  birthday: [
    photo('cake'),
    photo('table'),
    photo('flowers'),
    photo('friends'),
    photo('coffee'),
    photo('wed-dance'),
  ],
  year: [
    photo('travel-lake'),
    photo('travel-forest'),
    photo('flowers'),
    photo('travel-coast'),
    photo('travel-city'),
    photo('cake'),
  ],
}
