import { isEnvironmentVariableTruthy } from '~utils/string/is-environment-variable-truthy';

export function isDevToolsEnabled() {
  if (import.meta.env.PROD) {
    return false;
  }

  return isEnvironmentVariableTruthy(import.meta.env.VITE_DEV_TOOLS);
}
