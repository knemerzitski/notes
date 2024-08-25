export function invariant(condition: unknown, message?: string): asserts condition {
  const booleanCondition = Boolean(condition);
  if (!booleanCondition) {
    throw new Error(message ?? 'Unexpected invariant triggered.');
  }
}
