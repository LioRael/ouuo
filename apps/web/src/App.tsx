import { Brand } from '@ouuo/shared'
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
import './home.css'

const blackKeyPositions = [1, 2, 4, 5, 6, 8, 9, 11, 12, 13]

export default function App() {
  return (
    <div className="gallery">
      <a className="skip-link" href="#collection">
        Skip to collection
      </a>
      <header className="gallery-header">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#collection">The collection</a>
          <Dialog>
            <DialogTrigger className="quiet-button">
              About this room
            </DialogTrigger>
            <DialogBackdrop className="modal-backdrop" />
            <DialogContent className="room-dialog">
              <DialogTitle>A little room for playing.</DialogTitle>
              <DialogDescription>
                ouuo is an open-source collection of interactive digital
                objects. Made for curiosity, not productivity.
              </DialogDescription>
              <p>
                No account. No tracking. Sound starts only when you choose to
                play. The instruments run locally in your browser.
              </p>
              <p>
                Built with React, Web Audio and{' '}
                <a
                  className="text-link"
                  href="https://ui-sdk.dev"
                  target="_blank"
                  rel="noreferrer"
                >
                  Vercel UI SDK
                </a>
                . Original code and music are MIT licensed.
              </p>
              <DialogClose className="solid-link">Back to playing</DialogClose>
            </DialogContent>
          </Dialog>
        </nav>
      </header>

      <main>
        <section className="gallery-intro" aria-labelledby="gallery-title">
          <div className="wordmark-wrap">
            <h1 id="gallery-title">
              ouuo<span className="wordmark-period">.</span>
            </h1>
            <span className="edition-note">
              Digital objects.
              <br />
              Human curiosity.
            </span>
          </div>
          <div className="intro-bottom">
            <p>
              Beautiful interfaces
              <br />
              should be playable.
            </p>
            <p>
              A collection of little things
              <br />
              worth losing a little time to.
            </p>
            <a
              className="collection-jump"
              href="#collection"
              aria-label="Scroll to the collection"
            >
              ↓
            </a>
          </div>
        </section>

        <section
          id="collection"
          className="collection"
          aria-label="The collection"
        >
          <div className="collection-heading">
            <span>The collection</span>
            <span>Take your time. Make some noise.</span>
          </div>
          <a className="piano-exhibit" href="/plonko/" aria-label="Play plonko">
            <div className="exhibit-art" aria-hidden="true">
              <div className="exhibit-art-label">A study in sound & light</div>
              <div className="sculpture-shadow" />
              <div className="piano-sculpture">
                <div className="sculpture-top">
                  <span>plonko.</span>
                  <span>ouuo instruments</span>
                  <span className="sculpture-led" />
                </div>
                <div className="sculpture-keys">
                  {Array.from({ length: 15 }, (_, index) => (
                    <i key={`white-${index}`} className="sculpture-white" />
                  ))}
                  {blackKeyPositions.map((position) => (
                    <i
                      key={position}
                      className="sculpture-black"
                      style={{ left: `${(position / 15) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="sculpture-front" />
              </div>
              <div className="exhibit-orbit">
                Press play.
                <br />
                Feel something.
              </div>
              <span className="exhibit-play">↗</span>
            </div>
            <div className="exhibit-caption">
              <div className="exhibit-name">
                <span className="exhibit-category">
                  An instrument for everyone
                </span>
                <h2>plonko</h2>
              </div>
              <p>
                Find a melody in the light.
                <br />
                Your keyboard is an instrument.
              </p>
              <span className="exhibit-action">
                Play the piano <span aria-hidden="true">↗</span>
              </span>
            </div>
          </a>
          <div className="exhibit-notes">
            <span className="live-note">
              <i /> Playable now
            </span>
            <span>Free play · Original music · Keyboard & touch</span>
            <span>Sound is off until you play</span>
          </div>
        </section>

        <section className="workshop-ledger" aria-labelledby="workshop-title">
          <div>
            <h2 id="workshop-title">On the workbench.</h2>
            <p>
              Good toys take a little time.
              <br />
              These are still taking shape.
            </p>
          </div>
          <div className="ledger-entries">
            <a href="/tiny-studio/">
              <span>Tiny Studio</span>
              <span>A pocket-sized music desk</span>
              <span>In development</span>
            </a>
            <a href="/pocket-arcade/">
              <span>Pocket Arcade</span>
              <span>A little world you can hold</span>
              <span>In development</span>
            </a>
          </div>
        </section>

        <section className="room-note">
          <p>
            Less scrolling.
            <br />
            More playing.
          </p>
          <div>
            <p>
              Not everything needs to be useful.
              <br />
              Some things just need to make you smile.
            </p>
            <Button
              className="solid-link"
              render={<a href="/plonko/" aria-label="Find your first note" />}
            >
              Find your first note
            </Button>
          </div>
        </section>
      </main>
      <footer className="gallery-footer">
        <Brand />
        <span>An open-source playground for the web.</span>
        <a
          className="text-link"
          href="https://ui-sdk.dev"
          target="_blank"
          rel="noreferrer"
        >
          Made with UI SDK
        </a>
      </footer>
    </div>
  )
}
