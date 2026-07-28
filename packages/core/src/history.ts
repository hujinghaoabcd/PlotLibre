export interface Command {
  readonly label: string;
  execute(): void;
  undo(): void;
}

export interface CommandHistoryOptions {
  readonly maxSize?: number;
}

export class CommandHistory {
  readonly #undoStack: Command[] = [];
  readonly #redoStack: Command[] = [];
  readonly #maxSize: number;

  public constructor(options: CommandHistoryOptions = {}) {
    const maxSize = options.maxSize ?? 200;
    if (!Number.isInteger(maxSize) || maxSize < 1) {
      throw new RangeError("CommandHistory maxSize must be a positive integer.");
    }
    this.#maxSize = maxSize;
  }

  public execute(command: Command): void {
    command.execute();
    this.#undoStack.push(command);
    if (this.#undoStack.length > this.#maxSize) {
      this.#undoStack.shift();
    }
    this.#redoStack.length = 0;
  }

  public undo(): boolean {
    const command = this.#undoStack.pop();
    if (!command) {
      return false;
    }
    command.undo();
    this.#redoStack.push(command);
    return true;
  }

  public redo(): boolean {
    const command = this.#redoStack.pop();
    if (!command) {
      return false;
    }
    command.execute();
    this.#undoStack.push(command);
    return true;
  }

  public clear(): void {
    this.#undoStack.length = 0;
    this.#redoStack.length = 0;
  }

  public get canUndo(): boolean {
    return this.#undoStack.length > 0;
  }

  public get canRedo(): boolean {
    return this.#redoStack.length > 0;
  }

  public get undoDepth(): number {
    return this.#undoStack.length;
  }

  public get redoDepth(): number {
    return this.#redoStack.length;
  }
}
