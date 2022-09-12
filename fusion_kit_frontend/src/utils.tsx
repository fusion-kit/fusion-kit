export function unreachable(value: never): never {
  throw new Error(`unreachable called with value: ${value}`);
}

export function nonEmptyString(value: string | null | undefined): string | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  return value;
}
