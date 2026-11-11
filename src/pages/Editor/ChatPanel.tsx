import { useEffect, useRef, useState } from 'react'
import { Send, X } from 'lucide-react'
import styles from './Editor.module.scss'
import type { ChatMessage } from '../../types'

const prompts = [
  'Сделай обложку минималистичнее',
  'Убери текст с этой страницы',
  'Добавь больше крупных фотографий',
  'Сделай фон светлее',
  'Поменяй фотографии местами',
]

type Props = {
  open: boolean
  messages: ChatMessage[]
  onSend: (text: string) => void
  onClose: () => void
}

export function ChatPanel({ open, messages, onSend, onClose }: Props) {
  const [value, setValue] = useState('')
  const log = useRef<HTMLDivElement>(null)

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight })
  }, [messages.length, open])

  function submit(text = value) {
    const next = text.trim()
    if (!next) return
    onSend(next)
    setValue('')
  }

  return (
    <aside className={styles.chat} data-open={open ? 'true' : 'false'} aria-label="Чат с редактором">
      <header>
        <h2>Редактор</h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть чат">
          <X size={18} strokeWidth={1.5} />
        </button>
      </header>
      <div className={styles.log} ref={log} role="log" aria-live="polite">
        {messages.map((message) => (
          <p key={message.id} data-role={message.role}>
            {message.text}
          </p>
        ))}
      </div>
      <div className={styles.prompts}>
        {prompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => submit(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <input
          value={value}
          placeholder="Что изменить?"
          onChange={(event) => setValue(event.target.value)}
          aria-label="Сообщение редактору"
        />
        <button type="submit" aria-label="Отправить" disabled={!value.trim()}>
          <Send size={16} strokeWidth={1.5} />
        </button>
      </form>
    </aside>
  )
}
