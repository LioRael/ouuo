'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react'
import '@ouuo/shared'
import { bindDrag } from '@ui-sdk/core'
import { createParts } from '@ui-sdk/react/primitive'
import {
  createSliderController,
  Slider,
  SliderControl,
  SliderThumb,
  SliderTrack,
} from '@ui-sdk/react/slider'
import { Switch, SwitchThumb } from '@ui-sdk/react/switch'
import { mechanicalKeyboard } from './mechanical-keyboard'
import { keyboardRows, keyByCode } from './layout'
import { mountKeyboard } from './keycap-scene'
import './keyboard.css'

const SOUND_GAIN = 0.15

const { Root: KeyboardRoot, Key: KeyboardKey } = createParts(
  mechanicalKeyboard,
  { root: 'div', key: 'button' },
)

function ViewWheel({
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
    const startY = event.clientY
    controller.focus()
    setScrubbing(true)
    const stop = bindDrag(event.currentTarget, event.nativeEvent, {
      cancelOnEscape: true,
      onMove: ({ y, event }) => {
        controller.setValue(initial + (startY - y) / 3, {
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
    <Slider
      className="keyboard-angle"
      aria-label="Viewing angle"
      controller={controller}
      min={0}
      max={44}
      orientation="vertical"
      value={value}
      onValueChange={onChange}
      format={(angle) => (angle === 0 ? 'Flat' : `${angle} degrees`)}
      data-scrubbing={scrubbing || undefined}
    >
      <SliderControl
        title="Viewing angle: roll up or down"
        onPointerDown={scrub}
      >
        <SliderTrack>
          <SliderThumb aria-label="Viewing angle" />
        </SliderTrack>
      </SliderControl>
      <span className="keyboard-control-hint" aria-hidden="true">
        {value === 0 ? 'Flat' : `${value}°`}
      </span>
    </Slider>
  )
}

export default function App() {
  const [sound, setSound] = useState(true)
  const [backlight, setBacklight] = useState(true)
  const [angle, setAngle] = useState(0)
  const [audioError, setAudioError] = useState(false)
  const [renderError, setRenderError] = useState(false)
  const audio = useRef<{ context: AudioContext; output: GainNode } | null>(null)
  const pressFeedback = useRef<((code: string) => void) | null>(null)
  const surface = useCallback((element: HTMLDivElement | null) => {
    if (!element) return
    try {
      const scene = mountKeyboard(element, () => setRenderError(true))
      pressFeedback.current = scene.press
      return () => {
        pressFeedback.current = null
        scene.dispose()
      }
    } catch (error) {
      console.warn('Keyboard renderer unavailable', error)
      setRenderError(true)
    }
  }, [])

  useEffect(
    () => () => {
      void audio.current?.context.close().catch((error: unknown) => {
        console.warn('Could not close keyboard audio', error)
      })
    },
    [],
  )

  const changeSound = (value: boolean) => {
    setSound(value)
    setAudioError(false)
    if (audio.current) {
      const { context, output } = audio.current
      output.gain.setValueAtTime(value ? SOUND_GAIN : 0, context.currentTime)
    }
  }

  const soundUnavailable = () => {
    changeSound(false)
    setAudioError(true)
  }

  const clickSound = (code: string) => {
    try {
      if (!audio.current) {
        const context = new AudioContext()
        const output = context.createGain()
        output.gain.value = SOUND_GAIN
        const limiter = context.createWaveShaper()
        limiter.curve = Float32Array.from(
          { length: 2049 },
          (_, i) => 0.9 * Math.tanh((i / 1024 - 1) * 1.7),
        )
        limiter.oversample = '2x'
        output.connect(limiter).connect(context.destination)
        audio.current = { context, output }
      }
      const { context, output } = audio.current
      if (context.state === 'suspended')
        void context.resume().catch(soundUnavailable)
      const key = keyByCode.get(code)!
      const pitch = (235 + key.center * 1.8 + key.row * 3) / key.units ** 0.22
      const buffer = context.createBuffer(
        1,
        Math.ceil(context.sampleRate * 0.09),
        context.sampleRate,
      )
      const samples = buffer.getChannelData(0)
      let lowNoise = 0
      let contactNoise = 0
      const bodySmoothing =
        1 - Math.exp((-2 * Math.PI * 900) / context.sampleRate)
      const contactSmoothing =
        1 - Math.exp((-2 * Math.PI * 4800) / context.sampleRate)
      for (let i = 0; i < samples.length; i++) {
        const time = i / context.sampleRate
        const noise = Math.random() * 2 - 1
        lowNoise += (noise - lowNoise) * bodySmoothing
        contactNoise += (noise - contactNoise) * contactSmoothing
        const impact = (contactNoise - lowNoise) * 0.9 * Math.exp(-time / 0.002)
        const body =
          (Math.sin(time * Math.PI * 2 * pitch) * 0.5 + lowNoise * 0.7) *
            Math.exp(-time / (0.009 + key.units * 0.001)) +
          Math.sin(time * Math.PI * 2 * pitch * 2.71) *
            0.24 *
            Math.exp(-time / 0.0045) +
          Math.sin(time * Math.PI * 2 * pitch * 4.13) *
            0.1 *
            Math.exp(-time / 0.002)
        const stabilizer =
          key.units >= 2 ? lowNoise * 0.22 * Math.exp(-time / 0.012) : 0
        samples[i] =
          (impact + body + stabilizer) *
          Math.min(1, time / 0.00035, (0.09 - time) / 0.008)
      }
      const source = context.createBufferSource()
      const filter = context.createBiquadFilter()
      source.buffer = buffer
      source.playbackRate.value = 0.98 + Math.random() * 0.04
      filter.type = 'lowpass'
      filter.frequency.value = 5200
      filter.Q.value = 0.7
      source.connect(filter).connect(output)
      source.onended = () => {
        source.disconnect()
        filter.disconnect()
      }
      source.start()
    } catch {
      soundUnavailable()
    }
  }

  return (
    <main
      className="keyboard-room"
      aria-label="Mechanical Keyboard"
      data-backlight={backlight}
      data-view={angle === 0 ? 'flat' : 'perspective'}
      data-angle={angle}
      data-sound={sound}
      style={{ '--keyboard-angle': `${angle * 0.64}deg` } as CSSProperties}
    >
      <h1 className="keyboard-sr-only">Mechanical Keyboard</h1>
      <p id="keyboard-help" className="keyboard-sr-only">
        Type, click or tap the keys. Drag with a mouse to play across keys.
        Swipe horizontally to reach every key on a small screen. Tab to enter,
        arrows to move, Enter or Space to press. The orange dial toggles the
        backlight. Roll the right-side wheel up or down to change the viewing
        angle, or focus it and use the arrow keys, Home and End. The left-side
        switch turns key sound on and off.
      </p>
      {renderError ? (
        <output className="keyboard-sr-only">
          WebGL is unavailable. The keyboard is still playable in the simplified
          view.
        </output>
      ) : null}
      <KeyboardRoot
        id="keyboard"
        className="keyboard-instrument"
        aria-label="Mechanical keyboard"
        aria-describedby="keyboard-help"
        onValueChange={(value, details) => {
          if (details.reason === 'key-press') {
            const code = value.at(-1)
            if (code) {
              pressFeedback.current?.(code)
              if (sound && details.event?.isTrusted) clickSound(code)
            }
          }
        }}
      >
        <section
          className="keyboard-scroll"
          tabIndex={-1}
          aria-label="Keyboard surface"
        >
          <div className="keyboard-stage">
            <div className="keyboard-case" ref={surface}>
              <div
                className="keyboard-light keyboard-light-left"
                aria-hidden="true"
              />
              <div
                className="keyboard-light keyboard-light-right"
                aria-hidden="true"
              />
              <div className="keyboard-deck">
                {keyboardRows.map((row) => (
                  <div className="keyboard-row" key={row[0].code}>
                    {row.map((key) => (
                      <KeyboardKey
                        value={key.code}
                        key={key.code}
                        aria-label={`${key.label} key`}
                        className="mechanical-key"
                        data-accent={key.accent || undefined}
                        data-code={key.code}
                        data-function={key.row === 0 || undefined}
                        data-wide={key.units > 1 || undefined}
                        style={{ '--key-units': key.units } as CSSProperties}
                      >
                        <span className="key-face" aria-hidden="true">
                          {key.icon ? (
                            <svg
                              className="key-legend key-icon"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d={key.icon} />
                            </svg>
                          ) : null}
                          {key.legend ? (
                            <span className="key-legend">{key.legend}</span>
                          ) : null}
                          <span className="key-label">
                            {key.code === 'Space' ? 'o u u o' : key.label}
                          </span>
                          {key.code === 'KeyF' || key.code === 'KeyJ' ? (
                            <i className="key-homing" />
                          ) : null}
                        </span>
                      </KeyboardKey>
                    ))}
                    {row[0].code === 'Escape' ? (
                      <Switch
                        className="keyboard-knob"
                        aria-label="Backlight"
                        checked={backlight}
                        onCheckedChange={setBacklight}
                      >
                        <span aria-hidden="true" />
                      </Switch>
                    ) : null}
                  </div>
                ))}
              </div>
              <ViewWheel value={angle} onChange={setAngle} />
              <Switch
                className="keyboard-sound"
                aria-label="Key sound"
                aria-describedby={
                  audioError ? 'keyboard-sound-error' : undefined
                }
                title={
                  audioError
                    ? 'Sound unavailable. Switch on to retry.'
                    : 'Key sound'
                }
                checked={sound}
                onCheckedChange={changeSound}
              >
                <SwitchThumb />
                <span className="keyboard-control-hint" aria-hidden="true">
                  {audioError
                    ? 'Sound unavailable'
                    : sound
                      ? 'Sound on'
                      : 'Muted'}
                </span>
              </Switch>
              {audioError ? (
                <span
                  id="keyboard-sound-error"
                  className="keyboard-sr-only"
                  role="alert"
                >
                  Sound unavailable. Try switching it on again.
                </span>
              ) : null}
            </div>
          </div>
        </section>
      </KeyboardRoot>
    </main>
  )
}
