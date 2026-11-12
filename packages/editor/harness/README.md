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
| `reactCost`     | What do the toolbar and the document info panel cost in React, and how often does React re-render?       |
| `tableHeavy`    | What does a keystroke cost in a document made of tables, next to a paragraph document of the same size?  |
| `collaboration` | What does the Y.Doc binding cost on the typing side and on the receiving side?                           |

Every section also gets its own node, so one section can be read on its own: `#bench-lowlightAB`,
`#bench-sideMenuAB`, `#bench-serialization`, `#bench-updatePath`, `#bench-documentInfo`,
`#bench-profiles`, `#bench-reactCost`, `#bench-tableHeavy`, `#bench-collaboration`,
`#bench-diagnostics`.

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

The `tableHeavy` section adds a third split: the part that runs the plugin pipeline, the part that
updates the DOM, and the number of reads that force the browser to lay the document out. The DOM
part is the one a plugin profiler cannot see, and it is the one that decides whether the editor keeps
up with the display.

Two positions are measured in a table document, and they are not interchangeable: inside a cell,
which is where a user types, and the start of the document, which in a table document is _between_ two
cells. Inserting there is not a text insertion — it makes ProseMirror repair the table structure — so
that number measures the repair, not typing. Measuring a table document at the wrong position makes
the tables look twelve times more expensive than they are.

The `collaboration` section sets up two peers that share one document: the first one writes into its
Y.Doc, the second one receives the updates. Both directions are measured, because they are paid by
different people — the local write by the person who types, the remote apply by everybody else in
the session. The local write is timed inside the Y.Doc transaction, the remote apply around
`Y.applyUpdate`.

Two things have to be true for the numbers to mean anything, and both are reported: the content has
to have reached both editors (`contentFlowed`), and the second peer has to have received the updates
(`remote.transactions`, `remote.converged`). A peer that is synced too early — before the first
editor rendered — ends up with a document that is missing the structs the incremental updates refer
to; Yjs parks such an update instead of applying it, and the measurement would silently measure
nothing.

The section also reports the encoded size of the whole shared document after the first, the tenth
and the last update (`remote.docSizeAfterApply`). A binding that keeps position bookkeeping in the
shared document grows it even when the content does not change, and that growth is what the server
has to store.

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
| `react-cost.tsx` | The React proxy tree used by the `reactCost` section.                       |
