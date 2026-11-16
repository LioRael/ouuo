import {
  createChange,
  createRovingFocus,
  definePrimitive,
  dispatch,
  type ChangeDetails,
} from '@ui-sdk/core'
import { keyByCode, keyboardKeys } from './layout'

type KeyboardOptions = {
  codes?: string[]
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (
    value: string[],
    details: ChangeDetails<'key-press' | 'clear'>,
  ) => void
}

export const mechanicalKeyboard = definePrimitive({
  name: 'mechanical-keyboard',
  options: {
    codes: 'list',
    value: 'list',
    defaultValue: 'list',
    onValueChange: 'callback',
  },
  controlled: ['value'],
  state: (options: KeyboardOptions) => ({
    value: options.value ?? options.defaultValue ?? [],
    active: [] as string[],
    focused: null as string | null,
  }),
  sync: (options) =>
    options.value === undefined ? {} : { value: options.value },
  api: (context) => {
    const change = createChange(context)
    const accepts = (code: string) =>
      keyByCode.has(code) && (context.options().codes?.includes(code) ?? true)
    const sources = new Map<string, string | null>()
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const roving = createRovingFocus(context, {
      slot: 'key',
      key: 'focused',
      move: (event, { from, items, rtl }) => {
        const key = keyByCode.get(from.key)!
        const row = items.filter(
          (item) => keyByCode.get(item.key)!.row === key.row,
        )
        const index = row.findIndex((item) => item.key === from.key)
        if (event.key === 'Home') return row[0].key
        if (event.key === 'End') return row.at(-1)!.key
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          const by = (event.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1)
          return row[index + by]?.key ?? from.key
        }
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          const targetRow = key.row + (event.key === 'ArrowDown' ? 1 : -1)
          return (
            items
              .filter((item) => keyByCode.get(item.key)!.row === targetRow)
              .sort(
                (a, b) =>
                  Math.abs(keyByCode.get(a.key)!.center - key.center) -
                  Math.abs(keyByCode.get(b.key)!.center - key.center),
              )[0]?.key ?? from.key
          )
        }
        return undefined
      },
    })
    const updateActive = () =>
      context.store.set({
        active: [...new Set(sources.values())].filter((code) => code !== null),
      })
    const release = (source: string) => {
      if (sources.delete(source)) updateActive()
    }
    const clearHeld = () => {
      sources.clear()
      updateActive()
    }
    const down = (code: string, source: string, event?: Event) => {
      if (!accepts(code)) return
      if (sources.has(source)) return
      if (!sourcesHasKey(code)) {
        const previous = context.store.get().value
        const value = [...previous.slice(-11), code]
        const details = { reason: 'key-press' as const, event }
        const unchanged =
          value.length === previous.length &&
          value.every((key, index) => key === previous[index])
        // A full, identical history is still a new strike, not a refused change.
        if (
          unchanged
            ? dispatch(context, 'onValueChange', value, details)
            : !change('value', value, details)
        )
          return
      }
      sources.set(source, code)
      updateActive()
    }
    const sourcesHasKey = (code: string) => [...sources.values()].includes(code)
    context.onDestroy(() => {
      sources.clear()
      for (const timer of timers) clearTimeout(timer)
    })
    return {
      accepts,
      roving,
      down,
      release,
      clearHeld,
      slidePointer(code: string | null, event: PointerEvent) {
        const source = `pointer:${event.pointerId}`
        if (!sources.has(source) || sources.get(source) === code) return
        release(source)
        if (code) down(code, source, event)
        else sources.set(source, null)
      },
      strike(code: string, event?: Event) {
        if (typeof code !== 'string' || !accepts(code))
          throw new Error('Unknown keyboard key')
        const source = `strike:${code}`
        down(code, source, event)
        const timer = setTimeout(() => {
          release(source)
          timers.delete(timer)
        }, 110)
        timers.add(timer)
      },
      clear: () => change('value', [], { reason: 'clear' }),
      items: () =>
        keyboardKeys
          .filter((key) => accepts(key.code))
          .map((key) => ({
            value: key.code,
            label: `${key.label} (${key.code})`,
          })),
    }
  },
  slots: (slot) => ({
    root: slot({
      role: 'group',
      bind: (el, { api }) => {
        const keydown = (event: KeyboardEvent) => {
          if (
            el.closest('[inert]') ||
            event.defaultPrevented ||
            event.isComposing ||
            event.repeat ||
            event.code === 'Tab' ||
            event.metaKey ||
            event.ctrlKey ||
            event.altKey
          )
            return
          const target = event.target
          if (
            target instanceof HTMLElement &&
            (target.isContentEditable ||
              target.closest('input, textarea, select'))
          )
            return
          if (
            target instanceof HTMLElement &&
            target !== document.body &&
            !target.closest('[data-slot="mechanical-keyboard-key"]') &&
            [
              'Enter',
              'Space',
              'Escape',
              'Home',
              'End',
              'ArrowLeft',
              'ArrowRight',
              'ArrowUp',
              'ArrowDown',
            ].includes(event.code)
          )
            return
          if (!api.accepts(event.code)) return
          event.preventDefault()
          api.down(event.code, `keyboard:${event.code}`, event)
        }
        const keyup = (event: KeyboardEvent) => {
          api.release(`keyboard:${event.code}`)
          api.release(`activation:${event.code}`)
          if (
            event.code.startsWith('Meta') ||
            event.code.startsWith('Control') ||
            event.code.startsWith('Alt')
          )
            api.clearHeld()
        }
        const clear = () => api.clearHeld()
        const focusout = (event: FocusEvent) => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !el.contains(event.relatedTarget)
          )
            clear()
        }
        document.addEventListener('keydown', keydown)
        document.addEventListener('keyup', keyup)
        document.addEventListener('visibilitychange', clear)
        window.addEventListener('blur', clear)
        el.addEventListener('focusout', focusout)
        return () => {
          document.removeEventListener('keydown', keydown)
          document.removeEventListener('keyup', keyup)
          document.removeEventListener('visibilitychange', clear)
          window.removeEventListener('blur', clear)
          el.removeEventListener('focusout', focusout)
          clear()
        }
      },
    }),
    key: slot<{ value: string }>({
      props: { value: 'string' },
      role: 'button',
      focus: 'roving',
      attrs: (state, part) => ({
        type: 'button',
        tabindex: part.api.roving.tabIndex(state, part),
        'data-down': state.active.includes(part.key) ? '' : undefined,
      }),
      press: ({ api, key }, event) => {
        if (!event || (event instanceof MouseEvent && event.detail === 0))
          api.strike(key, event)
      },
      keys: [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
        'Enter',
        'Space',
      ],
      on: {
        keydown: (event, { api, el, key }) => {
          if (!el) return
          if (api.roving.keydown(event, el)) return
          if (event.code === 'Space' || event.code === 'Enter') {
            event.preventDefault()
            api.down(key, `activation:${event.code}`, event)
          }
        },
        pointerdown: (event, { api, key, el }) => {
          if (event.button !== 0) return
          if (event.isTrusted) el?.setPointerCapture(event.pointerId)
          api.down(key, `pointer:${event.pointerId}`, event)
        },
        pointermove: (event, { api, el }) => {
          if (event.pointerType === 'touch' || !(event.buttons & 1)) return
          const target = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest('[data-slot="mechanical-keyboard-key"]')
          const root = el?.closest('[data-slot="mechanical-keyboard"]')
          api.slidePointer(
            target && root?.contains(target)
              ? target.getAttribute('data-code')
              : null,
            event,
          )
        },
        pointerup: (event, { api }) =>
          api.release(`pointer:${event.pointerId}`),
        pointercancel: (event, { api }) =>
          api.release(`pointer:${event.pointerId}`),
        lostpointercapture: (event, { api }) =>
          api.release(`pointer:${event.pointerId}`),
      },
      bind: (el, part) => part.api.roving.bind(el, part),
    }),
  }),
  agent: { actions: ['strike', 'clear'], items: (api) => api.items() },
})
