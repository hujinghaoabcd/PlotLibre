import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import process from "node:process";
import { performance } from "node:perf_hooks";
import { PlotRegistry, PlotStore } from "@plotlibre/core";
import { MapLibreSelectionRegionResolver } from "@plotlibre/maplibre";
import {
  straightArrowDefinition,
  STRAIGHT_ARROW_TYPE,
} from "@plotlibre/symbols";

const OUTPUT_DIRECTORY = "artifacts/region-selection-benchmark";
const BASE_LONGITUDE = 118.7;
const BASE_LATITUDE = 32.0;
const GRID_COLUMNS = 100;
const GRID_SPACING_DEGREES = 0.0005;
const PROJECTION_SCALE = 100_000;
const RENDERED_DUPLICATES_PER_FEATURE = 2;
const PROFILE = "arrow.straight / all-candidates / deterministic-linear-projector";

const CASES = [
  { size: 100, warmups: 5, repetitions: 30, profileRepetitions: 7 },
  { size: 1_000, warmups: 3, repetitions: 24, profileRepetitions: 7 },
  { size: 10_000, warmups: 2, repetitions: 20, profileRepetitions: 7 },
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
  projection:
    "x=(lng-118.7)*100000; y=(32.2-lat)*100000; CSS-pixel-like deterministic adapter",
  regionPolicy: "one rectangle containing every generated candidate",
  renderedDuplicatesPerFeature: RENDERED_DUPLICATES_PER_FEATURE,
  garbageCollectionAvailable: typeof global.gc === "function",
});

const results = [];
for (const benchmarkCase of CASES) {
  results.push(runCase(benchmarkCase));
}

const report = Object.freeze({
  schemaVersion: 2,
  environment,
  cases: results,
  limitations: [
    "This is a Node/CI resolver microbenchmark, not a browser frame-time or GPU benchmark.",
    "The headline total timings use an uninstrumented resolver path. Diagnostic phase timings are collected in separate instrumented runs and must not be added to or subtracted from the headline totals.",
    "queryRenderedFeatures is a deterministic adapter returning a prebuilt rendered-feature array; real MapLibre tile-index query latency is not measured.",
    "The fixture is 100% arrow.straight and every feature is a broad-phase candidate and an exact hit; it represents a deliberate worst-candidate-count profile, not a mixed production document.",
    "RSS observations include Node.js allocator and garbage-collector behavior and are not a retained-heap measurement.",
    "Timing is observational and no pass/fail latency threshold is enforced.",
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
    executeUninstrumentedResolution(fixture);
  }

  collectGarbage();
  const rssAfterWarmup = process.memoryUsage().rss;
  const totalSamples = [];
  let peakRss = rssAfterWarmup;

  for (let index = 0; index < repetitions; index += 1) {
    const sample = executeUninstrumentedResolution(fixture);
    assertResolutionSample(sample, size);
    totalSamples.push(sample);
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
  }

  const profileSamples = [];
  for (let index = 0; index < profileRepetitions; index += 1) {
    const sample = executeProfiledResolution(fixture);
    assertResolutionSample(sample, size);
    profileSamples.push(sample);
  }

  const first = totalSamples[0];
  if (!first) throw new Error(`Benchmark case ${size} produced no samples.`);

  return Object.freeze({
    size,
    warmups,
    repetitions,
    profileRepetitions,
    featureType: STRAIGHT_ARROW_TYPE,
    authoredControlPointsPerFeature: 2,
    queriedFeatureCount: first.metrics.queriedFeatureCount,
    uniqueRenderedPlotIdCount: first.metrics.uniqueRenderedPlotIdCount,
    candidateCount: first.metrics.candidateCount,
    generatedCandidateCount: first.metrics.generatedCandidateCount,
    projectedGeometryCount: first.metrics.projectedGeometryCount,
    selectedCount: first.selectedCount,
    timingsMs: Object.freeze({
      total: summarize(totalSamples.map((sample) => sample.totalMs)),
    }),
    throughputCandidatesPerSecond: summarize(
      totalSamples.map((sample) => size / (sample.totalMs / 1_000)),
    ),
    diagnosticProfileMs: Object.freeze({
      profiledTotal: summarize(profileSamples.map((sample) => sample.totalMs)),
      queryAdapter: summarize(profileSamples.map((sample) => sample.queryMs)),
      registryGenerate: summarize(
        profileSamples.map((sample) => sample.generateMs),
      ),
      projectCalls: summarize(profileSamples.map((sample) => sample.projectMs)),
      nonIsolatedRemainder: summarize(
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

function assertResolutionSample(sample, size) {
  if (sample.selectedCount !== size) {
    throw new Error(
      `Benchmark case ${size} selected ${sample.selectedCount}; expected ${size}.`,
    );
  }
  if (
    sample.metrics.candidateCount !== size ||
    sample.metrics.generatedCandidateCount !== size ||
    sample.metrics.uniqueRenderedPlotIdCount !== size
  ) {
    throw new Error(
      `Benchmark case ${size} returned inconsistent resolver metrics: ${JSON.stringify(sample.metrics)}.`,
    );
  }
}

function createFixture(size) {
  const store = new PlotStore();
  const registry = new PlotRegistry().register(straightArrowDefinition);
  const rendered = [];

  for (let index = 0; index < size; index += 1) {
    const column = index % GRID_COLUMNS;
    const row = Math.floor(index / GRID_COLUMNS);
    const longitude = BASE_LONGITUDE + column * GRID_SPACING_DEGREES;
    const latitude = BASE_LATITUDE + row * GRID_SPACING_DEGREES;
    const id = `benchmark-arrow-${String(index).padStart(5, "0")}`;

    store.add({
      id,
      plotType: STRAIGHT_ARROW_TYPE,
      controlPoints: [
        [longitude, latitude],
        [longitude + 0.0003, latitude + 0.0002],
      ],
    });

    for (
      let duplicate = 0;
      duplicate < RENDERED_DUPLICATES_PER_FEATURE;
      duplicate += 1
    ) {
      rendered.push({ properties: { plotId: id } });
    }
  }

  const maximumRow = Math.ceil(size / GRID_COLUMNS);
  const maximumX =
    (GRID_COLUMNS * GRID_SPACING_DEGREES + 0.002) * PROJECTION_SCALE;
  const minimumY =
    (0.2 - maximumRow * GRID_SPACING_DEGREES - 0.002) * PROJECTION_SCALE;
  const regionBounds = Object.freeze({
    minX: -200,
    minY: minimumY - 200,
    maxX: maximumX + 200,
    maxY: 20_200,
  });
  const regionRing = Object.freeze([
    Object.freeze({ x: regionBounds.minX, y: regionBounds.minY }),
    Object.freeze({ x: regionBounds.maxX, y: regionBounds.minY }),
    Object.freeze({ x: regionBounds.maxX, y: regionBounds.maxY }),
    Object.freeze({ x: regionBounds.minX, y: regionBounds.maxY }),
    Object.freeze({ x: regionBounds.minX, y: regionBounds.minY }),
  ]);

  return Object.freeze({ store, registry, rendered, regionBounds, regionRing });
}

function executeUninstrumentedResolution(fixture) {
  const resolver = new MapLibreSelectionRegionResolver(
    createMapAdapter(fixture),
    fixture.store,
    fixture.registry,
  );
  const started = performance.now();
  const resolution = resolver.resolve(fixture.regionRing, fixture.regionBounds);
  return Object.freeze({
    totalMs: performance.now() - started,
    selectedCount: resolution.ids.length,
    metrics: resolution.metrics,
  });
}

function executeProfiledResolution(fixture) {
  const phase = { queryMs: 0, generateMs: 0, projectMs: 0 };
  const map = createMapAdapter(fixture, phase);
  const registry = {
    generate(feature) {
      const started = performance.now();
      try {
        return fixture.registry.generate(feature);
      } finally {
        phase.generateMs += performance.now() - started;
      }
    },
  };
  const resolver = new MapLibreSelectionRegionResolver(
    map,
    fixture.store,
    registry,
  );
  const started = performance.now();
  const resolution = resolver.resolve(fixture.regionRing, fixture.regionBounds);
  const totalMs = performance.now() - started;
  return Object.freeze({
    totalMs,
    queryMs: phase.queryMs,
    generateMs: phase.generateMs,
    projectMs: phase.projectMs,
    remainderMs: Math.max(
      0,
      totalMs - phase.queryMs - phase.generateMs - phase.projectMs,
    ),
    selectedCount: resolution.ids.length,
    metrics: resolution.metrics,
  });
}

function createMapAdapter(fixture, phase) {
  if (phase === undefined) {
    return {
      queryRenderedFeatures() {
        return fixture.rendered;
      },
      project(position) {
        return projectPosition(position);
      },
    };
  }

  return {
    queryRenderedFeatures() {
      const started = performance.now();
      try {
        return fixture.rendered;
      } finally {
        phase.queryMs += performance.now() - started;
      }
    },
    project(position) {
      const started = performance.now();
      try {
        return projectPosition(position);
      } finally {
        phase.projectMs += performance.now() - started;
      }
    },
  };
}

function projectPosition(position) {
  return {
    x: (position[0] - BASE_LONGITUDE) * PROJECTION_SCALE,
    y: (BASE_LATITUDE + 0.2 - position[1]) * PROJECTION_SCALE,
  };
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
    "PlotLibre region-selection resolver benchmark",
    `Source ${report.environment.sourceGitSha}`,
    `Node ${report.environment.node}; ${report.environment.platform} ${report.environment.release}; ${report.environment.cpuModel}`,
    "",
    [
      "features".padStart(8),
      "candidates".padStart(10),
      "total med".padStart(12),
      "total p95".padStart(12),
      "cand/s med".padStart(12),
      "profile gen".padStart(12),
      "profile proj".padStart(12),
      "profile rest".padStart(12),
      "peak +MiB".padStart(10),
    ].join(" | "),
  ];

  for (const benchmarkCase of report.cases) {
    lines.push(
      [
        String(benchmarkCase.size).padStart(8),
        String(benchmarkCase.candidateCount).padStart(10),
        formatMs(benchmarkCase.timingsMs.total.median).padStart(12),
        formatMs(benchmarkCase.timingsMs.total.p95).padStart(12),
        Math.round(
          benchmarkCase.throughputCandidatesPerSecond.median,
        ).toLocaleString("en-US").padStart(12),
        formatMs(
          benchmarkCase.diagnosticProfileMs.registryGenerate.median,
        ).padStart(12),
        formatMs(
          benchmarkCase.diagnosticProfileMs.projectCalls.median,
        ).padStart(12),
        formatMs(
          benchmarkCase.diagnosticProfileMs.nonIsolatedRemainder.median,
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
        `| ${benchmarkCase.size.toLocaleString("en-US")} | ${benchmarkCase.repetitions} | ${benchmarkCase.queriedFeatureCount.toLocaleString("en-US")} | ${benchmarkCase.candidateCount.toLocaleString("en-US")} | ${formatNumber(benchmarkCase.timingsMs.total.median)} | ${formatNumber(benchmarkCase.timingsMs.total.p95)} | ${Math.round(benchmarkCase.throughputCandidatesPerSecond.median).toLocaleString("en-US")} | ${formatNumber(benchmarkCase.diagnosticProfileMs.registryGenerate.median)} | ${formatNumber(benchmarkCase.diagnosticProfileMs.projectCalls.median)} | ${formatNumber(benchmarkCase.diagnosticProfileMs.nonIsolatedRemainder.median)} | ${formatNumber(benchmarkCase.memory.peakAdditionalDuringSamplesBytes / 1024 ** 2)} |`,
    )
    .join("\n");

  return `# PlotLibre Region-Selection Resolver Benchmark\n\nGenerated: ${report.environment.timestamp}  \nSource head SHA: \`${report.environment.sourceGitSha}\`  \nWorkflow checkout SHA: \`${report.environment.workflowGitSha}\`  \nNode: \`${report.environment.node}\`  \nPlatform: \`${report.environment.platform} ${report.environment.release} ${report.environment.arch}\`  \nCPU: \`${report.environment.cpuModel}\` (${report.environment.logicalCpuCount} logical CPUs)  \nTotal memory: ${(report.environment.totalMemoryBytes / 1024 ** 3).toFixed(2)} GiB  \nProfile: \`${report.environment.profile}\`\n\n## Headline results\n\n| Features | Total repetitions | Rendered rows | Unique candidates | Total median ms | Total p95 ms | Median candidates/s | Profile generate median ms | Profile project median ms | Profile non-isolated remainder median ms | Peak additional RSS MiB |\n|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n${rows}\n\nThe headline total and throughput columns come from uninstrumented resolver runs. The three profile columns come from separate instrumented runs and are diagnostic only; they are not an additive decomposition of the headline total.\n\n## Fixture\n\n- 100% \`${STRAIGHT_ARROW_TYPE}\`; two authored controls per feature.\n- ${RENDERED_DUPLICATES_PER_FEATURE} rendered rows per PlotFeature to exercise layer/tile deduplication.\n- Every PlotFeature is a broad-phase candidate and an exact region hit.\n- Deterministic linear CSS-pixel-like projector; no browser, GPU, tile worker or style evaluation.\n- Warmups, total repetitions and profile repetitions are recorded in JSON for every case.\n\n## Limitations\n\n${report.limitations.map((item) => `- ${item}`).join("\n")}\n`;
}

function formatMs(value) {
  return `${formatNumber(value)} ms`;
}

function formatMiB(bytes) {
  return `${formatNumber(bytes / 1024 ** 2)} MiB`;
}

function formatNumber(value) {
  return Number(value).toFixed(3);
}
