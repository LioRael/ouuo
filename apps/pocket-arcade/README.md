# Pocket Arcade

**Playable study.** A self-contained handheld with power, boot, library, settings, pause, results, replay and shutdown. The page contains only the console; instructions and collection navigation live inside its screen.

- **Rhythm Rush:** an original 32-note, 120 BPM tune. Left / Down / A play three lanes. Hits within 60ms earn 100 points, within 150ms earn 60. Maximum 3,200.
- **Pixel Racer:** steer Left / Right, brake with Down and boost with A. Survive 45 seconds with three hull points. Score is distance plus 250 per remaining hull point at completion.
- **Mini Puzzle:** light a 3×3 board by flipping each selected tile and its orthogonal neighbors. D-pad moves, A flips, B undoes. Three authored, solvable boards; seven retained moves earn 930 points.

Z / Space maps to A, X to B, Enter / Escape to Start, Shift to Select/settings, Q / E to previous/next cartridge in the library. Mouse and independent touch pointers use the same input ownership map. Unavailable controls are disabled and labelled. Blur and hidden tabs pause play and clear held input.

Audio starts only after Power on. Volume controls the Web Audio master gain; brightness changes actual screen output. Settings are visit-local, with no storage or cookies. If audio cannot start, the console remains playable and settings offers a retry. Canvas rendering and fixed-step racing simulation run outside React renders; games own no listeners, audio contexts or animation frames.

The [roadmap](../../docs/ROADMAP.md#3-pocket-arcade-a-playable-handheld) retains the release gates. Chromium browser tests cover the console lifecycle and game endings; real-device touch/audio, Firefox and performance promotion checks remain outstanding. Optional physical cartridge insertion is not implemented.

## Develop independently

Use Node.js 22.12+ and pnpm 12.9.1. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @ouuo/pocket-arcade dev
```

Open `http://localhost:5176`. The console is at `/` standalone or `/pocket-arcade/` in the collection.

## Build and deploy

```sh
pnpm --filter @ouuo/pocket-arcade typecheck
# Replace the reserved example domain with the real collection URL.
VITE_HOME_URL=https://collection.example/ pnpm --filter @ouuo/pocket-arcade build
pnpm --filter @ouuo/pocket-arcade exec vite preview --host 127.0.0.1 --port 4176 --strictPort
```

Publish **`apps/pocket-arcade/dist`** at an origin root after a repository-root workspace installation. On Vercel, use project root `apps/pocket-arcade`, output `dist` and access to workspace files outside the app root. See [deployment](../../docs/DEPLOYMENT.md).

`VITE_HOME_URL` sets the Back to ouuo link in console settings to your real external collection URL. Without it, it returns to `/` on the standalone host. The value is public and embedded at build time; rebuild to change it. There is no announced public URL to use yet.

Run the root checks in [CONTRIBUTING.md](../../CONTRIBUTING.md), then verify the standalone page, keyboard navigation, mobile layout and home link. `tests/pocket-arcade.spec.ts` covers public page behavior; `src/games/*.test.ts` covers scoring, deterministic simulation, puzzle rules and replay.
