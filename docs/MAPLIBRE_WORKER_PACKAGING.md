# MapLibre GL JS 6 Worker Packaging

## Problem

MapLibre GL JS 6 uses an ESM worker entry named:

```text
maplibre-gl-worker.mjs
```

That worker imports a second sibling module:

```text
maplibre-gl-shared.mjs
```

A static-site bundler may bundle the main `maplibre-gl` application entry while leaving these sibling worker modules out of the output. On a Vite SPA deployment, a missing module URL can be silently answered with `index.html`.

The visible symptoms are misleading:

- MapLibre canvas and controls appear;
- PlotLibre Store contains objects;
- the UI reports that examples loaded;
- no GeoJSON feature is rendered;
- newly drawn objects also remain invisible.

The cause is that the MapLibre worker cannot load and therefore cannot process GeoJSON sources.

## PlotLibre solution

The Playground resolves the installed `maplibre-gl` package during Vite configuration and copies both official modules into:

```text
apps/playground/public/assets/
```

Generated files:

```text
maplibre-gl-worker.mjs
maplibre-gl-shared.mjs
```

They are generated from the exact installed MapLibre version and are not committed to the repository.

Before the first `Map` is created, the application calls:

```ts
setWorkerUrl(`${import.meta.env.BASE_URL}assets/maplibre-gl-worker.mjs`);
```

For the GitHub Pages project site this resolves to:

```text
/PlotLibre/assets/maplibre-gl-worker.mjs
```

The relative import inside the worker then resolves its shared module from the same directory.

## Required invariants

Every production build must guarantee:

1. both module URLs return HTTP 200;
2. both responses use a JavaScript MIME type;
3. neither URL returns the SPA HTML fallback;
4. the worker entry still imports `maplibre-gl-shared.mjs`;
5. `setWorkerUrl()` is called before `new Map()`;
6. the paths include the configured Vite base;
7. generated worker modules are ignored by Git.

## Browser validation

Playwright now verifies:

- worker entry is real JavaScript;
- shared module is real JavaScript;
- committed GeoJSON source exists;
- the source contains generated fill and outline features;
- committed fill and line layers exist and are visible;
- `queryRenderedFeatures()` returns PlotLibre features from the canvas.

This is stronger than checking Store size or UI counters. A rendering milestone is not considered complete unless source data and actual MapLibre rendering are both verified.

## Upgrade policy

Whenever MapLibre is upgraded:

1. inspect the installed distribution filenames;
2. verify whether the worker imports additional sibling modules;
3. update the copy list if required;
4. run the worker-module and rendered-feature E2E tests;
5. verify the GitHub Pages deployment after merge.

Do not copy MapLibre worker code manually into source control. Always package the files from the installed dependency so their version and license remain aligned with `package.json`.
