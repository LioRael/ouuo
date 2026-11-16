# Roadmap

This is future scope and release criteria, not a list of shipped features or dated commitments. plonko is the only implemented playable work. Tiny Studio and Pocket Arcade currently render nonplayable workshop entrances.

Acceptance items remain open until someone records evidence from the relevant checks. Existing code or a test file alone does not close an item.

## 1. Verify the first playable release

Keep the initial collection focused on plonko before promoting more exhibits.

- [ ] Run root installation with the frozen lockfile, `pnpm check`, `pnpm format:check` and `pnpm test:e2e`; attach actual results, including any failures.
- [ ] Build and preview all four apps independently. Verify each root page and the configured external collection home link.
- [ ] Verify direct loading and refreshing of all four collection routes on a static-host preview.
- [ ] Complete one Listen session and one Challenge session, including pause, resume, restart and replay. Confirm results match the performed input.
- [ ] Verify keyboard chords, touch chords, note dragging, pointer cancellation, sustain release, settings pause, blur, hidden tabs and unmount without stuck notes or resumed stale playback.
- [ ] Record checks in Chromium, Firefox and Safari, including at least one real touch device. Document unsupported behavior rather than implying universal compatibility.
- [ ] Check viewport widths of 320, 390, 768 and 1440 CSS pixels, keyboard-only use and reduced motion. No page-level horizontal overflow; any narrow instrument scrolling remains internal.
- [ ] Capture the collection and piano at `docs/media/collection.png` and `docs/media/plonko.png`. Add a real public link only after deployment is authorized and verified.

## 2. Tiny Studio: one complete musical workflow

The entrance describes a synthesizer, drum machine and sequencer. None of these is playable yet. Deliver one working workflow before adding more panels.

- [ ] Implement a user-unlocked polyphonic synthesizer with playable keyboard/touch input. Changing every exposed sound control must audibly change the sound, and all voices must stop on cancellation/unmount.
- [ ] Add an original drum kit and clock-synchronized step sequencer. A pattern must loop, stop, restart and change tempo without accumulating duplicate notes or timers.
- [ ] Make each exposed effect bypassable and audible. Do not ship decorative knobs or unimplemented parameter labels.
- [ ] Save and reload at least one pattern locally, with a documented data format and graceful handling of unavailable storage or invalid data.
- [ ] Export a recording or rendered audio file that opens in a separate player. Explain export duration/format and require explicit user action to download.
- [ ] Verify a complete create, edit, save, reload and export session with keyboard and touch. Record browser coverage, focus-loss behavior and cleanup checks.

## 3. Pocket Arcade: a playable handheld

This scope carries forward the supplied Pocket Arcade brief. It is all planned, including the console operating system and the three games. The existing entrance does not implement power, controls, games or rendering loops.

### Console foundation

- [ ] Build a handheld shell with working D-pad, A/B, Start, Select and shoulder controls. Document each mapping; hide or disable with explanation any control unavailable in the current context.
- [ ] Support keyboard, mouse and multitouch. Verify simultaneous directional and action input on a real touch device, plus remapping for supported keyboard actions.
- [ ] Implement power-on, startup, game selection, settings, return-to-menu and shutdown states. Starting sound requires a user gesture. Shutdown must stop all audio and game loops.
- [ ] Make volume and brightness alter real output. Persist settings only with a documented local-storage policy and a safe fallback when storage is unavailable.
- [ ] Use SDK controls for suitable menus, dialogs, settings and focus behavior. Keep game simulation and Canvas or equivalent rendering independent from React renders.
- [ ] Pause on focus loss and hidden tabs; resume only through a clear action. Verify resize/orientation handling and that held input clears on pointer cancellation or lost focus.
- [ ] Give button presses, transitions and startup feedback a purpose. Respect mute and reduced motion; no persistent idle animation is required to play.

### Rhythm Rush

- [ ] Ship an original falling-note rhythm chart with a start screen, visible controls, audio, scored timing, results and restart.
- [ ] Define timing windows and score rules in testable logic. Add tests for early/late boundaries, wrong notes, misses, duplicate input, pause/resume and replay reset.
- [ ] Complete a run with keyboard and touch. Verify results against known input and that reduced-motion cues retain the timing information needed to play.

### Pixel Racer

- [ ] Ship an original bite-sized racer or obstacle-dodging game with start, controls, active play, collision/end state, score or progression, sound and restart.
- [ ] Define increasing difficulty and deterministic test cases for collisions and score updates. Verify movement speed remains time-based rather than frame-count-based.
- [ ] Complete and restart a run using keyboard and touch. Resizing or returning from a paused tab must not cause a simulation jump or leave controls held.

### Mini Puzzle

- [ ] Choose and document an original puzzle rule set, legal moves, progress/win condition and restart behavior before implementation.
- [ ] Supply replayable boards through authored levels or a generator with a solvability check. Add tests for legal moves, win detection and fresh-game reset.
- [ ] Ship a start screen, visible controls, progression, sound and a complete win/replay flow. Verify completion using keyboard and touch without relying on hover or color alone.

### Promotion gate

- [ ] A person can power on, choose any of the three games, play to an end state, restart, return to the menu and power off without reloading the page.
- [ ] Every game has its own complete loop. No placeholder cartridge can be mistaken for a working game.
- [ ] Record desktop and real-device browser checks, input/audio cleanup and repeat-session behavior. Measure frame time and input response on named devices before making performance claims.
- [ ] Use only original or compatibly licensed music, art and code. Hardware references inform physical affordances, not copied branding, sprites or industrial designs.

Interchangeable cartridge insertion/removal animations are optional and come after this promotion gate. They must not delay working games or make game selection dependent on motion.

## 4. Maintain the collection

- [ ] Add regression tests for reported scoring, audio-lifecycle and input bugs before closing them.
- [ ] Review SDK beta upgrades as paired core/React changes; run control, agent and browser checks before updating the pin.
- [ ] Keep each app's standalone build and root-host deployment instructions current.
- [ ] Update exhibit status only when its criteria and verification evidence justify the change. Publish screenshots and social copy that match the running implementation.
