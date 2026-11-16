# plonko

ouuo's implemented playable instrument: C4 through C5, sample-free additive Web Audio, and the original piece Daybreak at 96 BPM. Browser verification is in progress.

## Play

- **Free play:** keyboard or touch notes, chords and dragging between keys.
- **Listen:** scheduled playback of Daybreak with note cues.
- **Challenge:** match the notes at the target line for points, note-hit accuracy and streaks.

White keys use `A S D F G H J K`; black keys use `W E T Y U`. Hold `Space` for sustain outside focused actionable controls, or use the sustain switch. Settings control volume, labels and sustain. Sound requires interaction; Enable sound, mute and unmute are explicit actions. Songs can pause, resume, restart and replay. Opening settings or losing focus pauses the session. Reduced motion replaces falling notes with static cues.

## Develop independently

Use Node.js 22.12+ and pnpm 12.9.1. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @ouuo/plonko dev
```

Open `http://localhost:5174`. The standalone instrument is at `/`; the collection uses `/plonko/`. The former `/glass-piano/` collection route remains compatible. The workspace directory is `apps/plonko` and the package is `@ouuo/plonko`.

## Build and deploy

```sh
pnpm --filter @ouuo/plonko typecheck
# Replace the reserved example domain with the real collection URL.
VITE_HOME_URL=https://collection.example/ pnpm --filter @ouuo/plonko build
pnpm --filter @ouuo/plonko exec vite preview --host 127.0.0.1 --port 4174 --strictPort
```

Publish **`apps/plonko/dist`** at an origin root. Install from the workspace root, not an isolated copy of this app. On Vercel, use project root `apps/plonko`, app-relative output `dist` and access to workspace files outside the app root. See [deployment](../../docs/DEPLOYMENT.md).

`VITE_HOME_URL` sets the brand's external collection destination. The default `/` returns to this standalone instrument. The value is public and embedded at build time, so rebuild after changing it. There is no public collection URL to substitute automatically.

## Implementation and checks

`App.tsx` owns presentation, `usePiano.ts` session/input lifecycle, `music.ts` the score and bindings, and `score.ts` deterministic judgement. `@ouuo/audio` owns synthesis. See [architecture](../../docs/ARCHITECTURE.md) and [UI SDK](../../docs/UI-SDK.md).

Run `pnpm exec vitest run apps/plonko/src/score.test.ts packages/audio/src/piano.test.ts` from the root for focused unit checks. Root `pnpm test:e2e` tests the instrument through the collection, not this standalone deployment. Verify this build separately, including audio unlock, touch/keyboard chords, cancellation, focus loss, settings, transport and home links. No check is claimed to have passed here. The planned capture is `docs/media/plonko.png` at the repository root.
