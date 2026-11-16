import {
  createChange,
  createRovingFocus,
  createSelection,
  createTypeahead,
  definePrimitive,
  isTypeaheadKey,
  type ChangeDetails,
} from '@ui-sdk/core'
import { createParts } from '@ui-sdk/react/primitive'
import { tracks } from './music'

type SongBrowserOptions = {
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (
    value: string[],
    details: ChangeDetails<'item-press' | 'imperative'>,
  ) => void
}

export const songBrowser = definePrimitive({
  name: 'song-browser',
  options: { value: 'list', defaultValue: 'list', onValueChange: 'callback' },
  controlled: ['value'],
  state: (options: SongBrowserOptions) => ({
    value: options.value ?? options.defaultValue ?? [tracks[0].id],
    focused: null as string | null,
  }),
  sync: (options) =>
    options.value === undefined ? {} : { value: options.value },
  api: (context) => {
    const change = createChange(context)
    const roving = createRovingFocus(context, {
      slot: 'song',
      key: 'focused',
      orientation: () => 'both',
      loop: () => true,
      preferred: (part) => context.store.get().value.includes(part.key),
      claims: (state, part) => state.value.includes(part.key),
    })
    const selection = createSelection(context, {
      key: 'value',
      set: (value, details) => change('value', value, details),
      order: () => tracks.map((track) => track.id),
      selectable: (id) => tracks.some((track) => track.id === id),
    })
    const typeahead = createTypeahead()
    return {
      roving,
      chooseSong(id: string, event?: Event) {
        if (typeof id !== 'string' || !tracks.some((track) => track.id === id))
          return false
        selection.choose(id, {
          reason: event ? 'item-press' : 'imperative',
          event,
        })
        return true
      },
      keydown(event: KeyboardEvent, el: HTMLElement) {
        if (roving.keydown(event, el)) return
        if (isTypeaheadKey(event) && event.key !== ' ') {
          const items = roving.items()
          const index = typeahead(
            event.key,
            items.map(
              (item) => tracks.find((track) => track.id === item.key)!.title,
            ),
            items.findIndex((item) => item.el === el),
          )
          if (index >= 0) {
            event.preventDefault()
            roving.focus(items[index].key)
          }
        }
      },
      items: () =>
        tracks.map((track) => ({ value: track.id, label: track.title })),
    }
  },
  slots: (slot) => ({
    root: slot({
      role: 'listbox',
      focus: { none: 'Options own the roving tab stop' },
      keys: { none: 'Options handle navigation' },
    }),
    song: slot<{ value: string }>({
      props: { value: 'string' },
      role: 'option',
      focus: 'roving',
      attrs: (state, part) => ({
        type: 'button',
        'aria-selected': String(state.value.includes(part.key)),
        tabindex: part.api.roving.tabIndex(state, part),
      }),
      press: ({ api, key }, event) => {
        api.chooseSong(key, event)
      },
      keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'],
      on: {
        keydown: (event, { api, el }) => {
          if (el) api.keydown(event, el)
        },
      },
      bind: (el, part) => part.api.roving.bind(el, part),
    }),
  }),
  agent: { actions: ['chooseSong'], closed: true, items: (api) => api.items() },
})

export const { Root: SongBrowser, Song: SongChoice } = createParts(
  songBrowser,
  { root: 'div', song: 'button' },
)
