import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.scss'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  full?: boolean
  children: ReactNode
}

export function Button({ variant = 'primary', full, className, children, ...rest }: Props) {
  const classes = [styles.button, styles[variant], full ? styles.full : '', className ?? ''].filter(Boolean).join(' ')
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  )
}
