import { StrictMode, useCallback, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createParts } from '@ui-sdk/react/primitive'
import { Switch, SwitchThumb } from '@ui-sdk/react/switch'
import '@ouuo/shared'
import '@ouuo/shared/base.css'
import { mechanicalKeyboard } from './mechanical-keyboard'
import { mountKeycap } from './keycap-scene'
import './keycap.css'

const { Root, Key } = createParts(mechanicalKeyboard, {
  root: 'div',
  key: 'button',
})

function KeycapStudy() {
  const [failure, setFailure] = useState(false)
  const pressFeedback = useRef<(() => void) | null>(null)

  const surface = useCallback((element: HTMLDivElement | null) => {
    if (!element) return
    const key = element.querySelector<HTMLButtonElement>('[data-code="KeyA"]')!
    const camera = element.querySelector<HTMLButtonElement>('[role="switch"]')!
    try {
      const scene = mountKeycap(element, key, camera, () => setFailure(true))
      pressFeedback.current = scene.press
      return () => {
        pressFeedback.current = null
        scene.dispose()
      }
    } catch (error) {
      console.warn('Keycap renderer unavailable', error)
      setFailure(true)
    }
  }, [])

  return (
    <main className="keycap-room" aria-label="WebGL keycap study">
      <Root
        codes={['KeyA']}
        onValueChange={(_, details) => {
          if (details.reason === 'key-press') pressFeedback.current?.()
        }}
        aria-label="Keycap study"
        className="keycap-study"
        ref={surface}
      >
        <Key
          value="KeyA"
          data-code="KeyA"
          className="keycap-target"
          aria-label="A key"
          aria-describedby="keycap-help"
        >
          <span className="keycap-fallback" aria-hidden="true">
            A
          </span>
        </Key>
        <Switch
          className="keycap-camera"
          aria-label="Perspective view"
          title="Perspective view"
        >
          <SwitchThumb />
        </Switch>
        <p id="keycap-help" className="keycap-sr-only">
          Hold A, click or touch to press. Enter or Space presses the focused
          key. The small switch changes the camera angle.
        </p>
        {failure ? (
          <p className="keycap-error" role="alert">
            WebGL is unavailable. The A key still responds, but 3D rendering
            needs a compatible browser.
          </p>
        ) : null}
      </Root>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KeycapStudy />
  </StrictMode>,
)
