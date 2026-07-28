export class PlotLibreError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = "PlotLibreError";
    this.code = code;
  }
}

export class PlotDefinitionNotFoundError extends PlotLibreError {
  public constructor(type: string) {
    super("PLOT_DEFINITION_NOT_FOUND", `No plot definition is registered for "${type}".`);
    this.name = "PlotDefinitionNotFoundError";
  }
}

export class DuplicatePlotDefinitionError extends PlotLibreError {
  public constructor(type: string) {
    super("DUPLICATE_PLOT_DEFINITION", `A plot definition is already registered for "${type}".`);
    this.name = "DuplicatePlotDefinitionError";
  }
}

export class PlotFeatureNotFoundError extends PlotLibreError {
  public constructor(id: string) {
    super("PLOT_FEATURE_NOT_FOUND", `No plot feature exists with id "${id}".`);
    this.name = "PlotFeatureNotFoundError";
  }
}

export class DuplicatePlotFeatureError extends PlotLibreError {
  public constructor(id: string) {
    super("DUPLICATE_PLOT_FEATURE", `A plot feature already exists with id "${id}".`);
    this.name = "DuplicatePlotFeatureError";
  }
}

export class InvalidPlotFeatureError extends PlotLibreError {
  public constructor(message: string) {
    super("INVALID_PLOT_FEATURE", message);
    this.name = "InvalidPlotFeatureError";
  }
}
