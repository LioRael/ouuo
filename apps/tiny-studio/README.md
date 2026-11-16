# Tiny Studio

**In development. Not playable yet.** This app is a workshop entrance describing a future browser synthesizer, drum machine and sequencer. It does not currently generate studio sounds, edit patterns, save sessions or export audio. Its working navigation returns to the collection.

See the [roadmap](../../docs/ROADMAP.md#2-tiny-studio-one-complete-musical-workflow) for the planned workflow and acceptance criteria.

## Develop independently

Use Node.js 22.12+ and pnpm 12.9.1. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @ouuo/tiny-studio dev
```

Open `http://localhost:5175`. The entrance is at `/` standalone or `/tiny-studio/` in the collection.

## Build and deploy

```sh
pnpm --filter @ouuo/tiny-studio typecheck
# Replace the reserved example domain with the real collection URL.
VITE_HOME_URL=https://collection.example/ pnpm --filter @ouuo/tiny-studio build
pnpm --filter @ouuo/tiny-studio exec vite preview --host 127.0.0.1 --port 4175 --strictPort
```

Publish **`apps/tiny-studio/dist`** at an origin root after a repository-root workspace installation. For Vercel, use project root `apps/tiny-studio`, output `dist` and access to workspace files outside the app root. See [deployment](../../docs/DEPLOYMENT.md).

`VITE_HOME_URL` sets the brand and Back to ouuo links to an external collection. Without it they point to `/` on the standalone host. It is a public build-time setting, not a secret or a runtime redirect; rebuild when it changes. No public collection URL exists yet.

Before review, run the root checks in [CONTRIBUTING.md](../../CONTRIBUTING.md), then verify the standalone page, keyboard navigation, narrow layouts and external home links. Deploying this entrance does not make the planned studio playable. Browser verification is in progress.
