import type { Control } from './game'

export type HardwareControl = Control | 'start' | 'select' | 'l' | 'r'

export class ArcadeInput {
  readonly held = new Set<Control>()
  private readonly sources = new Map<string, HardwareControl>()

  press(source: string, control: HardwareControl) {
    if (this.sources.has(source)) return false
    const alreadyHeld = [...this.sources.values()].includes(control)
    this.sources.set(source, control)
    if (isGameControl(control)) this.held.add(control)
    return !alreadyHeld
  }

  release(source: string) {
    const control = this.sources.get(source)
    this.sources.delete(source)
    if (
      control &&
      isGameControl(control) &&
      ![...this.sources.values()].includes(control)
    ) {
      this.held.delete(control)
    }
  }

  active(control: HardwareControl) {
    return [...this.sources.values()].includes(control)
  }

  clear() {
    this.sources.clear()
    this.held.clear()
  }
}

export function isGameControl(control: HardwareControl): control is Control {
  return (
    control !== 'start' &&
    control !== 'select' &&
    control !== 'l' &&
    control !== 'r'
  )
}

export const keyMap: Readonly<Record<string, HardwareControl>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  KeyZ: 'a',
  Space: 'a',
  KeyX: 'b',
  Enter: 'start',
  Escape: 'start',
  ShiftLeft: 'select',
  ShiftRight: 'select',
  KeyQ: 'l',
  KeyE: 'r',
}
