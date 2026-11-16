# ouuo collection

The collection website presents plonko and two explicitly nonplayable workshop entrances. It lazy-imports each exhibit's workspace `App` export, so one deployment serves the whole collection without separate exhibit servers.

## Develop

Use Node.js 22.12+ and pnpm 12.9.1. Run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @ouuo/web dev
```

Open `http://localhost:5173`. Routes are `/`, `/plonko/`, `/tiny-studio/` and `/pocket-arcade/`. Existing `/glass-piano/` links still open plonko. There is no public deployment URL yet.

## Build and deploy

```sh
pnpm --filter @ouuo/web typecheck
pnpm --filter @ouuo/web build
pnpm --filter @ouuo/web exec vite preview --host 127.0.0.1 --port 4173 --strictPort
```

Publish **`apps/web/dist`** when building from the repository root. Serve at the origin root and rewrite non-asset page requests to `/index.html`. Direct exhibit links must work after reload. The app's Vercel config uses app-relative `dist` when its project root is `apps/web`; allow workspace files outside that root.

Leave `VITE_HOME_URL` unset to keep home links at `/`. If this site's brand must link to a different collection, set `VITE_HOME_URL` to that real external URL at build time. It does not change exhibit routes or asset paths and is not needed for a normal collection deployment.

See the [deployment guide](../../docs/DEPLOYMENT.md) for host settings and release checks. Run root `pnpm check`, `pnpm format:check` and `pnpm test:e2e` before review; no passing result is implied here. The planned collection capture is `docs/media/collection.png` at the repository root.
