import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import type { Span } from '@ui-sdk/core'
import { PianoAudio } from '@ouuo/audio'
import { keys, notesFor, tracks, type Difficulty } from './music'
import { PerformanceScore } from './score'
import { PianoTransport } from './transport'
import { renderPiano, type NoteTrail } from './rendering'

export type PlayMode = 'free' | 'listen' | 'challenge'
type Phase = 'idle' | 'running' | 'paused' | 'complete'

export function usePiano() {
  const [preferences] = useState(() => {
    try {
      const storedVolume = Number(localStorage.getItem('ouuo:volume') ?? 65)
      return {
        muted: localStorage.getItem('ouuo:muted') === 'true',
        volume: Number.isFinite(storedVolume)
          ? Math.min(100, Math.max(0, storedVolume))
          : 65,
      }
    } catch {
      return { muted: false, volume: 65 }
    }
  })
  const [mode, setMode] = useState<PlayMode>('free')
  const [phase, setPhase] = useState<Phase>('idle')
  const [track, setTrack] = useState(tracks[0])
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [speed, setSpeed] = useState(1)
  const [range, setRange] = useState<Span[]>([])
  const [loop, setLoop] = useState(false)
  const [metronome, setMetronome] = useState(false)
  const [effects, setEffects] = useState(true)
  const [hints, setHints] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [volume, setVolume] = useState(preferences.volume)
  const [muted, setMuted] = useState(preferences.muted)
  const [sustain, setSustain] = useState(false)
  const [labels, setLabels] = useState(true)
  const [settings, setSettings] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [active, setActive] = useState<Set<number>>(() => new Set())
  const [bindings, setBindings] = useState<string[]>(() =>
    keys.map((key) => key.binding),
  )
  const audio = useRef<PianoAudio | null>(null)
  const [initialScore] = useState(
    () => new PerformanceScore(notesFor(tracks[0], 'normal'), 'normal'),
  )
  const transport = useRef(new PianoTransport(() => 0))
  const score = useRef(initialScore)
  const [result, setResult] = useState(initialScore.result)
  const held = useRef(new Map<string, number>())
  const sounding = useRef(new Set<number>())
  const trails = useRef<NoteTrail[]>([])
  const canvas = useRef<HTMLCanvasElement>(null)
  const progress = useRef<HTMLDivElement>(null)
  const clock = useRef<HTMLSpanElement>(null)
  const mounted = useRef(false)
  const operation = useRef(0)
  const pedalHeld = useRef(false)
  const tapTimers = useRef(new Map<number, number>())
  const listeningActive = useRef(new Set<number>())
  const scheduled = useRef(new Set<number>())
  const beatScheduled = useRef(-1)
  const needsDraw = useRef(true)
  const notes = useMemo(() => notesFor(track, difficulty), [track, difficulty])

  useEffect(() => {
    needsDraw.current = true
  })

  useEffect(() => {
    try {
      localStorage.setItem('ouuo:muted', String(muted))
      localStorage.setItem('ouuo:volume', String(volume))
    } catch {
      /* Storage can be disabled without disabling the instrument. */
    }
  }, [muted, volume])

  function getAudio() {
    return (audio.current ??= new PianoAudio())
  }
  async function unlock() {
    try {
      const engine = getAudio()
      await engine.unlock()
      if (!mounted.current) return false
      engine.setVolume(muted ? 0 : volume / 100)
      engine.setSustain(sustain || pedalHeld.current)
      setReady(true)
      setError('')
      return true
    } catch {
      if (mounted.current)
        setError(
          'Sound couldn’t start. Check browser audio permissions, then try Enable sound again.',
        )
      return false
    }
  }
  function publishActive(next: Set<number>) {
    setActive((previous) =>
      previous.size === next.size &&
      [...previous].every((midi) => next.has(midi))
        ? previous
        : next,
    )
  }
  function releaseAll() {
    held.current.clear()
    sounding.current.clear()
    for (const timer of tapTimers.current.values()) window.clearTimeout(timer)
    tapTimers.current.clear()
    listeningActive.current.clear()
    pedalHeld.current = false
    audio.current?.releaseAll()
    audio.current?.setSustain(sustain)
    trails.current.forEach((trail) => {
      trail.end ??= performance.now() / 1000
    })
    publishActive(new Set())
    scheduled.current.clear()
    beatScheduled.current = -1
  }
  function pause() {
    operation.current++
    if (transport.current.running) {
      transport.current.pause()
      if (mode === 'challenge')
        transport.current.seek(score.current.interrupt(transport.current.time))
      setPhase('paused')
    }
    releaseAll()
  }
  function resetScore(from = 0) {
    const section = range[0]
    score.current = new PerformanceScore(
      notes
        .filter(
          (note) => note.time >= from && (!section || note.time < section.end),
        )
        .map((note) =>
          section
            ? {
                ...note,
                duration: Math.min(note.duration, section.end - note.time),
              }
            : note,
        ),
      difficulty,
    )
    setResult(score.current.result)
  }
  async function start(resume = false) {
    const token = ++operation.current
    if (!(await unlock()) || token !== operation.current) return
    releaseAll()
    const from = resume ? transport.current.time : (range[0]?.start ?? 0)
    if (!resume || phase === 'complete') resetScore(from)
    transport.current.start(from)
    setPhase('running')
    setFeedback('')
  }
  function chooseMode(next: string | null) {
    if (next !== 'free' && next !== 'listen' && next !== 'challenge') return
    pause()
    transport.current.seek(0)
    setMode(next)
    setPhase('idle')
    setResult(initialScore.result)
    setFeedback('')
  }
  function chooseTrack(id: string) {
    const next = tracks.find((item) => item.id === id)
    if (!next || next.id === track.id) return
    pause()
    transport.current.seek(0)
    setTrack(next)
    setRange([])
    setLoop(false)
    setPhase('idle')
    setResult(initialScore.result)
    setFeedback('')
  }
  function changeDifficulty(next: string | null) {
    if (next !== 'easy' && next !== 'normal' && next !== 'hard') return
    pause()
    setDifficulty(next)
    transport.current.seek(range[0]?.start ?? 0)
    setPhase('idle')
    setResult(initialScore.result)
  }
  function seek(time: number) {
    if (!Number.isFinite(time) || time < 0 || time > track.duration) return
    if (range[0]) time = Math.max(range[0].start, Math.min(range[0].end, time))
    pause()
    transport.current.seek(time)
    resetScore(time)
    setPhase('paused')
  }
  function changeRange(next: Span[]) {
    if (
      next.length > 1 ||
      next.some(
        (span) =>
          span.start < 0 ||
          span.end > track.duration ||
          !Number.isFinite(span.start + span.end) ||
          span.end - span.start < 1,
      )
    )
      return
    pause()
    setRange(next)
    transport.current.seek(next[0]?.start ?? 0)
    setPhase('idle')
    setResult(initialScore.result)
  }
  function changeSpeed(next: number) {
    if (!Number.isFinite(next) || next < 0.5 || next > 1.5) return
    pause()
    transport.current.setSpeed(next)
    setSpeed(next)
  }
  function noteUp(source: string) {
    const midi = held.current.get(source)
    if (midi === undefined) return
    held.current.delete(source)
    if (![...held.current.values()].includes(midi)) {
      if (mode === 'challenge' && transport.current.running) {
        score.current.release(midi, transport.current.time)
        setResult(score.current.result)
      }
      audio.current?.noteOff(midi)
      sounding.current.delete(midi)
      const trail = trails.current.findLast(
        (trail) => trail.midi === midi && trail.end === undefined,
      )
      if (trail) trail.end = performance.now() / 1000
      publishActive(new Set(held.current.values()))
    }
  }
  function noteDown(midi: number, source: string) {
    if (
      held.current.get(source) === midi ||
      settings ||
      (mode === 'listen' && transport.current.running)
    )
      return
    noteUp(source)
    held.current.set(source, midi)
    const play = () => {
      if (
        held.current.get(source) !== midi ||
        !mounted.current ||
        sounding.current.has(midi)
      )
        return
      getAudio().noteOn(midi)
      sounding.current.add(midi)
      trails.current.push({ midi, start: performance.now() / 1000 })
      publishActive(new Set(held.current.values()))
      if (mode === 'challenge' && transport.current.running) {
        const judgement = score.current.hit(midi, transport.current.time)
        setFeedback(
          judgement === 'wrong'
            ? 'Keep going'
            : judgement[0].toUpperCase() + judgement.slice(1),
        )
        setResult(score.current.result)
      }
    }
    if (ready && audio.current?.contextState === 'running') play()
    else
      unlock()
        .then((ok) => {
          if (ok) play()
        })
        .catch(() => {
          releaseAll()
          setError('Sound stopped. Try Enable sound again.')
        })
  }
  function tapNote(midi: number) {
    window.clearTimeout(tapTimers.current.get(midi))
    noteDown(midi, `virtual:${midi}`)
    tapTimers.current.set(
      midi,
      window.setTimeout(() => {
        noteUp(`virtual:${midi}`)
        tapTimers.current.delete(midi)
      }, 220),
    )
  }

  const keyDown = useEffectEvent((event: KeyboardEvent) => {
    if (
      event.repeat ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      settings
    )
      return
    const target = event.target
    if (
      target instanceof Element &&
      target.closest('input,textarea,select,[contenteditable="true"]')
    )
      return
    if (
      event.code === 'Space' &&
      (!(target instanceof Element) ||
        !target.closest('button,a,[role="radio"],[role="switch"]'))
    ) {
      event.preventDefault()
      pedalHeld.current = true
      audio.current?.setSustain(true)
      return
    }
    const index = bindings.indexOf(event.key.toLowerCase())
    if (index >= 0) {
      event.preventDefault()
      noteDown(keys[index].midi, `key:${event.key.toLowerCase()}`)
    }
  })
  const keyUp = useEffectEvent((event: KeyboardEvent) => {
    if (event.code === 'Space') {
      pedalHeld.current = false
      audio.current?.setSustain(sustain)
    }
    noteUp(`key:${event.key.toLowerCase()}`)
  })
  const loseFocus = useEffectEvent(() => pause())
  const tick = useEffectEvent(() => {
    if (!transport.current.running) return
    const time = transport.current.time
    const section = range[0]
    const end = section?.end ?? track.duration
    if (time >= end) {
      if (mode === 'challenge')
        score.current.advance(end, new Set(held.current.values()))
      releaseAll()
      if (loop && section) {
        resetScore(section.start)
        transport.current.start(section.start)
      } else {
        transport.current.pause()
        transport.current.seek(end)
        score.current.expire(end + 1)
        setResult(score.current.result)
        setPhase('complete')
      }
      return
    }
    if (mode === 'listen') {
      notes.forEach((note, index) => {
        if (
          scheduled.current.has(index) ||
          note.time < (section?.start ?? 0) ||
          note.time >= end ||
          note.time + note.duration <= time ||
          note.time > time + 0.2 * speed
        )
          return
        scheduled.current.add(index)
        const startTime = Math.max(time, note.time)
        getAudio().scheduleNote(
          note.midi,
          transport.current.audioTimeFor(startTime),
          (Math.min(end, note.time + note.duration) - startTime) / speed,
        )
      })
      listeningActive.current = new Set(
        notes
          .filter(
            (note) =>
              note.time >= (section?.start ?? 0) &&
              time >= note.time &&
              time < Math.min(end, note.time + note.duration),
          )
          .map((note) => note.midi),
      )
      publishActive(listeningActive.current)
    } else if (mode === 'challenge') {
      const before = JSON.stringify(score.current.result)
      score.current.advance(time, new Set(held.current.values()))
      if (before !== JSON.stringify(score.current.result)) {
        setResult(score.current.result)
        if (score.current.result.misses > result.misses) setFeedback('Miss')
      }
    }
    if (metronome) {
      const beat = 60 / track.bpm
      const nextBeat = Math.ceil(time / beat)
      if (
        nextBeat > beatScheduled.current &&
        nextBeat * beat < end &&
        nextBeat * beat < time + 0.12 * speed
      ) {
        beatScheduled.current = nextBeat
        getAudio().scheduleNote(
          nextBeat % 4 === 0 ? 96 : 89,
          transport.current.audioTimeFor(nextBeat * beat),
          0.035,
        )
      }
    }
  })
  const draw = useEffectEvent(() => {
    const time = transport.current.time
    if (progress.current)
      progress.current.style.transform = `scaleX(${Math.min(1, time / track.duration)})`
    if (clock.current)
      clock.current.textContent = `0:${String(Math.floor(time)).padStart(2, '0')}`
    trails.current = trails.current.filter(
      (trail) =>
        trail.end === undefined || performance.now() / 1000 - trail.end < 3.5,
    )
    if (!canvas.current) return
    if (
      !needsDraw.current &&
      !transport.current.running &&
      !trails.current.length &&
      !active.size
    )
      return
    renderPiano(canvas.current, {
      time,
      notes:
        mode === 'challenge' && phase !== 'idle' ? score.current.notes : notes,
      played:
        mode !== 'challenge' || phase === 'idle'
          ? new Set()
          : score.current.played,
      active,
      trails: trails.current,
      free: mode === 'free',
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      effects,
      hints,
    })
    needsDraw.current =
      transport.current.running || trails.current.length > 0 || active.size > 0
  })
  const dispose = useEffectEvent(() => {
    mounted.current = false
    operation.current++
    transport.current.pause()
    for (const timer of tapTimers.current.values()) window.clearTimeout(timer)
    tapTimers.current.clear()
    audio.current?.dispose()
    audio.current = null
    held.current.clear()
    sounding.current.clear()
  })
  useEffect(() => {
    mounted.current = true
    transport.current = new PianoTransport(
      () => audio.current?.currentTime ?? 0,
    )
    const observer = new ResizeObserver(() => {
      needsDraw.current = true
    })
    if (canvas.current) observer.observe(canvas.current)
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const redraw = () => {
      needsDraw.current = true
    }
    motion.addEventListener('change', redraw)
    let frame = 0
    const update = () => {
      draw()
      frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    const timer = window.setInterval(() => tick(), 20)
    const down = (event: KeyboardEvent) => keyDown(event)
    const up = (event: KeyboardEvent) => keyUp(event)
    const blur = () => loseFocus()
    const visibility = () => {
      if (document.hidden) loseFocus()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      dispose()
      observer.disconnect()
      motion.removeEventListener('change', redraw)
      cancelAnimationFrame(frame)
      clearInterval(timer)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])

  function changeVolume(next: number) {
    if (!Number.isFinite(next) || next < 0 || next > 100) return
    setVolume(next)
    audio.current?.setVolume(muted ? 0 : next / 100)
  }
  function changeMute(next: boolean) {
    setMuted(next)
    audio.current?.setVolume(next ? 0 : volume / 100)
  }
  function changeSustain(next: boolean) {
    setSustain(next)
    audio.current?.setSustain(next || pedalHeld.current)
  }
  function openSettings(open: boolean) {
    if (open) pause()
    setSettings(open)
  }
  function changeBinding(index: number, binding: string) {
    const value = binding.toLowerCase()
    if (
      !/^[a-z0-9]$/.test(value) ||
      bindings.some((existing, i) => i !== index && existing === value)
    )
      return false
    releaseAll()
    setBindings((previous) =>
      previous.map((existing, i) => (i === index ? value : existing)),
    )
    return true
  }
  return {
    mode,
    chooseMode,
    phase,
    ready,
    unlock,
    error,
    volume,
    changeVolume,
    muted,
    changeMute,
    sustain,
    changeSustain,
    labels,
    setLabels,
    settings,
    openSettings,
    feedback,
    result,
    active,
    noteDown,
    noteUp,
    tapNote,
    start,
    pause,
    canvas,
    progress,
    clock,
    track,
    chooseTrack,
    difficulty,
    changeDifficulty,
    speed,
    changeSpeed,
    range,
    changeRange,
    loop,
    setLoop,
    metronome,
    setMetronome,
    effects,
    setEffects,
    hints,
    setHints,
    seek,
    time: () => transport.current.time,
    bindings,
    changeBinding,
  }
}
