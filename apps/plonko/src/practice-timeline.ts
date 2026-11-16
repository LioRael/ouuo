import {
  createChange,
  createCommit,
  createSpans,
  definePrimitive,
  type ChangeDetails,
  type CommitDetails,
  type Span,
  type SpansDraft,
  type SpansReason,
} from '@ui-sdk/core'
import { createParts } from '@ui-sdk/react/primitive'

type TimelineOptions = {
  duration: number
  value?: Span[]
  defaultValue?: Span[]
  onValueChange?: (value: Span[], details: ChangeDetails<SpansReason>) => void
  onValueCommit?: (value: Span[], details: CommitDetails<SpansReason>) => void
}

export const practiceTimeline = definePrimitive({
  name: 'practice-timeline',
  options: {
    duration: 'number',
    value: 'list',
    defaultValue: 'list',
    onValueChange: 'callback',
    onValueCommit: 'callback',
  },
  controlled: ['value'],
  commits: ['value'],
  state: (options: TimelineOptions) => ({
    value: options.value ?? options.defaultValue ?? [],
    duration: options.duration,
    draft: null as SpansDraft | null,
  }),
  sync: (options) => ({
    duration: options.duration,
    ...(options.value === undefined ? {} : { value: options.value }),
  }),
  api: (context) => {
    const change = createChange(context)
    const commit = createCommit(context)
    const accept = (
      value: Span[],
      details: { reason: SpansReason; event?: Event },
    ) => {
      const duration = context.options().duration
      if (
        value.length > 1 ||
        value.some(
          (span) =>
            !Number.isFinite(span.start) ||
            !Number.isFinite(span.end) ||
            span.start < 0 ||
            span.end > duration ||
            span.end - span.start < 1,
        )
      )
        return false
      if (!change('value', value, details)) return false
      commit('value', value, details)
      return true
    }
    const spans = createSpans(context, {
      key: 'value',
      draft: 'draft',
      set: accept,
      axis: 'x',
      min: () => 0,
      max: () => context.options().duration,
      step: () => 0.25,
      minSize: () => 1,
      tracks: () => ['practice'],
      overlap: false,
      create: (span) =>
        context.store.get().value.length ? null : { ...span, id: 'section' },
      label: (span) =>
        `Practice section from ${span.start} to ${span.end} seconds`,
      createAutoScroll: false,
    })
    return {
      spans,
      setRange(start: number, end: number) {
        if (typeof start !== 'number' || typeof end !== 'number') return false
        return accept([{ id: 'section', track: 'practice', start, end }], {
          reason: 'imperative',
        })
      },
      clear: () => accept([], { reason: 'imperative' }),
      cancel: () => spans.cancel(),
    }
  },
  slots: (slot) => ({
    root: slot({
      role: 'group',
      on: {
        keydown: (event, { api }) => {
          if (event.key === 'Escape') api.cancel()
        },
      },
      bind: (_el, { api }) => {
        const cancel = () => api.cancel()
        window.addEventListener('blur', cancel)
        document.addEventListener('visibilitychange', cancel)
        return () => {
          window.removeEventListener('blur', cancel)
          document.removeEventListener('visibilitychange', cancel)
        }
      },
    }),
    track: slot<{ value: string }>({
      props: { value: 'string' },
      bind: (el, { api, key }) => api.spans.bindTrack(el, key),
      on: {
        pointerdown: (event, { api, key }) =>
          api.spans.trackPointerdown(event, key),
      },
    }),
    section: slot<{ value: string }>({
      props: { value: 'string' },
      role: 'button',
      focus: 'tab-stop',
      press: { none: 'This range is moved or resized, not activated' },
      attrs: (state, { api, key }) => {
        const span = api.spans.spans(state).find((item) => item.id === key)
        return {
          ...api.spans.spanAttrs(state, key),
          type: 'button',
          tabindex: '0',
          hidden: span ? undefined : '',
          'aria-label': span
            ? `Practice section from ${span.start} to ${span.end} seconds`
            : 'Practice section',
          style: span ? api.spans.spanStyle(span) : undefined,
        }
      },
      bind: (el, { api, key }) => api.spans.bindSpan(el, key),
      on: {
        pointerdown: (event, { api, key }) => {
          event.stopPropagation()
          api.spans.spanPointerdown(event, key)
        },
        keydown: (event, { api, key }) => {
          api.spans.keydown(event, key)
        },
      },
    }),
  }),
  agent: { actions: ['setRange', 'clear'] },
})

export const {
  Root: PracticeTimeline,
  Track: PracticeTrack,
  Section: PracticeSection,
} = createParts(practiceTimeline, {
  root: 'div',
  track: 'div',
  section: 'button',
})
