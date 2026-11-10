import { useEffect, useState } from 'react'

interface Props {
  value: string
  onChange: (isoDate: string) => void
  required?: boolean
  id?: string
  'aria-label'?: string
}

/** Always shows / stores YYYY-MM-DD, with a native picker as a side control. */
export function DateInput({
  value,
  onChange,
  required,
  id,
  'aria-label': ariaLabel,
}: Props) {
  const [text, setText] = useState(value)

  useEffect(() => {
    setText(value)
  }, [value])

  function commit(raw: string) {
    const t = raw
      .trim()
      .replace(/[/.]/g, '-')
      .replace(/年|月/g, '-')
      .replace(/日/g, '')
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
      onChange(t)
      setText(t)
      return
    }
    if (!t) {
      if (!required) {
        onChange('')
        setText('')
      } else {
        setText(value)
      }
      return
    }
    setText(value)
  }

  return (
    <span className="date-input">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="2026-11-09"
        spellCheck={false}
        autoComplete="off"
        required={required}
        value={text}
        aria-label={ariaLabel ?? '日期，年-月-日'}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commit(text)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit(text)
          }
        }}
      />
      <input
        type="date"
        lang="zh-CN"
        value={value}
        required={required}
        tabIndex={-1}
        aria-label="打开日历选择"
        className="date-input-picker"
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value)
        }}
      />
    </span>
  )
}
