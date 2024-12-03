import { GraphQLServiceAction } from '../graphql/types';

import { simulateOfflineGraphQLServiceAction } from './components/global/SimulateOfflineToggleButton';

export const devGraphQLServiceActions: GraphQLServiceAction[] = import.meta.env.PROD
  ? []
  : [simulateOfflineGraphQLServiceAction];
