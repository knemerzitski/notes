import { isEnvironmentVariableTruthy } from '../../../utils/src/string/is-environment-variable-truthy';

import { GraphQLServiceAction } from '../graphql/types';

import { simulateOfflineGraphQLServiceAction } from './components/global/SimulateOfflineToggleButton';

export const devGraphQLServiceActions: GraphQLServiceAction[] =
  import.meta.env.PROD || !isEnvironmentVariableTruthy(import.meta.env.VITE_DEV_TOOLS)
    ? []
    : [simulateOfflineGraphQLServiceAction];
