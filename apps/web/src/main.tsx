import { Component, StrictMode, Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import '@ouuo/shared/base.css'
import App from './App'

const Piano = lazy(() => import('@ouuo/plonko'))
const Studio = lazy(() => import('@ouuo/tiny-studio'))
const Arcade = lazy(() => import('@ouuo/pocket-arcade'))
const path = window.location.pathname
  .replace(/\/$/, '')
  .replace(/^\/glass-piano$/, '/plonko')
const titles: Record<string, string> = {
  '/plonko': 'plonko · ouuo',
  '/tiny-studio': 'Tiny Studio · ouuo workshop',
  '/pocket-arcade': 'Pocket Arcade · ouuo workshop',
}
if (titles[path]) document.title = titles[path]

class ExhibitBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <main className="load-state">
        <h1>This room couldn’t load.</h1>
        <p>Check your connection and reload the page.</p>
        <a className="solid-link" href={window.location.pathname}>
          Reload this room
        </a>
      </main>
    ) : (
      this.props.children
    )
  }
}

const exhibit =
  path === '/plonko' ? (
    <Piano />
  ) : path === '/tiny-studio' ? (
    <Studio />
  ) : path === '/pocket-arcade' ? (
    <Arcade />
  ) : path === '' ? (
    <App />
  ) : (
    <main className="load-state">
      <h1>This room doesn’t exist.</h1>
      <a className="solid-link" href="/">
        Back to ouuo
      </a>
    </main>
  )

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ExhibitBoundary>
      <Suspense
        fallback={
          <main className="load-state">
            <output>Opening the room…</output>
          </main>
        }
      >
        {exhibit}
      </Suspense>
    </ExhibitBoundary>
  </StrictMode>,
)
