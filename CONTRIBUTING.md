# Contributing to PlotLibre

PlotLibre is in early architectural development. Read these files before making changes:

1. `AGENTS.md`
2. `docs/ARCHITECTURE.md`
3. `docs/ALGORITHM_POLICY.md`
4. `docs/handover/LATEST.md`

## Development checks

```bash
npm install
npm run typecheck
npm test
npm run handover:check
```

## Pull requests

A pull request should contain one coherent vertical improvement. It must explain:

- what changed;
- why the architecture needs it;
- public API impact;
- PlotJSON impact;
- geometry and interaction state-machine edge cases;
- validation commands;
- license/provenance considerations.

## New symbols

A new symbol is incomplete without:

- a stable type name;
- a `PlotDefinition`;
- documented control point semantics;
- documented parameters and units;
- degenerate input behavior;
- geometry tests;
- PlotJSON round-trip coverage;
- interaction behavior or a documented reason it is non-interactive;
- a handover update.

## Documentation and handover

Every completed development milestone must update `docs/handover/LATEST.md` and add a dated immutable handover file. This is part of the definition of done.
