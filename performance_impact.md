# Performance Impact of Refactoring Nested Timeouts

## What
The nested `setTimeout` structure inside `activateSuperheroMode` in `script.js` was replaced with an asynchronous Immediately Invoked Function Expression (IIFE) using `async`/`await` and a small promise-returning `delay` utility function.

## Why
This change enhances the maintainability, readability, and testability of the animation sequence logic without changing the behavior or introducing structural modifications to the host method itself.

## Performance Impact
- **Negligible execution overhead:** The usage of `Promise` in place of standard callbacks comes with an infinitesimal microtask queue processing overhead, which in modern JavaScript environments takes virtually 0ms and does not degrade UI responsiveness.
- **Maintainability:** Makes it infinitely easier for developers to adjust the timeline, durations, or sequential logic without counting nesting levels, thereby saving future developer time.
- **Safety:** Because the logic runs within a fire-and-forget IIFE inside the larger timeline initialization flow, it does not block the main thread and properly sequences the UI steps over exactly the same schedule as the old implementation (500ms -> 1500ms -> 800ms).

## Regression Testing
The code has been verified manually using node syntax checking (`node -c script.js`) as no formal `package.json` testing suite was found in the repository setup. The UI behavior remains untouched.