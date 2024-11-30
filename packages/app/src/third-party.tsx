import { isEnvironmentVariableTruthy } from '~utils/string/is-environment-variable-truthy';

// Google
export const GOOGLE = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  mock: import.meta.env.PROD
    ? false
    : isEnvironmentVariableTruthy(import.meta.env.VITE_MOCK_GOOGLE_AUTH),
};
