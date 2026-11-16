# UI SDK in ouuo

plonko uses shipped UI SDK controls, two app-local Behavior-composed Primitives and the in-page agent bridge. Native piano input, audio scheduling and Canvas rendering remain independent of the SDK.

This file records implementation evidence and review recommendations. The [interaction architecture standard](ui-sdk-architecture.md) owns Behavior Discovery, versioned sources, Skill setup, Primitive contracts, testing and agent permissions. [AGENTS.md](../AGENTS.md) is the mandatory entry point. The project is not affiliated with or endorsed by the SDK authors.

## plonko interaction guide

The viewport contains only the instrument. A ridged volume wheel, mode selector, previous/next song buttons, sustain and mute buttons operate directly on its front. Its coral **Piano settings** key flips to a rear-shell Dialog with Music, Practice, Sound and Keys tabs. SDK Slider owns the wheel's value, bounds, keyboard and ARIA; Core `bindDrag` adds relative horizontal pointer/touch scrubbing through its public controller. Segmented Control owns front-mode selection, Dialog owns dismissal and focus return, and Tabs owns rear-page arrow navigation and panel semantics. All controls use the same piano-controller state. No additional custom Primitive was needed. The collection homepage and the two workshop studies remain separate.

The wheel follows the inspected ui-chords top-edge control: pressing never changes the value, 40 CSS pixels right adds 20 points, vertical movement does not adjust, and the ridges translate beneath a stationary highlight. The caller pointer handler prevents the Slider's default absolute track press. Escape, pointer cancellation, blur and a hidden tab restore the gesture's initial value; unmount releases the drag binding. Keyboard and agent actions still call the same accepted volume path. The circular control on the reference's left is a joystick, not this wheel.

Action shortcuts use the installed `@ui-sdk/react/shortcuts` contract: `useShortcut('mod+enter', ...)` plays or pauses Listen/Challenge through the same handlers as the buttons; `DialogTrigger shortcut="mod+,"` opens the rear controls. `useShortcutHint` supplies platform-specific help and playback `aria-keyshortcuts`. The modal pauses page shortcuts, with an additional application `when` condition excluding settings and Free play. Escape remains owned by Dialog. Native keydown/keyup still own polyphonic notes, per-source release and held Space sustain; the action-only shortcut hook is not a substitute for their press/release lifetime. No new document keyboard listener was added.

| Primitive                                                | Core Behaviors                                                            | Ownership and interaction                                                                                                                                                                                                           |
| -------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SongBrowser` / `SongChoice`                             | `createRovingFocus`, `createSelection`, `createTypeahead`, `createChange` | Controlled song ID list; arrows, Home/End and typing move focus without starting or selecting music. Enter/Space, pointer or touch selects. Named listbox/options expose selection.                                                 |
| `PracticeTimeline` / `PracticeTrack` / `PracticeSection` | `createSpans`, `createChange`, `createCommit`                             | Controlled committed range and separate drag draft. Draw, move and resize a single section; arrows move, Shift + arrows resize its end, Delete clears. Escape, pointer cancellation, blur and visibility changes discard the draft. |

Practice ranges snap to 0.25 seconds, have a one-second minimum and stay within the song. **Set practice section** supplies a keyboard-accessible starting range; **Clear section** resets it. The playback-position Slider seeks, the speed Slider changes musical tempo without changing pitch, and Loop section repeats the selected passage. Opening settings pauses and releases audio. Pausing during an unfinished hold rewinds to a half-second before its start so it can be replayed without an automatic miss; completed notes retain their scores.

The song browser exposes bounded `chooseSong(id)` actions for `first-light`, `violet-current` and `afterglow`. The timeline exposes validated `setRange(start, end)` and `clear()` actions. Open settings through the named trigger before operating these controls through `window.ouuoAgent`; standard Slider and Button actions change speed and start/pause through the same application handlers. This does not bypass browser audio permission.

Ordinary settings use shipped Dialog, Tabs, Segmented Control, Slider, Switch, Field and Input components. They do not earn custom Primitives. Polyphonic piano presses/releases deliberately use native pointer capture and keyboard events; audio-clock transport and scoring do not wait for React animation updates. Canvas uses requestAnimationFrame, skips idle redraws and respects reduced motion. No shared Primitive was introduced because only plonko consumes these interactions.

`tests/piano-practice.spec.ts` covers front-control use without opening settings, relative wheel dragging without press-position jumps, vertical-movement rejection, cancellation and clamping, volume/sustain synchronization after flipping, focus return, actual Chromium touch dragging of the wheel, multifinger chords/glissando/cancellation, selection versus focus, agent validation, drawing/resizing/canceling/looping sections, shared input ownership, audio-clock chord holds and all three original tracks. `tests/ouuo.spec.ts` covers lifecycle and keyboard settings; `tests/audio.spec.ts` checks synthesized audio and permission retry. Real-device audio latency and multitouch still require device testing.

The earlier physical-control baseline passed `pnpm check` (43 Vitest tests, typed lint, package typechecks and builds), `pnpm format:check`, and the three browser suites above (19 Chromium tests). The relative-wheel update expanded those suites to 20 tests. A new shortcut regression exercises opening settings, modal playback suppression, rebinding a note, starting/pausing playback and independently releasing a chord. The previous 120-frame idle Chromium sample had median 16.7ms / p95 16.8ms; no new performance or latency improvement is claimed. React Doctor's changed-scope scan cannot establish a baseline because this checkout has no HEAD commit. The thread's current acceptance record owns the latest rendered evidence and command results.

## Earlier inspected baseline

- Reviewed on 2026-11-16: all three app sources, collection UI, shared integration, piano input/session code, audio ownership, Vitest/Playwright configuration and current tests.
- Consumer manifests, `pnpm-lock.yaml` and installed packages agree on Core/React **0.1.0-beta.2**. SDK dependencies exist in all four apps and `packages/shared`; Tiny Studio and Pocket Arcade do not yet import components themselves.
- The official Skill is already present at `.agents/skills/ui-sdk/SKILL.md`, sourced from `vercel-labs/ui` in `skills-lock.json`. Its bundled installed-version counterpart and Core, Rendering, Testing and Agents docs were consulted. No Skill reinstall or dependency upgrade was needed.
- Tiny Studio and Pocket Arcade render the shared nonplayable `Workshop`, not a sequencer, handheld OS or game. Planned controls below are opportunities, not missing implementations promised by the current UI.

## Shipped component integration

| Component                                   | Use                                                       |
| ------------------------------------------- | --------------------------------------------------------- |
| `Button`                                    | Piano keys, transport and sound actions                   |
| `Dialog` and its parts                      | Collection About dialog and piano settings                |
| `Tabs` and its parts                        | Music, Practice, Sound and Keys settings pages            |
| `SegmentedControl` / `SegmentedControlItem` | Free play, Listen and Challenge selection                 |
| `Slider` and its parts                      | Volume, speed and playback position                       |
| `Switch` / `SwitchThumb`                    | Labels, sustain, loop, metronome, hints and light effects |
| `Field` / `FieldLabel`                      | Settings control labels                                   |
| `Input`                                     | Unique letter/number piano bindings                       |

`apps/plonko/src/App.tsx` is the main integration example. The settings dialog uses its title, description, backdrop, content, trigger and close parts. State changes call the piano controller so the control value and actual audio behavior stay connected.

`packages/shared/src/base.css` begins with `@layer ui-sdk;` before the app's global styles. Keep this ordering when changing shared CSS. Style the actual documented parts and state attributes. Supply visible labels or accessible names for every control; a styled surface alone is not enough.

### Correct boundaries to preserve

The SDK is not the audio engine, a piano scheduler or a game renderer. ouuo uses native pointer events and pointer capture for polyphonic keys, Web Audio for synthesis and timing, and Canvas with `requestAnimationFrame` for note cues. Ordinary links handle navigation.

- [plonko UI](../apps/plonko/src/App.tsx) uses individual component entries, named keys, controlled mode/settings and documented Dialog/Slider/Switch parts. It composes the app-local song browser and practice timeline without reimplementing standard widgets.
- [Piano controller](../apps/plonko/src/usePiano.ts) routes settings into the engine, tracks input sources independently, releases on blur/hidden tabs and settings open, and cleans up listeners/timers/audio on unmount. The session-start operation token guards superseded starts after asynchronous unlock.
- [Audio](../packages/audio/src/piano.ts) owns voice creation, scheduling and disposal. [Score logic](../apps/plonko/src/score.ts) is independent of DOM and SDK. Preserve these owners and clocks.
- [Tiny Studio](../apps/tiny-studio/src/App.tsx) and [Pocket Arcade](../apps/pocket-arcade/src/App.tsx) correctly use [Workshop](../packages/shared/src/index.tsx) with explicit planned-feature text and ordinary home/skip links. There are no fake knobs or game controls to replace.
- [Collection](../apps/web/src/App.tsx) uses an SDK About dialog and a Button rendered as a navigation link; ordinary exhibit anchors need no Primitive. Existing browser tests cover About dismissal/focus return.

## In-page agent bridge

`packages/shared/src/index.tsx` creates an SDK agent and exposes it as `window.ouuoAgent`. The browser tests use it to inspect named controls and operate the same live state as a person using the interface.

In a loaded ouuo page's developer console:

```js
window.ouuoAgent.snapshot()
```

The bridge also supports action sequences. `tests/ouuo.spec.ts` demonstrates selecting Challenge, opening Piano settings and changing Volume and Key labels through `act()`. Keep control names stable enough for these tests, and update tests deliberately when labels change.

This is an in-page integration bridge, not a backend agent, remote code execution endpoint or a promise of a public WebMCP service. It does not bypass browser audio-unlock restrictions. Do not expose secrets or privileged operations through it.

## Earlier review recommendations

The historical review below describes the implementation before the full-screen piano and custom practice controls. Its findings are not a current verification report. Future Tiny Studio and Pocket Arcade feature suggestions remain unapproved scope.

### 1. Repair the lifecycle test and close piano input coverage gaps

**Value: high. Change risk: low for tests; high for input rewrites. Evidence: reproduced test-selector failure and confirmed coverage gaps, not a confirmed piano runtime defect.**

The Chromium baseline run stops the song lifecycle test at `tests/ouuo.spec.ts:64`: `getByText('Take a breath.')` matches both the paused heading and feedback output, violating strict locator mode. Scope that assertion to the heading before relying on it to validate resume/restart/completion. Those later assertions were not reached in this run. This documentation task reports the issue without changing test code.

[Piano keys](../apps/plonko/src/App.tsx) have pointer press/drag/release, focused Enter/Space and zero-detail click activation, while [usePiano](../apps/plonko/src/usePiano.ts) separately handles global musical bindings and source ownership. The repeated release calls for up/cancel/lost capture protect different lifecycle paths; repetition alone is not a reason to delete them. Focused-key and click activation are overlapping routes worth checking for double-trigger or lingering tap behavior, not a demonstrated bug.

[Current browser tests](../tests/ouuo.spec.ts) exercise keyboard chords and synthetic blur, but not pointer glissando, multi-pointer ownership, pointer cancel/lost capture, focused Enter/Space versus assistive click, held Space sustain release, hidden-tab cleanup or unmount during pending unlock. Add focused regression scenarios through the page and verify no active notes remain, including two sources on one note. Measure audio effects as well as `data-active`; real-device multitouch remains necessary. Leave this path native unless an extraction preserves these contracts and latency.

### 2. Complete settings, mode and agent-path checks

**Value: high. Change risk: low for tests; medium if event or permission routing changes. Evidence: confirmed test gaps.**

[Existing tests](../tests/ouuo.spec.ts) change Volume and Key labels, restore dialog focus, and run an agent sequence into Challenge/settings. They do not exercise both sustain switches with Space, all slider bounds/arrows, mode arrow navigation, a complete Listen session, or every advertised bridge action. They assert some DOM outcomes but do not prove audible gain/sustain behavior or every requested mode change. Expand page-level checks rather than retesting SDK internals.

The shared bridge currently uses `createAgent()` without a custom allow policy. This is not evidence of a privileged-operation vulnerability in the current local toy. Before adding export, destructive pattern changes or external effects, add bounded semantic methods, explicit confirmation and refusal/approval tests. Validate `act` results against actual accepted state; `ok` alone is insufficient. Do not expose the controller store or scheduler to make tests easier.

### 3. Make Tiny Studio's first complete workflow the composition example

**Value: high for the project's behavior-first goal. Implementation risk: medium/high. Evidence: roadmap opportunity, no existing editor to refactor.**

[Tiny Studio](../apps/tiny-studio/src/App.tsx) has only its workshop entrance. Follow [the roadmap](ROADMAP.md) and start with an app-local sequencer grid: evaluate `createGridFocus` plus `createChange`, then range selection and one-edit undo only as required. The [Primitive design example](ui-sdk-architecture.md#example-design-a-step-sequencer-grid) specifies focus, activation, controlled-state and engine boundaries. Keep scheduling separate, and promote code to shared only after a second app consumes it.

XY pads (`createArea`), note timelines (`createSpans`) and patching (`createConnect`/`createViewport`, with move/resize as needed) are later candidates. Building all of them up front would delay the roadmap's first playable workflow.

### 4. Give Pocket Arcade semantic navigation before games expand

**Value: medium/high when the console foundation is authorized. Implementation risk: medium for menus; high for game loops. Evidence: roadmap opportunity.**

[Pocket Arcade](../apps/pocket-arcade/src/App.tsx) currently has no cartridge selector, virtual D-pad or game simulation. Use shipped menu/settings components when they fit; evaluate roving/grid focus plus selection for a distinctive cartridge browser. Investigate `bindHold`/`bindRepeat` for menu or parameter stepping, not real-time directional input. Test a full select/play/return/power-off lifecycle with keyboard and multitouch before calling it playable. Preserve an independent input map, simulation and renderer.

### 5. Consolidate preference handling only when there is a shared choice

**Value: modest now. Implementation risk: medium because saved settings must retain their meaning. Evidence: existing app-local persistence; no cross-app duplication found.**

[usePiano](../apps/plonko/src/usePiano.ts) already persists mute and volume in guarded `localStorage` reads/writes. Labels and sustain remain session-local. Evaluate `createPreference` for a future finite shared choice such as labels or a console setting, not as a blanket replacement for numeric volume or pattern documents. Preserve defaults, existing storage keys or an explicit migration, and unavailable/invalid-storage behavior. Do not extract a preference framework solely for SDK usage.

### 6. Defer optional piano editors and broad abstractions

**Value: conditional on new content/editing needs. Implementation risk: medium/high. Evidence: no current requirement for another track or editable practice range.**

The earlier Glass Piano baseline had one original composition and no practice-range editor. A normal track picker can use Select/Listbox; an actual time-range editor could compose `createSpans` with focus/selection. Neither justifies replacing the working mode control or wrapping every key in `definePrimitive` today. No duplicated custom selection/drag implementation was found across the three works because the other two do not yet implement those interactions.

## Verification record and limits

Checks run on 2026-11-16 after the documentation update:

- Targeted Prettier check of `AGENTS.md`, this file, `ui-sdk-architecture.md` and `ARCHITECTURE.md`: exit 0.
- Disposable Node document/API check: exit 0; all relative links/anchors resolve, all 15 candidate Behaviors plus `definePrimitive` are public functions, rendering/testing entries resolve, and `agentTools` supplies `snapshot`, `act` and `query` schemas.
- `pnpm check`: exit 1. All six typecheck tasks succeeded via Turbo cache, then typed lint stopped at `tests/audio.spec.ts:74` because `ended.sort()` lacks a comparator. The aggregate command did not reach tests/builds. The test file was not changed by this task.
- Separately, `pnpm test`: exit 0, 12 tests passed. `pnpm build`: exit 0, all four production build tasks succeeded via Turbo cache; these were not fresh recompilations.
- `pnpm test:e2e`: exit 1, six Chromium tests passed and the lifecycle test failed on the ambiguous paused-text locator described above. Passing scenarios exercised collection/About navigation and focus return; keyboard chords, synthetic blur and SDK settings; agent settings changes; 390px reduced-motion routes; OfflineAudioContext voice tuning/decay/release/mixing/cancellation; and an injected audio-permission failure followed by retry. Offline rendering is not proof of physical speaker output or input latency.

The review separates integration risks from observed test defects. No claim is made that pointer/touch cancellation, real devices, Safari/Firefox, a completed song lifecycle, settings' audible effects, performance baselines or agent permission refusals were exercised. No agent-model instruction-following evaluation was run; link/API checks do not prove future agents will follow the standard.

The current Vitest configuration uses its default Node environment and covers score/audio logic. It has no DOM Primitive harness yet. Playwright is configured for Chromium; [audio browser tests](../tests/audio.spec.ts) supplement [collection/piano flows](../tests/ouuo.spec.ts). Use the architecture guide's verification requirements when those interactions change; do not mark unexecuted [roadmap gates](ROADMAP.md) complete.
