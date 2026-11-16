# Pocket Arcade

**In development. Not playable yet.** This app is a workshop entrance, not a working handheld console. Rhythm Rush, Pixel Racer, Mini Puzzle, console power, menus and game controls are all future scope.

The [roadmap](../../docs/ROADMAP.md#3-pocket-arcade-a-playable-handheld) preserves the proposed three-game scope, full gameplay loops, keyboard/mouse/touch controls, responsible audio and measurable promotion criteria. The current app only presents that direction and collection navigation.

## Develop independently

Use Node.js 22.12+ and pnpm 12.9.1. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @ouuo/pocket-arcade dev
```

Open `http://localhost:5176`. The entrance is at `/` standalone or `/pocket-arcade/` in the collection.

## Build and deploy

```sh
pnpm --filter @ouuo/pocket-arcade typecheck
# Replace the reserved example domain with the real collection URL.
VITE_HOME_URL=https://collection.example/ pnpm --filter @ouuo/pocket-arcade build
pnpm --filter @ouuo/pocket-arcade exec vite preview --host 127.0.0.1 --port 4176 --strictPort
```

Publish **`apps/pocket-arcade/dist`** at an origin root after a repository-root workspace installation. On Vercel, use project root `apps/pocket-arcade`, output `dist` and access to workspace files outside the app root. See [deployment](../../docs/DEPLOYMENT.md).

`VITE_HOME_URL` sets the brand and Back to ouuo links to your real external collection URL. Without it, they return to `/` on the standalone host. The value is public and embedded at build time; rebuild to change it. There is no announced public URL to use yet.

Run the root checks in [CONTRIBUTING.md](../../CONTRIBUTING.md), then verify the standalone page, keyboard navigation, mobile layout and home links. Do not describe a successful build as proof that the future console or games exist. Browser verification is in progress.
