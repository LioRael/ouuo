# ouuo

Beautiful interfaces should be playable.

ouuo is an open-source collection of browser instruments and digital toys. Start with plonko: play a chord, listen to the original piece **Daybreak**, or follow its notes in a timing challenge. Sound is synthesized in your browser with Web Audio, without recorded piano samples.

## What's here

| App                                           | Status                        | Collection route  |
| --------------------------------------------- | ----------------------------- | ----------------- |
| [Web](apps/web/README.md)                     | Collection website            | `/`               |
| [plonko](apps/plonko/README.md)               | Implemented playable work     | `/plonko/`        |
| [Tiny Studio](apps/tiny-studio/README.md)     | Nonplayable workshop entrance | `/tiny-studio/`   |
| [Pocket Arcade](apps/pocket-arcade/README.md) | Nonplayable workshop entrance | `/pocket-arcade/` |

plonko includes free play, listen and challenge modes, keyboard and touch input, sustain, volume, mute, key labels and settings. Tiny Studio and Pocket Arcade describe future work, not working synthesizers or games. Browser verification is in progress; this README is not a test-results report. No public deployment or GitHub repository URL has been announced.

plonko was previously named Glass Piano. Existing `/glass-piano/` links still open the instrument. Its workspace directory is `apps/plonko` and its package is `@ouuo/plonko`.

## Run locally

Use Node.js 22.12 or newer and pnpm **12.9.1**, as pinned in `package.json`. Node.js 24 is the CI configuration's runtime. Install the matching pnpm version using your preferred package-manager setup, then run these commands from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the collection at `http://localhost:5173`. The other dev servers run on 5174 (plonko), 5175 (Tiny Studio) and 5176 (Pocket Arcade). Ports are strict: stop the conflicting process if a port is occupied.

To run only the collection and its lazy-loaded exhibits:

```sh
pnpm --filter @ouuo/web dev
```

Workspace installation must happen at the repository root. Each app can also run and deploy independently; see its README and the [deployment guide](docs/DEPLOYMENT.md).

### Play plonko

- Press `A S D F G H J K` for white keys, `W E T Y U` for black keys, or touch the instrument. Multiple notes can sound together.
- Hold `Space` for sustain when focus is outside another actionable control, or use the sustain switch.
- Sound starts after an interaction. Use **Enable sound** if needed and check device volume.
- Choose **Listen** for Daybreak or **Challenge** to play the notes as they reach the line. Pause, resume, restart and replay are available.
- Open **Settings** to change volume, key labels and sustain. Opening settings or leaving the page's focus pauses the song. Reduced motion uses static timing cues.

## Development checks

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm format:check
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm check` combines typechecking, typed lint, unit tests and all production builds. It does not include formatting or browser tests. Playwright starts its own collection server on port 5197. For Linux browser dependencies, use `pnpm exec playwright install --with-deps chromium`.

These are commands to run, not a claim that the current checkout passed them. See [CONTRIBUTING.md](CONTRIBUTING.md) for manual verification and review expectations.

## Project guide

- [Architecture](docs/ARCHITECTURE.md): four Vite React apps, workspace packages, audio and timing ownership.
- [UI SDK](docs/UI-SDK.md): how `@ui-sdk/react` and `@ui-sdk/core` 0.1.0-beta.2 fit the project.
- [Design](docs/DESIGN.md): gallery materials, typography and motion rationale.
- [Deployment](docs/DEPLOYMENT.md): one collection or four separate static sites.
- [Roadmap](docs/ROADMAP.md): future work with checkable completion criteria.

Screenshot locations are reserved for verified captures: [`docs/media/collection.png`](docs/media/collection.png) and [`docs/media/plonko.png`](docs/media/plonko.png). They may be absent until browser verification and capture finish.

## Share ouuo

> ouuo is a small open-source collection of playable interfaces. Its first instrument, plonko, combines a touch-and-keyboard piano with an original melody and a timing challenge. Built with React, Web Audio and UI SDK. Tiny Studio and Pocket Arcade are still in the workshop.

Add a real repository or deployment link when one exists. Pair the introduction with the screenshots above or a recording made from the running app.

### 中文简介

ouuo 是一个开源的浏览器交互玩具集合。目前可玩的是 plonko，支持键盘和触控演奏、原创曲目 Daybreak 的试听与节奏挑战。Tiny Studio 和 Pocket Arcade 仍在开发中，入口页不是可玩的成品。

在仓库根目录运行 `pnpm install --frozen-lockfile`，再运行 `pnpm --filter @ouuo/web dev`，打开 `http://localhost:5173`。需要 Node.js 22.12+ 和 pnpm 12.9.1。

## License

Original project code and Daybreak are available under the [MIT license](LICENSE), copyright 2026 ouuo contributors. Dependencies and bundled fonts retain their own licenses; preserve their notices when redistributing them.
