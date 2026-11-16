# UI SDK interaction architecture

Use UI SDK to invent interactions, not merely assemble components. Start with the behavior a person needs, choose the smallest SDK composition that satisfies it, and keep real-time systems independent. [AGENTS.md](../AGENTS.md) makes this the default for implementation, changes and reviews. [UI-SDK.md](UI-SDK.md) records the current integration and review; [ROADMAP.md](ROADMAP.md) owns future scope.

## Versioned sources and the official Skill

The inspected workspace pins `@ui-sdk/core` and `@ui-sdk/react` to `0.1.0-beta.2` in every consumer. The root has no direct SDK dependency: resolve documentation through the app or package that uses it, not `node_modules/@ui-sdk` at the repository root.

- Reuse [`.agents/skills/ui-sdk/SKILL.md`](../.agents/skills/ui-sdk/SKILL.md) and its references. `skills-lock.json` records the official `vercel-labs/ui` source and `packages/core/skills/ui-sdk/SKILL.md` path. Do not reinstall it for each task.
- Read `apps/plonko/node_modules/@ui-sdk/core/skills/ui-sdk/SKILL.md` for the Skill matching the installed release. Other consumers have the equivalent path. The repository copy has minor wording/Nuxt guidance differences; installed public contracts govern API compatibility.
- Read the consuming package's `@ui-sdk/react/docs/llms.txt` index, then only the relevant component pages. For custom interactions, follow the Skill's `references/create-component.md`, `references/patterns.md`, `references/testing.md` and `references/agent-ready.md`; search headings in `docs/core.md` rather than loading the whole file. Read `docs/rendering.md` and `docs/agents.md` for the selected path.
- Confirm each entry in the installed `package.json` export map and its referenced `.d.ts`. Core helpers below are exported from `@ui-sdk/core`; rendering uses `@ui-sdk/react/primitive`, testing uses `@ui-sdk/core/testing`, and the app bridge uses `@ui-sdk/react/agent`. A type existing under `dist/` does not authorize a deep import. Do not read compiled JavaScript as API documentation.
- When documentation/examples disagree with types or leave behavior unspecified, make a small disposable probe against the installed package, report the discrepancy, and remove the probe. Do not cast away contract errors or silently copy a newer API.
- Upgrade Core and React together, deliberately updating the lockfile and rerunning behavior/page/agent checks. Installing or refreshing the Skill is separate from upgrading runtime packages.

If the official Skill is absent, its upstream installation command is `npx skills add vercel-labs/ui --skill ui-sdk`. Run it only for that missing setup or a requested refresh; inspect its repository/lockfile changes. This workspace already has it. Use pnpm for project dependencies and scripts.

Official references: [UI SDK](https://ui-sdk.dev), [Behaviors](https://ui-sdk.dev/docs/core/behaviors), [Compose Behaviors](https://ui-sdk.dev/docs/core/compose-behaviors), [Agents](https://ui-sdk.dev/docs/agents). Online examples are discovery material, not proof they match the installed beta.

## Behavior Discovery

Before coding a nontrivial interaction, record a short decision in the task discussion or implementation plan:

1. **State:** which values are application data, temporary interaction drafts, focus or selection? Who owns each value? What commits or cancels an edit?
2. **Input and semantics:** describe pointer, keyboard, touch, focus entry/exit, selection and cancellation. Pick a WAI-ARIA pattern where one fits; define keys and announcements for interactions without an exact APG pattern. Decide whether selection follows focus.
3. **Discovery:** check the installed component catalog and Core Behaviors. Name the behaviors that cover the contract and any gap. A shipped component that fully fits is the smallest valid choice.
4. **Composition:** choose the smallest combination. Extract an app-local Primitive when behavior composition is complex or there is a concrete reuse need, not for every ordinary button. Keep ordinary navigation as links.
5. **Evidence:** name the observable tests, real-browser checks and performance baseline needed to distinguish the intended behavior from a plausible wrong implementation.

For reviews, reconstruct these decisions from the code and requirements, identify gaps and rank recommendations; do not rewrite working interactions merely to increase SDK coverage.

## Behavior selection reference

All candidates below were confirmed in the installed Core public type exports. This is a discovery list, not a checklist of APIs every widget must use. Many direct-manipulation helpers are marked experimental in their types; recheck on upgrades.

| Interaction requirement                 | Candidate           | Boundary to decide                                                                                                 |
| --------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| One group Tab stop and arrow navigation | `createRovingFocus` | Orientation, looping, initial/remembered focus, disabled items and whether selection follows focus                 |
| Two-dimensional cell navigation         | `createGridFocus`   | Rows/columns, skipped cells and revealing unrendered cells; navigation is not note activation                      |
| Item or range selection                 | `createSelection`   | Stable string keys, selection order, single/multiple selection and a setter routed through `createChange`          |
| Free object positioning                 | `createMove`        | Coordinates, snapping, bounds, keyboard movement and canceled drafts                                               |
| Box edge/corner resizing                | `createResize`      | Minimum dimensions, bounds and keyboard equivalence; track ranges may fit `createSpans` better                     |
| A value with two axes                   | `createArea`        | XY value ranges, steps, readable units and alternative precise controls                                            |
| Draw, move or resize ranges on tracks   | `createSpans`       | Track IDs, time units, snapping, overlap policy and edit cancellation                                              |
| Connect ports                           | `createConnect`     | Eligible endpoints, keyboard connection, cancellation and application validation of legal connections              |
| Pan/zoom an editing surface             | `createViewport`    | Screen/world conversion, zoom bounds and keeping focused items visible; not a game camera requirement              |
| Request a user-visible state change     | `createChange`      | Callback reason/source, cancellation and controlled ownership                                                      |
| Report the end of an edit               | `createCommit`      | Final-value notification, not a state write, validation hook or cancelable transaction                             |
| Undo/redo document edits                | `createUndoStack`   | Record accepted snapshots, gesture grouping, limits and restoring returned values; it does not update state itself |
| Shared or persisted choice              | `createPreference`  | Finite choices, storage policy, safe defaults and unavailable storage; not arbitrary pattern storage               |
| Long press                              | `bindHold`          | Hold threshold, optional repeat and release/cancel cleanup                                                         |
| Step immediately and repeat while held  | `bindRepeat`        | Repeat delay/rate and end cleanup; not an audio scheduler or game input loop                                       |

Search installed `docs/core.md` headings: **All Behaviors**, **Focus and Keys**, **Selection**, **Dragging and Resizing**, **Canvas**, **Handle Changes**, **Preferences** and **Testing**. Also discover `createCellRange` for rectangular selection, `createFocusRecovery` for removed focused parts, and existing popup components before inventing more handling.

## Custom Primitive contract

- Keep the behavior in an app-local TypeScript module with `definePrimitive`; use `createParts` from `@ui-sdk/react/primitive` to map semantic Slots to React elements. Add manual parts only when generated parts cannot express the rendering requirement. Move a Primitive into `packages/shared` only after multiple apps consume it.
- Define Options, State, API and Slots before styling. Separate accepted application data from transient drafts, hover/focus and playback cursors. Application code owns composition rules, scoring, audio graphs, persistence formats and permissions; pass accepted values across that boundary.
- Declare option/slot-prop schemas. For controlled keys, support the documented value/default/change callback pattern, `controlled` and `sync`; defaults initialize uncontrolled state, they do not override later controlled values. User-visible changes go through `createChange` with a reason and source. Internal bookkeeping may use the store directly.
- Validate a proposed edit before accepting it, for pointer, keyboard, programmatic and agent paths alike. Handle a canceled change or a parent refusing an update without leaving the visual draft ahead of accepted state. `createCommit` only reports the accepted final value; record undo snapshots at the chosen successful edit boundary, not on every animation frame. Decide how external controlled updates reset or reconcile history.
- Give Slots meaningful names and stable item IDs. Declare roles on Slots using the installed `role`/`focus`/`press`/`keys` contracts; `attrs` supplies the role's ARIA states and `data-*`. Keep `attrs` and rendered state server-safe. Do not copy older examples that put every role only inside `attrs` when current types require a Slot declaration.
- Decide Tab entry/exit, arrows/Home/End, Enter/Space, Escape ownership, disabled behavior and focus recovery when items disappear. Supply a keyboard equivalent for pointer edits and a usable touch interaction without hover. A visual grid is not automatically an ARIA grid; match roles and keys to its actual operation.
- DOM binding belongs in Slot `bind`, returning cleanup. Instance-owned timers/subscriptions belong to the instance lifetime with `context.onDestroy`. Handle pointer cancel/lost capture, blur, hidden tabs, edit completion, popup dismissal and unmount without stuck input or unfinished drafts. Coordinate overlapping behaviors so one gesture has one owner and one accepted edit.
- Keep visual styling in the app's CSS, driven by documented attributes/variables. Measured coordinates or documented geometry helpers can supply dynamic geometry; do not move theme or application rules into a generic Primitive.
- Expose only intentional semantic methods in `agent.actions` after `slots`. Keep raw stores, DOM event handlers, engine internals and arbitrary state setters out of the agent surface. See the agent boundaries below.

### Example design: a step-sequencer grid

This is a proposed contract, not an implemented feature or a copy-paste SDK API example. Build only the first complete workflow authorized by the roadmap.

- **Options:** a pattern keyed by stable track/step IDs, its default and change callback, plus the grid dimensions. **State:** accepted pattern and active cell; a playback cursor is separate engine/view state. If a controlled update is refused, the cell stays at its accepted value.
- **Slots/Parts:** `root`, `row`, `cell` with a meaningful name such as track plus beat. Choose grid/row/gridcell semantics and an explicit activation model. Tab enters one active cell; arrows move focus without toggling notes; Space/Enter toggles the focused step. Announce the step's on/off state without reading every playback tick.
- **Composition:** `createGridFocus` owns navigation; `createChange` requests pattern edits. If range selection is needed, evaluate `createCellRange` or `createSelection` separately from note on/off data. Add `createUndoStack` only when undo is in scope; one paint gesture should undo as one edit. Do not add timeline or connection behaviors to this grid without a requirement.
- **API/agent:** a proposed semantic `setStep(trackId, stepId, enabled)` validates IDs, booleans, editability and pattern bounds before requesting a change. Pointer activation, keyboard activation and the advertised action use that same edit path. This is an application-defined method, not an SDK export. Agents cannot rewrite the scheduler clock.
- **Engine boundary:** the accepted pattern reaches the audio scheduler; React focus changes never schedule notes directly. Starting audio still requires a valid user gesture. Undo restores pattern data, not elapsed playback or exported files.
- **Tests:** move to a different row and a nonadjacent step, activate once and assert only that step changes; arrows must not toggle notes. Test a refused controlled edit, pointer cancellation, one-gesture undo, agent invalid IDs and cleanup during playback. Assert the rendered page too, not only the isolated Primitive.

For a complete official code template, use the installed `docs/core.md` **Compose Behaviors** example together with **Roles, Focus and Keys**, `docs/rendering.md` and the public types. Its rating demonstrates shared state plus roving focus; do not copy its radio selection model onto a sequencer.

## Apply the boundary to each work

### plonko

Keep the existing standard settings and mode components. If track selection or practice-range editing is requested, use a fitting Select/Listbox or investigate `createSpans` plus focus/selection for editing time ranges. Neither feature currently exists. Do not manufacture a custom track-selection Primitive for the current single composition.

Native multi-source piano press/release, touch chords, Web Audio voice scheduling, scoring time and Canvas/requestAnimationFrame drawing remain independent. A press-and-hold note is not a click-only action. Any input extraction must preserve source ownership, cancellation, audio unlock races and latency before adoption.

### Tiny Studio

The strongest future composition opportunity is the first sequencer workflow. Investigate grid focus and edits first; then, only as scope needs them, `createSpans` for a note timeline, `createArea` for an XY pad, `createMove`/`createResize` for modules, and `createConnect`/`createViewport` for a patching surface. Reuse shipped Slider/Number Input controls for ordinary parameters; evaluate hold/repeat for custom stepping and undo for accepted edits. Keep synthesis and clock scheduling outside Primitives. These are future options, not permission to build every panel now.

### Pocket Arcade

Use Menu, Select, Tabs or another fitting shipped component for standard console screens. Evaluate roving/grid focus plus selection for a distinctive cartridge browser; hold/repeat may fit menu stepping or a hardware-style setting. Do not use those timers for held directional/action game input. Keyboard, mouse and multitouch game sources feed an independent input map and simulation. Keep collision detection, time-based movement, rendering and shutdown cleanup in the game runtime.

## Agent-native boundaries

The existing shared `createAgent` from `@ui-sdk/react/agent` exposes `window.ouuoAgent` in-page. Reuse it rather than creating a bridge per component. `snapshot()` reads registered SDK components and available actions, not the entire DOM or internal application state; ordinary links need not become Primitives to appear there.

- `act({ steps })` calls semantic methods or presses SDK buttons. Non-press actions do not simulate keyboard/pointer events. Put validation in public methods and change callbacks, never only in DOM handlers. Custom action arguments are not generally validated for you.
- `query({ within, text, kind })` finds controls/choices; handle its error result and ambiguous labels, and read choices rather than inventing IDs. Descriptions in the installed agent guide differ on whether choice discovery opens popups; test the chosen path and gate sensitive open changes as well. Do not rely on `allow` as a read/visibility boundary.
- `agentTools` describes the `snapshot`, `act` and `query` tool schemas; it neither connects a model nor creates an assistant. WebMCP registration would be a separate, explicitly scoped integration with its own allow policy and cleanup; it is not currently installed in OUUO's app code.
- For agent-suitable custom controls, expose actions such as choosing a track, changing a bounded pattern step, setting a synth parameter or selecting a cartridge. These are examples of future app actions, not existing bridge features. Advertise their choices and accessible names; use explicit refs if labels collide.
- `act` is sequential, not atomic: earlier edits remain when a later step fails. `ok: true` does not prove a change callback or controlled owner accepted a value. Inspect returned values and actual application state, including asynchronous completion, before claiming success.
- Mark destructive/external actions with `data-agent-confirm` at the action that performs the effect, not harmless Cancel. An `allow` policy must obtain explicit approval before running it. Reject invalid edits through change callbacks (`details.cancel()`), and enforce any privileged effect at its actual boundary too. In-page agent approval is not server authorization.
- Use `data-agent-secret` or `data-agent-hidden` when needed; these are bridge presentation controls, not protection against arbitrary page scripts. Never expose secrets, unrestricted store writes, downloads/exports without approval, or hidden engine controls. No agent action bypasses browser audio-unlock requirements.

## Verification and delivery

For every complex interaction change, follow this order and report actual evidence:

1. Read the relevant Skill/docs, perform Behavior Discovery and choose the minimal composition.
2. Implement against the installed public contracts. Verify integration through accepted application state, not only component callbacks.
3. For a custom Primitive, use `mount` from `@ui-sdk/core/testing` for keys, clicks/drags, state, changes and announcements; always unmount. Enable SDK strict warnings in its test setup. Use `checkServer` for server-safe initial output and `checkDirection` when horizontal navigation should mirror. Apply `checkPattern` only to a supported matching pattern. Beta.2 has no `grid` pattern checker: explicitly test grid roles/keys instead of inventing `checkPattern(root, 'grid')`.
4. For shipped components, test application wiring, names, effects and focus return rather than retesting SDK internals. For agent-suitable controls, inspect named snapshots and exercise advertised actions, verifying accepted values and the resulting application effect. When permissions are added, test refusal and approval; test invalid custom arguments.
5. Use the real page in a browser for keyboard/focus, pointer/touch, cancellation, popup placement, reduced motion, responsive layout and ARIA. Check non-default/error states and console errors. jsdom cannot prove geometry, contrast, audio unlock or real multitouch. Record browser/device coverage; touch emulation does not prove real-device operation.
6. Compare frame timing, input response and render/update frequency with the previous implementation on the same named device/browser for changed high-frequency interactions. For editor changes, check undo grouping and that playback/scheduling remains independent. Report measurements or the limit; do not assert no regression from a build alone.
7. Run the relevant Vitest and Playwright checks, actual consumer typechecks and builds using the root commands in AGENTS.md. The current Vitest setup has no DOM environment: when adding DOM-based Primitive tests, configure the required environment/dependencies and documented stubs for those tests, rather than assuming browser globals exist. A docs-only task needs document/link/API checks, not new UI fixtures.

The delivery summary names Behaviors and custom Primitives used (or none), intentional non-SDK paths and why, commands with results, observed interactions and remaining verification limits. Keep screenshots/browser evidence for visual changes. A review distinguishes observed defects, code-level risks and missing test coverage.

## Review traps

- Choosing generic controls first and treating the finished look as proof the intended interaction works.
- Hand-writing selection/arrow/drag logic before checking public behaviors, or layering two gesture owners on the same element. Compose existing popup parts as containers or siblings; do not bind a custom Slot and an SDK part to the same DOM element.
- Treating focus, selection, edited data and audio/playback state as one value; storing every frame in React or recording an undo entry per tick.
- Updating a store directly for user/agent edits, omitting controlled `sync`, or putting validation only in click handlers.
- Assuming the SDK supplies the whole accessibility contract, testing only API calls, or asserting a callback fired without checking the accepted value/focus and application effect.
- Adding a generic Primitive library before an actual reuse/composition need, or moving one app's engine/business rules into `packages/shared`.
- Replacing native polyphonic input, audio clocks or game loops merely to increase SDK API counts.
