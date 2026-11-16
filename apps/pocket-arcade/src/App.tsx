import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { homeUrl } from '@ouuo/shared'
import { Button } from '@ui-sdk/react/button'
import { Radio, RadioGroup } from '@ui-sdk/react/radio'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from '@ui-sdk/react/dialog'
import {
  Slider,
  SliderControl,
  SliderTrack,
  SliderIndicator,
  SliderThumb,
} from '@ui-sdk/react/slider'
import { ArcadeAudio } from './audio'
import { ArcadeInput, isGameControl, keyMap } from './input'
import type { HardwareControl } from './input'
import { SCREEN_HEIGHT, SCREEN_WIDTH } from './game'
import type { Game, GameId, GameResult } from './game'
import { createRhythm } from './games/rhythm'
import { createRacer } from './games/racer'
import { createPuzzle } from './games/puzzle'
import './arcade.css'

type Screen =
  | 'off'
  | 'boot'
  | 'menu'
  | 'intro'
  | 'playing'
  | 'paused'
  | 'result'
  | 'shutdown'
const cartridges = [
  {
    id: 'rhythm',
    title: 'Rhythm Rush',
    genre: 'Find your flow',
    number: '01',
    controls: '← left lane · ↓ middle lane · A right lane',
    rules:
      'Catch 32 notes on the line. Within 60ms: 100 points. Within 150ms: 60 points. Find your flow through Sundown Circuit, an original 120 BPM tune.',
    factory: createRhythm,
  },
  {
    id: 'racer',
    title: 'Pixel Racer',
    genre: 'Chase the horizon',
    number: '02',
    controls: '← → steer · ↓ brake · A boost',
    rules:
      'Thread your way through traffic. Stay on the road, dodge every car, and see how far you can go. The longer you drive, the faster it gets.',
    factory: createRacer,
  },
  {
    id: 'puzzle',
    title: 'Mini Puzzle',
    genre: 'A little lightbulb moment',
    number: '03',
    controls: 'D-pad move · A flip · B undo',
    rules:
      'Light every tile. Flip a tile and its four neighbors with A. B undoes a move. Clear three little circuits, then try again in fewer moves.',
    factory: createPuzzle,
  },
] as const

function GameArtwork({
  id,
  thumbnail = false,
}: {
  id: GameId
  thumbnail?: boolean
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (!context) return
    context.imageSmoothingEnabled = false
    const cartridge = cartridges.find((item) => item.id === id)!
    context.save()
    const [x, y, width, height] =
      id === 'rhythm'
        ? thumbnail
          ? [148, 166, 240, 110]
          : [140, 62, 340, 214]
        : id === 'puzzle'
          ? [16, 78, 224, 202]
          : thumbnail
            ? [195, 209, 90, 65]
            : [80, 40, 320, 240]
    context.scale(480 / width, 320 / height)
    context.translate(-x, -y)
    cartridge.factory({ tone: () => {}, finish: () => {} }).draw(context, 3.5)
    context.restore()
  }, [id, thumbnail])
  return (
    <canvas
      ref={canvas}
      width={480}
      height={320}
      aria-hidden="true"
      className={`cartridge-art art-${id}`}
    />
  )
}

function SettingSlider({
  name,
  value,
  onChange,
  min = 0,
}: {
  name: string
  value: number
  onChange: (value: number) => void
  min?: number
}) {
  return (
    <div className="arcade-setting">
      <div>
        <span>{name}</span>
        <output>{value}%</output>
      </div>
      <Slider
        aria-label={name}
        value={value}
        min={min}
        max={100}
        step={1}
        onValueChange={(next, details) => {
          if (!Number.isFinite(next) || next < min || next > 100) {
            details.cancel()
            return
          }
          onChange(next)
        }}
      >
        <SliderControl>
          <SliderTrack>
            <SliderIndicator />
            <SliderThumb aria-label={name} />
          </SliderTrack>
        </SliderControl>
      </Slider>
    </div>
  )
}

function SettingsBody({ children }: { children: ReactNode }) {
  const body = useRef<HTMLElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const [scrollHint, setScrollHint] = useState('')

  useEffect(() => {
    const region = body.current!
    const update = () => {
      setScrollHint(
        region.scrollHeight <= region.clientHeight + 1
          ? ''
          : region.scrollTop + region.clientHeight >= region.scrollHeight - 1
            ? '↑ Sound settings'
            : '↓ More settings',
      )
    }
    const observer = new ResizeObserver(update)
    observer.observe(region)
    observer.observe(content.current!)
    region.addEventListener('scroll', update, { passive: true })
    update()
    return () => {
      observer.disconnect()
      region.removeEventListener('scroll', update)
    }
  }, [])

  return (
    <>
      <section
        className="settings-body"
        ref={body}
        aria-label="Sound and keyboard settings"
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard users need to scroll the noninteractive key guide.
        tabIndex={0}
      >
        <div ref={content}>{children}</div>
      </section>
      <div className="settings-scroll-hint">{scrollHint}</div>
    </>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('off')
  const [selected, setSelected] = useState<GameId>('rhythm')
  const [settings, setSettings] = useState(false)
  const [volume, setVolume] = useState(45)
  const [brightness, setBrightness] = useState(100)
  const [result, setResult] = useState<GameResult | null>(null)
  const [audioProblem, setAudioProblem] = useState(false)
  const [, refreshInput] = useState(0)
  const [audio] = useState(() => new ArcadeAudio())
  const [input] = useState(() => new ArcadeInput())
  const canvas = useRef<HTMLCanvasElement>(null)
  const display = useRef<HTMLDivElement>(null)
  const game = useRef<Game | null>(null)
  const elapsed = useRef(0)
  const anchor = useRef(0)
  const clock = useRef(() => performance.now() / 1000)
  const cartridge = cartridges.find((item) => item.id === selected)!
  const powered = screen !== 'off' && screen !== 'shutdown'
  const live = powered && screen !== 'boot'

  function available(control: HardwareControl) {
    if (!live) return false
    if (settings) return ['select', 'start', 'b'].includes(control)
    if (control === 'select' || control === 'start') return true
    if (control === 'l' || control === 'r') return screen === 'menu'
    if (control === 'a') return true
    if (control === 'b')
      return screen === 'playing' ? selected === 'puzzle' : screen !== 'menu'
    if (screen === 'menu') return true
    if (screen !== 'playing') return false
    if (selected === 'rhythm') return control === 'left' || control === 'down'
    if (selected === 'racer') return control !== 'up'
    return true
  }

  function clearInput() {
    input.clear()
    refreshInput((value) => value + 1)
  }
  function silence() {
    clearInput()
    audio.stop()
  }
  function unlock() {
    audio
      .unlock()
      .then(() => setAudioProblem(false))
      .catch(() => setAudioProblem(true))
  }
  function pause() {
    if (screen !== 'playing') return
    elapsed.current = Math.max(
      elapsed.current,
      clock.current() - anchor.current,
    )
    game.current?.pause?.(elapsed.current)
    silence()
    setScreen('paused')
  }
  function library() {
    silence()
    game.current = null
    setScreen('menu')
  }
  function begin() {
    silence()
    elapsed.current = 0
    clock.current = audio.clock()
    game.current = cartridge.factory({
      tone: audio.tone,
      finish: (next) => {
        audio.stop()
        clearInput()
        setResult(next)
        setScreen('result')
      },
    })
    setResult(null)
    setScreen('playing')
  }
  function power() {
    silence()
    setSettings(false)
    game.current = null
    if (screen === 'off') {
      unlock()
      setScreen('boot')
    } else if (screen !== 'shutdown') {
      audio.tone(392, 0.1)
      audio.tone(196, 0.18, 0.1)
      setScreen('shutdown')
    }
  }
  function choose(direction: number) {
    const index = cartridges.findIndex((item) => item.id === selected)
    setSelected(
      cartridges[(index + direction + cartridges.length) % cartridges.length]!
        .id,
    )
    audio.tone(330 + index * 55, 0.045)
  }
  function activate(control: HardwareControl) {
    if (!live) return
    if (settings) {
      if (control === 'select' || control === 'b' || control === 'start')
        setSettings(false)
      return
    }
    if (control === 'select') {
      pause()
      setSettings(true)
      return
    }
    if (control === 'start') {
      if (screen === 'playing') pause()
      else if (screen === 'paused') setScreen('playing')
      else if (screen === 'menu') setScreen('intro')
      else if (screen === 'intro' || screen === 'result') begin()
      return
    }
    if (screen === 'menu') {
      if (['up', 'left', 'l'].includes(control)) choose(-1)
      else if (['down', 'right', 'r'].includes(control)) choose(1)
      else if (control === 'a') setScreen('intro')
    } else if (screen === 'playing' && isGameControl(control)) {
      game.current?.press(
        control,
        Math.max(elapsed.current, clock.current() - anchor.current),
      )
    } else if (control === 'b') library()
    else if (control === 'a' && (screen === 'intro' || screen === 'result'))
      begin()
    else if (control === 'a' && screen === 'paused') setScreen('playing')
  }
  function press(source: string, control: HardwareControl) {
    if (!available(control)) return
    if (input.press(source, control)) {
      if (screen !== 'playing') audio.tone(control === 'a' ? 523 : 262, 0.035)
      activate(control)
    }
    refreshInput((value) => value + 1)
  }
  function release(source: string) {
    input.release(source)
    refreshInput((value) => value + 1)
  }

  useEffect(() => {
    audio.setVolume(volume)
  }, [audio, volume])

  useEffect(
    () => () => {
      input.clear()
      audio.dispose()
    },
    [audio, input],
  )

  useEffect(() => {
    if (screen !== 'boot' && screen !== 'shutdown') return
    const timer = window.setTimeout(
      () => {
        if (screen === 'boot') {
          audio.tone(262, 0.12)
          audio.tone(392, 0.12, 0.12)
          audio.tone(523, 0.25, 0.24)
          setScreen('menu')
        } else {
          audio.stop()
          setScreen('off')
        }
      },
      screen === 'boot' ? 900 : 350,
    )
    return () => window.clearTimeout(timer)
  }, [audio, screen])

  useEffect(() => {
    const root = display.current
    if (screen === 'playing') canvas.current?.focus({ preventScroll: true })
    else if (screen === 'menu')
      root
        ?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')
        ?.focus({ preventScroll: true })
    else if (['intro', 'paused', 'result'].includes(screen))
      root?.querySelector<HTMLElement>('.screen-primary')?.focus()
  }, [screen])

  useEffect(() => {
    const group = display.current?.querySelector('[role="radiogroup"]')
    if (group?.contains(document.activeElement))
      group
        .querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')
        ?.focus({ preventScroll: true })
  }, [selected])

  useEffect(() => {
    const surface = canvas.current
    const context = surface?.getContext('2d')
    if (screen !== 'playing' || !surface || !context || !game.current) return
    const activeGame = game.current
    const resize = (width: number, height: number) => {
      if (width === 0) return
      const nextHeight = Math.max(
        SCREEN_HEIGHT,
        Math.round((SCREEN_WIDTH * height) / width),
      )
      if (surface.height !== nextHeight) surface.height = nextHeight
      context.imageSmoothingEnabled = false
    }
    resize(surface.clientWidth, surface.clientHeight)
    const observer = new ResizeObserver(([entry]) => {
      resize(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(surface)
    anchor.current = clock.current() - elapsed.current
    let previous = elapsed.current
    let frame = 0
    context.imageSmoothingEnabled = false
    const draw = () => {
      elapsed.current = Math.max(previous, clock.current() - anchor.current)
      activeGame.update(elapsed.current - previous, input.held, elapsed.current)
      activeGame.draw(context, elapsed.current)
      previous = elapsed.current
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [screen, input])

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.isComposing ||
        settings
      )
        return
      const target = event.target instanceof Element ? event.target : null
      if (
        target?.closest('input, select, textarea, [role="slider"]') &&
        event.code !== 'Escape' &&
        event.code !== 'Enter'
      )
        return
      if (
        target?.closest('button, a') &&
        (event.code === 'Enter' || event.code === 'Space')
      )
        return
      const control = keyMap[event.code]
      if (!control || !live) return
      event.preventDefault()
      if (!event.repeat) press(`key:${event.code}`, control)
    }
    const up = (event: KeyboardEvent) => {
      if (keyMap[event.code]) release(`key:${event.code}`)
    }
    const blur = () => {
      clearInput()
      pause()
    }
    const hidden = () => {
      if (document.hidden) blur()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', hidden)
    }
  })

  function hardware(
    control: HardwareControl,
    label: string,
    children: ReactNode,
    className = '',
  ) {
    return (
      <button
        type="button"
        className={`hardware-key ${className}`}
        aria-label={label}
        disabled={!available(control)}
        title={
          available(control) ? label : `${label}: unavailable on this screen`
        }
        data-held={input.active(control) ? '' : undefined}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.preventDefault()
          event.currentTarget.setPointerCapture(event.pointerId)
          press(`pointer:${event.pointerId}`, control)
        }}
        onPointerUp={(event) => release(`pointer:${event.pointerId}`)}
        onPointerCancel={(event) => release(`pointer:${event.pointerId}`)}
        onLostPointerCapture={(event) => release(`pointer:${event.pointerId}`)}
        onClick={(event) => {
          if (event.detail === 0) {
            press('virtual', control)
            release('virtual')
          }
        }}
      >
        {children}
      </button>
    )
  }

  return (
    <main className="arcade-page" id="arcade" aria-label="Pocket Arcade">
      <h1 className="sr-only">Pocket Arcade</h1>
      <div className="console" data-powered={powered}>
        <div className="console-top">
          {hardware(
            'l',
            'Previous cartridge (L)',
            <>
              <i className="shoulder-cap" aria-hidden="true" />
              <span>L</span>
            </>,
            'shoulder shoulder-left',
          )}
          <div className="cartridge-slot" aria-hidden="true">
            <i />
          </div>
          {hardware(
            'r',
            'Next cartridge (R)',
            <>
              <i className="shoulder-cap" aria-hidden="true" />
              <span>R</span>
            </>,
            'shoulder shoulder-right',
          )}
        </div>
        <div className="console-face">
          <div className="left-controls">
            <Button
              className="power-switch"
              aria-label={powered ? 'Power off' : 'Power on'}
              onClick={power}
              disabled={screen === 'shutdown'}
            >
              <span className="power-track">
                <i />
              </span>
              <span>power</span>
            </Button>
            <div className="dpad-well">
              <div className="dpad">
                {hardware(
                  'up',
                  'D-pad up',
                  <span aria-hidden="true">▲</span>,
                  'dpad-up',
                )}
                {hardware(
                  'left',
                  'D-pad left',
                  <span aria-hidden="true">◀</span>,
                  'dpad-left',
                )}
                <span className="dpad-center" aria-hidden="true">
                  <i />
                </span>
                {hardware(
                  'right',
                  'D-pad right',
                  <span aria-hidden="true">▶</span>,
                  'dpad-right',
                )}
                {hardware(
                  'down',
                  'D-pad down',
                  <span aria-hidden="true">▼</span>,
                  'dpad-down',
                )}
              </div>
            </div>
            <div className="speaker speaker-left" aria-hidden="true">
              {Array.from({ length: 18 }, (_, index) => (
                <i key={index} />
              ))}
            </div>
          </div>
          <div className="screen-column">
            <div className="screen-bezel">
              <div
                className="screen-glass"
                ref={display}
                style={
                  { '--screen-brightness': brightness / 100 } as CSSProperties
                }
                data-screen={screen}
              >
                {screen === 'off' || screen === 'shutdown' ? (
                  <div className="screen-off">
                    <div className="idle-status">
                      <span>pocket arcade</span>
                      <span>
                        {screen === 'shutdown' ? 'powering down' : 'standby'}
                      </span>
                    </div>
                    <div className="idle-message">
                      <span className="off-mark" aria-hidden="true">
                        p.
                      </span>
                      <p>
                        {screen === 'shutdown' ? (
                          'See you in a little bit.'
                        ) : (
                          <>
                            A little time <strong>for play.</strong>
                          </>
                        )}
                      </p>
                    </div>
                    <span className="idle-prompt">
                      <i className="idle-switch" aria-hidden="true" />
                      {screen === 'off'
                        ? 'Slide power to play'
                        : 'Goodbye for now'}
                    </span>
                  </div>
                ) : screen === 'boot' ? (
                  <output
                    className="boot-screen"
                    aria-label="Starting Pocket Arcade"
                  >
                    <span className="idle-status">
                      <span>pocket os 1.0</span>
                      <span>starting</span>
                    </span>
                    <span className="boot-identity">
                      <span>ouuo</span>
                      <span className="boot-tagline">
                        small console. big daydreams.
                      </span>
                    </span>
                    <span className="boot-cartridges" aria-hidden="true">
                      {cartridges.map((item) => (
                        <span key={item.id}>{item.number}</span>
                      ))}
                    </span>
                  </output>
                ) : (
                  <>
                    <div className="screen-status">
                      <span>
                        pocket os <b>1.0</b>
                      </span>
                      <span>
                        {audioProblem
                          ? 'audio unavailable · see settings'
                          : volume === 0
                            ? 'sound off'
                            : 'sound on'}
                      </span>
                    </div>
                    {screen === 'menu' ? (
                      <div className="library-screen">
                        <div className="library-top">
                          <h2>Game library</h2>
                          <div className="library-position">
                            <span>
                              {cartridge.number} /{' '}
                              {String(cartridges.length).padStart(2, '0')}
                            </span>
                            <span className="library-slots" aria-hidden="true">
                              {cartridges.map((item) => (
                                <i
                                  key={item.id}
                                  data-selected={
                                    item.id === selected || undefined
                                  }
                                />
                              ))}
                            </span>
                          </div>
                        </div>
                        <div className="library-body">
                          <RadioGroup
                            aria-label="Game library"
                            value={selected}
                            onValueChange={(value, details) => {
                              if (
                                !cartridges.some((item) => item.id === value)
                              ) {
                                details.cancel()
                                return
                              }
                              setSelected(value as GameId)
                              audio.tone(392, 0.04)
                            }}
                          >
                            {cartridges.map((item) => (
                              <Radio
                                key={item.id}
                                value={item.id}
                                aria-label={item.title}
                                className={`game-choice choice-${item.id}`}
                              >
                                <span
                                  className="choice-number"
                                  aria-hidden="true"
                                >
                                  {item.number}
                                </span>
                                <span
                                  className="cartridge-icon"
                                  aria-hidden="true"
                                >
                                  <GameArtwork id={item.id} thumbnail />
                                </span>
                                <span className="choice-copy">
                                  <strong>{item.title}</strong>
                                  <small>{item.genre}</small>
                                </span>
                                <span
                                  className="choice-cursor"
                                  aria-hidden="true"
                                />
                              </Radio>
                            ))}
                          </RadioGroup>
                          <div className="library-preview">
                            <GameArtwork id={selected} />
                            <span>
                              <small>Cartridge {cartridge.number}</small>
                              <strong>{cartridge.title}</strong>
                            </span>
                          </div>
                        </div>
                        <div className="library-bottom">
                          <span>
                            <b>L</b> <b>R</b> switch cartridge
                          </span>
                          <Button
                            className="screen-primary"
                            onClick={() => setScreen('intro')}
                            aria-label={`Let’s play ${cartridge.title}`}
                          >
                            <b>A</b> Let’s play
                          </Button>
                        </div>
                      </div>
                    ) : screen === 'playing' ? (
                      <canvas
                        ref={canvas}
                        width={SCREEN_WIDTH}
                        height={SCREEN_HEIGHT}
                        className="game-canvas"
                        tabIndex={0}
                        aria-label={`${cartridge.title} game screen`}
                        aria-describedby="game-instructions"
                      >
                        Your browser needs Canvas to play. Use a current
                        browser.
                      </canvas>
                    ) : (
                      <div className={`game-overlay overlay-${screen}`}>
                        <div className="overlay-content">
                          <span className="overlay-kicker">
                            {screen === 'intro'
                              ? `Cartridge ${cartridge.number}`
                              : cartridge.title}
                          </span>
                          <h2>
                            {screen === 'intro'
                              ? cartridge.title
                              : screen === 'paused'
                                ? 'Paused'
                                : result?.title}
                          </h2>
                          <p>
                            {screen === 'intro'
                              ? cartridge.rules
                              : screen === 'paused'
                                ? 'Take your time. Your game will be right here.'
                                : result?.detail}
                          </p>
                          {screen === 'result' && (
                            <strong className="final-score">
                              {result?.score.toLocaleString()}{' '}
                              <small>points</small>
                            </strong>
                          )}
                          {screen === 'intro' && (
                            <span className="intro-controls">
                              {cartridge.controls
                                .split(' · ')
                                .map((control) => (
                                  <span key={control}>{control}</span>
                                ))}
                            </span>
                          )}
                          <div className="overlay-actions">
                            <Button
                              className="screen-primary"
                              onClick={
                                screen === 'paused'
                                  ? () => setScreen('playing')
                                  : begin
                              }
                              aria-label={
                                screen === 'paused'
                                  ? 'Keep playing'
                                  : screen === 'intro'
                                    ? 'Begin game'
                                    : 'Play again'
                              }
                            >
                              <b>A</b>{' '}
                              {screen === 'paused'
                                ? 'Keep playing'
                                : screen === 'intro'
                                  ? 'Begin game'
                                  : 'Play again'}
                            </Button>
                            {screen === 'paused' && (
                              <Button onClick={begin} aria-label="Restart game">
                                Restart
                              </Button>
                            )}
                            <Button
                              onClick={library}
                              aria-label="Return to library"
                            >
                              <b aria-hidden="true">B</b> Library
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <Dialog
                  open={settings && live}
                  onOpenChange={(open) => {
                    if (open) pause()
                    setSettings(open)
                  }}
                  modal={false}
                >
                  <DialogTrigger
                    className="screen-settings"
                    aria-label="Console settings"
                    disabled={!live}
                  >
                    <b aria-hidden="true">select</b> Settings
                  </DialogTrigger>
                  <DialogContent
                    className="console-settings"
                    finalFocus={() =>
                      display.current?.querySelector<HTMLElement>(
                        '.screen-settings',
                      ) ?? null
                    }
                  >
                    <div className="settings-header">
                      <div className="settings-title">
                        <DialogTitle>Console settings</DialogTitle>
                        <DialogClose aria-label="Close settings">×</DialogClose>
                      </div>
                      <DialogDescription>
                        Make yourself comfortable.
                      </DialogDescription>
                    </div>
                    <SettingsBody>
                      <SettingSlider
                        name="Volume"
                        value={volume}
                        onChange={setVolume}
                      />
                      <SettingSlider
                        name="Brightness"
                        value={brightness}
                        onChange={setBrightness}
                        min={40}
                      />
                      <p>Visit-only settings. Nothing saved.</p>
                      <dl className="settings-bindings">
                        <div>
                          <dt>Move</dt>
                          <dd>
                            <kbd>↑ ↓ ← →</kbd>
                          </dd>
                        </div>
                        <div>
                          <dt>A / B</dt>
                          <dd>
                            <kbd>Z / Space</kbd>
                            <span>/</span>
                            <kbd>X</kbd>
                          </dd>
                        </div>
                        <div>
                          <dt>Pause</dt>
                          <dd>
                            <kbd>Enter / Esc</kbd>
                          </dd>
                        </div>
                        <div>
                          <dt>Settings</dt>
                          <dd>
                            <kbd>Shift</kbd>
                          </dd>
                        </div>
                        <div>
                          <dt>Cartridge</dt>
                          <dd>
                            <kbd>Q / E</kbd>
                          </dd>
                        </div>
                      </dl>
                      {audioProblem && (
                        <Button className="screen-secondary" onClick={unlock}>
                          Retry audio
                        </Button>
                      )}
                    </SettingsBody>
                    <div className="settings-footer">
                      <DialogClose className="screen-primary">
                        Back to console
                      </DialogClose>
                      <a className="console-home" href={homeUrl}>
                        Back to ouuo
                      </a>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <span className="bezel-label">
                pocket arcade <i /> color system
              </span>
            </div>
            <div className="system-keys">
              {hardware(
                'select',
                'Select / settings',
                <>
                  <i />
                  <span>select</span>
                </>,
                'system-key',
              )}
              {hardware(
                'start',
                'Start / pause',
                <>
                  <i />
                  <span>start</span>
                </>,
                'system-key',
              )}
            </div>
          </div>
          <div className="right-controls">
            <span className="power-light">
              <i /> <span>on</span>
            </span>
            <div className="action-keys">
              {hardware('a', 'A button', <span>A</span>, 'action-a')}
              {hardware('b', 'B button', <span>B</span>, 'action-b')}
            </div>
            <div className="speaker" aria-hidden="true">
              {Array.from({ length: 18 }, (_, index) => (
                <i key={index} />
              ))}
            </div>
          </div>
          <span className="shell-wordmark" aria-hidden="true">
            ouuo
          </span>
          <span className="shell-model" aria-hidden="true">
            PA–03
          </span>
        </div>
      </div>
      <p id="game-instructions" className="sr-only">
        {cartridge.title}. {cartridge.rules} {cartridge.controls}. Z or Space is
        A. X is B. Enter or Escape pauses. Shift opens settings. Q and E select
        the previous and next cartridge in the library.
      </p>
    </main>
  )
}
