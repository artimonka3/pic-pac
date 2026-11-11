import { useEffect } from 'react'

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title === 'PicPac' ? 'PicPac' : `${title} — PicPac`
  }, [title])
}
