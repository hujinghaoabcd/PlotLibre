import {
  DuplicatePlotDefinitionError,
  InvalidPlotFeatureError,
  PlotDefinitionNotFoundError,
} from "./errors.js";
import type {
  PlotDefinition,
  PlotFeature,
  RenderBundle,
  ValidationResult,
} from "./types.js";

export class PlotRegistry {
  readonly #definitions = new Map<string, PlotDefinition>();

  public register(definition: PlotDefinition): this {
    if (this.#definitions.has(definition.type)) {
      throw new DuplicatePlotDefinitionError(definition.type);
    }
    this.#assertDefinition(definition);
    this.#definitions.set(definition.type, definition);
    return this;
  }

  public registerMany(definitions: readonly PlotDefinition[]): this {
    for (const definition of definitions) {
      this.register(definition);
    }
    return this;
  }

  public replace(definition: PlotDefinition): this {
    this.#assertDefinition(definition);
    this.#definitions.set(definition.type, definition);
    return this;
  }

  public unregister(type: string): boolean {
    return this.#definitions.delete(type);
  }

  public has(type: string): boolean {
    return this.#definitions.has(type);
  }

  public get(type: string): PlotDefinition {
    const definition = this.#definitions.get(type);
    if (!definition) {
      throw new PlotDefinitionNotFoundError(type);
    }
    return definition;
  }

  public list(): readonly PlotDefinition[] {
    return [...this.#definitions.values()].sort((left, right) =>
      left.type.localeCompare(right.type),
    );
  }

  public validate(feature: PlotFeature): ValidationResult {
    const definition = this.get(feature.plotType);
    const pointCount = feature.controlPoints.length;
    const issues = [];

    if (pointCount < definition.controlSchema.minPoints) {
      issues.push({
        code: "TOO_FEW_CONTROL_POINTS",
        message: `${definition.type} requires at least ${definition.controlSchema.minPoints} control points; received ${pointCount}.`,
        severity: "error" as const,
      });
    }

    if (pointCount > definition.controlSchema.maxPoints) {
      issues.push({
        code: "TOO_MANY_CONTROL_POINTS",
        message: `${definition.type} accepts at most ${definition.controlSchema.maxPoints} control points; received ${pointCount}.`,
        severity: "error" as const,
      });
    }

    for (const [index, point] of feature.controlPoints.entries()) {
      const [longitude, latitude] = point;
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
        issues.push({
          code: "NON_FINITE_CONTROL_POINT",
          message: `Control point ${index} contains a non-finite coordinate.`,
          severity: "error" as const,
        });
      }
      if (latitude < -90 || latitude > 90) {
        issues.push({
          code: "LATITUDE_OUT_OF_RANGE",
          message: `Control point ${index} has latitude ${latitude}, outside [-90, 90].`,
          severity: "error" as const,
        });
      }
    }

    const custom = definition.validate?.({ feature });
    if (custom) {
      issues.push(...custom.issues);
    }

    return {
      valid: !issues.some((issue) => issue.severity === "error"),
      issues,
    };
  }

  public assertValid(feature: PlotFeature): void {
    const validation = this.validate(feature);
    if (!validation.valid) {
      throw new InvalidPlotFeatureError(
        validation.issues.map((issue) => issue.message).join(" "),
      );
    }
  }

  public generate(feature: PlotFeature): RenderBundle {
    this.assertValid(feature);
    return this.get(feature.plotType).generate({ feature });
  }

  #assertDefinition(definition: PlotDefinition): void {
    if (!definition.type.trim()) {
      throw new InvalidPlotFeatureError("Plot definition type must not be empty.");
    }
    if (!Number.isInteger(definition.controlSchema.minPoints) || definition.controlSchema.minPoints < 0) {
      throw new InvalidPlotFeatureError("controlSchema.minPoints must be a non-negative integer.");
    }
    if (
      !Number.isFinite(definition.controlSchema.maxPoints) &&
      definition.controlSchema.maxPoints !== Number.POSITIVE_INFINITY
    ) {
      throw new InvalidPlotFeatureError("controlSchema.maxPoints must be finite or Infinity.");
    }
    if (definition.controlSchema.maxPoints < definition.controlSchema.minPoints) {
      throw new InvalidPlotFeatureError("controlSchema.maxPoints must be >= minPoints.");
    }
  }
}
