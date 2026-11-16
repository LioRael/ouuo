# ouuo

An open-source interactive playground: "A little corner of the internet to play."

## Workspace

- `apps/web` is the collection website. It lazy-loads the three app exports for a single-domain deployment. Each work also has its own Vite entry and standalone build.
- `apps/plonko` owns the instrument and timing game. `packages/audio` owns Web Audio voices. Audio clocks and animation frames stay outside React renders.
- `apps/tiny-studio` and `apps/pocket-arcade` are explicitly labelled development studies, not finished exhibits. Follow `docs/ROADMAP.md` before expanding them.
- `packages/shared` contains only code and styles already consumed by multiple apps.

## Commands

Use pnpm. `pnpm check` runs actual package typechecks, typed Oxlint, Vitest and every production build. `pnpm test:e2e` exercises Chromium; install it with `pnpm exec playwright install chromium`. `pnpm format:check` checks formatting.

## UI SDK — Behavior-First by Default

- **Use UI SDK to invent interactions, not merely assemble components.** Behavior-first does not mean SDK-only or maximizing API usage. These rules apply when developing, modifying or reviewing interaction UI.
- Before any nontrivial interaction change or review, read [the architecture guide](docs/ui-sdk-architecture.md), `.agents/skills/ui-sdk/SKILL.md` and the installed version's skill/docs through the consuming package's `node_modules/@ui-sdk/` path. Follow the relevant component pages; for custom interactions, read the relevant Core Behaviors, Compose Behaviors, Rendering and Testing sections. Verify public exports and `.d.ts` contracts; never guess beta APIs from memory or newer web examples.
- **Behavior Discovery comes before implementation:** identify state and ownership; pointer, keyboard, focus and selection requirements; applicable Core Behaviors and their smallest useful composition; whether a custom Primitive earns its cost through reuse or complex composition; and accessible roles and observable tests. Record the choice briefly in the task discussion or plan before coding. Reviewers check that choice against the actual interaction contract.
- Use a shipped component when it fully meets the interaction contract, including standard Dialog, Select, Tabs, Switch, Slider and Segmented Control. For distinctive interactions, first evaluate Core Behaviors and composition; do not reduce the interaction to generic controls or duplicate event handling for speed. Plain links and ordinary buttons do not need custom Primitives.
- For custom Primitives, follow the guide's state, semantic Slots/Parts, controlled/uncontrolled change, ARIA and cleanup contracts. Keep styles, audio engines and application rules outside reusable Primitives. Start app-local; move to `packages/shared` only when multiple apps actually consume it.
- Import React components per entry, never a root barrel or Core internals. Install matching Core/React versions together. Use documented parts and change callbacks; name every control. Declare `@layer ui-sdk;` before global styles.
- For agent-suitable controls, expose named, bounded semantic actions through Primitive `agent.actions` and the existing `window.ouuoAgent` bridge. Validate arguments and changes through the same application path as human input; require explicit permission for destructive or external effects. The bridge is an in-page integration surface, not remote code execution or blanket state-write access.
- **Delivery gate for complex interaction changes:** exercise the real interaction, keyboard/focus, pointer/touch, ARIA and cancellation paths; run relevant behavior, page/agent and browser tests; compare performance and usability with the previous implementation. Report Behaviors used, custom Primitives, intentional non-SDK paths and reasons, commands/results and unverified coverage. For reviews, report findings and evidence limits instead of implying implementation or runtime checks happened. See [current integration and review](docs/UI-SDK.md).

### plonko

Use SDK components/Behaviors for track selection, practice-range editing, navigation and control panels when those features are in scope. Keep native polyphonic press/release input, Web Audio scheduling and requestAnimationFrame note rendering independent of SDK and React render timing.

### Tiny Studio

The main future Behavior Composition study: sequencer grids, note timelines, XY pads, module connections, parameter editing and undo/redo. Follow `docs/ROADMAP.md`; these are candidates, not shipped features or a mandate to build all of them.

### Pocket Arcade

Use SDK components/Behaviors for handheld menus, cartridge selection, directional navigation, virtual hardware controls and settings where they fit. Keep real-time game input, simulation, collision detection and rendering loops independent. Follow `docs/ROADMAP.md` before expanding the workshop entrance.

## Design and behavior

Read `docs/DESIGN.md` for the visual rationale. Apply antislop during development, as requested by the owner; do not add an installation wizard or extra design interviews. Keep unfinished work honest. Never autoplay sound. Handle blur, visibility changes, pointer cancellation, unmount and audio failures. Respect reduced motion. Every apparent control must work. Verify responsive rendered states and keyboard navigation in a browser before delivery. Keep original compositions and generated sound free of third-party assets.
