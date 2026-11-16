# Contributing

Keep each contribution small enough to review and play. Read [AGENTS.md](AGENTS.md), [the design direction](docs/DESIGN.md) and the [roadmap](docs/ROADMAP.md) before changing behavior. Workshop entrances must stay labelled nonplayable until their acceptance criteria are met.

## Setup

Use Node.js 22.12+ and pnpm 12.9.1. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @ouuo/web dev
```

The collection runs on port 5173 and loads the other apps from their workspace exports. Use `pnpm dev` for all four standalone servers. Each [app README](README.md#whats-here) lists its commands.

## Code and content

- Use TypeScript and the existing React patterns. Keep real-time clocks and drawing outside React's render cycle.
- Keep instrument behavior in its app, Web Audio voices in `packages/audio`, and only genuinely shared code in `packages/shared`.
- Follow the [UI SDK guide](docs/UI-SDK.md) before changing SDK components. Keep controls named, keyboard-operable and connected to real state.
- Never autoplay sound. Handle focus loss, pointer cancellation, hidden tabs, unmounts and audio failures.
- Respect reduced motion. Check touch input and keyboard-only use, not just desktop pointer input.
- Contribute original music, graphics and sounds, or clearly document compatible licenses and attribution. Do not introduce copied game sprites or commercial recordings.
- Update documentation when commands, deployment settings or actual feature status change. Never present a planned feature as shipped.

## Checks before review

```sh
pnpm check
pnpm format:check
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm check` runs package typechecks, typed Oxlint, Vitest and production builds. Browser checks and formatting are separate. Format only files you changed, for example:

```sh
pnpm exec prettier --write apps/plonko/src/App.tsx
```

Add regression tests beside deterministic logic, as in `score.test.ts` and `piano.test.ts`. Add user-flow coverage under `tests/`. Playwright currently targets Chromium; a green run does not establish Safari, Firefox, real-device audio or accessibility conformance.

Manually verify affected routes in both the collection and the relevant standalone build:

- Reload a direct exhibit URL and follow the home link.
- Play and release keyboard chords and touch notes. Cancel a pointer, leave focus and switch tabs; confirm notes do not remain stuck.
- Start, pause, resume, restart and finish Listen and Challenge. Open settings during playback.
- Check mute, zero volume, sustain and key labels. Try sound unlock and its failure message where reproducible.
- Use Tab, Enter, Space and Escape. Check dialog focus return, visible focus and slider keyboard input.
- Check phone-width layouts, desktop resizing and reduced-motion settings. Record the browsers and viewport sizes actually used.

## Reports and pull requests

Until a public repository is available, share reports through the project's existing collaboration channel. Once hosted publicly, use that repository's issue and pull-request tools.

Include reproduction steps, expected and actual behavior, browser/OS, input method and relevant console errors. Audio bugs also need device output and mute/volume state. Avoid secrets or personal data in logs and recordings.

In a pull request, explain the user-visible change, tests run with results, checks not run and why, and screenshots or a short recording for visual changes. Do not turn incomplete checks into a passing claim. Contributions to original project material are offered under the repository's [MIT license](LICENSE).
