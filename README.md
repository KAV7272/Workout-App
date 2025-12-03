## Workout App — Weekly Weight Tracking

A minimal, single-page workout tracker that prompts every Sunday for the weekly workout goal and current weight, tracks completions, and keeps a week-by-week history. Data is stored in the browser via `localStorage` so it stays on the device.

### Run locally

```bash
npm start
# open http://localhost:3333
```

### Run with Docker

```bash
docker build -t workout-app .
docker run -p 3333:3333 workout-app
```

### Features
- Weekly check-in modal (auto-opens on a new week starting Sunday) to capture goal + weight.
- Log workouts against the weekly goal with a progress bar.
- Toggle body-weight moves (push-ups, squats, lunges, plank, burpees, crunches).
- History tab shows week range, completed vs goal, and weight (latest week is pinned to the top).
- Optional trend support: use `window.trendAPI.getSeries()` in the browser console to retrieve a ready-to-plot array of `{label, weight, completionRate}` points. A sample backend response also lives at `/api/trend`.

### Notes
- The bundled Node server is dependency-free and only serves static files plus a sample trend feed at `/api/trend`.
- Storage is local to the browser; Docker restarts do not wipe your data as long as you keep using the same browser.
