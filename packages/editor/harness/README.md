# Editor browser bench

A measurement harness for the editor that runs in a **real browser**. The unit tests run on
`happy-dom`, which has no layout engine, so it cannot answer the questions that matter most for the
editor's hot paths: forced layout, frame budget, paint cost and how a transaction is distributed over
the plugins that handle it.

## Running it

```bash
pnpm --filter @strata/editor bench:browser
```

Then open <http://localhost:5199/>. The page measures on load and writes the result into the DOM, so
the numbers can be read without injecting any script:

- `#bench-results` — the full report as JSON
- `#live-counters` — live counters (pointer events, frames, document hit tests)

### Running one section

`http://localhost:5199/?sections=reactCost,updatePath` runs only the listed sections. Without the
parameter every section runs.

This matters because a browser window that is not in the foreground has its animation frames
throttled to roughly one per second. The harness therefore paces itself on a frame **or** a 32 ms
timer, whichever comes first — the timer is the floor, the frame is the ceiling. The measurements
that depend on the browser really coalescing work into frames (the side menu schedules its update
on an animation frame) still wait for a real frame.

## What it measures

| Section         | Question                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| `lowlightAB`    | Does the editor still pay for a duplicated plugin? Runs the same editor with and without it.             |
| `sideMenuAB`    | Does the side menu coalesce pointer events, and what does the coalescing cost?                           |
| `serialization` | What does handing the whole document to a consumer as JSON and HTML cost per keystroke?                  |
| `updatePath`    | What does a keystroke cost with and without a consumer that serializes on every update?                  |
| `documentInfo`  | What does the document info panel cost on every update?                                                  |
| `profiles`      | Which plugin spends the time of a transaction, measured by wrapping `plugin.spec` and timing every call. |
| `reactCost`     | What do the toolbar and the document info panel cost in React, and how often does React re-render?        |

Every section also gets its own node, so one section can be read on its own: `#bench-lowlightAB`,
`#bench-sideMenuAB`, `#bench-serialization`, `#bench-updatePath`, `#bench-documentInfo`,
`#bench-profiles`, `#bench-reactCost`, `#bench-diagnostics`.

The profiler is the reason this harness exists: it attributes transaction time to individual plugins,
which is how the `unique-id` plugin was found to spend 4 ms per keystroke on a 1000 paragraph
document.

The profiler also has a blind spot: it only sees the ProseMirror transaction. Work that happens in
editor event handlers (the document info panel) or in extension lifecycle hooks sits outside of it and
needs its own measurement. The `reactCost` section covers that blind spot: it mounts a proxy tree
that mirrors the toolbar and the document info panel, and reports how often React re-rendered and how
long the render plus commit took. The proxy is not the real application — it reproduces the
subscription pattern, the state shape and the number of rendered children, but not the real
component tree — so its numbers are an indication of the order of magnitude.

## Rules for a trustworthy number

1. **Every measurement is an A/B in the same page.** The same document and the same event stream run
   through the current implementation and the one it replaced, so the difference is the only variable.
2. **Every measurement reports that it did the work.** `elementsFromPoint` returns an empty list for
   coordinates outside the viewport, which silently turns a measurement into a no-op. Hit counts are
   therefore reported next to the timings.
3. **The target has to be inside the viewport.** The harness scrolls to the top and picks a block that
   is actually visible before it measures anything.

## Layout of the harness

| File             | Purpose                                                                     |
| ---------------- | --------------------------------------------------------------------------- |
| `index.html`     | Page shell with the editor host.                                            |
| `styles.css`     | The real stylesheet, same recipe as `apps/web/styles/globals.css`.          |
| `vite.config.ts` | Dev server on port 5199. Exports a plain object, it does not import `vite`. |
| `main.ts`        | The measurements.                                                           |
| `react-cost.tsx` | The React proxy tree used by the `reactCost` section.                        |
