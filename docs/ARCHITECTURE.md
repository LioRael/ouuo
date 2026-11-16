# Architecture

ouuo has four Vite React applications in a pnpm workspace. Turbo coordinates development, typechecking and production builds. All packages are private workspace packages, not published npm releases.

## Boundaries

| Location             | Owns                                                                         |
| -------------------- | ---------------------------------------------------------------------------- |
| `apps/web`           | Collection UI, pathname dispatch, lazy exhibit loading and load/error states |
| `apps/plonko`        | Piano UI, input mapping, original score, game session and scoring            |
| `apps/tiny-studio`   | Nonplayable studio workshop entrance                                         |
| `apps/pocket-arcade` | Nonplayable arcade workshop entrance                                         |
| `packages/audio`     | Sample-free Web Audio synthesis, voice scheduling and cleanup                |
| `packages/shared`    | Shared CSS/font, brand/home link, workshop presentation and SDK agent        |
| `tests`              | Collection browser-flow tests                                                |

Shared packages export source directly. Vite bundles those sources into each app, so they do not need an independently published or prebuilt package artifact. The exhibit apps export `src/App.tsx` for the collection and have their own `index.html` and `src/main.tsx` for standalone builds.

## Collection versus standalone

`apps/web/src/main.tsx` chooses an exhibit from `window.location.pathname` and uses React `lazy()` to import its workspace export. This is composition in one page, not an iframe, microfrontend runtime or request to another deployed app. Navigation uses ordinary links. The known routes are `/`, `/plonko/`, `/tiny-studio/` and `/pocket-arcade/`. The former `/glass-piano/` route is an alias for plonko without changing the browser URL. Its workspace directory is `apps/plonko` and its package name is `@ouuo/plonko`.

The collection supplies shared base styles, a Suspense loading state and an exhibit error boundary. Unknown paths show a missing-room message after the app loads. A static host must serve the collection's `index.html` for exhibit URLs; this is not server-rendered routing or an HTTP-level 404 implementation.

Each standalone app mounts its own React root and imports the shared base CSS. Build from a root workspace installation with `pnpm --filter @ouuo/<app> build`; the result is `apps/<app>/dist`. No collection server is needed to serve that output.

`packages/shared` resolves the home link from build-time `VITE_HOME_URL`, falling back to `/`. Set it to an external collection URL for separately hosted exhibits. It does not control Vite's asset base or redirect collection exhibit routes. Current links assume hosting at an origin root. See [deployment](DEPLOYMENT.md).

## Piano session and input

`App.tsx` renders the instrument and SDK controls. `usePiano.ts` owns the session lifecycle and bridges the interface to the audio engine:

- Modes are `free`, `listen` and `challenge`; song phases are `idle`, `running`, `paused` and `complete`.
- React state holds visible settings, active notes, feedback and score snapshots. Mutable session refs hold the clock origin, paused offset and score object.
- Keyboard bindings and pointer IDs identify input sources. Releasing one source does not release a note still held by another source.
- Pointer capture supports touch/mouse note dragging. Cancellation and lost capture release the source.
- Opening settings, window blur and hidden-document events pause/release playback. Unmount cancels animation frames, timers, listeners and the audio engine.
- Asynchronous audio unlock uses an operation token so a stale start cannot resume a superseded session.

`music.ts` defines C4 through C5 and Daybreak, an original 32-note piece at 96 BPM. Listen schedules the piece on the Web Audio clock. Challenge scores live input against that same time base without automatically playing the melody for the player.

`score.ts` is independent of the DOM and audio engine. A matching unplayed note within 160 ms earns a hit: 100 points within 70 ms, otherwise 70 points. Expired notes count as misses and reset the combo. The displayed accuracy is the percentage of score notes caught, not a measured latency or weighted timing grade.

## Audio and rendering

`PianoAudio` creates/resumes its `AudioContext` only after an interaction. It combines slightly detuned sine partials with per-partial envelopes, pitch-dependent decay and sample-rate-aware frequency filtering. Master gain and a compressor precede the output. It does not load recorded piano samples or use an external audio service.

The engine owns held notes, sustained releases, scheduled voices and a shared voice budget. `releaseAll()` cancels current and future voices; `dispose()` disconnects the graph and closes the context. Scheduling uses absolute `AudioContext.currentTime`, not frame count or a React timer.

A `requestAnimationFrame` loop draws note cues to Canvas and updates progress/clock DOM refs. React is updated for semantic changes rather than every animation tick. Reduced motion replaces scrolling notes with static target cues; timing still uses the audio clock.

## UI, data and verification

UI SDK supplies standard controls and composable behavior, focus and ARIA machinery; ouuo owns styling, music, pointer polyphony and playback. The [interaction standard](ui-sdk-architecture.md) governs new work; the [SDK integration review](UI-SDK.md) records the current split and in-page agent bridge.

There is no application backend or account system. Piano mute and volume persist in browser localStorage with an in-memory fallback when storage is unavailable; other settings and scores live in memory. Hosting still serves static assets and can generate its own request logs; browser-local synthesis is not a promise about a host's data practices.

Vitest covers score and audio logic. Playwright covers collection navigation, piano interactions, settings, timing completion, reduced-motion/mobile layout and SDK agent actions in Chromium. Test files describe intended checks, not proof of a passing run. Runtime and browser verification must accompany releases.
