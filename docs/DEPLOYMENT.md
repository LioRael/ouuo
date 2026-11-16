# Deployment

ouuo builds to static files. Deploy the collection as one site, or deploy any exhibit as its own site. There is no required backend, database, server secret or public deployment URL today.

## Build from the workspace root

Use Node.js 22.12+ (Node.js 24 matches CI) and pnpm 12.9.1. Install the whole workspace even when deploying just one app:

```sh
pnpm install --frozen-lockfile
pnpm --filter @ouuo/web build
```

| Site          | Build command from repository root        | Publish directory from repository root |
| ------------- | ----------------------------------------- | -------------------------------------- |
| Collection    | `pnpm --filter @ouuo/web build`           | `apps/web/dist`                        |
| plonko        | `pnpm --filter @ouuo/plonko build`        | `apps/plonko/dist`                     |
| Tiny Studio   | `pnpm --filter @ouuo/tiny-studio build`   | `apps/tiny-studio/dist`                |
| Pocket Arcade | `pnpm --filter @ouuo/pocket-arcade build` | `apps/pocket-arcade/dist`              |

`pnpm build` builds all sites through Turbo. Deploy only the selected site's `dist` contents, not the workspace, source directory or `node_modules`.

## Cloudflare Pages: plonko and keyboard

For a single Pages project serving only these two apps, use the repository root as the build root:

```sh
pnpm install --frozen-lockfile
pnpm build:pages
```

Publish the root `dist` directory. The build places plonko under `/plonko/` and keyboard under `/keyboard/`, with each app's assets using the matching prefix. It does not publish the collection or workshop apps. The normal standalone builds remain available separately.

## One collection site

Publish `apps/web/dist` at the origin root. The collection bundles the exhibit code as lazy chunks; it does not need the other apps deployed separately.

Configure the static host to serve existing assets normally and rewrite unmatched page paths to `/index.html` with status 200. At minimum, direct requests and reloads for `/plonko/`, the compatible legacy `/glass-piano/` route, `/tiny-studio/` and `/pocket-arcade/` must reach the collection entry. Do not rewrite missing `/assets/*` files to HTML, which conceals broken asset deployments.

Leave `VITE_HOME_URL` unset for the collection so home links return to `/`. The workshop apps remain nonplayable even when their pages are deployed.

## Separate exhibit sites

Each app can be built and hosted at its own origin root. Set the collection URL before building, for example:

```sh
# Example only. Replace this reserved domain with your real collection URL.
VITE_HOME_URL=https://collection.example/ pnpm --filter @ouuo/plonko build
```

Use the equivalent command for `tiny-studio` or `pocket-arcade`, then publish its directory from the table. `VITE_HOME_URL` changes the brand and workshop back links. Without it, `/` means the standalone site's own root, not the collection.

Vite embeds `VITE_*` values in client assets. They are public, not secrets. Configure the value in each hosting environment and rebuild after changing it. Turbo's build task includes `VITE_HOME_URL` in its cache inputs. It is not a runtime setting, an asset-prefix setting or a way to make collection links open external exhibit domains.

Current Vite configs and links assume root hosting. Subdirectory hosting requires coordinated Vite `base` and link/routing changes; setting `VITE_HOME_URL` alone is insufficient.

## Vercel

Create a project for each site you want to publish, using the same repository:

1. Set the project's Root Directory to `apps/web`, `apps/plonko`, `apps/tiny-studio` or `apps/pocket-arcade`.
2. Enable access to source files outside that Root Directory so workspace dependencies under `packages/` and sibling apps can be bundled.
3. Use the repository's pinned pnpm and a workspace-root `pnpm install --frozen-lockfile`. Do not copy an app into an isolated project before installation. If overriding installation explicitly from an app root, use `cd ../.. && pnpm install --frozen-lockfile`.
4. The app's `vercel.json` supplies its filtered build command and app-relative output directory `dist`. The collection config also supplies its SPA rewrite.
5. Set `VITE_HOME_URL` for standalone exhibits in the project's Preview and Production environments as appropriate. Leave it unset for a normal single-domain collection.
6. Build a preview first and perform the checks below before promoting it.

For a host configured with the repository itself as the build root, use the table's full `apps/<app>/dist` output path instead. App-root `dist` and repository-root `apps/<app>/dist` describe the same directory from different working directories. Ensure that the collection rewrite is also applied when not using its app-root Vercel config.

These are configuration instructions, not evidence of a successful Vercel deployment. No production publish is part of the current local work.

## Preview and release checklist

Preview a build locally, for example:

```sh
pnpm --filter @ouuo/web exec vite preview --host 127.0.0.1 --port 4173 --strictPort
```

Use the same command with another app filter for its standalone output. Vite preview is for checking builds, not a production server. Use HTTPS on the deployed host.

- Run `pnpm check`, `pnpm format:check` and `pnpm test:e2e`; report the actual outcomes.
- Open every deployed route directly, reload it and follow home/back links. Check standalone links point to the intended collection.
- Inspect Network and Console for missing chunks, font failures and HTML returned for JavaScript assets.
- Confirm sound starts only after interaction. Exercise Free play, Listen, Challenge, pause/resume, mute, sustain and settings.
- Check keyboard focus, touch notes, focus loss, hidden tabs, reduced motion and phone-width layouts.
- Capture verified screenshots at `docs/media/collection.png` and `docs/media/plonko.png`; these paths are reserved, not proof that capture has happened.
- Record the real preview/production URL and browser coverage. Do not add a live badge or link until the destination exists.

## Troubleshooting

| Symptom                                        | Check                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Workspace dependency cannot be resolved        | Install from the repository root and allow the host to read outside the app directory.                       |
| Direct exhibit URLs return 404                 | Add the collection SPA rewrite, while preserving real assets.                                                |
| Standalone home link returns to the instrument | Set `VITE_HOME_URL` before the build and rebuild.                                                            |
| Changed home URL does not appear               | Confirm the correct environment and rebuild the app, not just the hosting configuration.                     |
| Blank page or asset MIME error                 | Check the publish directory, root-hosting assumption and asset rewrite exclusions.                           |
| No sound                                       | Interact with Enable sound, check browser/device mute and volume, and inspect the app's audio error message. |
