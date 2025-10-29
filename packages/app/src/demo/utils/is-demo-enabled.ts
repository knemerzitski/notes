import { isEnvironmentVariableTruthy } from '../../../../utils/src/string/is-environment-variable-truthy';

export function isDemoEnabled() {
  return isEnvironmentVariableTruthy(import.meta.env.VITE_DEMO_ENABLED);
}
