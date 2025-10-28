import { isEnvironmentVariableTruthy } from '../../../utils/src/string/is-environment-variable-truthy';

const DEFAULT_INTERVAL = 24 * 60 * 60 * 1000;

export function isDemoMode(env: typeof process.env) {
  return isEnvironmentVariableTruthy(env.VITE_DEMO_ENABLED);
}

export function demoResetInterval(env: typeof process.env) {
  if (!env.DEMO_RESET_INTERVAL) {
    return DEFAULT_INTERVAL;
  }

  const value = Number.parseInt(env.DEMO_RESET_INTERVAL);

  if (Number.isNaN(value) || value < 0) {
    return DEFAULT_INTERVAL;
  }

  return value;
}
