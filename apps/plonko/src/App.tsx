import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { bindDrag } from '@ui-sdk/core'
import { Button } from '@ui-sdk/react/button'
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@ui-sdk/react/dialog'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@ui-sdk/react/segmented-control'
import {
  createSliderController,
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
  SliderValue,
} from '@ui-sdk/react/slider'
import { Switch, SwitchThumb } from '@ui-sdk/react/switch'
import { Field, FieldLabel } from '@ui-sdk/react/field'
import { Input } from '@ui-sdk/react/input'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@ui-sdk/react/tabs'
import { useShortcut, useShortcutHint } from '@ui-sdk/react/shortcuts'
import { keys, tracks } from './music'
import { SongBrowser, SongChoice } from './song-browser'
import {
  PracticeTimeline,
  PracticeTrack,
  PracticeSection,
} from './practice-timeline'
import { usePiano } from './usePiano'
import './piano.css'

function VolumeWheel({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  const [controller] = useState(() => createSliderController<number>())
  const [scrubbing, setScrubbing] = useState(false)
  const gesture = useRef<{ stop: () => void; cancel: () => void } | null>(null)
  useEffect(() => {
    const cancel = () => gesture.current?.cancel()
    const hidden = () => {
      if (document.hidden) cancel()
    }
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      gesture.current?.stop()
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', hidden)
    }
  }, [])
  function scrub(event: PointerEvent<HTMLElement>) {
    event.preventDefault()
    if (event.button !== 0 || gesture.current) return
    const initial = controller.getValue()
    const startX = event.clientX
    controller.focus()
    setScrubbing(true)
    const stop = bindDrag(event.currentTarget, event.nativeEvent, {
      cancelOnEscape: true,
      onMove: ({ x, event }) => {
        controller.setValue(initial + (x - startX) / 2, {
          reason: 'drag',
          event,
        })
      },
      onEnd: (event, canceled) => {
        if (canceled) controller.setValue(initial, { reason: 'drag', event })
        gesture.current = null
        setScrubbing(false)
      },
    })
    gesture.current = {
      stop,
      cancel: () => {
        stop()
        controller.setValue(initial)
        gesture.current = null
        setScrubbing(false)
      },
    }
  }
  return (
    <Field className="volume-wheel" data-scrubbing={scrubbing || undefined}>
      <Slider controller={controller} value={value} onValueChange={onChange}>
        <SliderControl title="Volume: drag left or right" onPointerDown={scrub}>
          <SliderTrack style={{ backgroundPosition: `0 0, ${value * 2}px 0` }}>
            <SliderThumb aria-label="Volume" />
          </SliderTrack>
        </SliderControl>
        <div className="wheel-caption">
          <FieldLabel>Volume</FieldLabel>
          <SliderValue />
        </div>
      </Slider>
    </Field>
  )
}

function Parameter({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}) {
  return (
    <Field className="parameter">
      <Slider
        value={value}
        onValueChange={onChange}
        min={min}
        max={max}
        step={step}
      >
        <div className="setting-heading">
          <FieldLabel>{label}</FieldLabel>
          <SliderValue />
        </div>
        <SliderControl>
          <SliderTrack>
            <SliderIndicator />
            <SliderThumb />
          </SliderTrack>
        </SliderControl>
      </Slider>
    </Field>
  )
}

function Setting({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <Field className="switch-field">
      <FieldLabel>{label}</FieldLabel>
      <Switch checked={checked} onCheckedChange={onChange}>
        <SwitchThumb />
      </Switch>
    </Field>
  )
}

export default function App() {
  const { canvas, progress, clock, ...piano } = usePiano()
  const [bindingError, setBindingError] = useState('')
  const heldNotes = keys
    .filter((key) => piano.active.has(key.midi))
    .map((key) => key.name)
    .join(' · ')
  const playbackButton = useRef<HTMLButtonElement>(null)
  const playbackShortcut = useShortcutHint('mod+enter')
  const settingsShortcut = useShortcutHint('mod+,')
  function drag(event: PointerEvent<HTMLElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-midi]')
    if (target)
      piano.noteDown(Number(target.dataset.midi), `pointer:${event.pointerId}`)
    else piano.noteUp(`pointer:${event.pointerId}`)
  }
  async function play() {
    piano.openSettings(false)
    await piano.start(piano.phase === 'paused')
  }
  useShortcut('mod+enter', () => playbackButton.current?.click(), {
    when: () => piano.mode !== 'free' && !piano.settings,
    description: 'Play or pause the song',
  })

  return (
    <main
      className="piano-room"
      data-mode={piano.mode}
      data-phase={piano.phase}
      data-side={piano.settings ? 'back' : 'front'}
      data-effects={piano.effects || undefined}
      aria-label="plonko"
    >
      <h1 className="sr-only">plonko</h1>
      <Dialog open={piano.settings} onOpenChange={piano.openSettings}>
        <DialogBackdrop className="piano-backdrop" />
        <DialogContent className="piano-settings" inert={!piano.settings}>
          <div className="back-feet" aria-hidden="true">
            <i />
            <i />
          </div>
          <div className="panel-heading">
            <div>
              <span className="back-brand" aria-hidden="true">
                plonko.
              </span>
              <DialogTitle>The other side</DialogTitle>
            </div>
            <DialogClose className="close-control" aria-label="Close controls">
              flip
            </DialogClose>
          </div>
          <DialogDescription className="sr-only">
            A few little adjustments. Then back to making noise.
          </DialogDescription>
          <Tabs
            defaultValue="music"
            aria-label="Piano controls"
            className="rear-controls"
          >
            <TabsList aria-label="Settings pages" className="settings-tabs">
              <TabsTab value="music">Music</TabsTab>
              <TabsTab value="practice">Practice</TabsTab>
              <TabsTab value="sound">Sound</TabsTab>
              <TabsTab value="keys">Keys</TabsTab>
            </TabsList>
            <TabsPanel value="music">
              <SegmentedControl
                aria-label="Play mode"
                value={piano.mode}
                onValueChange={piano.chooseMode}
                className="play-modes"
              >
                <SegmentedControlItem value="free">
                  Free play
                </SegmentedControlItem>
                <SegmentedControlItem value="listen">
                  Listen
                </SegmentedControlItem>
                <SegmentedControlItem value="challenge">
                  Challenge
                </SegmentedControlItem>
              </SegmentedControl>
              <section className="control-section" aria-label="Music library">
                <h2>Three little originals</h2>
                <SongBrowser
                  aria-label="Choose a song"
                  className="song-browser"
                  value={[piano.track.id]}
                  onValueChange={(value) => piano.chooseTrack(value[0])}
                >
                  {tracks.map((track, index) => (
                    <SongChoice
                      key={track.id}
                      value={track.id}
                      className="song-choice"
                    >
                      <span
                        className="song-art"
                        data-track={index}
                        aria-hidden="true"
                      >
                        {track.notes
                          .filter((_, i) => i % 3 === 0)
                          .slice(0, 13)
                          .map((note, i) => (
                            <i
                              key={`${note.time}:${note.midi}`}
                              style={{
                                height: `${12 + (note.midi - 60) * 2}px`,
                                transform: `translateY(${((i % 3) - 1) * 4}px)`,
                              }}
                            />
                          ))}
                      </span>
                      <span>
                        <strong>{track.title}</strong>
                        <small>
                          {track.bpm} BPM · {Math.round(track.duration)}s
                        </small>
                      </span>
                      <span className="song-selected" aria-hidden="true">
                        ✓
                      </span>
                    </SongChoice>
                  ))}
                </SongBrowser>
              </section>
            </TabsPanel>
            <TabsPanel value="practice" className="practice-panel">
              {piano.mode !== 'free' && (
                <section className="control-section">
                  <h2>Practice, at your pace</h2>
                  <SegmentedControl
                    aria-label="Difficulty"
                    value={piano.difficulty}
                    onValueChange={piano.changeDifficulty}
                    className="play-modes"
                  >
                    <SegmentedControlItem value="easy">
                      Easy
                    </SegmentedControlItem>
                    <SegmentedControlItem value="normal">
                      Normal
                    </SegmentedControlItem>
                    <SegmentedControlItem value="hard">
                      Hard
                    </SegmentedControlItem>
                  </SegmentedControl>
                  <Parameter
                    label="Playback speed"
                    value={piano.speed}
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    onChange={piano.changeSpeed}
                  />
                  <Parameter
                    label="Playback position"
                    value={piano.time()}
                    min={piano.range[0]?.start ?? 0}
                    max={piano.range[0]?.end ?? piano.track.duration}
                    step={0.25}
                    onChange={piano.seek}
                  />
                </section>
              )}
              <section className="control-section">
                <div className="setting-heading">
                  <h2>Practice section</h2>
                  <Button
                    className="text-control"
                    onClick={() =>
                      piano.changeRange(
                        piano.range.length
                          ? []
                          : [
                              {
                                id: 'section',
                                track: 'practice',
                                start: 2,
                                end: Math.min(10, piano.track.duration),
                              },
                            ],
                      )
                    }
                  >
                    {piano.range.length
                      ? 'Clear section'
                      : 'Set practice section'}
                  </Button>
                </div>
                <PracticeTimeline
                  key={piano.track.id}
                  aria-label="Practice timeline"
                  duration={piano.track.duration}
                  value={piano.range}
                  onValueChange={piano.changeRange}
                  className="practice-timeline"
                >
                  <PracticeTrack value="practice" className="practice-track">
                    <div className="mini-score" aria-hidden="true">
                      {piano.track.notes.map((note) => (
                        <i
                          key={`${note.time}:${note.midi}`}
                          style={{
                            left: `${(note.time / piano.track.duration) * 100}%`,
                            bottom: `${10 + (note.midi - 60) * 2}%`,
                            width: `${Math.max(0.4, (note.duration / piano.track.duration) * 100)}%`,
                          }}
                        />
                      ))}
                    </div>
                    <PracticeSection
                      value="section"
                      className="practice-section"
                    >
                      <span data-span-edge="start" />
                      <span className="section-grip" aria-hidden="true">
                        ⋮⋮
                      </span>
                      <span data-span-edge="end" />
                    </PracticeSection>
                  </PracticeTrack>
                </PracticeTimeline>
                <p className="control-help">
                  Drag to mark a passage. Drag its edges to resize. Arrow keys
                  move it, Shift + arrows resize, Delete clears.
                </p>
                <Setting
                  label="Loop section"
                  checked={piano.loop}
                  onChange={piano.setLoop}
                />
              </section>
            </TabsPanel>
            <TabsPanel value="sound" className="sound-panel">
              <section className="control-section">
                <h2>Sound & light</h2>
                <div>
                  {piano.settings && (
                    <Parameter
                      label="Volume"
                      value={piano.volume}
                      min={0}
                      max={100}
                      onChange={piano.changeVolume}
                    />
                  )}
                  <Button
                    className="text-control sound-control"
                    onClick={async () => {
                      if (!piano.ready) await piano.unlock()
                      else piano.changeMute(!piano.muted)
                    }}
                  >
                    {!piano.ready
                      ? 'Enable sound'
                      : piano.muted
                        ? 'Unmute sound'
                        : 'Mute sound'}
                  </Button>
                  <Setting
                    label="Sustain pedal"
                    checked={piano.sustain}
                    onChange={piano.changeSustain}
                  />
                </div>
                <div>
                  <Setting
                    label="Metronome"
                    checked={piano.metronome}
                    onChange={piano.setMetronome}
                  />
                  <Setting
                    label="Key labels"
                    checked={piano.labels}
                    onChange={piano.setLabels}
                  />
                  <Setting
                    label="Note hints"
                    checked={piano.hints}
                    onChange={piano.setHints}
                  />
                  <Setting
                    label="Light effects"
                    checked={piano.effects}
                    onChange={piano.setEffects}
                  />
                </div>
              </section>
            </TabsPanel>
            <TabsPanel value="keys" className="keys-panel">
              <section className="control-section">
                <div className="setting-heading">
                  <h2>Your keyboard</h2>
                  <p className="control-help">One letter or number per key.</p>
                </div>
                <div className="binding-grid">
                  {keys.map((key, index) => (
                    <Field key={key.midi}>
                      <FieldLabel>{key.name}</FieldLabel>
                      <Input
                        aria-label={`Binding for ${key.name}`}
                        value={piano.bindings[index]}
                        maxLength={1}
                        onFocus={(event) => event.currentTarget.select()}
                        onValueChange={(value, details) => {
                          if (!piano.changeBinding(index, value)) {
                            details.cancel()
                            setBindingError(
                              'Use a different letter or number for each key.',
                            )
                          } else setBindingError('')
                        }}
                      />
                    </Field>
                  ))}
                </div>
                {bindingError && (
                  <p className="binding-error" role="alert">
                    {bindingError}
                  </p>
                )}
                <p className="control-help">
                  Hold Space for sustain. <kbd>{settingsShortcut.text}</kbd>{' '}
                  flips the piano. <kbd>{playbackShortcut.text}</kbd> plays or
                  pauses Listen / Challenge.
                </p>
              </section>
            </TabsPanel>
          </Tabs>
        </DialogContent>

        <div className="instrument-scroll" inert={piano.settings}>
          <div className="instrument-bed">
            <div className="note-space">
              <div className="screen-status">
                <div className="performance-hud">
                  {piano.mode === 'free' ? (
                    <>
                      <span
                        className="held-notes"
                        title={heldNotes || undefined}
                      >
                        {heldNotes || 'Keyboard & touch'}
                      </span>
                      <span>
                        {piano.active.size
                          ? `${piano.active.size} held`
                          : 'Ready to play'}
                      </span>
                    </>
                  ) : piano.mode === 'listen' ? (
                    <>
                      <div className="live-score">
                        <span>
                          <b>{Math.round(piano.track.bpm * piano.speed)}</b>BPM
                        </span>
                        <span>
                          <b>{piano.speed}×</b>speed
                        </span>
                      </div>
                      <span>
                        {
                          {
                            idle: 'Ready to listen',
                            running: 'Playing',
                            paused: 'Paused',
                            complete: 'Finished',
                          }[piano.phase]
                        }
                      </span>
                    </>
                  ) : (
                    <div className="live-score">
                      <span>
                        <b>{piano.result.points}</b>score
                      </span>
                      <span>
                        <b>{piano.result.combo}</b>combo
                      </span>
                      <span>
                        <b>{piano.result.accuracy}%</b>accuracy
                      </span>
                    </div>
                  )}
                </div>
                <div className="song-transport">
                  {piano.mode === 'free' ? (
                    <>
                      <span>Live input</span>
                      <div className="input-lights" aria-hidden="true">
                        {keys.map((key) => (
                          <span
                            key={key.midi}
                            data-active={
                              piano.active.has(key.midi) || undefined
                            }
                            data-black={key.black || undefined}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <span ref={clock}>0:00</span>
                      <div className="song-progress" aria-hidden="true">
                        <div ref={progress} />
                      </div>
                      <span>0:{Math.ceil(piano.track.duration)}</span>
                      {piano.phase === 'running' && (
                        <Button
                          ref={playbackButton}
                          className="transport-control"
                          onClick={piano.pause}
                          aria-keyshortcuts={playbackShortcut.ariaKeyshortcuts}
                          title={`Play / pause: ${playbackShortcut.text}`}
                        >
                          Pause
                        </Button>
                      )}
                      {piano.phase !== 'idle' && (
                        <Button
                          className="transport-control"
                          onClick={() => piano.start()}
                        >
                          Restart
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <canvas ref={canvas} className="note-canvas" aria-hidden="true" />
              {piano.mode !== 'free' && piano.phase !== 'running' && (
                <div
                  className="stage-message"
                  data-complete={piano.phase === 'complete' || undefined}
                >
                  <span className="stage-caption">
                    {piano.phase === 'complete'
                      ? 'Your performance'
                      : piano.phase === 'paused'
                        ? 'Paused'
                        : piano.mode === 'listen'
                          ? 'An original for this moment'
                          : 'Follow the falling light'}
                  </span>
                  <h2>
                    {piano.phase === 'complete'
                      ? 'A little music, made by you.'
                      : piano.track.title}
                  </h2>
                  {piano.phase === 'complete' && piano.mode === 'challenge' && (
                    <div className="final-score">
                      <span>
                        <b>{piano.result.points}</b>score
                      </span>
                      <span>
                        <b>{piano.result.accuracy}%</b>accuracy
                      </span>
                      <span>
                        <b data-testid="final-misses">{piano.result.misses}</b>
                        missed
                      </span>
                    </div>
                  )}
                  <Button
                    ref={playbackButton}
                    className="piano-primary"
                    onClick={play}
                    aria-keyshortcuts={playbackShortcut.ariaKeyshortcuts}
                    title={`Play / pause: ${playbackShortcut.text}`}
                  >
                    {piano.phase === 'complete'
                      ? 'Play again'
                      : piano.phase === 'paused'
                        ? 'Resume'
                        : piano.mode === 'listen'
                          ? `Listen to ${piano.track.title}`
                          : 'Start challenge'}
                  </Button>
                </div>
              )}
              {piano.phase === 'running' && piano.mode === 'challenge' && (
                <output className="hit-feedback" aria-live="off">
                  {piano.feedback}
                </output>
              )}
            </div>
            {!piano.settings && (
              <VolumeWheel value={piano.volume} onChange={piano.changeVolume} />
            )}
            <div className="piano-hardware">
              <div className="hardware-rail">
                <div className="instrument-brand">
                  <span>
                    plonko<span className="brand-period">.</span>
                  </span>
                  <small>a little room for noise</small>
                </div>
                <div className="speaker-grille" aria-hidden="true" />
                <div className="instrument-display" aria-live="off">
                  <span>{piano.track.title}</span>
                  <strong>
                    {piano.active.size > 3
                      ? `${piano.active.size} notes`
                      : piano.active.size
                        ? keys
                            .filter((key) => piano.active.has(key.midi))
                            .map((key) => key.name.replace(/\d/, ''))
                            .join(' ')
                        : 'hello :)'}
                  </strong>
                  <small>
                    {piano.active.size
                      ? 'sounds like you'
                      : 'touch a key. make a little noise.'}
                  </small>
                </div>
                <DialogTrigger
                  className="console-trigger"
                  aria-label="Piano settings"
                  shortcut="mod+,"
                  title={`Flip the piano: ${settingsShortcut.text}`}
                >
                  <span className="flip-mark" aria-hidden="true" />
                  <span>other side</span>
                </DialogTrigger>
              </div>
              <div className="hardware-controls">
                <SegmentedControl
                  aria-label="Instrument mode"
                  value={piano.mode}
                  onValueChange={piano.chooseMode}
                  className="hardware-modes play-modes"
                >
                  <SegmentedControlItem value="free">
                    <svg viewBox="0 0 256 256" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M215.38 14.54a12 12 0 0 0-10.29-2.18l-128 32A12 12 0 0 0 68 56v103.35A40 40 0 1 0 92 196V65.37l104-26v88A40 40 0 1 0 220 164V24a12 12 0 0 0-4.62-9.46M52 212a16 16 0 1 1 16-16a16 16 0 0 1-16 16m128-32a16 16 0 1 1 16-16a16 16 0 0 1-16 16"
                      />
                    </svg>
                    Free play
                  </SegmentedControlItem>
                  <SegmentedControlItem value="listen">
                    <svg viewBox="0 0 256 256" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M240 128a15.74 15.74 0 0 1-7.6 13.51L88.32 229.65a16 16 0 0 1-16.2.3A15.86 15.86 0 0 1 64 216.13V39.87a15.86 15.86 0 0 1 8.12-13.82a16 16 0 0 1 16.2.3l144.08 88.14A15.74 15.74 0 0 1 240 128"
                      />
                    </svg>
                    Listen
                  </SegmentedControlItem>
                  <SegmentedControlItem value="challenge">
                    <svg viewBox="0 0 256 256" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M229.26 90.4a108 108 0 0 1-177.63 114A108 108 0 0 1 195.41 43.63l20.1-20.11a12 12 0 0 1 17 17l-96 96a12 12 0 1 1-17-17l24-24a36 36 0 1 0 19.76 39.65a12 12 0 0 1 23.53 4.74a60 60 0 1 1-25.73-62l17.23-17.17a84 84 0 1 0 28.46 38a12 12 0 1 1 22.5-8.35Z"
                      />
                    </svg>
                    Challenge
                  </SegmentedControlItem>
                </SegmentedControl>
                <div className="hardware-buttons">
                  <div className="song-stepper">
                    <Button
                      className="hardware-button"
                      aria-label="Previous song"
                      onClick={() =>
                        piano.chooseTrack(
                          tracks[
                            (tracks.indexOf(piano.track) + tracks.length - 1) %
                              tracks.length
                          ].id,
                        )
                      }
                    >
                      ‹
                    </Button>
                    <Button
                      className="hardware-button"
                      aria-label="Next song"
                      onClick={() =>
                        piano.chooseTrack(
                          tracks[
                            (tracks.indexOf(piano.track) + 1) % tracks.length
                          ].id,
                        )
                      }
                    >
                      ›
                    </Button>
                  </div>
                  <Button
                    className="hardware-button sustain-button"
                    aria-label="Hold sustain"
                    aria-pressed={piano.sustain}
                    onClick={() => piano.changeSustain(!piano.sustain)}
                  >
                    <i aria-hidden="true" /> sustain
                  </Button>
                  <Button
                    className="hardware-button mute-button"
                    aria-label={
                      piano.muted ? 'Unmute instrument' : 'Mute instrument'
                    }
                    aria-pressed={piano.muted}
                    onClick={() => piano.changeMute(!piano.muted)}
                  >
                    {piano.muted ? 'muted' : 'sound'}
                  </Button>
                </div>
              </div>
              <div
                className="keyboard"
                data-labels={piano.labels || undefined}
                aria-label="Piano keyboard"
              >
                {keys.map((key, index) => (
                  <Button
                    key={key.midi}
                    className={`piano-key ${key.black ? 'black-key' : 'white-key'}`}
                    data-midi={key.midi}
                    data-active={piano.active.has(key.midi) || undefined}
                    style={{ left: `${key.position * 12.5}%` }}
                    aria-label={`Play ${key.name}`}
                    aria-keyshortcuts={piano.bindings[index]}
                    onPointerDown={(event) => {
                      if (event.button !== 0) return
                      event.preventDefault()
                      event.currentTarget.setPointerCapture(event.pointerId)
                      piano.noteDown(key.midi, `pointer:${event.pointerId}`)
                    }}
                    onPointerMove={drag}
                    onPointerUp={(event) =>
                      piano.noteUp(`pointer:${event.pointerId}`)
                    }
                    onPointerCancel={(event) =>
                      piano.noteUp(`pointer:${event.pointerId}`)
                    }
                    onLostPointerCapture={(event) =>
                      piano.noteUp(`pointer:${event.pointerId}`)
                    }
                    onContextMenu={(event) => event.preventDefault()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        event.stopPropagation()
                        piano.noteDown(key.midi, `focus:${key.midi}`)
                      }
                    }}
                    onKeyUp={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        event.stopPropagation()
                        piano.noteUp(`focus:${key.midi}`)
                      }
                    }}
                    onBlur={() => piano.noteUp(`focus:${key.midi}`)}
                    onClick={(event) => {
                      if (event.detail === 0) piano.tapNote(key.midi)
                    }}
                  >
                    <span className="key-note">{key.name}</span>
                    <kbd>{piano.bindings[index].toUpperCase()}</kbd>
                  </Button>
                ))}
              </div>
              <div className="hardware-lip" aria-hidden="true">
                <span>ouuo</span>
                <span>GP / 13</span>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
      {piano.error && (
        <div className="audio-error" role="alert">
          <p>{piano.error}</p>
          <Button className="text-control" onClick={piano.unlock}>
            Enable sound
          </Button>
        </div>
      )}
    </main>
  )
}
