import * as React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base = 'inline-flex items-center justify-center rounded-2xl text-base font-medium transition active:scale-95 min-h-[44px] px-5'
  const skin = variant === 'primary'
    ? 'bg-slate-100 text-slate-900 hover:bg-white'
    : 'bg-transparent text-slate-100 border border-slate-600 hover:bg-slate-800'
  return <button className={`${base} ${skin} ${className}`} {...props} />
}
