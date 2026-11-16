import { describe, expect, it } from 'vitest'
import { ArcadeInput } from './input'

describe('handheld input ownership', () => {
  it('keeps a control held until every keyboard and touch source releases it', () => {
    const input = new ArcadeInput()
    expect(input.press('key:ArrowLeft', 'left')).toBe(true)
    expect(input.press('pointer:1', 'left')).toBe(false)
    expect(input.press('pointer:2', 'a')).toBe(true)
    input.release('key:ArrowLeft')
    expect([...input.held].sort()).toEqual(['a', 'left'])
    input.release('pointer:1')
    expect([...input.held]).toEqual(['a'])
    input.clear()
    expect(input.held.size).toBe(0)
    expect(input.press('key:ArrowLeft', 'left')).toBe(true)
  })

  it('does not retrigger a held key, and releasing an unknown pointer is harmless', () => {
    const input = new ArcadeInput()
    expect(input.press('key:KeyZ', 'a')).toBe(true)
    expect(input.press('key:KeyZ', 'a')).toBe(false)
    input.release('pointer:99')
    expect([...input.held]).toEqual(['a'])
    input.release('key:KeyZ')
    expect(input.press('key:KeyZ', 'a')).toBe(true)
  })
})
