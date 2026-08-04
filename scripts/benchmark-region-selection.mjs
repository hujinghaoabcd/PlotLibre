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
  { size: 100, warmups: 3, repetitions: 12 },
  { size: 1_000, warmups: 2, repetitions: 8 },
  { size: 10_000, warmups: 1, repetitions: 5 },
];

const environment = Object.freeze({
  timestamp: new Date().toISOString(),
  gitSha: process.env.GITHUB_SHA ?? process.env.PLOTLIBRE_BENCHMARK_SHA ?? "local",
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
    "This is a Node/CI resolver microbenchmark, not a browser frame-time or GPU benchmark.",
    "queryRenderedFeatures is a deterministic adapter returning a prebuilt rendered-feature array; real MapLibre tile-index query latency is not measured.",
    "The measured total includes rendered-id deduplication, PlotStore-order filtering, Registry generation, projection and exact screen intersection.",
    "The fixture is 100% arrow.straight and every feature is a broad-phase candidate and an exact hit; it represents a deliberate worst-candidate-count profile, not a mixed production document.",
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

function runCase({ size, warmups, repetitions }) {
  const fixture = createFixture(size);

  for (let index = 0; index < warmups; index += 1) {
    executeResolution(fixture);
  }

  const samples = [];
  const rssBefore = process.memoryUsage().rss;
  let peakRss = rssBefore;

  for (let index = 0; index < repetitions; index += 1) {
    const sample = executeResolution(fixture);
    samples.push(sample);
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
  }

  const first = samples[0];
  if (!first) throw new Error(`Benchmark case ${size} produced no samples.`);
  for (const sample of samples) {
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

  return Object.freeze({
    size,
    warmups,
    repetitions,
    featureType: STRAIGHT_ARROW_TYPE,
    authoredControlPointsPerFeature: 2,
    queriedFeatureCount: first.metrics.queriedFeatureCount,
    uniqueRenderedPlotIdCount: first.metrics.uniqueRenderedPlotIdCount,
    candidateCount: first.metrics.candidateCount,
    generatedCandidateCount: first.metrics.generatedCandidateCount,
    projectedGeometryCount: first.metrics.projectedGeometryCount,
    selectedCount: first.selectedCount,
    timingsMs: Object.freeze({
      total: summarize(samples.map((sample) => sample.totalMs)),
      queryAdapter: summarize(samples.map((sample) => sample.queryMs)),
      registryGenerate: summarize(samples.map((sample) => sample.generateMs)),
      projectCalls: summarize(samples.map((sample) => sample.projectMs)),
      orderingDedupAndIntersection: summarize(
        samples.map((sample) => sample.residualMs),
      ),
    }),
    throughputCandidatesPerSecond: summarize(
      samples.map((sample) => size / (sample.totalMs / 1_000)),
    ),
    memory: Object.freeze({
      rssBeforeBytes: rssBefore,
      peakRssBytes: peakRss,
      peakDeltaBytes: Math.max(0, peakRss - rssBefore),
    }),
  });
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

    for (let duplicate = 0; duplicate < RENDERED_DUPLICATES_PER_FEATURE; duplicate += 1) {
      rendered.push({ properties: { plotId: id } });
    }
  }

  const maximumRow = Math.ceil(size / GRID_COLUMNS);
  const maximumX =
    (GRID_COLUMNS * GRID_SPACING_DEGREES + 0.002) * PROJECTION_SCALE;
  const maximumY =
    (0.2 - maximumRow * GRID_SPACING_DEGREES + 0.002) * PROJECTION_SCALE;
  const minimumY =
    (0.2 - maximumRow * GRID_SPACING_DEGREES - 0.002) * PROJECTION_SCALE;
  const regionBounds = Object.freeze({
    minX: -200,
    minY: Math.min(minimumY, maximumY) - 200,
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

function executeResolution(fixture) {
  const phase = {
    queryMs: 0,
    generateMs: 0,
    projectMs: 0,
  };

  const map = {
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
        return {
          x: (position[0] - BASE_LONGITUDE) * PROJECTION_SCALE,
          y: (BASE_LATITUDE + 0.2 - position[1]) * PROJECTION_SCALE,
        };
      } finally {
        phase.projectMs += performance.now() - started;
      }
    },
  };

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
  const residualMs = Math.max(
    0,
    totalMs - phase.queryMs - phase.generateMs - phase.projectMs,
  );

  return Object.freeze({
    totalMs,
    queryMs: phase.queryMs,
    generateMs: phase.generateMs,
    projectMs: phase.projectMs,
    residualMs,
    selectedCount: resolution.ids.length,
    metrics: resolution.metrics,
  });
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
    `Node ${report.environment.node}; ${report.environment.platform} ${report.environment.release}; ${report.environment.cpuModel}`,
    "",
    [
      "features".padStart(8),
      "candidates".padStart(10),
      "total med".padStart(12),
      "total p95".padStart(12),
      "generate med".padStart(14),
      "project med".padStart(12),
      "residual med".padStart(13),
      "cand/s med".padStart(12),
    ].join(" | "),
  ];

  for (const benchmarkCase of report.cases) {
    lines.push(
      [
        String(benchmarkCase.size).padStart(8),
        String(benchmarkCase.candidateCount).padStart(10),
        formatMs(benchmarkCase.timingsMs.total.median).padStart(12),
        formatMs(benchmarkCase.timingsMs.total.p95).padStart(12),
        formatMs(benchmarkCase.timingsMs.registryGenerate.median).padStart(14),
        formatMs(benchmarkCase.timingsMs.projectCalls.median).padStart(12),
        formatMs(
          benchmarkCase.timingsMs.orderingDedupAndIntersection.median,
        ).padStart(13),
        Math.round(
          benchmarkCase.throughputCandidatesPerSecond.median,
        ).toLocaleString("en-US").padStart(12),
      ].join(" | "),
    );
  }
  return lines.join("\n");
}

function renderMarkdown(report) {
  const rows = report.cases
    .map(
      (benchmarkCase) =>
        `| ${benchmarkCase.size.toLocaleString("en-US")} | ${benchmarkCase.repetitions} | ${benchmarkCase.queriedFeatureCount.toLocaleString("en-US")} | ${benchmarkCase.candidateCount.toLocaleString("en-US")} | ${formatNumber(benchmarkCase.timingsMs.total.median)} | ${formatNumber(benchmarkCase.timingsMs.total.p95)} | ${formatNumber(benchmarkCase.timingsMs.registryGenerate.median)} | ${formatNumber(benchmarkCase.timingsMs.projectCalls.median)} | ${formatNumber(benchmarkCase.timingsMs.orderingDedupAndIntersection.median)} | ${Math.round(benchmarkCase.throughputCandidatesPerSecond.median).toLocaleString("en-US")} |`,
    )
    .join("\n");

  return `# PlotLibre Region-Selection Resolver Benchmark\n\nGenerated: ${report.environment.timestamp}  \nGit SHA: \`${report.environment.gitSha}\`  \nNode: \`${report.environment.node}\`  \nPlatform: \`${report.environment.platform} ${report.environment.release} ${report.environment.arch}\`  \nCPU: \`${report.environment.cpuModel}\` (${report.environment.logicalCpuCount} logical CPUs)  \nTotal memory: ${(report.environment.totalMemoryBytes / 1024 ** 3).toFixed(2)} GiB  \nProfile: \`${report.environment.profile}\`\n\n## Results\n\n| Features | Repetitions | Rendered rows | Unique candidates | Total median ms | Total p95 ms | Generate median ms | Project median ms | Residual median ms | Median candidates/s |\n|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n${rows}\n\nResidual time is total resolver time minus the measured query-adapter, Registry.generate and map.project wrapper durations. It includes rendered-id collection, deduplication, PlotStore-order filtering, projected-geometry allocation and exact screen intersection.\n\n## Fixture\n\n- 100% \`${STRAIGHT_ARROW_TYPE}\`; two authored controls per feature.\n- ${RENDERED_DUPLICATES_PER_FEATURE} rendered rows per PlotFeature to exercise layer/tile deduplication.\n- Every PlotFeature is a broad-phase candidate and an exact region hit.\n- Deterministic linear CSS-pixel-like projector; no browser, GPU, tile worker or style evaluation.\n- Warmups and repetitions are recorded per row.\n\n## Limitations\n\n${report.limitations.map((item) => `- ${item}`).join("\n")}\n`;
}

function formatMs(value) {
  return `${formatNumber(value)} ms`;
}

function formatNumber(value) {
  return Number(value).toFixed(3);
}
