import { isEnvironmentVariableTruthy } from '~utils/string/is-environment-variable-truthy';

const IS_REAL_PRODUCTION_BUILD =
  !isEnvironmentVariableTruthy(
    import.meta.env.VITE_WARNING_BUILD_PRODUCTION_ONLY_FOR_LOCALHOST
  ) && import.meta.env.PROD;

// Google
export const GOOGLE = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  mock: IS_REAL_PRODUCTION_BUILD
    ? false
    : isEnvironmentVariableTruthy(import.meta.env.VITE_MOCK_GOOGLE_AUTH),
};
