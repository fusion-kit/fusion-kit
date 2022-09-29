export function unreachable(value: never): never {
  throw new Error(`unreachable called with value: ${value}`);
}

export function nonEmptyString(value: string | null | undefined): string | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  return value;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(Math.min(value, max), min);
}

export function replaceAt<T>(items: T[], index: number, newValue: T): T[] {
  return [...items.slice(0, index), newValue, ...items.slice(index + 1)];
}

export function removeAt<T>(items: T[], index: number): T[] {
  return [...items.slice(0, index), ...items.slice(index + 1)];
}
