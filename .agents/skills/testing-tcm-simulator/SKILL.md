---
name: testing-tcm-simulator
description: Run and test the STORM_INC TCM tropical cyclone simulator (Storm_Inc/TCM.html) end-to-end in a browser. Use when verifying UI/rendering changes to the JS modules under Storm_Inc/js/.
---

# Testing the STORM_INC TCM Simulator

The simulator is a static, no-build web app. `Storm_Inc/TCM.html` loads ES modules from
`Storm_Inc/js/` (`type="module"`). There is **no package.json, bundler, linter, or test suite**.

## Serve & open
ES modules require HTTP (not `file://`). From the repo root:
```
python3 -m http.server 8099
```
Then open `http://localhost:8099/Storm_Inc/TCM.html`. The landing page `index.html` links to it via
"Access TCM Interface". External CDNs (tailwind, d3, topojson) must be reachable.

## Syntax-check JS after edits (no linter exists)
`.js` files are ESM but there is no package.json `type`, so plain `node --check` fails on `import`.
Use stdin with module mode:
```
for f in Storm_Inc/js/*.js; do node --check --input-type=module < "$f" || echo "FAIL $f"; done
```
To smoke-test `utils.js` exports as real ESM, copy to a `.mjs` in a temp dir and import from there
(importing a `.js` directly from an ESM `-e` context makes Node treat it as CommonJS and can wrongly
report "Named export not found").

## Key UI flows (how to reach features)
- **INITIALIZE** (bottom bar) generates a cyclone; it then auto-animates through its whole lifecycle
  (TD → hurricane → extratropical) in ~1–2 min. **RESTART** resets and immediately spawns a new active storm.
- **Pause/Play** button (▮▮ / ▶) freezes the sim. IMPORTANT: overlays like the humidity field only
  (re)draw on an animation frame — after toggling an overlay while paused, tap Play then Pause once to
  force a redraw so the overlay appears.
- Bottom toolbar toggles (by `title`, left→right): **Wind Field** (this is the Wind **Radii** toggle,
  `toggleWindRadiiButton`, bullseye icon), **Pressure**, **850mb RH** (humidity, droplet icon),
  **100m Level Wind**, **Forecast**, **History**. Active toggles turn cyan.
- **ICWC** button (red, right side; `generateJTWCButton`) opens the JTWC/ICWC product modal with tabs:
  Warning Graphic, Wind Prob 34kt/64kt, Sat Imagery, Phase Space, Station Obs, Synoptic Chart. Each
  renders a canvas image; watch for "GENERATING..." → image (or a "NO CYCLONE DATA" error).

## What maps to which code (useful for targeted verification)
- Satellite cloud render: `satellite-view.js` (WebGL shader).
- Humidity isolines: `visualization.js` `calculateBackgroundHumidity` / `calculateTotalHumidity`.
- Wind radii rings: `visualization.js` `drawWindRadii` (+ `cyclone-model.js` radii calc); uses
  `projectPoint` from `utils.js`.
- JTWC products: `visualization.js` `renderJTWCStyle` / `renderProbabilitiesStyle` /
  `renderStationSynopticChart`; city metrics use `calculateDistance` from `utils.js`.
- Every map draw goes through `main.js` `buildMapOptions(state, extra)` → `drawMap`.

Because everything is wired via ES-module named imports, a broken/missing export makes the whole app
fail to load — so "app boots + each feature renders" is strong evidence a refactor is safe.

## Devin Secrets Needed
None. The app is fully static/local; no login, API keys, or secrets are required.
