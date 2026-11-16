import { createAgent } from '@ui-sdk/react/agent'

export const homeUrl = import.meta.env.VITE_HOME_URL || '/'

export function Brand() {
  return (
    <a className="brand" href={homeUrl} aria-label="ouuo home">
      <span className="brand-symbol" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      ouuo
    </a>
  )
}

export const agent = createAgent()

declare global {
  interface Window {
    ouuoAgent: typeof agent
  }
}

if (typeof window !== 'undefined') window.ouuoAgent = agent

export function Workshop({
  title,
  description,
  features,
}: {
  title: string
  description: string
  features: { name: string; detail: string }[]
}) {
  return (
    <div className="workshop">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header>
        <Brand />
        <span>From the ouuo workshop</span>
      </header>
      <main id="main">
        <p className="workshop-status">In development · Not playable yet</p>
        <h1>{title}</h1>
        <p className="workshop-description">{description}</p>
        <div className="workshop-list">
          {features.map((feature) => (
            <section key={feature.name}>
              <h2>{feature.name}</h2>
              <p>{feature.detail}</p>
            </section>
          ))}
        </div>
        <a className="solid-link" href={homeUrl}>
          Back to ouuo
        </a>
        <p>
          This is a project entrance, not a finished exhibit. No pretend
          controls.
        </p>
      </main>
    </div>
  )
}
