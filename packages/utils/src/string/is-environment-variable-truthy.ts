export function isEnvironmentVariableTruthy(value: string | undefined) {
  return value === 'true' || value === '1';
}
