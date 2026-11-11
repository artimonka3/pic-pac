import type { StyleId, ThemeId } from '../types'
import { library } from './library'

export const themes: { id: ThemeId; name: string; note: string; image: string }[] = [
  {
    id: 'travel',
    name: 'Путешествие',
    note: 'Дорога, города, свет.',
    image: library.travel[0],
  },
  {
    id: 'family',
    name: 'Семья',
    note: 'Дом и обычные дни.',
    image: library.family[0],
  },
  {
    id: 'wedding',
    name: 'Свадьба',
    note: 'Один день по часам.',
    image: library.wedding[0],
  },
  {
    id: 'childhood',
    name: 'Детство',
    note: 'Короткий возраст.',
    image: library.childhood[1],
  },
  {
    id: 'birthday',
    name: 'Праздник',
    note: 'Стол и люди рядом.',
    image: library.birthday[0],
  },
  {
    id: 'year',
    name: 'Год',
    note: 'Несколько месяцев вместе.',
    image: library.year[0],
  },
]

export const styles: { id: StyleId; name: string; note: string }[] = [
  { id: 'quiet', name: 'Тихая классика', note: 'Крупный кадр и короткая подпись.' },
  { id: 'film', name: 'Плёнка', note: 'Тёплая бумага, подписи курсивом.' },
  { id: 'editorial', name: 'Редакционный', note: 'Плотнее сетка, гротеск.' },
  { id: 'minimal', name: 'Светлый', note: 'Много поля, меньше кадров.' },
]

export function themeById(id: ThemeId) {
  return themes.find((theme) => theme.id === id) ?? themes[0]
}

export function styleById(id: StyleId) {
  return styles.find((style) => style.id === id) ?? styles[0]
}
