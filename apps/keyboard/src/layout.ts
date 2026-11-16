type KeySpec = {
  code: string
  label: string
  legend?: string
  icon?: string
  units: number
  row: number
  center: number
  accent?: boolean
}

type KeyInput = [code: string, label: string, units?: number, legend?: string]

const functionIcons: Record<string, string> = {
  F1: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4',
  F2: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10M12 2.5v1m0 17v1M2.5 12h1m17 0h1M5.3 5.3l.8.8m11.8 11.8.8.8M5.3 18.7l.8-.8M17.9 6.1l.8-.8',
  F3: 'M3.5 4.5h17v15h-17zM3.5 10h17M9 10v9.5M15 10v9.5',
  F4: 'M10.5 3.5a7 7 0 1 0 0 14 7 7 0 0 0 0-14M15.5 15.5l5 5',
  F5: 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3M5.5 10v1a6.5 6.5 0 0 0 13 0v-1M12 17.5V21m-4 0h8',
  F6: 'M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z',
  F7: 'M3 5v14M12 5l-8 7 8 7ZM21 5l-8 7 8 7Z',
  F8: 'M5 3.5 20 12 5 20.5Z',
  F9: 'M21 5v14M12 5l8 7-8 7ZM3 5l8 7-8 7Z',
  F10: 'M3 9h4l5-5v16l-5-5H3ZM16 9l5 6m0-6-5 6',
  F11: 'M3 9h4l5-5v16l-5-5H3ZM16 8a6 6 0 0 1 0 8',
  F12: 'M3 9h4l5-5v16l-5-5H3ZM16 8a6 6 0 0 1 0 8m2.5-11a10 10 0 0 1 0 14',
}

const rows: KeyInput[][] = [
  [
    ['Escape', 'esc'],
    ['F1', 'F1'],
    ['F2', 'F2'],
    ['F3', 'F3'],
    ['F4', 'F4'],
    ['F5', 'F5'],
    ['F6', 'F6'],
    ['F7', 'F7'],
    ['F8', 'F8'],
    ['F9', 'F9'],
    ['F10', 'F10'],
    ['F11', 'F11'],
    ['F12', 'F12'],
    ['Delete', 'del'],
  ],
  [
    ['Backquote', '`', 1, '~'],
    ['Digit1', '1', 1, '!'],
    ['Digit2', '2', 1, '@'],
    ['Digit3', '3', 1, '#'],
    ['Digit4', '4', 1, '$'],
    ['Digit5', '5', 1, '%'],
    ['Digit6', '6', 1, '^'],
    ['Digit7', '7', 1, '&'],
    ['Digit8', '8', 1, '*'],
    ['Digit9', '9', 1, '('],
    ['Digit0', '0', 1, ')'],
    ['Minus', '-', 1, '_'],
    ['Equal', '=', 1, '+'],
    ['Backspace', 'backspace', 2],
    ['Home', 'home'],
  ],
  [
    ['Tab', 'tab', 1.5],
    ...'QWERTYUIOP'
      .split('')
      .map((letter): KeyInput => [`Key${letter}`, letter]),
    ['BracketLeft', '[', 1, '{'],
    ['BracketRight', ']', 1, '}'],
    ['Backslash', '\\', 1.5, '|'],
    ['PageUp', 'pg up'],
  ],
  [
    ['CapsLock', 'caps', 1.8],
    ...'ASDFGHJKL'
      .split('')
      .map((letter): KeyInput => [`Key${letter}`, letter]),
    ['Semicolon', ';', 1, ':'],
    ['Quote', "'", 1, '"'],
    ['Enter', 'return', 2.2],
    ['PageDown', 'pg dn'],
  ],
  [
    ['ShiftLeft', 'shift', 2.3],
    ...'ZXCVBNM'.split('').map((letter): KeyInput => [`Key${letter}`, letter]),
    ['Comma', ',', 1, '<'],
    ['Period', '.', 1, '>'],
    ['Slash', '/', 1, '?'],
    ['ShiftRight', 'shift', 1.7],
    ['ArrowUp', '↑'],
    ['End', 'end'],
  ],
  [
    ['ControlLeft', 'ctrl', 1.3],
    ['AltLeft', 'option', 1.3],
    ['MetaLeft', '⌘', 1.4],
    ['Space', 'space', 6],
    ['MetaRight', '⌘'],
    ['AltRight', 'option'],
    ['Fn', 'fn'],
    ['ArrowLeft', '←'],
    ['ArrowDown', '↓'],
    ['ArrowRight', '→'],
  ],
]

export const keyboardRows: KeySpec[][] = rows.map((row, rowIndex) => {
  let offset = 0
  return row.map(([code, label, units = 1, legend]) => {
    const key = {
      code,
      label,
      units,
      legend,
      icon: functionIcons[code],
      row: rowIndex,
      center: offset + units / 2,
      accent: code === 'CapsLock',
    }
    offset += units
    return key
  })
})

export const keyboardKeys = keyboardRows.flat()
export const keyByCode = new Map(keyboardKeys.map((key) => [key.code, key]))
