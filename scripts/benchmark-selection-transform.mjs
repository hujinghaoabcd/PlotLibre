import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import process from "node:process";
import { performance } from "node:perf_hooks";
import {
  createPlotFeature,
  PlotRegistry,
  PlotStore,
} from "@plotlibre/core";
import {
  createSelectionTransformCommand,
  SelectionController,
  SelectionTransformSession,
} from "@plotlibre/interaction";
import {
  straightArrowDefinition,
  STRAIGHT_ARROW_TYPE,
} from "@plotlibre/symbols";

const OUTPUT_DIRECTORY = "artifacts/selection-transform-benchmark";
const BASE_LONGITUDE = 118.72;
const BASE_LATITUDE = 32.02;
const GRID_COLUMNS = 40;
const GRID_SPACING_DEGREES = 0.00035;
const CLOCKWISE_RADIANS = Math.PI / 12;
const PROFILE =
  "arrow.straight / complete-selection / shared-local-frame / 15-degree-clockwise-rotation";

const CASES = [
  { size: 1, warmups: 8, repetitions: 60, profileRepetitions: 12 },
  { size: 100, warmups: 5, repetitions: 36, profileRepetitions: 10 },
  { size: 1_000, warmups: 3, repetitions: 18, profileRepetitions: 8 },
];

const environment = Object.freeze({
  timestamp: new Date().toISOString(),
  sourceGitSha:
    process.env.PLOTLIBRE_BENCHMARK_SHA ?? process.env.GITHUB_SHA ?? "local",
  workflowGitSha: process.env.GITHUB_SHA ?? "local",
  runnerName: process.env.RUNNER_NAME ?? "local",
  runnerOs: process.env.RUNNER_OS ?? os.platform(),
  node: process.version,
  platform: os.platform(),
  release: os.release(),
  arch: os.arch(),
  cpuModel: os.cpus()[0]?.model ?? "unknown",
  logicalCpuCount: os.cpus().length,
  totalMemoryBytes: os.totalmem(),
  profile: PROFILE,
  garbageCollectionAvailable: typeof global.gc === "function",
});

const results = [];
for (const benchmarkCase of CASES) {
  results.push(runCase(benchmarkCase));
}

const report = Object.freeze({
  schemaVersion: 1,
  environment,
  cases: results,
  limitations: [
    "This is a Node/CI interaction-layer microbenchmark, not browser frame time, MapLibre projection time, DOM overlay time or GPU time.",
    "The fixture uses only arrow.straight and rotates the complete selection by 15 clockwise degrees in one shared local-metre frame.",
    "Headline preview timings use an uninstrumented Registry path. Canonicalize/generate phase observations come from separate instrumented runs and must not be algebraically mixed with headline samples.",
    "Commit preparation creates and validates the atomic command but does not execute Store listeners, renderer work, History notification or browser painting.",
    "RSS observations include Node.js allocator and garbage-collector behavior and are not retained-heap measurements.",
    "Timing is observational; this benchmark enforces correctness only and defines no latency SLA.",
  ],
});

await mkdir(OUTPUT_DIRECTORY, { recursive: true });
await writeFile(
  `${OUTPUT_DIRECTORY}/results.json`,
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
await writeFile(
  `${OUTPUT_DIRECTORY}/results.md`,
  renderMarkdown(report),
  "utf8",
);

console.log(renderConsoleTable(report));
console.log(`\nWrote ${OUTPUT_DIRECTORY}/results.json`);
console.log(`Wrote ${OUTPUT_DIRECTORY}/results.md`);

function runCase({ size, warmups, repetitions, profileRepetitions }) {
  collectGarbage();
  const rssBeforeFixture = process.memoryUsage().rss;
  const fixture = createFixture(size);

  for (let index = 0; index < warmups; index += 1) {
    executeUninstrumentedSample(fixture);
  }

  collectGarbage();
  const rssAfterWarmup = process.memoryUsage().rss;
  const previewSamples = [];
  const commitSamples = [];
  let peakRss = rssAfterWarmup;

  for (let index = 0; index < repetitions; index += 1) {
    const sample = executeUninstrumentedSample(fixture);
    assertSample(sample, size);
    previewSamples.push(sample.previewMs);
    commitSamples.push(sample.commitPreparationMs);
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
  }

  const profileSamples = [];
  for (let index = 0; index < profileRepetitions; index += 1) {
    const sample = executeProfiledSample(fixture);
    assertSample(sample, size);
    profileSamples.push(sample);
  }

  return Object.freeze({
    size,
    warmups,
    repetitions,
    profileRepetitions,
    featureType: STRAIGHT_ARROW_TYPE,
    authoredControlPointsPerFeature: 2,
    transformedFeatureCount: size,
    transformedControlPointCount: size * 2,
    clockwiseRadians: CLOCKWISE_RADIANS,
    timingsMs: Object.freeze({
      previewPreparation: summarize(previewSamples),
      commandPreparation: summarize(commitSamples),
    }),
    throughputFeaturesPerSecond: summarize(
      previewSamples.map((milliseconds) => size / (milliseconds / 1_000)),
    ),
    diagnosticProfileMs: Object.freeze({
      sessionConstruction: summarize(
        profileSamples.map((sample) => sample.sessionConstructionMs),
      ),
      profiledPreviewTotal: summarize(
        profileSamples.map((sample) => sample.previewMs),
      ),
      registryCanonicalize: summarize(
        profileSamples.map((sample) => sample.canonicalizeMs),
      ),
      registryGenerate: summarize(
        profileSamples.map((sample) => sample.generateMs),
      ),
      nonIsolatedTransformRemainder: summarize(
        profileSamples.map((sample) => sample.remainderMs),
      ),
    }),
    memory: Object.freeze({
      rssBeforeFixtureBytes: rssBeforeFixture,
      rssAfterWarmupBytes: rssAfterWarmup,
      peakRssBytes: peakRss,
      fixtureAndWarmupDeltaBytes: Math.max(0, rssAfterWarmup - rssBeforeFixture),
      peakAdditionalDuringSamplesBytes: Math.max(0, peakRss - rssAfterWarmup),
    }),
  });
}

function createFixture(size) {
  const registry = new PlotRegistry().register(straightArrowDefinition);
  const store = new PlotStore();
  const ids = [];

  for (let index = 0; index < size; index += 1) {
    const column = index % GRID_COLUMNS;
    const row = Math.floor(index / GRID_COLUMNS);
    const longitude = BASE_LONGITUDE + column * GRID_SPACING_DEGREES;
    const latitude = BASE_LATITUDE + row * GRID_SPACING_DEGREES;
    const id = `transform-arrow-${String(index).padStart(4, "0")}`;
    const feature = registry.canonicalize(
      createPlotFeature({
        id,
        plotType: STRAIGHT_ARROW_TYPE,
        definitionVersion: straightArrowDefinition.version,
        controlPoints: [
          [longitude, latitude],
          [longitude + 0.00022, latitude + 0.00017],
        ],
        parameters: { ...straightArrowDefinition.defaultParameters },
        style: { ...straightArrowDefinition.defaultStyle },
        metadata: { benchmarkIndex: index },
      }),
    );
    registry.generate(feature);
    store.add(feature);
    ids.push(id);
  }

  const selection = new SelectionController(store);
  selection.replace(ids);
  const originals = Object.freeze(ids.map((id) => store.get(id)));
  return Object.freeze({
    registry,
    store,
    selection,
    selectionSnapshot: selection.snapshot(),
    originals,
  });
}

function executeUninstrumentedSample(fixture) {
  const session = new SelectionTransformSession(
    "rotate",
    fixture.originals,
    fixture.registry,
  );
  const pointer = pointerFixture(session.frame);
  session.pointerDown(pointer.start);

  const previewStarted = performance.now();
  const snapshot = session.pointerMove(pointer.current);
  const previewMs = performance.now() - previewStarted;
  const transformed = session.previewFeatures();

  const commandStarted = performance.now();
  const command = createSelectionTransformCommand(
    fixture.store,
    fixture.selection,
    {
      completion: Object.freeze({
        completed: true,
        kind: "rotate",
        originals: fixture.originals,
        transformed,
        clockwiseRadians: CLOCKWISE_RADIANS,
      }),
      selectionSnapshot: fixture.selectionSnapshot,
    },
  );
  const commitPreparationMs = performance.now() - commandStarted;

  return Object.freeze({
    previewMs,
    commitPreparationMs,
    snapshot,
    transformed,
    command,
  });
}

function executeProfiledSample(fixture) {
  const phase = { canonicalizeMs: 0, generateMs: 0 };
  const instrumentedRegistry = {
    canonicalize(feature) {
      const started = performance.now();
      try {
        return fixture.registry.canonicalize(feature);
      } finally {
        phase.canonicalizeMs += performance.now() - started;
      }
    },
    generate(feature) {
      const started = performance.now();
      try {
        return fixture.registry.generate(feature);
      } finally {
        phase.generateMs += performance.now() - started;
      }
    },
  };

  const constructionStarted = performance.now();
  const session = new SelectionTransformSession(
    "rotate",
    fixture.originals,
    instrumentedRegistry,
  );
  const sessionConstructionMs = performance.now() - constructionStarted;
  const pointer = pointerFixture(session.frame);
  session.pointerDown(pointer.start);

  const previewStarted = performance.now();
  const snapshot = session.pointerMove(pointer.current);
  const previewMs = performance.now() - previewStarted;
  const transformed = session.previewFeatures();

  const commandStarted = performance.now();
  const command = createSelectionTransformCommand(
    fixture.store,
    fixture.selection,
    {
      completion: Object.freeze({
        completed: true,
        kind: "rotate",
        originals: fixture.originals,
        transformed,
        clockwiseRadians: CLOCKWISE_RADIANS,
      }),
      selectionSnapshot: fixture.selectionSnapshot,
    },
  );
  const commitPreparationMs = performance.now() - commandStarted;

  return Object.freeze({
    previewMs,
    commitPreparationMs,
    sessionConstructionMs,
    canonicalizeMs: phase.canonicalizeMs,
    generateMs: phase.generateMs,
    remainderMs: Math.max(
      0,
      previewMs - phase.canonicalizeMs - phase.generateMs,
    ),
    snapshot,
    transformed,
    command,
  });
}

function pointerFixture(frame) {
  const width = frame.boundsMeters.maxX - frame.boundsMeters.minX;
  const height = frame.boundsMeters.maxY - frame.boundsMeters.minY;
  const radius = Math.max(10, Math.hypot(width, height) * 0.65);
  return Object.freeze({
    start: Object.freeze({
      x: frame.pivotMeters.x + radius,
      y: frame.pivotMeters.y,
    }),
    current: Object.freeze({
      x: frame.pivotMeters.x + radius * Math.cos(CLOCKWISE_RADIANS),
      y: frame.pivotMeters.y - radius * Math.sin(CLOCKWISE_RADIANS),
    }),
  });
}

function assertSample(sample, size) {
  if (sample.snapshot.status !== "active" || sample.snapshot.rejection) {
    throw new Error(
      `Transform benchmark case ${size} did not produce one valid active preview.`,
    );
  }
  if (sample.transformed.length !== size || sample.command === undefined) {
    throw new Error(
      `Transform benchmark case ${size} produced an incomplete preview or command.`,
    );
  }
  for (const [index, transformed] of sample.transformed.entries()) {
    const original = sample.command === undefined
      ? undefined
      : transformed.id;
    if (!original || transformed.revision !== 1) {
      throw new Error(
        `Transform benchmark case ${size} produced an invalid revision at index ${index}.`,
      );
    }
  }
}

function collectGarbage() {
  if (typeof global.gc === "function") global.gc();
}

function summarize(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return Object.freeze({
    minimum: sorted[0],
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    maximum: sorted.at(-1),
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
  });
}

function percentile(sorted, probability) {
  if (sorted.length === 0) return Number.NaN;
  const index = Math.max(
    0,
    Math.min(sorted.length - 1, Math.ceil(probability * sorted.length) - 1),
  );
  return sorted[index];
}

function renderConsoleTable(report) {
  const lines = [
    "PlotLibre selection-transform benchmark",
    `Source ${report.environment.sourceGitSha}`,
    `Node ${report.environment.node}; ${report.environment.platform} ${report.environment.release}; ${report.environment.cpuModel}`,
    "",
    [
      "features".padStart(8),
      "preview med".padStart(12),
      "preview p95".padStart(12),
      "command med".padStart(12),
      "feat/s med".padStart(12),
      "profile canon".padStart(13),
      "profile gen".padStart(12),
      "profile rest".padStart(12),
      "peak +MiB".padStart(10),
    ].join(" | "),
  ];

  for (const benchmarkCase of report.cases) {
    lines.push(
      [
        String(benchmarkCase.size).padStart(8),
        formatMs(benchmarkCase.timingsMs.previewPreparation.median).padStart(12),
        formatMs(benchmarkCase.timingsMs.previewPreparation.p95).padStart(12),
        formatMs(benchmarkCase.timingsMs.commandPreparation.median).padStart(12),
        Math.round(
          benchmarkCase.throughputFeaturesPerSecond.median,
        ).toLocaleString("en-US").padStart(12),
        formatMs(
          benchmarkCase.diagnosticProfileMs.registryCanonicalize.median,
        ).padStart(13),
        formatMs(
          benchmarkCase.diagnosticProfileMs.registryGenerate.median,
        ).padStart(12),
        formatMs(
          benchmarkCase.diagnosticProfileMs.nonIsolatedTransformRemainder.median,
        ).padStart(12),
        formatMiB(
          benchmarkCase.memory.peakAdditionalDuringSamplesBytes,
        ).padStart(10),
      ].join(" | "),
    );
  }
  return lines.join("\n");
}

function renderMarkdown(report) {
  const rows = report.cases
    .map(
      (benchmarkCase) =>
        `| ${benchmarkCase.size.toLocaleString("en-US")} | ${benchmarkCase.repetitions} | ${formatNumber(benchmarkCase.timingsMs.previewPreparation.median)} | ${formatNumber(benchmarkCase.timingsMs.previewPreparation.p95)} | ${formatNumber(benchmarkCase.timingsMs.commandPreparation.median)} | ${Math.round(benchmarkCase.throughputFeaturesPerSecond.median).toLocaleString("en-US")} | ${formatNumber(benchmarkCase.diagnosticProfileMs.registryCanonicalize.median)} | ${formatNumber(benchmarkCase.diagnosticProfileMs.registryGenerate.median)} | ${formatNumber(benchmarkCase.diagnosticProfileMs.nonIsolatedTransformRemainder.median)} | ${formatNumber(benchmarkCase.memory.peakAdditionalDuringSamplesBytes / 1024 ** 2)} |`,
    )
    .join("\n");

  return `# PlotLibre Selection-Transform Benchmark\n\nGenerated: ${report.environment.timestamp}  \nSource head SHA: \`${report.environment.sourceGitSha}\`  \nWorkflow checkout SHA: \`${report.environment.workflowGitSha}\`  \nNode: \`${report.environment.node}\`  \nPlatform: \`${report.environment.platform} ${report.environment.release} ${report.environment.arch}\`  \nCPU: \`${report.environment.cpuModel}\` (${report.environment.logicalCpuCount} logical CPUs)  \nTotal memory: ${(report.environment.totalMemoryBytes / 1024 ** 3).toFixed(2)} GiB  \nProfile: \`${report.environment.profile}\`\n\n## Headline results\n\n| Selected features | Repetitions | Preview median (ms) | Preview p95 (ms) | Command preparation median (ms) | Median features/s | Diagnostic canonicalize median (ms) | Diagnostic generate median (ms) | Diagnostic remainder median (ms) | Peak additional RSS (MiB) |\n|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n${rows}\n\nPreview preparation transforms every authored control, canonicalizes and Registry-generates every member. Command preparation validates the captured selection and Store state and creates one stale-safe atomic command without executing it.\n\n## Limitations\n\n${report.limitations.map((item) => `- ${item}`).join("\n")}\n`;
}

function formatMs(value) {
  return `${formatNumber(value)} ms`;
}

function formatMiB(bytes) {
  return formatNumber(bytes / 1024 ** 2);
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "n/a";
  if (Math.abs(value) >= 100) return value.toFixed(1);
  if (Math.abs(value) >= 10) return value.toFixed(2);
  return value.toFixed(3);
}
